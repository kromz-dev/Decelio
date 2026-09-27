import { db } from "@/lib/db";

/**
 * Fin de l'essai gratuit en cours pour ce compte, ou `null` hors essai
 * (jamais commencé, converti ou résilié) : le webhook Stripe ne garde
 * `stripeTrialEnd` que tant que l'abonnement est en `trialing`.
 *
 * Donnée exposée au Design pour le bandeau « Essai : X jours restants ».
 */
export async function getTrialEndsAt(userId: string | undefined): Promise<Date | null> {
  if (!userId) return null;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeTrialEnd: true },
  });
  return user?.stripeTrialEnd ?? null;
}
