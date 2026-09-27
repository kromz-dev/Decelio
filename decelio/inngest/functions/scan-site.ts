import { inngest } from "../client";
import { db } from "@/lib/db";
import { runCoreScan, type SimpleStatus } from "@/lib/scanner/core";
import { DEFAULT_PROBE_BOTS, type BotAgent } from "../../lib/scanner/agents";
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
 *
 * Confirmation des régressions (constitution principe I : zéro faux
 * positif). Une dégradation détectée sur un site qui a déjà un historique
 * n'est pas alertée tout de suite : on attend `REGRESSION_CONFIRMATION_DELAY`
 * (attente durable `step.sleep`, survit à un redémarrage), puis on rescanne
 * une seule fois le même site pour confirmer. Un site tout juste ajouté
 * (aucun `ScanLog` antérieur) n'a rien à confirmer : son premier verdict
 * dégradé est signalé immédiatement, comme avant. Ce second passage double
 * le coût réseau, mais seulement pour les sites réellement dégradés — le lot
 * quotidien (`daily-scan.ts`) n'attend jamais : l'attente vit dans cette
 * fonction par site, pas dans le dispatcher.
 */
const SCAN_BATCH_SIZE = 10;

/** Attente durable avant de rescanner un site dont le verdict s'est dégradé. */
const REGRESSION_CONFIRMATION_DELAY = "10m";

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

type MonitoredSiteWithUser = NonNullable<
  Awaited<ReturnType<typeof db.monitoredSite.findUnique>>
> & { user: { email: string } };

interface ScanAndLogResult {
  newStatus: SimpleStatus;
  cause: string;
  /** Robot de recherche sondé qui porte le verdict, pour nommer l'assistant dans l'alerte. */
  decidingBot: BotAgent | undefined;
}

interface PendingConfirmation {
  siteId: string;
  oldStatus: string;
  newStatus: SimpleStatus;
  pendingConfirmation: true;
}

interface SettledOutcome {
  siteId: string;
  oldStatus: string;
  newStatus: string;
  pendingConfirmation: false;
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

/** Dégradation candidate au sens de l'alerte actuelle : un site lisible qui devient bloqué ou vide. */
function isRegressionCandidate(oldStatus: string, newStatus: SimpleStatus): boolean {
  return (
    (oldStatus === "ACTIVE" || oldStatus === "OK") &&
    (newStatus === "BLOQUÉ" || newStatus === "COQUILLE VIDE")
  );
}

async function fetchSite(siteId: string): Promise<MonitoredSiteWithUser> {
  const site = await db.monitoredSite.findUnique({
    where: { id: siteId },
    include: { user: true },
  });

  if (!site) {
    logFailure("scan.site_missing", { siteId });
    throw new NonRetriableError(`Site not found: ${siteId}`);
  }

  return site as MonitoredSiteWithUser;
}

/** Scanne le site, journalise une ligne ScanLog, et renvoie le verdict. Un seul scan réseau. */
async function scanAndLog(
  site: { id: string; url: string },
  previous: { simpleStatus: string | null; cause: string | null } | undefined,
): Promise<ScanAndLogResult> {
  const { report, results } = await runCoreScan(site.url, DEFAULT_PROBE_BOTS);

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

  // L'alerte nomme l'assistant seulement si le robot décisif est l'un des
  // robots de recherche sondés ; sinon elle reste générique.
  const decidingBot = DEFAULT_PROBE_BOTS.find((bot) => bot === deciding?.agent);

  return { newStatus, cause, decidingBot };
}

async function applyStatusChange(
  site: MonitoredSiteWithUser,
  oldStatus: string,
  newStatus: SimpleStatus,
  cause: string,
  sendAlert: boolean,
  decidingBot?: BotAgent,
): Promise<void> {
  await db.monitoredSite.update({
    where: { id: site.id },
    data: { status: newStatus },
  });

  if (sendAlert) {
    await sendRegressionAlert(site.user.email, site.url, oldStatus, newStatus, decidingBot);
  }
}

/**
 * Premier scan d'un site du lot. Si le verdict se dégrade et que le site a
 * déjà un historique, ne met rien à jour et ne rient : renvoie une
 * confirmation en attente pour laisser la fonction faire une attente durable
 * puis un second scan. Un site sans historique (premier scan de sa vie)
 * garde le comportement immédiat d'origine.
 */
async function runInitialScan(siteId: string): Promise<PendingConfirmation | SettledOutcome> {
  const site = await fetchSite(siteId);
  const history = await db.scanLog.findMany({
    where: { siteId: site.id },
    orderBy: { createdAt: "desc" },
    take: 1,
    select: { simpleStatus: true, cause: true },
  });

  const { newStatus, cause, decidingBot } = await scanAndLog(site, history[0]);
  const oldStatus = site.status;

  if (oldStatus === newStatus) {
    return { siteId: site.id, oldStatus, newStatus, pendingConfirmation: false };
  }

  const hasHistory = history.length > 0;
  const isCandidate = isRegressionCandidate(oldStatus, newStatus);

  if (hasHistory && isCandidate) {
    return { siteId: site.id, oldStatus, newStatus, pendingConfirmation: true };
  }

  await applyStatusChange(site, oldStatus, newStatus, cause, isCandidate, decidingBot);

  return { siteId: site.id, oldStatus, newStatus, pendingConfirmation: false };
}

/**
 * Second scan, après l'attente durable. Confirmé si le verdict reste au
 * moins aussi mauvais (même statut, ou pire, hors ERREUR qui reste ambigu —
 * EF-030). Sinon : pas d'alerte, statut inchangé, événement journalisé.
 */
async function runConfirmationScan(
  siteId: string,
  pending: PendingConfirmation,
): Promise<SettledOutcome> {
  const site = await fetchSite(siteId);
  const history = await db.scanLog.findMany({
    where: { siteId: site.id },
    orderBy: { createdAt: "desc" },
    take: 1,
    select: { simpleStatus: true, cause: true },
  });

  const { newStatus, cause, decidingBot } = await scanAndLog(site, history[0]);
  const confirmed =
    newStatus !== "ERREUR" && STATUS_RANK[newStatus] >= STATUS_RANK[pending.newStatus];

  if (!confirmed) {
    logFailure("scan.regression_not_confirmed", {
      siteId: site.id,
      firstStatus: pending.newStatus,
      secondStatus: newStatus,
    });
    return { siteId: site.id, oldStatus: pending.oldStatus, newStatus, pendingConfirmation: false };
  }

  await applyStatusChange(site, pending.oldStatus, newStatus, cause, true, decidingBot);

  return { siteId: site.id, oldStatus: pending.oldStatus, newStatus, pendingConfirmation: false };
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
      const initial = await step.run(`scan-${siteId}`, () => runInitialScan(siteId));

      if (!initial.pendingConfirmation) {
        scanned.push({ siteId: initial.siteId, oldStatus: initial.oldStatus, newStatus: initial.newStatus });
        continue;
      }

      // Attente durable : survit à un redémarrage du worker, ne bloque pas
      // le lot quotidien (les autres sites du `for` ne dépendent pas d'elle).
      await step.sleep(`wait-regression-confirmation-${siteId}`, REGRESSION_CONFIRMATION_DELAY);

      const confirmation = await step.run(`confirm-regression-${siteId}`, () =>
        runConfirmationScan(siteId, initial),
      );

      scanned.push({
        siteId: confirmation.siteId,
        oldStatus: confirmation.oldStatus,
        newStatus: confirmation.newStatus,
      });
    }

    return { scanned };
  },
);
