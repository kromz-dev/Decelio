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
