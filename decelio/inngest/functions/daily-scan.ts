import { inngest } from "../client";
import { db } from "@/lib/db";
import { activeSiteWhere, withinPlanQuota } from "@/lib/sites/active-sites";

/** Un événement porte 10 sites : 1 lancement + 10 steps = 1,1 exécution par site. */
const SCAN_BATCH_SIZE = 10;

export const dailyScanJob = inngest.createFunction(
  {
    id: "daily-scan-dispatcher",
    triggers: [{ cron: "0 3 * * *" }],
  },
  async ({ step }) => {

    // EF-024 : seuls les sites d'un compte payant et à jour sont scannés.
    // Voir lib/sites/active-sites.ts pour la règle exacte et le quota du plan.
    const eligibleSites = await step.run("fetch-eligible-sites", async () => {
      const sites = await db.monitoredSite.findMany({
        where: activeSiteWhere(),
        select: { id: true, userId: true, user: { select: { plan: true } } },
        orderBy: { createdAt: "asc" },
      });
      return sites.map((site) => ({
        id: site.id,
        userId: site.userId,
        userPlan: site.user.plan,
      }));
    });

    const sitesToScan = withinPlanQuota(eligibleSites);

    const batches: string[][] = [];
    for (let i = 0; i < sitesToScan.length; i += SCAN_BATCH_SIZE) {
      batches.push(sitesToScan.slice(i, i + SCAN_BATCH_SIZE).map((site) => site.id));
    }

    if (batches.length > 0) {
      await step.sendEvent(
        "dispatch-scan-batches",
        batches.map((siteIds) => ({
          name: "app/scan.site" as const,
          data: { siteIds },
        })),
      );
    }

    return {
      totalSites: sitesToScan.length,
      dispatched: sitesToScan.length,
      batches: batches.length,
    };
  }
);
