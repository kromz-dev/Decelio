import { inngest } from "../client";
import { db } from "@/lib/db";
import { runCoreScan, type SimpleStatus } from "@/lib/scanner/core";
import { DEFAULT_PROBE_BOTS } from "../../lib/scanner/agents";
import { sendRegressionAlert } from "@/lib/alerting/sendAlert";
import { NonRetriableError } from "inngest";
import { SCAN_CONCURRENCY } from "../../lib/sites/scan-throughput";
import { logFailure } from "../../lib/log";

/**
 * Contrat stable pour le passage quotidien et pour T043 (premier scan).
 *
 * Événement `app/scan.site` :
 * - `siteIds` : au plus 10 identifiants, un lot du passage quotidien ;
 * - `siteId` : un seul site. Équivalent à `siteIds: [siteId]`.
 *   Un déclenchement unitaire (onboarding) doit continuer à envoyer `siteId`.
 *
 * Budget Inngest Hobby : 50 000 exécutions par mois, une par lancement
 * et une par step. Un lot de 10 sites = 1 lancement + 10 `step.run`
 * = 11 exécutions, soit 1,1 par site et par jour (≤ 1,2). Sur 30 jours :
 * 33 exécutions par site, donc 50 000 / 33 ≈ 1 515 sites. Le dispatcher
 * ajoute 1 cron, 1 step de lecture et 1 `step.sendEvent` pour tous les
 * lots. Aucun ping récurrent.
 */
const SCAN_BATCH_SIZE = 10;

const STATUS_RANK: Record<SimpleStatus, number> = {
  OK: 0,
  // Blocage général sans preuve qu'il vise ce robot (voir core.ts) : plus
  // grave qu'OK, mais jamais un verdict tranché, donc en dessous de BLOQUÉ.
  "À VÉRIFIER": 1,
  "COQUILLE VIDE": 2,
  "BLOQUÉ": 3,
  ERREUR: 4,
};

interface ScanEventData {
  siteId?: string;
  siteIds?: string[];
}

export function causeForBot(agent: string, reasons: string[]): string {
  const reason = reasons[0];
  if (!reason) return `${agent} : aucune restriction détectée`;
  const french = reason
    .replace(/^robots\.txt disallows /, "robots.txt interdit ")
    .replace(/^unreachable: .*/, "site injoignable")
    .replace(/^http (\d+)$/, "réponse HTTP $1")
    .replace(/^access challenged.*/, "page de challenge")
    .replace(/^access blocked.*/, "accès bloqué")
    .replace(
      /^general block \(status:(\d+)\).*/,
      "le site bloque tout (HTTP $1), sans rien qui vise spécifiquement ce robot : à vérifier",
    )
    .replace(
      /^unverified probe blocked \(status:(\d+)\).*/,
      "une requête non vérifiée se présentant comme ce robot a été bloquée (HTTP $1) alors que notre visite passe : un indice, pas une preuve",
    )
    .replace(/^js_dependent: .*/, "la page dépend de JavaScript")
    .replace(/^likely_js_dependent: .*/, "la page dépend probablement de JavaScript")
    .replace(/^noindex$/, "balise noindex");
  return `${agent} : ${french}`;
}

function siteIdsFrom(data: ScanEventData): string[] {
  const ids = data.siteIds?.length ? data.siteIds : data.siteId ? [data.siteId] : [];
  return ids.slice(0, SCAN_BATCH_SIZE);
}

function worstStatus(statuses: SimpleStatus[]): SimpleStatus {
  return statuses.reduce(
    (worst, status) => (STATUS_RANK[status] > STATUS_RANK[worst] ? status : worst),
    "OK",
  );
}

export const scanSiteJob = inngest.createFunction(
  {
    id: "scan-single-site",
    concurrency: {
      // 10 fonctions × 10 sites × 20 s = 1 000 sites en 0,56 h (ENF-005).
      limit: SCAN_CONCURRENCY,
    },
    triggers: [{ event: "app/scan.site" }],
  },
  async ({ event, step }) => {
    const siteIds = siteIdsFrom(event.data as ScanEventData);
    if (siteIds.length === 0) {
      throw new NonRetriableError("Aucun site à scanner");
    }

    const scanned: { siteId: string; oldStatus: string; newStatus: string }[] = [];

    for (const siteId of siteIds) {
      const outcome = await step.run(`scan-${siteId}`, async () => {
        const site = await db.monitoredSite.findUnique({
          where: { id: siteId },
          include: { user: true },
        });

        if (!site) {
          logFailure("scan.site_missing", { siteId });
          throw new NonRetriableError(`Site not found: ${siteId}`);
        }

        const { report, results } = await runCoreScan(site.url, DEFAULT_PROBE_BOTS);
        const history = await db.scanLog.findMany({
          where: { siteId: site.id },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { simpleStatus: true, cause: true },
        });

        // Une ligne par scan : T032a retient le dernier ScanLog du jour.
        // simpleStatus est toujours une valeur de SimpleStatus (core.ts).
        const newStatus = results.length > 0
          ? worstStatus(results.map((result) => result.simpleStatus))
          : "ERREUR";
        const perBot = results.map((result) => ({
          agent: result.agent,
          simpleStatus: result.simpleStatus,
          httpStatus: result.httpStatus,
          reasons: result.reasons ?? [],
          cause: causeForBot(result.agent, result.reasons ?? []),
        }));
        const cause = perBot
          .filter((result) => result.simpleStatus === newStatus)
          .map((result) => result.cause)
          .join(" ; ");
        const previous = history[0];
        const changed =
          !previous ||
          previous.simpleStatus !== newStatus ||
          previous.cause !== cause;
        const deciding = perBot.find((result) => result.simpleStatus === newStatus);

        await db.scanLog.create({
          data: {
            siteId: site.id,
            httpStatus: deciding?.httpStatus ?? 0,
            simpleStatus: newStatus,
            cause,
            // Neon Free : 0,5 Go. Le JSON n'est réécrit que si le verdict
            // du site change. simpleStatus et cause sont toujours remplis.
            payload: changed
              ? JSON.stringify({ results: perBot, report })
              : null,
          },
        });

        const oldStatus = site.status;

        if (oldStatus !== newStatus) {
          await db.monitoredSite.update({
            where: { id: site.id },
            data: { status: newStatus },
          });

          const isRegression =
            (oldStatus === "ACTIVE" || oldStatus === "OK") &&
            (newStatus === "BLOQUÉ" || newStatus === "COQUILLE VIDE");

          if (isRegression) {
            await sendRegressionAlert(site.user.email, site.url, oldStatus, newStatus);
          }
        }

        return { siteId: site.id, oldStatus, newStatus };
      });

      scanned.push(outcome);
    }

    return { scanned };
  },
);
