"use server";

import { getStripe } from "./stripe";
import { isPurchasablePlan, priceIdForPlan, TRIAL_DAYS } from "./plans";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { captureServerEvent } from "@/lib/posthog-server";
import { redirect } from "next/navigation";

/**
 * Identifiant du coupon fondateur à appliquer si le code fourni correspond.
 *
 * Le client ne choisit jamais un identifiant de coupon Stripe directement :
 * il ne peut que proposer un code, comparé ici au seul coupon autorisé côté
 * serveur. Un code inconnu (ou la variable absente) est un rejet, jamais un
 * paiement silencieusement sans réduction.
 */
function resolveFounderCoupon(couponCode: string | undefined): string | undefined {
  const trimmed = couponCode?.trim();
  if (!trimmed) return undefined;

  const founderCoupon = process.env.STRIPE_FOUNDER_COUPON;
  if (!founderCoupon || trimmed.toUpperCase() !== founderCoupon.toUpperCase()) {
    throw new Error("Code promo inconnu.");
  }
  return founderCoupon;
}

/**
 * Ouvre un paiement Stripe pour un plan.
 *
 * L'argument est un nom de plan, jamais un identifiant de tarif : un tarif
 * transmis par le client permettrait de payer le montant le plus bas du
 * compte Stripe et d'obtenir le plan le plus élevé.
 */
export async function createCheckoutSession(plan: string, couponCode?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (!isPurchasablePlan(plan)) {
    throw new Error(`Plan inconnu : ${plan}`);
  }
  const priceId = priceIdForPlan(plan);
  const coupon = resolveFounderCoupon(couponCode);
  const stripe = getStripe();

  const user = await db.user.findUnique({
    where: { id: session.user.id }
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Un seul essai gratuit par compte : un abonnement ou un essai déjà eu
  // (marqueur posé au premier abonnement, jamais effacé, même après
  // résiliation) exclut tout nouvel essai. Le paiement démarre alors
  // immédiatement, comme avant l'essai gratuit.
  const eligibleForTrial = !user.trialUsedAt;

  // Create checkout session
  const stripeSession = await stripe.checkout.sessions.create({
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    payment_method_types: ["card"],
    managed_payments: { enabled: false },
    mode: "subscription",
    billing_address_collection: "auto",
    customer_email: user.stripeCustomerId ? undefined : user.email,
    customer: user.stripeCustomerId || undefined,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    // La carte est toujours demandée dès le tunnel, essai ou pas : sans
    // elle, Stripe ne prélève jamais à la fin de l'essai. C'est le
    // comportement par défaut de Stripe, posé explicitement ici pour ne
    // jamais dépendre d'une valeur par défaut qui pourrait changer.
    payment_method_collection: "always",
    ...(coupon ? { discounts: [{ coupon }] } : {}),
    ...(eligibleForTrial
      ? { subscription_data: { trial_period_days: TRIAL_DAYS } }
      : {}),
    client_reference_id: user.id,
  });

  if (!stripeSession.url) {
    throw new Error("Could not create stripe session");
  }

  await captureServerEvent(user.id, "checkout_started", { plan });

  redirect(stripeSession.url);
}

export async function createCustomerPortalSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id }
  });

  if (!user?.stripeCustomerId) {
    throw new Error("No stripe customer found");
  }

  const stripe = getStripe();
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
  });

  redirect(portalSession.url);
}



