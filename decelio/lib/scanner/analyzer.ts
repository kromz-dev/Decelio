import { BOTS, BotAgent } from "./agents";
import type { CrawlResult } from "./crawler";

// ---------------------------------------------------------------------------
// Texte visible
// ---------------------------------------------------------------------------

/**
 * Nettoie le HTML pour ne garder que le texte visible.
 * Fonction pure et basique pour éviter de charger de grosses dépendances comme JSDOM ou Cheerio.
 */
export function extractVisibleText(html: string): string {
  if (!html) return "";

  // Extraire uniquement le contenu du body s'il existe
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let content = bodyMatch ? bodyMatch[1] : html;

  // Supprimer les balises script et style et leur contenu
  content = content.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ");
  content = content.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ");
  content = content.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ");
  content = content.replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, " ");

  // Remplacer toutes les autres balises par un espace
  content = content.replace(/<[^>]+>/g, " ");

  // Décoder les entités basiques
  content = content.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

  // Normaliser les espaces
  return content.replace(/\s+/g, " ").trim();
}

export function countWords(text: string): number {
  // Comptage sans allocation de gros tableaux
  let wordCount = 0;
  for (const _ of text.matchAll(/\S{2,}/g)) wordCount++;
  return wordCount;
}

/**
 * Détecte les signatures classiques des SPAs non pré-rendues.
 */
export function detectSpaRoot(html: string): boolean {
  if (!html) return false;
  // Détecte <div id="root">, <div id="app">, <div id="__next">, etc. sans contenu ou très peu.
  return /<div[^>]+id=["'](root|app|__next|__nuxt|svelte)["'][^>]*>\s*(<!--[\s\S]*?-->\s*)*<\/div>/i.test(html);
}

// ---------------------------------------------------------------------------
// Défis anti-bot
// ---------------------------------------------------------------------------

export interface ChallengeDetection {
  /** Un défi (JS, CAPTCHA, Turnstile) a répondu à la place du contenu. */
  challenged: boolean;
  /** Refus sans défi identifiable (403, 401, 429, 503). */
  blocked: boolean;
  signals: string[];
}

const CHALLENGE_MARKUP: Array<[RegExp, string]> = [
  [/<title>\s*Just a moment\.\.\.\s*<\/title>/i, "markup:just-a-moment"],
  [/challenges\.cloudflare\.com\/turnstile/i, "markup:turnstile"],
  [/class=["'][^"']*\bcf-turnstile\b/i, "markup:turnstile"],
  [/\/cdn-cgi\/challenge-platform\//i, "markup:cf-challenge-platform"],
  [/window\._cf_chl_opt\b/i, "markup:cf-challenge-platform"],
  [/<title>\s*Attention Required! \| Cloudflare\s*<\/title>/i, "markup:cf-attention-required"],
  [/captcha-delivery\.com/i, "markup:datadome"],
  [/id=["']px-captcha["']/i, "markup:perimeterx"],
  // Akamai Bot Manager : la page de refus par défaut associe toujours
  // « Access Denied » à un identifiant « Reference #», servie par le Ghost
  // d'Akamai. Combiner les deux évite de confondre cette page avec une
  // page d'erreur ordinaire qui contiendrait l'une des deux phrases seule.
  // Sources : https://www.aethyn.io/blog/what-is-akamai-reference-18-access-denied
  // et https://github.com/AynOps/AynOps/issues/194 (retour d'expérience sur
  // le faux positif « Server: AkamaiGHost » seul, voir plus bas).
  [/access denied[\s\S]{0,300}reference #/i, "markup:akamai-access-denied"],
];

// Signaux Akamai écartés (documentés pour ne pas être ajoutés par erreur) :
// - Les cookies `_abck` / `ak_bmsc` (posés dans `set-cookie`) prouvent
//   seulement que Bot Manager est déployé devant le site, pas que la requête
//   a été bloquée : ils apparaissent aussi sur des réponses 200 normales.
//   Source : https://scrapfly.io/blog/posts/akamai-bot-manager-understanding-abck-cookies-and-sensor-data
//   (« The _abck is the Bot Manager verdict cookie... its presence indicates
//   Bot Manager is deployed, not that the client passed »).
// - L'en-tête `Server: AkamaiGHost` seul n'est pas un signal fiable non plus :
//   il identifie l'infrastructure Akamai et apparaît sur toutes les réponses
//   d'un site derrière Akamai, y compris les réponses normales.
//   Source : https://github.com/AynOps/AynOps/issues/194 et le correctif
//   https://github.com/AynOps/AynOps/pull/196 (exiger le fingerprint du
//   corps de la page, pas seulement l'en-tête serveur + un statut ≥ 400).

const BLOCKING_STATUSES = new Set([401, 403, 429, 503]);

export function detectChallenge(result: Pick<CrawlResult, "status" | "headers" | "html">): ChallengeDetection {
  const signals: string[] = [];

  if ((result.headers["cf-mitigated"] || "").toLowerCase().includes("challenge")) {
    signals.push("header:cf-mitigated=challenge");
  }
  // Le balisage n'est cherché que dans le début du document : une page qui
  // parle de Cloudflare dans son contenu ne doit pas passer pour un défi.
  const head = result.html.slice(0, 64 * 1024);
  for (const [re, signal] of CHALLENGE_MARKUP) {
    if (re.test(head) && !signals.includes(signal)) signals.push(signal);
  }
  const challenged = signals.length > 0;

  if (BLOCKING_STATUSES.has(result.status)) signals.push(`status:${result.status}`);

  return {
    challenged,
    blocked: !challenged && BLOCKING_STATUSES.has(result.status),
    signals,
  };
}

// ---------------------------------------------------------------------------
// Accès
// ---------------------------------------------------------------------------

/**
 * - ok          : 2xx sans défi ;
 * - challenged  : un défi a répondu (Cloudflare, Turnstile, DataDome...) ;
 * - blocked     : refus explicite (401, 403, 429, 503) ;
 * - http_error  : autre code d'erreur (404, 500...) ;
 * - unreachable : pas de réponse (DNS, délai, SSRF, trop de redirections).
 */
export type AccessRisk = "ok" | "challenged" | "blocked" | "http_error" | "unreachable";

export interface AccessCheck {
  risk: AccessRisk;
  httpStatus: number;
  finalUrl: string;
  redirects: CrawlResult["redirects"];
  signals: string[];
  error?: string;
  durationMs: number;
}

export function classifyAccess(result: CrawlResult): AccessCheck {
  const base = {
    httpStatus: result.status,
    finalUrl: result.finalUrl,
    redirects: result.redirects,
    durationMs: result.durationMs,
  };
  if (result.status === 0) {
    return { ...base, risk: "unreachable", signals: [], error: result.error };
  }
  const challenge = detectChallenge(result);
  let risk: AccessRisk;
  if (challenge.challenged) risk = "challenged";
  else if (challenge.blocked) risk = "blocked";
  else if (result.status >= 400) risk = "http_error";
  else risk = "ok";
  return { ...base, risk, signals: challenge.signals };
}

// ---------------------------------------------------------------------------
// Meta robots et X-Robots-Tag
// ---------------------------------------------------------------------------

export interface DirectiveSource {
  source: "meta" | "header";
  /** « * » pour une directive générique, sinon le jeton visé (« googlebot », « gptbot »). */
  target: string;
  directives: string[];
}

export interface IndexingDirectives {
  sources: DirectiveSource[];
}

/** Directives qui acceptent une valeur après « : » (pas des noms de robots). */
const VALUED_DIRECTIVES = new Set(["max-snippet", "max-image-preview", "max-video-preview", "unavailable_after"]);

function readAttribute(tag: string, name: string): string | null {
  const re = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i");
  const m = tag.match(re);
  return m ? (m[1] ?? m[2] ?? m[3] ?? "") : null;
}

function splitDirectives(value: string): string[] {
  return value
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

export function parseMetaRobots(html: string): DirectiveSource[] {
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const scope = headMatch ? headMatch[1] : html.slice(0, 64 * 1024);
  const out: DirectiveSource[] = [];
  for (const [tag] of scope.matchAll(/<meta\b[^>]*>/gi)) {
    const name = readAttribute(tag, "name")?.trim().toLowerCase();
    const content = readAttribute(tag, "content");
    if (!name || content === null) continue;
    // « robots » vise tout le monde ; un nom de robot (googlebot, gptbot...) vise ce robot.
    if (name === "robots" || name.includes("bot") || isKnownToken(name)) {
      out.push({ source: "meta", target: name === "robots" ? "*" : name, directives: splitDirectives(content) });
    }
  }
  return out;
}

function isKnownToken(name: string): boolean {
  return Object.values(BOTS).some((b) => b.robotsToken.toLowerCase() === name);
}

/**
 * X-Robots-Tag : « noindex », « googlebot: noindex, nofollow », ou plusieurs
 * en-têtes que fetch concatène avec « , ». Un préfixe « robot: » s'applique
 * aux directives suivantes jusqu'au prochain préfixe.
 */
export function parseXRobotsTag(header: string | undefined): DirectiveSource[] {
  if (!header) return [];
  const byTarget = new Map<string, string[]>();
  let target = "*";
  for (const rawPart of header.split(",")) {
    let part = rawPart.trim();
    if (!part) continue;
    const colon = part.indexOf(":");
    if (colon !== -1) {
      const prefix = part.slice(0, colon).trim().toLowerCase();
      if (!VALUED_DIRECTIVES.has(prefix)) {
        target = prefix;
        part = part.slice(colon + 1).trim();
        if (!part) continue;
      }
    }
    const list = byTarget.get(target) ?? [];
    list.push(part.toLowerCase());
    byTarget.set(target, list);
  }
  return [...byTarget].map(([t, directives]) => ({ source: "header", target: t, directives }));
}

export function parseIndexingDirectives(result: Pick<CrawlResult, "headers" | "html">): IndexingDirectives {
  return {
    sources: [...parseXRobotsTag(result.headers["x-robots-tag"]), ...parseMetaRobots(result.html)],
  };
}

export interface BotIndexing {
  bot: BotAgent;
  noindex: boolean;
  nofollow: boolean;
}

/** Directives applicables à un robot : génériques + celles qui le nomment. */
export function indexingForBot(directives: IndexingDirectives, bot: BotAgent): BotIndexing {
  const token = BOTS[bot].robotsToken.toLowerCase();
  const applicable = directives.sources
    .filter((s) => s.target === "*" || s.target === token)
    .flatMap((s) => s.directives);
  const none = applicable.includes("none");
  return {
    bot,
    noindex: none || applicable.includes("noindex"),
    nofollow: none || applicable.includes("nofollow"),
  };
}

// ---------------------------------------------------------------------------
// Dépendance au JavaScript
// ---------------------------------------------------------------------------

/**
 * - static              : le HTML brut contient l'essentiel du texte rendu ;
 * - partial             : une partie notable du texte n'apparaît qu'après JS ;
 * - js_dependent        : le HTML brut est quasi vide face au rendu ;
 * - likely_js_dependent : pas de rendu disponible, mais le HTML brut est quasi vide ;
 * - unknown             : pas de HTML exploitable.
 */
export type JsDependencyVerdict = "static" | "partial" | "js_dependent" | "likely_js_dependent" | "unknown";

export interface JsDependencyCheck {
  verdict: JsDependencyVerdict;
  rawWordCount: number;
  /** `null` si aucun moteur de rendu n'est configuré ou s'il a échoué. */
  renderedWordCount: number | null;
  /** Part du texte rendu déjà présente dans le HTML brut. */
  rawToRenderedRatio: number | null;
  hasAppRoot: boolean;
}

/** En dessous, une page est considérée comme une coquille vide. */
export const MIN_WORDS = 50;

export function analyzeJsDependency(rawHtml: string, renderedHtml: string | null): JsDependencyCheck {
  const rawWordCount = countWords(extractVisibleText(rawHtml));
  const hasAppRoot = detectSpaRoot(rawHtml);

  if (renderedHtml === null) {
    let verdict: JsDependencyVerdict;
    if (!rawHtml) verdict = "unknown";
    else if (rawWordCount < MIN_WORDS) verdict = "likely_js_dependent";
    else verdict = "static";
    return { verdict, rawWordCount, renderedWordCount: null, rawToRenderedRatio: null, hasAppRoot };
  }

  const renderedWordCount = countWords(extractVisibleText(renderedHtml));
  const ratio = renderedWordCount === 0 ? 1 : Math.min(1, rawWordCount / renderedWordCount);
  let verdict: JsDependencyVerdict;
  if (rawWordCount < MIN_WORDS && renderedWordCount >= MIN_WORDS) verdict = "js_dependent";
  else if (ratio < 0.2) verdict = "js_dependent";
  else if (ratio < 0.7) verdict = "partial";
  else verdict = "static";
  return { verdict, rawWordCount, renderedWordCount, rawToRenderedRatio: ratio, hasAppRoot };
}

// ---------------------------------------------------------------------------
// Statut combiné (rétrocompatibilité /api/audit)
// ---------------------------------------------------------------------------

export type ScannerStatus =
  | "ACCESSIBLE"
  | "BLOCKED_403"
  | "BLOCKED_CAPTCHA"
  | "EMPTY_JS_REQUIRED"
  | "ERROR";

export interface AnalyzerResult {
  agent: string;
  status: ScannerStatus;
  wordCount: number;
  hasAppRoot: boolean;
  httpStatus: number;
  durationMs: number;
}

/**
 * Résumé en un seul statut d'une réponse brute. Mélange accès et rendu :
 * à réserver aux écrans qui n'affichent qu'une pastille.
 */
export function analyzeResponse(result: CrawlResult, agent: string, controlWordCount?: number): AnalyzerResult {
  const base = { agent, httpStatus: result.status, durationMs: result.durationMs };
  const access = classifyAccess(result);

  if (access.risk === "unreachable") {
    return { ...base, status: "ERROR", wordCount: 0, hasAppRoot: false };
  }
  if (access.risk === "challenged") {
    return { ...base, status: "BLOCKED_CAPTCHA", wordCount: 0, hasAppRoot: false };
  }
  if (access.risk === "blocked") {
    return { ...base, status: "BLOCKED_403", wordCount: 0, hasAppRoot: false };
  }

  const js = analyzeJsDependency(result.html, null);
  let status: ScannerStatus = "ACCESSIBLE";
  if (js.rawWordCount < MIN_WORDS) status = "EMPTY_JS_REQUIRED";
  else if (controlWordCount !== undefined && js.rawWordCount < controlWordCount * 0.2) status = "EMPTY_JS_REQUIRED";

  return { ...base, status, wordCount: js.rawWordCount, hasAppRoot: js.hasAppRoot };
}
