import { inngest } from "../client";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * Purge RGPD des comptes résiliés (EF-015 / ENF-003).
 *
 * Le webhook Stripe (`customer.subscription.deleted`, voir
 * `app/api/webhooks/stripe/route.ts`) pose `User.purgeAt` = résiliation + 60
 * jours, et la page de réglages promet explicitement à l'utilisateur :
 * « Vos données seront supprimées le [date] » (`personal-data-summary.ts`,
 * `formatPurgeLabel`). Jusqu'à cette fonction, rien ne lisait jamais
 * `purgeAt` : la promesse n'était tenue par aucun code.
 *
 * SUPPRESSION, PAS ANONYMISATION : la promesse affichée dit « supprimées »,
 * pas « anonymisées ». Le schéma est construit pour ça : toutes les relations
 * propriétaire→enfant de `User` (Account, Session, Site, MonitoredSite,
 * Client, BrandSettings, et transitivement Page, ScanLog, AlertEvent,
 * BotScan, ProbeResult…) sont en `onDelete: Cascade` — un seul
 * `db.user.deleteMany()` suffit à tout effacer proprement, sans anonymisation
 * partielle qui laisserait des lignes orphelines à gérer à la main. C'est
 * aussi le choix le plus conservateur : moins de données résiduelles qu'une
 * anonymisation, et cohérent avec le mot employé dans l'UI.
 *
 * COMPTE RÉABONNÉ ENTRE-TEMPS (le bug le plus probable de cette fonction) :
 * `checkout.session.completed` remet `cancelledAt`/`purgeAt` à `null` quand
 * l'utilisateur repasse par un nouveau paiement — ce cas est déjà sûr. Mais
 * `customer.subscription.updated` peut réactiver un abonnement annulé-à-
 * échéance (ex. bouton « reprendre » du portail Stripe) SANS repasser par
 * `checkout.session.completed`, donc SANS remettre `cancelledAt`/`purgeAt` à
 * `null` (voir route.ts lignes 121-145). Ce même chemin remet en revanche
 * `plan` sur le tarif actif et `stripeCurrentPeriodEnd` sur une date future.
 * `purgeEligibleWhere` exige donc, en plus de `purgeAt` échu et `cancelledAt`
 * non nul : `plan === "FREE"` ET `stripeCurrentPeriodEnd === null`. Un compte
 * réactivé par ce chemin échoue ces deux conditions et n'est jamais purgé,
 * même si son `purgeAt` obsolète traîne encore en base.
 *
 * BORNAGE DU LOT : `findMany` est plafonné par `PURGE_BATCH_SIZE` (jamais un
 * nombre non borné de comptes chargés en mémoire). Le `deleteMany` qui suit
 * re-filtre par les mêmes critères d'éligibilité (pas seulement par id), ce
 * qui ferme la fenêtre de course où un webhook de réabonnement arriverait
 * entre les deux steps.
 *
 * COÛT INNGEST : cron quotidien (pas mensuel comme `prune-scan-logs`, pour
 * tenir l'échéance à 60 jours annoncée à l'utilisateur avec une précision
 * d'un jour, pas d'un mois) + 2 steps (lecture bornée, puis suppression) =
 * 3 exécutions par jour, ~90/mois. Négligeable sur le palier gratuit de
 * 50 000 exécutions/mois (cf. commentaire de budget dans scan-site.ts).
 */
export const PURGE_BATCH_SIZE = 200;

/**
 * Filtre Prisma des comptes éligibles à la purge à l'instant `now`. Fonction
 * pure (comme `pruneCutoff` dans prune-scan-logs.ts) pour rester testable
 * sans horloge système, et réutilisée à l'identique pour la lecture et pour
 * la suppression.
 */
export function purgeEligibleWhere(now: Date): Prisma.UserWhereInput {
  return {
    purgeAt: { lte: now },
    cancelledAt: { not: null },
    plan: "FREE",
    stripeCurrentPeriodEnd: null,
  };
}

export const purgeCancelledAccountsJob = inngest.createFunction(
  {
    id: "purge-cancelled-accounts",
    triggers: [{ cron: "TZ=Europe/Paris 0 5 * * *" }],
  },
  async ({ step }) => {
    const candidates = await step.run("find-purge-candidates", async () => {
      return await db.user.findMany({
        where: purgeEligibleWhere(new Date()),
        select: { id: true },
        take: PURGE_BATCH_SIZE,
      });
    });

    if (candidates.length === 0) {
      return { purged: 0 };
    }

    const result = await step.run("purge-accounts", async () => {
      const ids = candidates.map((candidate) => candidate.id);
      return await db.user.deleteMany({
        where: {
          id: { in: ids },
          ...purgeEligibleWhere(new Date()),
        },
      });
    });

    return { purged: result.count };
  },
);
