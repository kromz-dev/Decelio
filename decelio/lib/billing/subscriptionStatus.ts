import { getStripe } from "./stripe";
import { logFailure } from "../log";

/**
 * Date à laquelle un abonnement Stripe s'arrêtera réellement, quand une
 * résiliation est déjà programmée depuis le portail client.
 *
 * Stripe garde l'abonnement `active` jusqu'à la fin de la période déjà
 * payée et n'émet `customer.subscription.deleted` qu'à ce moment-là : entre
 * la demande de résiliation et cette date, `cancel_at_period_end`/`cancel_at`
 * sont la seule trace de la résiliation à venir, et ils ne vivent que côté
 * Stripe, jamais reçus en base ici.
 *
 * Lus en direct à l'affichage plutôt que persistés : les ajouter à `User`
 * demanderait une colonne et donc une migration Prisma, qui se décide avec
 * le fondateur et ne part pas dans la même correction qu'un affichage. Le
 * coût réseau supplémentaire est acceptable ici : la page Paramètres est peu
 * vue, jamais sur un chemin chaud.
 *
 * Ne lève jamais : une panne Stripe ponctuelle prive seulement l'écran de
 * paramètres de cette précision, elle ne doit jamais le casser.
 */
export async function getScheduledCancellation(
  stripeSubscriptionId: string,
): Promise<Date | null> {
  try {
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

    if (subscription.status === "canceled") return null;
    if (!subscription.cancel_at_period_end && !subscription.cancel_at) return null;

    const seconds = subscription.cancel_at ?? subscription.items?.data?.[0]?.current_period_end;
    return typeof seconds === "number" ? new Date(seconds * 1000) : null;
  } catch (error) {
    logFailure("billing.scheduled_cancellation_lookup_failed", {
      stripeSubscriptionId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}
