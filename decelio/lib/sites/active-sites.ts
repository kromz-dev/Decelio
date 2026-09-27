import type { Prisma } from "@prisma/client";
import { PURCHASABLE_PLANS, maxSitesFor } from "@/lib/billing/plans";

/**
 * Filtre Prisma « site à scanner » (EF-024).
 *
 * Un `MonitoredSite` n'est scanné que si son propriétaire :
 * 1. a un plan payant (`SOLO`, `PRO` ou `SCALE` — jamais `FREE`) ;
 * 2. et n'a pas d'abonnement échu.
 *
 * Le webhook Stripe (`app/api/webhooks/stripe/route.ts`) repasse déjà `plan`
 * à `FREE` dès qu'un abonnement devient inactif (`customer.subscription.updated`
 * avec un statut différent de `active`/`trialing`) ou est supprimé
 * (`customer.subscription.deleted`) : le champ `plan` est donc l'autorité
 * normale, et un compte `FREE` (jamais payé, ou résilié en attente de purge
 * RGPD à J+60) n'est jamais scanné.
 *
 * `stripeCurrentPeriodEnd` est une défense en profondeur pour la fenêtre
 * entre l'expiration réelle de la période et la réception de l'événement
 * Stripe correspondant :
 * - `null` (pas de fin de période connue, par exemple juste après le
 *   paiement si `periodEndOf()` ne l'a pas trouvée) ne doit PAS être traité
 *   comme une échéance passée, sous peine de ne jamais scanner ces comptes ;
 * - une date passée signifie que la période déjà payée est terminée.
 */
export function activeSiteWhere(
  now: Date = new Date(),
): Prisma.MonitoredSiteWhereInput {
  return {
    user: {
      plan: { in: [...PURCHASABLE_PLANS] },
      OR: [{ stripeCurrentPeriodEnd: null }, { stripeCurrentPeriodEnd: { gt: now } }],
    },
  };
}

/** Un site déjà jugé éligible par {@link activeSiteWhere}, prêt pour le quota. */
export interface QuotaCandidateSite {
  id: string;
  userId: string;
  userPlan: string;
}

/**
 * Applique le quota de sites du plan (EF-018) aux sites déjà filtrés comme
 * éligibles par {@link activeSiteWhere}.
 *
 * Un compte rétrogradé (par exemple PRO → SOLO) peut posséder plus de sites
 * que son nouveau quota n'autorise. On ne supprime aucun `MonitoredSite` :
 * on scanne seulement les sites les plus anciens, dans la limite du quota du
 * plan actuel, pour ne pas resurveiller des sites qu'un plan inférieur ne
 * couvre plus.
 *
 * `sites` doit déjà être trié par `createdAt` croissant (c'est le rôle du
 * `orderBy` de la requête Prisma) : cette fonction ne re-trie pas, pour ne
 * pas dépendre d'un `Date` qui redevient une chaîne après une relecture
 * mémorisée par Inngest.
 */
export function withinPlanQuota<T extends QuotaCandidateSite>(sites: T[]): T[] {
  const byUser = new Map<string, T[]>();
  for (const site of sites) {
    const forUser = byUser.get(site.userId);
    if (forUser) {
      forUser.push(site);
    } else {
      byUser.set(site.userId, [site]);
    }
  }

  const kept: T[] = [];
  for (const userSites of byUser.values()) {
    const limit = maxSitesFor(userSites[0].userPlan);
    kept.push(...userSites.slice(0, limit));
  }
  return kept;
}
