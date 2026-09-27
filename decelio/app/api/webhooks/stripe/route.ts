import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import { planForPriceId } from "@/lib/billing/plans";
import { db } from "@/lib/db";
import { captureServerEvent } from "@/lib/posthog-server";
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

  // Événements de tunnel à émettre après la transaction, une fois
  // l'idempotence Stripe vérifiée (ProcessedWebhook). Alimentés depuis
  // l'intérieur de la transaction ; un événement rejoué échoue sur le
  // marqueur d'idempotence avant que ce tableau ne soit jamais rempli, donc
  // n'émet rien une seconde fois.
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
              ...(isFounder
                ? { isFounderMember: true, founderOfferAt: new Date() }
                : {}),
            },
          });
          pendingFunnelEvents.push(() =>
            captureServerEvent(userId, "subscription_activated", { plan }),
          );
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object;
          const user = await tx.user.findUnique({
            where: { stripeCustomerId: subscription.customer as string },
            select: { id: true },
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
              plan: active && plan ? plan : "FREE",
            },
          });
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
