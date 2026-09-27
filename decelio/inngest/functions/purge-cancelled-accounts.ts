import { inngest } from "../client";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/billing/stripe";
import type { Prisma } from "@prisma/client";
import Stripe from "stripe";

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
 * SUPPRESSION STRIPE : Après suppression des comptes en base, on efface aussi
 * le client Stripe associé si présent. Cela retire ses moyens de paiement et
 * coordonnées chez Stripe, mais les factures déjà émises restent conservées
 * par Stripe (obligation légale et comptable) — ce comportement est attendu.
 *
 * COÛT INNGEST : cron quotidien (pas mensuel comme `prune-scan-logs`, pour
 * tenir l'échéance à 60 jours annoncée à l'utilisateur avec une précision
 * d'un jour, pas d'un mois) + 3 steps (lecture bornée, suppression, suppression
 * Stripe) = 4 exécutions par jour, ~120/mois. Négligeable sur le palier
 * gratuit de 50 000 exécutions/mois (cf. commentaire de budget dans
 * scan-site.ts).
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
      return { purged: 0, stripeCustomersDeleted: 0 };
    }

    const purgeResult = await step.run("purge-accounts", async () => {
      const ids = candidates.map((candidate) => candidate.id);
      const now = new Date();

      // Utiliser une transaction pour lire les stripeCustomerIds ET supprimer
      // les comptes en cohérence atomique. Jamais supprimer un client Stripe
      // avant que la ligne en base ne soit effacée : un compte réabonné
      // entre-temps ne doit JAMAIS perdre son client Stripe.
      const txResult = await db.$transaction(async (tx) => {
        const usersToDelete = await tx.user.findMany({
          where: {
            id: { in: ids },
            ...purgeEligibleWhere(now),
          },
          select: {
            id: true,
            stripeCustomerId: true,
          },
        });

        const deleteResult = await tx.user.deleteMany({
          where: {
            id: { in: ids },
            ...purgeEligibleWhere(now),
          },
        });

        // En cas de race condition, vérifier lesquels ont effectivement été
        // supprimés : un compte qui redevient inéligible entre findMany et
        // deleteMany survivra au deleteMany, et on ne doit pas supprimer son
        // client Stripe. On interrogue donc quels IDs survivent encore, et on
        // retourne les stripeCustomerIds de ceux qui ont disparu.
        const survivors = await tx.user.findMany({
          where: {
            id: { in: usersToDelete.map((u) => u.id) },
          },
          select: {
            id: true,
          },
        });

        const survivorIds = new Set(survivors.map((u) => u.id));
        const deletedStripeCustomerIds = usersToDelete
          .filter((u) => !survivorIds.has(u.id))
          .map((u) => u.stripeCustomerId)
          .filter((id): id is string => id !== null);

        return {
          count: deleteResult.count,
          stripeCustomerIds: deletedStripeCustomerIds,
        };
      });

      return txResult;
    });

    // Supprimer les clients Stripe seulement si la liste est non vide.
    let stripeCustomersDeleted = 0;
    if (purgeResult.stripeCustomerIds.length > 0) {
      stripeCustomersDeleted = await step.run("delete-stripe-customers", async () => {
        const stripe = getStripe();
        let deleted = 0;

        for (const customerId of purgeResult.stripeCustomerIds) {
          try {
            await stripe.customers.del(customerId);
            deleted++;
          } catch (err) {
            // Typage strict : utiliser instanceof pour vérifier le type
            if (err instanceof Stripe.errors.StripeError) {
              // 404 ou resource_missing = client n'existe plus, c'est OK
              if (
                err.code === "resource_missing" ||
                err.statusCode === 404
              ) {
                deleted++;
                continue;
              }
            }
            // Toute autre erreur est relancée, Inngest réessaiera le step
            throw err;
          }
        }

        return deleted;
      });
    }

    return {
      purged: purgeResult.count,
      stripeCustomersDeleted,
    };
  },
);
