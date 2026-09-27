import { crawlUrl } from "./crawler";
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

export async function runScan(url: string, options: ScanOptions = {}): Promise<ScanReport> {
  const userAgent = decelioUserAgent();
  const reportBots = options.reportBots ?? ALL_BOTS;
  const renderer = options.renderer ?? getDefaultRenderer();

  // 1. Requête honnête : c'est la référence de tout le reste.
  const page = await crawlUrl(url, { userAgent });
  const access = classifyAccess(page);
  // robots.txt s'applique à l'origine qui sert réellement le contenu.
  const contentUrl = page.status !== 0 ? page.finalUrl : url;

  // 2. robots.txt, rendu et sondes en parallèle.
  const probeBots = (options.probeBots ?? []).filter((bot) => BOTS[bot].userAgent !== null);
  const [robots, renderedHtml, unverifiedProbes] = await Promise.all([
    fetchRobotsReport(contentUrl, reportBots, userAgent),
    access.risk === "ok" ? renderer.render(page.finalUrl).catch(() => null) : Promise.resolve(null),
    Promise.all(
      probeBots.map(async (bot): Promise<UnverifiedProbe> => {
        const probe = classifyAccess(await crawlUrl(url, { userAgent: BOTS[bot].userAgent! }));
        return {
          claimedBot: bot,
          label: `unverified requester claiming to be ${bot}`,
          risk: probe.risk,
          httpStatus: probe.httpStatus,
          differsFromBaseline: probe.risk !== access.risk || probe.httpStatus !== access.httpStatus,
        };
      }),
    ),
  ]);

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

export type SimpleStatus = "OK" | "BLOQUÉ" | "COQUILLE VIDE" | "ERREUR";

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

  let simpleStatus: SimpleStatus = "OK";
  if (access.risk === "unreachable" || access.risk === "http_error") {
    simpleStatus = "ERREUR";
    reasons.push(access.risk === "unreachable" ? `unreachable: ${access.error ?? "no response"}` : `http ${access.httpStatus}`);
  } else {
    if (policy?.verdict === "disallowed") {
      simpleStatus = "BLOQUÉ";
      reasons.push(robots.fetchStatus === "unreachable" ? "robots.txt unreachable (full disallow)" : `robots.txt disallows ${policy.token}`);
    }
    if (access.risk === "challenged" || access.risk === "blocked") {
      simpleStatus = "BLOQUÉ";
      reasons.push(`access ${access.risk} (${access.signals.join(", ")})`);
    }
    if (simpleStatus === "OK" && (jsDependency.verdict === "js_dependent" || jsDependency.verdict === "likely_js_dependent")) {
      simpleStatus = "COQUILLE VIDE";
      reasons.push(`${jsDependency.verdict}: ${jsDependency.rawWordCount} words in raw HTML`);
    }
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
