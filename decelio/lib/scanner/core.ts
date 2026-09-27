import { crawlUrl, CrawlResult } from "./crawler";
import {
  AccessCheck,
  ScannerStatus,
  AccessRisk,
  analyzeJsDependency,
  BotIndexing,
  classifyAccess,
  DirectiveSource,
  indexingForBot,
  JsDependencyCheck,
  parseIndexingDirectives,
} from "./analyzer";
import { ALL_BOTS, BOTS, BotAgent, decelioUserAgent, DEFAULT_PROBE_BOTS } from "./agents";
import { fetchRobotsReport, RobotsReport } from "./robots";
import { getDefaultRenderer, Renderer } from "./renderer";
import { detectPlatform, PlatformDetection } from "./platform";

/**
 * Sonde secondaire : même requête, User-Agent d'un robot IA. Nous ne sommes
 * pas ce robot et un site sérieux le vérifie par IP ; un refus ici ne prouve
 * donc pas que le vrai robot est refusé, d'où le libellé.
 */
export interface UnverifiedProbe {
  claimedBot: BotAgent;
  label: string;
  risk: AccessRisk;
  httpStatus: number;
  /** Le site ne répond pas pareil qu'à la requête honnête. */
  differsFromBaseline: boolean;
  /**
   * Vrai si la sonde a reçu un 429 qu'on n'a pas pu confirmer par une
   * deuxième tentative espacée (budget de temps insuffisant). Un 429 isolé,
   * reçu pendant la rafale de requêtes vers le même hôte, n'est pas la
   * preuve d'un blocage — un hébergeur mutualisé qui limite le débit peut
   * répondre 429 à Decelio sans jamais viser le vrai robot (voir
   * `runHostSpaced` et `probeUnverified`). Quand ce champ est vrai, les
   * consommateurs (`summarizeForBot`, `verdictForBot`) ne doivent jamais en
   * tirer un verdict BLOQUÉ tranché.
   */
  rateLimitUnconfirmed: boolean;
}

export interface AccessReport extends AccessCheck {
  userAgent: string;
  unverifiedProbes: UnverifiedProbe[];
}

export interface IndexingReport {
  sources: DirectiveSource[];
  perBot: BotIndexing[];
}

export interface JsDependencyReport extends JsDependencyCheck {
  renderer: string;
}

/**
 * Trois résultats indépendants (plus les directives d'indexation) : on ne les
 * fusionne pas, parce qu'ils appellent des corrections différentes.
 */
export interface ScanReport {
  url: string;
  finalUrl: string;
  scannedAt: string;
  robots: RobotsReport;
  access: AccessReport;
  jsDependency: JsDependencyReport;
  indexing: IndexingReport;
  /**
   * Détection de plateforme (CMS, extension SEO, pare-feu, hébergeur) à partir
   * des seules données déjà récupérées ci-dessus — aucune requête réseau
   * supplémentaire. Absent quand la page honnête n'a pas pu être lue.
   */
  platform?: PlatformDetection;
}

export interface ScanOptions {
  /** Robots sondés en User-Agent usurpé (signal secondaire). */
  probeBots?: BotAgent[];
  /** Robots dont on rapporte la politique robots.txt et l'indexation. */
  reportBots?: BotAgent[];
  renderer?: Renderer;
}

// ---------------------------------------------------------------------------
// Espacement des requêtes vers le même hôte
// ---------------------------------------------------------------------------

/**
 * `runScan` envoyait jusque-là la requête robots.txt et jusqu'à 3 sondes en
 * même temps, vers le même hôte que la requête honnête. Un hébergeur
 * mutualisé qui limite le débit peut renvoyer 429 à Decelio (pas au vrai
 * robot) dans cette rafale, et provoquer un faux « BLOQUÉ ». On borne donc
 * la concurrence vers un même hôte et on espace les lots d'une petite pause.
 */
const HOST_REQUEST_CONCURRENCY = 2;
/** Pause documentée entre deux lots de requêtes vers le même hôte. */
export const HOST_REQUEST_SPACING_MS = 300;
/**
 * Budget interne, sous le budget externe de 20 s de la route (ENF-004,
 * `app/api/scan/route.ts`) : marge pour la sérialisation JSON et le trajet
 * retour. Sert uniquement à décider si une pause d'espacement ou une
 * nouvelle tentative sur 429 tiennent encore dans le temps imparti — jamais
 * à interrompre le scan lui-même (la route s'en charge déjà).
 */
const SCAN_SOFT_BUDGET_MS = 15_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exécute `tasks` avec une concurrence bornée (`HOST_REQUEST_CONCURRENCY`)
 * et une pause (`HOST_REQUEST_SPACING_MS`) entre deux lots, tant que le
 * budget (`deadline`) le permet. Préserve l'ordre des résultats.
 */
async function runHostSpaced<T>(tasks: Array<() => Promise<T>>, deadline: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  for (let i = 0; i < tasks.length; i += HOST_REQUEST_CONCURRENCY) {
    const batch = tasks.slice(i, i + HOST_REQUEST_CONCURRENCY);
    const batchResults = await Promise.all(batch.map((task) => task()));
    batchResults.forEach((value, j) => {
      results[i + j] = value;
    });
    const hasMoreBatches = i + HOST_REQUEST_CONCURRENCY < tasks.length;
    if (hasMoreBatches && Date.now() + HOST_REQUEST_SPACING_MS < deadline) {
      await sleep(HOST_REQUEST_SPACING_MS);
    }
  }
  return results;
}

/**
 * Sonde en User-Agent usurpé, avec une nouvelle tentative espacée en cas de
 * 429 : un 429 isolé pendant la rafale de requêtes vers le même hôte n'est
 * pas la preuve d'un blocage (règle 3). Si le budget ne permet plus de
 * réessayer, le 429 reste `rateLimitUnconfirmed`, pour que les consommateurs
 * n'en tirent jamais un verdict tranché. Si la deuxième tentative renvoie de
 * nouveau 429, le signal est traité comme confirmé (comportement documenté :
 * pas de troisième essai, pour rester dans le budget).
 */
async function probeUnverified(url: string, bot: BotAgent, baseline: AccessCheck, deadline: number): Promise<UnverifiedProbe> {
  const userAgent = BOTS[bot].userAgent!;
  let raw: CrawlResult = await crawlUrl(url, { userAgent });
  let rateLimitUnconfirmed = false;

  if (raw.status === 429) {
    if (Date.now() + HOST_REQUEST_SPACING_MS < deadline) {
      await sleep(HOST_REQUEST_SPACING_MS);
      raw = await crawlUrl(url, { userAgent });
    } else {
      rateLimitUnconfirmed = true;
    }
  }

  const probe = classifyAccess(raw);
  return {
    claimedBot: bot,
    label: `unverified requester claiming to be ${bot}`,
    risk: probe.risk,
    httpStatus: probe.httpStatus,
    differsFromBaseline: probe.risk !== baseline.risk || probe.httpStatus !== baseline.httpStatus,
    rateLimitUnconfirmed,
  };
}

type HostTaskResult =
  | { kind: "robots"; value: RobotsReport }
  | { kind: "probe"; value: UnverifiedProbe };

export async function runScan(url: string, options: ScanOptions = {}): Promise<ScanReport> {
  const scanStart = Date.now();
  const deadline = scanStart + SCAN_SOFT_BUDGET_MS;
  const userAgent = decelioUserAgent();
  const reportBots = options.reportBots ?? ALL_BOTS;
  const renderer = options.renderer ?? getDefaultRenderer();

  // 1. Requête honnête : c'est la référence de tout le reste.
  const page = await crawlUrl(url, { userAgent });
  const access = classifyAccess(page);
  // robots.txt s'applique à l'origine qui sert réellement le contenu.
  const contentUrl = page.status !== 0 ? page.finalUrl : url;

  // 2. robots.txt et sondes : même hôte, donc espacés (voir `runHostSpaced`).
  // Le rendu JS n'y est pas mêlé : le moteur par défaut n'effectue aucune
  // requête réseau (`noopRenderer`) et une implémentation réelle gère son
  // propre budget (voir `renderer.ts`).
  const probeBots = (options.probeBots ?? []).filter((bot) => BOTS[bot].userAgent !== null);
  const hostTasks: Array<() => Promise<HostTaskResult>> = [
    async () => ({ kind: "robots", value: await fetchRobotsReport(contentUrl, reportBots, userAgent) }),
    ...probeBots.map(
      (bot) =>
        async (): Promise<HostTaskResult> => ({ kind: "probe", value: await probeUnverified(url, bot, access, deadline) }),
    ),
  ];

  const [renderedHtml, hostResults] = await Promise.all([
    access.risk === "ok" ? renderer.render(page.finalUrl).catch(() => null) : Promise.resolve(null),
    runHostSpaced(hostTasks, deadline),
  ]);

  const robots = hostResults.find((r): r is Extract<HostTaskResult, { kind: "robots" }> => r.kind === "robots")!.value;
  const unverifiedProbes = hostResults
    .filter((r): r is Extract<HostTaskResult, { kind: "probe" }> => r.kind === "probe")
    .map((r) => r.value);

  const directives = parseIndexingDirectives(page);
  const js = access.risk === "ok"
    ? analyzeJsDependency(page.html, renderedHtml)
    : analyzeJsDependency("", null);
  const platform = page.status !== 0 ? detectPlatform({ headers: page.headers, html: page.html }) : undefined;

  return {
    url,
    finalUrl: page.finalUrl,
    scannedAt: new Date().toISOString(),
    robots,
    access: { ...access, userAgent, unverifiedProbes },
    jsDependency: { ...js, renderer: renderer.name },
    indexing: {
      sources: directives.sources,
      perBot: reportBots.map((bot) => indexingForBot(directives, bot)),
    },
    platform,
  };
}

// ---------------------------------------------------------------------------
// Résumé par robot (pastille UI, statut du site surveillé, alertes)
// ---------------------------------------------------------------------------

/**
 * « À VÉRIFIER » : le site refuse la requête honnête elle-même (bloqué ou
 * challengé), sans aucune preuve que ce robot précis soit visé — ni règle
 * robots.txt qui le nomme, ni sonde qui diffère de la référence. Voir
 * `summarizeForBot`. Ne déclenche jamais d'alerte de régression (constitution,
 * principe I : en cas de doute, on écrit « à vérifier », jamais un verdict
 * tranché).
 */
export type SimpleStatus = "OK" | "À VÉRIFIER" | "BLOQUÉ" | "COQUILLE VIDE" | "ERREUR";

export interface ScanCoreResult {
  agent: BotAgent;
  simpleStatus: SimpleStatus;
  /** Pourquoi ce statut, dans l'ordre de gravité. */
  reasons: string[];
  httpStatus: number;
  durationMs: number;
  wordCount: number;
}

/** Pastille équivalente au statut combiné de `analyzeResponse` (/api/audit). */
export function mapStatusToSimple(status: ScannerStatus): SimpleStatus {
  switch (status) {
    case "ACCESSIBLE":
      return "OK";
    case "LOW_TEXT":
      // Page courte sans indice de rendu côté client : jamais un verdict tranché.
      return "À VÉRIFIER";
    case "BLOCKED_403":
    case "BLOCKED_CAPTCHA":
      return "BLOQUÉ";
    case "EMPTY_JS_REQUIRED":
      return "COQUILLE VIDE";
    default:
      return "ERREUR";
  }
}

export function summarizeForBot(report: ScanReport, bot: BotAgent): ScanCoreResult {
  const reasons: string[] = [];
  const { access, robots, jsDependency, indexing } = report;
  const policy = robots.policies.find((p) => p.bot === bot);
  const probe = access.unverifiedProbes.find((p) => p.claimedBot === bot);

  let simpleStatus: SimpleStatus = "OK";

  // robots.txt réellement lu (fetchStatus "ok") qui nomme ce robot est une
  // preuve indépendante de la requête honnête : elle prime sur tout le reste
  // (règle 2). Un simple défaut de lecture de robots.txt (unreachable /
  // challenged) donne aussi verdict:"disallowed" par précaution côté
  // `buildRobotsReport`, mais ce n'est pas un ciblage nommé — traité plus bas.
  const robotsNamesThisBot = robots.fetchStatus === "ok" && policy?.verdict === "disallowed";
  const robotsUnreadablePrecaution = robots.fetchStatus !== "ok" && policy?.verdict === "disallowed";

  if (robotsNamesThisBot) {
    simpleStatus = "BLOQUÉ";
    reasons.push(`robots.txt disallows ${policy!.token}`);
  } else if (access.risk === "unreachable" || access.risk === "http_error") {
    // Priorité à ERREUR : si la requête honnête elle-même n'a pas de réponse,
    // c'est ce qu'il faut signaler, pas une précaution sur robots.txt.
    simpleStatus = "ERREUR";
    reasons.push(access.risk === "unreachable" ? `unreachable: ${access.error ?? "no response"}` : `http ${access.httpStatus}`);
  } else if (access.risk === "challenged" || access.risk === "blocked") {
    // Blocage général (règle 1) : la requête honnête elle-même est refusée ou
    // challengée. Rien ne prouve que ce robot précis soit visé (un robots.txt
    // illisible à cause du même blocage n'est pas un ciblage nommé), donc pas
    // de BLOQUÉ — un statut « à vérifier », jamais un verdict tranché.
    simpleStatus = "À VÉRIFIER";
    reasons.push(`general block (status:${access.httpStatus}) — no bot-specific evidence`);
  } else if (robotsUnreadablePrecaution) {
    // La page se charge normalement, mais robots.txt lui-même est
    // injoignable ou challengé : par précaution, on refuse.
    simpleStatus = "BLOQUÉ";
    reasons.push("robots.txt unreachable (full disallow)");
  } else if (probe && probe.differsFromBaseline && probe.rateLimitUnconfirmed) {
    // 429 isolé, reçu pendant la rafale de requêtes vers le même hôte, sans
    // confirmation possible par une nouvelle tentative (budget insuffisant) :
    // ce n'est pas la preuve d'un blocage (fix/scanner-sans-auto-429).
    simpleStatus = "À VÉRIFIER";
    reasons.push(`unverified probe rate-limited (status:${probe.httpStatus}), not confirmed by retry`);
  } else if (probe && probe.differsFromBaseline && (probe.risk === "blocked" || probe.risk === "challenged")) {
    // La requête honnête passe, mais la sonde qui se présente comme ce robot
    // est bloquée (règle 3) : un indice à forte valeur, jamais une preuve
    // (le site peut vérifier ce robot par IP), d'où le libellé « indice ».
    simpleStatus = "BLOQUÉ";
    reasons.push(`unverified probe blocked (status:${probe.httpStatus}) while honest request ok`);
  }

  if (simpleStatus === "OK" && (jsDependency.verdict === "js_dependent" || jsDependency.verdict === "likely_js_dependent")) {
    simpleStatus = "COQUILLE VIDE";
    reasons.push(`${jsDependency.verdict}: ${jsDependency.rawWordCount} words in raw HTML`);
  } else if (simpleStatus === "OK" && jsDependency.verdict === "low_text") {
    // Texte court sans aucun indice de rendu côté client : ni preuve de
    // dépendance JS, ni certitude que le peu de texte est délibéré. « À
    // vérifier », jamais « COQUILLE VIDE » (constitution, principe I).
    simpleStatus = "À VÉRIFIER";
    reasons.push(`low_text: ${jsDependency.rawWordCount} words in raw HTML, no JS-rendering signal`);
  }
  if (indexing.perBot.find((i) => i.bot === bot)?.noindex) reasons.push("noindex");

  return {
    agent: bot,
    simpleStatus,
    reasons,
    httpStatus: access.httpStatus,
    durationMs: access.durationMs,
    wordCount: jsDependency.rawWordCount,
  };
}

export interface CoreScanOutput {
  report: ScanReport;
  results: ScanCoreResult[];
}

/**
 * Scan complet et résumé pour les robots demandés. Les robots qui ont un
 * User-Agent public sont aussi sondés en requérant non vérifié.
 */
export async function runCoreScan(
  url: string,
  bots: BotAgent[] = DEFAULT_PROBE_BOTS,
  options: Omit<ScanOptions, "probeBots"> = {},
): Promise<CoreScanOutput> {
  const report = await runScan(url, { ...options, probeBots: bots });
  return { report, results: bots.map((bot) => summarizeForBot(report, bot)) };
}
