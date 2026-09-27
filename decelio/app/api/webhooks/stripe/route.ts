import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import { planForPriceId } from "@/lib/billing/plans";
import { db } from "@/lib/db";
import { captureServerEvent } from "@/lib/posthog-server";
import { sendTrialEndingEmail } from "@/lib/email/resend";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Fin de période d'un abonnement.
 *
 * Stripe a déplacé `current_period_end` de l'abonnement vers ses lignes.
 * Lire l'ancien emplacement produit `new Date(NaN)`, qui casse l'écriture
 * en base sans message utile.
 */
function periodEndOf(subscription: Stripe.Subscription): Date | null {
  const seconds = subscription.items?.data?.[0]?.current_period_end;
  return typeof seconds === "number" ? new Date(seconds * 1000) : null;
}

/** Plan réellement facturé, déduit du tarif que Stripe confirme. */
function planOf(subscription: Stripe.Subscription) {
  return planForPriceId(subscription.items?.data?.[0]?.price?.id);
}

/** Fin de l'essai en cours, ou `null` si l'abonnement n'est pas en essai. */
function trialEndOf(subscription: Stripe.Subscription): Date | null {
  // Stripe conserve trial_end même après la fin de l'essai (valeur historique).
  // On ne retourne la date que si l'abonnement est actuellement en essai.
  if (subscription.status !== "trialing") return null;
  return typeof subscription.trial_end === "number"
    ? new Date(subscription.trial_end * 1000)
    : null;
}

/**
 * Le coupon fondateur a-t-il été appliqué à cette session de paiement ?
 *
 * `session.discounts` est déjà présent sur l'objet reçu par le webhook (pas
 * besoin d'un appel réseau supplémentaire ni d'un `expand`) ; le coupon n'y
 * est pas développé par défaut, donc `discount.coupon` est directement
 * l'identifiant à comparer à la variable serveur.
 */
function founderCouponApplied(session: Stripe.Checkout.Session): boolean {
  const founderCoupon = process.env.STRIPE_FOUNDER_COUPON;
  if (!founderCoupon) return false;

  return (session.discounts ?? []).some((discount) => {
    const coupon = discount.coupon;
    const couponId = typeof coupon === "string" ? coupon : coupon?.id;
    return couponId === founderCoupon;
  });
}

export async function POST(req: Request) {
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET absente : webhook refusé.");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  const stripe = getStripe();

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Signature de webhook invalide.", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Effets de bord (événements de tunnel PostHog, e-mail Resend) à exécuter
  // après la transaction, une fois l'idempotence Stripe vérifiée
  // (ProcessedWebhook). Alimentés depuis l'intérieur de la transaction ; un
  // événement rejoué échoue sur le marqueur d'idempotence avant que ce
  // tableau ne soit jamais rempli, donc n'exécute rien une seconde fois.
  const pendingFunnelEvents: Array<() => Promise<void>> = [];

  try {
    let fetchedSubscription: Stripe.Subscription | null = null;
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription) {
        fetchedSubscription = await stripe.subscriptions.retrieve(
          session.subscription as string,
        );
      }
    }

    // Lien du portail client et aperçu de facture à glisser dans l'e-mail de fin
    // d'essai. Créés avant la transaction, comme la relecture de l'abonnement
    // ci-dessus : les appels Stripe supplémentaires sur un rejeu ne coûtent rien,
    // l'écriture en base (et donc l'envoi de l'e-mail) reste protégée par
    // `ProcessedWebhook`.
    let trialWillEndPortalUrl: string | null = null;
    let invoicePreview: Stripe.Invoice | null = null;
    if (event.type === "customer.subscription.trial_will_end") {
      const subscription = event.data.object as Stripe.Subscription;
      // Vérifier que l'abonnement est bien en essai, non résilié, avant de créer
      // la session du portail et de chercher un montant.
      if (
        subscription.status === "trialing" &&
        subscription.cancel_at_period_end !== true &&
        !subscription.cancel_at
      ) {
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: subscription.customer as string,
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        });
        trialWillEndPortalUrl = portalSession.url;

        // Créer un aperçu de facture pour lire le montant réel (prenant en compte
        // les coupons comme FONDATEUR50).
        invoicePreview = await stripe.invoices.createPreview({
          subscription: subscription.id,
        });
      }
    }

    // Le marqueur d'idempotence et l'écriture métier sont dans la même
    // transaction. Séparés, deux livraisons simultanées passent toutes les
    // deux, et un échec métier après marquage perd l'événement.
    await db.$transaction(async (tx) => {
      await tx.processedWebhook.create({ data: { id: event.id } });

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.client_reference_id;
          if (!userId || !fetchedSubscription) break;

          const plan = planOf(fetchedSubscription);
          if (!plan) {
            // Un tarif inconnu ne doit jamais accorder un plan par défaut.
            console.error(
              `Tarif Stripe non répertorié sur l'abonnement ${fetchedSubscription.id}. Aucun plan accordé.`,
            );
            break;
          }

          const isFounder = founderCouponApplied(session);
          const isTrialing = fetchedSubscription.status === "trialing";
          const trialEnd = trialEndOf(fetchedSubscription);

          // `trialUsedAt` n'est jamais effacé : on ne le pose que s'il est
          // encore vide, pour ne pas perdre la trace du premier abonnement
          // d'un compte si ce webhook était un jour rejoué avec une valeur
          // différente en amont (il ne l'est pas ici, ProcessedWebhook s'en
          // charge, mais la garde ne coûte rien et documente l'intention).
          const existingUser = await tx.user.findUnique({
            where: { id: userId },
            select: { trialUsedAt: true },
          });

          await tx.user.update({
            where: { id: userId },
            data: {
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: fetchedSubscription.id,
              stripePriceId: fetchedSubscription.items?.data?.[0]?.price?.id,
              plan,
              stripeCurrentPeriodEnd: periodEndOf(fetchedSubscription),
              cancelledAt: null,
              purgeAt: null,
              trialUsedAt: existingUser?.trialUsedAt ?? new Date(),
              stripeTrialEnd: trialEnd,
              ...(isFounder
                ? { isFounderMember: true, founderOfferAt: new Date() }
                : {}),
            },
          });
          // `subscription_activated` part dès le début de l'essai (ou dès
          // le paiement immédiat s'il n'y a pas d'essai) : c'est le moment où
          // l'agence a réellement pris l'engagement (carte fournie), plus
          // honnête qu'attendre la conversion qui peut n'être qu'une
          // formalité 14 jours plus tard. `trial_converted` (facture
          // cycle_reason ci-dessous) mesure spécifiquement le passage réel au
          // payant.
          pendingFunnelEvents.push(() =>
            captureServerEvent(userId, "subscription_activated", { plan }),
          );
          if (isTrialing) {
            pendingFunnelEvents.push(() =>
              captureServerEvent(userId, "trial_started", { plan }),
            );
          }
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object;
          const user = await tx.user.findUnique({
            where: { stripeCustomerId: subscription.customer as string },
            select: { id: true, plan: true },
          });
          if (!user) break;

          const active =
            subscription.status === "active" || subscription.status === "trialing";
          const plan = planOf(subscription);

          await tx.user.update({
            where: { id: user.id },
            data: {
              stripeSubscriptionId: subscription.id,
              stripePriceId: subscription.items?.data?.[0]?.price?.id,
              stripeCurrentPeriodEnd: periodEndOf(subscription),
              // Un changement de tarif doit se refléter dans les deux sens :
              // conserver l'ancien plan rendait toute rétrogradation sans effet.
              // `trialing` compte comme actif : la période d'essai donne déjà
              // accès au plan payant (EF-essai-gratuit-14-jours).
              plan: active && plan ? plan : "FREE",
              // Reflète la date de fin d'essai courante ; `null` une fois
              // l'essai terminé (converti ou résilié), ce qui arrête aussi
              // tout futur affichage d'un essai qui n'existe plus.
              stripeTrialEnd: trialEndOf(subscription),
            },
          });

          // Détection de conversion d'essai : transition trialing → active.
          // On lit previous_attributes pour vérifier l'état antérieur.
          const previousStatus = event.data.previous_attributes?.status;
          if (previousStatus === "trialing" && subscription.status === "active") {
            pendingFunnelEvents.push(() =>
              captureServerEvent(user.id, "trial_converted", { plan: plan || user.plan }),
            );
          }
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object;
          const user = await tx.user.findUnique({
            where: { stripeCustomerId: subscription.customer as string },
            select: { id: true, plan: true },
          });
          if (!user) break;

          const now = new Date();
          const purgeAt = new Date(now);
          purgeAt.setDate(purgeAt.getDate() + 60);

          await tx.user.update({
            where: { id: user.id },
            data: {
              plan: "FREE",
              stripeCurrentPeriodEnd: null,
              cancelledAt: now,
              purgeAt,
            },
          });
          pendingFunnelEvents.push(() =>
            captureServerEvent(user.id, "subscription_canceled", {
              plan: "FREE",
              previous_plan: user.plan,
            }),
          );
          break;
        }

        case "customer.subscription.trial_will_end": {
          const subscription = event.data.object;
          const user = await tx.user.findUnique({
            where: { stripeCustomerId: subscription.customer as string },
            select: { id: true, email: true, name: true },
          });
          if (!user) break;

          const trialEnd = trialEndOf(subscription);
          const amountCents = invoicePreview?.amount_due;
          const currency = invoicePreview?.currency;

          if (
            !trialEnd ||
            typeof amountCents !== "number" ||
            !currency ||
            !trialWillEndPortalUrl
          ) {
            // Un abonnement sans aperçu de facture ou sans date de fin d'essai
            // lisible ne doit jamais produire un e-mail avec un montant ou une
            // date inventés (docs/08-constitution.md, honnêteté de la mesure).
            console.error(
              `Webhook trial_will_end incomplet pour l'abonnement ${subscription.id} : e-mail non envoyé.`,
            );
            break;
          }

          pendingFunnelEvents.push(async () => {
            await sendTrialEndingEmail({
              to: user.email,
              recipientName: user.name,
              trialEndDate: trialEnd,
              amountCents,
              currency,
              portalUrl: trialWillEndPortalUrl!,
            });
          });
          break;
        }

      }
    });

    for (const emit of pendingFunnelEvents) {
      await emit();
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    // Violation de contrainte unique sur le marqueur : l'événement a déjà été
    // traité. C'est un succès, pas une erreur — répondre 500 ferait rejouer
    // Stripe indéfiniment.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    console.error("Échec du traitement du webhook :", error);
    // Le marqueur n'est pas supprimé : la transaction a été annulée avec lui.
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
