import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { maxSitesFor } from "@/lib/billing/plans";
import { createCustomerPortalSession } from "@/lib/billing/actions";
import { Button } from "@/components/ui/button";
import { buildSubscriptionSummary } from "./subscription-summary";

/**
 * Section Abonnement des paramètres (EF-059).
 *
 * Server Component : lit la session et la base directement, sans passer par
 * une route API. Le compte de sites surveillés compte tous les statuts, pas
 * seulement `ACTIVE`, pour refléter le quota réellement consommé.
 */
export async function SubscriptionSection() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const [user, siteCount] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        plan: true,
        stripeCustomerId: true,
        stripeCurrentPeriodEnd: true,
        cancelledAt: true,
      },
    }),
    db.monitoredSite.count({ where: { userId } }),
  ]);

  if (!user) return null;

  const summary = buildSubscriptionSummary({
    plan: user.plan,
    siteCount,
    maxSites: maxSitesFor(user.plan),
    stripeCustomerId: user.stripeCustomerId,
    stripeCurrentPeriodEnd: user.stripeCurrentPeriodEnd,
    cancelledAt: user.cancelledAt,
  });

  return (
    <section id="abonnement" className="scroll-mt-8 border-b border-line pb-8">
      <h2 className="text-xl font-semibold text-ink">{summary.planName}</h2>

      <div className="mt-5 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
        <div className="bg-surface p-4.5 sm:p-5">
          <div className="type-caption font-medium text-ink-2">Quota</div>
          <div className="mt-1.5 text-xl font-semibold text-ink">{summary.quotaLabel}</div>
        </div>
        <div className="bg-surface p-4.5 sm:p-5">
          <div className="type-caption font-medium text-ink-2">Facturation</div>
          <div className="mt-1.5 text-xl font-semibold text-ink">
            {summary.billingLabel ?? "Aucun abonnement actif"}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        {summary.showPricingLink && (
          <Button size="lg" nativeButton={false} render={<Link href="/pricing" />}>
            Choisir une offre
          </Button>
        )}
        {summary.showManageButton && (
          <form action={createCustomerPortalSession}>
            <Button type="submit" size="lg" variant={summary.showPricingLink ? "outline" : "default"}>
              Gérer l&apos;abonnement
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
