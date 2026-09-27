export type Plan = "FREE" | "SOLO" | "PRO" | "SCALE";

/**
 * Correspondance entre les tarifs Stripe et les plans du produit.
 *
 * Le client ne doit jamais choisir le tarif qu'il paie : s'il transmet un
 * identifiant de prix arbitraire, il peut régler le tarif le plus bas du
 * compte Stripe et se voir attribuer le plan le plus élevé. La table
 * ci-dessous est la seule autorité, et elle vit côté serveur.
 */
const PRICE_ID_BY_PLAN: Partial<Record<Plan, string | undefined>> = {
  SOLO: process.env.STRIPE_PRICE_SOLO,
  PRO: process.env.STRIPE_PRICE_PRO,
  SCALE: process.env.STRIPE_PRICE_SCALE,
};

/**
 * Durée de l'essai gratuit accordé au premier abonnement d'un compte, en
 * jours. La carte bancaire est toujours collectée dès le tunnel Stripe
 * Checkout (`subscription_data.payment_method_collection = "always"`) : le
 * premier prélèvement a lieu à la fin de l'essai si l'agence n'a pas résilié.
 */
export const TRIAL_DAYS = 14;

/** Plans que l'on peut réellement acheter. `FREE` n'en fait pas partie. */
export const PURCHASABLE_PLANS = ["SOLO", "PRO", "SCALE"] as const;
export type PurchasablePlan = (typeof PURCHASABLE_PLANS)[number];

export function isPurchasablePlan(value: unknown): value is PurchasablePlan {
  return (
    typeof value === "string" &&
    (PURCHASABLE_PLANS as readonly string[]).includes(value)
  );
}

/** Identifiant de tarif Stripe pour un plan. Lève si le tarif n'est pas configuré. */
export function priceIdForPlan(plan: PurchasablePlan): string {
  const priceId = PRICE_ID_BY_PLAN[plan];
  if (!priceId) {
    throw new Error(
      `Aucun tarif Stripe configuré pour le plan ${plan}. Renseigne STRIPE_PRICE_${plan}.`,
    );
  }
  return priceId;
}

/**
 * Plan correspondant à un tarif Stripe, ou `null` si le tarif est inconnu.
 *
 * Utilisé par le webhook : le plan se déduit de ce que Stripe confirme avoir
 * facturé, jamais d'une valeur écrite en dur ni transmise par le client.
 */
export function planForPriceId(priceId: string | null | undefined): Plan | null {
  if (!priceId) return null;
  for (const plan of PURCHASABLE_PLANS) {
    if (PRICE_ID_BY_PLAN[plan] === priceId) return plan;
  }
  return null;
}

/**
 * Quota de sites surveillés et accès à la marque blanche par plan.
 *
 * Seule autorité pour l'application du quota (EF-018) : jamais recalculée
 * ni contournable côté client.
 */
export const PLAN_LIMITS: Record<Plan, { maxSites: number; whiteLabel: boolean }> = {
  FREE: { maxSites: 0, whiteLabel: false },
  SOLO: { maxSites: 10, whiteLabel: false },
  PRO: { maxSites: 30, whiteLabel: true },
  SCALE: { maxSites: 100, whiteLabel: true },
};

/** Quota de sites pour un plan. Un plan inconnu n'a droit à aucun site. */
export function maxSitesFor(plan: string): number {
  return (PLAN_LIMITS as Record<string, { maxSites: number; whiteLabel: boolean }>)[plan]?.maxSites ?? 0;
}

/** Accès à la marque blanche pour un plan. Un plan inconnu n'y a pas droit. */
export function whiteLabelFor(plan: string): boolean {
  return (PLAN_LIMITS as Record<string, { maxSites: number; whiteLabel: boolean }>)[plan]?.whiteLabel ?? false;
}
