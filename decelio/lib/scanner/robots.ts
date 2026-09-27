import { BOTS, BotAgent, BotPurpose } from "./agents";
import { crawlUrl, CrawlResult } from "./crawler";
import { detectChallenge } from "./analyzer";

/**
 * Analyse robots.txt selon la RFC 9309.
 *
 * - Un groupe = une ou plusieurs lignes `user-agent` consécutives suivies de
 *   leurs règles. Les règles placées avant tout `user-agent` sont ignorées.
 * - Le jeton produit est comparé sans tenir compte de la casse. Tous les
 *   groupes qui le nomment sont fusionnés ; à défaut, on applique le groupe
 *   `*` ; à défaut, tout est autorisé.
 * - Parmi les règles du groupe retenu, la correspondance la plus longue
 *   l'emporte ; à longueur égale, `allow` l'emporte.
 * - `/robots.txt` est toujours autorisé.
 */

export type RuleType = "allow" | "disallow";

export interface RobotsRule {
  type: RuleType;
  pattern: string;
}

export interface RobotsGroup {
  userAgents: string[];
  rules: RobotsRule[];
}

export interface ParsedRobots {
  groups: RobotsGroup[];
  sitemaps: string[];
}

/** La RFC impose de lire au moins 500 Kio ; le reste est ignoré. */
const MAX_ROBOTS_BYTES = 500 * 1024;

export function parseRobotsTxt(content: string): ParsedRobots {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  let current: RobotsGroup | null = null;
  // Vrai tant qu'on lit des lignes user-agent consécutives d'un même groupe.
  let collectingAgents = false;

  const text = content.slice(0, MAX_ROBOTS_BYTES).replace(/^﻿/, "");
  for (const rawLine of text.split(/\r\n|\r|\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    const sep = line.indexOf(":");
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim().toLowerCase();
    const value = line.slice(sep + 1).trim();

    if (key === "user-agent") {
      if (!collectingAgents || !current) {
        current = { userAgents: [], rules: [] };
        groups.push(current);
        collectingAgents = true;
      }
      if (value) current.userAgents.push(value);
    } else if (key === "allow" || key === "disallow") {
      collectingAgents = false;
      if (!current) continue;
      // Une règle vide (« Disallow: ») n'interdit rien : on l'ignore.
      if (value) current.rules.push({ type: key, pattern: value });
    } else if (key === "sitemap") {
      // Ligne hors groupe : elle ne termine pas le groupe courant.
      if (value) sitemaps.push(value);
    }
  }

  return { groups, sitemaps };
}

/** Extrait le jeton produit d'une valeur `User-agent` (« GPTBot/1.1 » → « gptbot »). */
function productToken(value: string): string {
  const match = value.trim().match(/^[A-Za-z_-]+|^\*/);
  return (match ? match[0] : value.trim()).toLowerCase();
}

export type GroupMatch = "specific" | "wildcard" | "none";

export function selectRules(robots: ParsedRobots, token: string): { match: GroupMatch; rules: RobotsRule[] } {
  const wanted = token.toLowerCase();
  const specific = robots.groups.filter((g) => g.userAgents.some((ua) => productToken(ua) === wanted));
  if (specific.length > 0) {
    return { match: "specific", rules: specific.flatMap((g) => g.rules) };
  }
  const wildcard = robots.groups.filter((g) => g.userAgents.some((ua) => ua.trim() === "*"));
  if (wildcard.length > 0) {
    return { match: "wildcard", rules: wildcard.flatMap((g) => g.rules) };
  }
  return { match: "none", rules: [] };
}

/**
 * Normalise l'encodage-pourcent pour comparer motif et chemin octet à octet :
 * les caractères hors ASCII imprimable sont encodés en UTF-8, les séquences
 * existantes passent en majuscules.
 */
function normalizePercentEncoding(value: string): string {
  let out = "";
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === "%" && /^[0-9a-fA-F]{2}$/.test(value.slice(i + 1, i + 3))) {
      out += "%" + value.slice(i + 1, i + 3).toUpperCase();
      i += 2;
    } else if (/[\x21-\x7e]/.test(ch)) {
      out += ch;
    } else {
      const cp = value.codePointAt(i)!;
      if (cp > 0xffff) i++;
      out += Array.from(new TextEncoder().encode(String.fromCodePoint(cp)))
        .map((b) => "%" + b.toString(16).toUpperCase().padStart(2, "0"))
        .join("");
    }
  }
  return out;
}

function patternToRegExp(pattern: string): RegExp {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const source = body
    .split("*")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp("^" + source + (anchored ? "$" : ""));
}

export interface PathDecision {
  allowed: boolean;
  rule: RobotsRule | null;
}

/** Décide pour un chemin (avec sa query) parmi les règles d'un groupe. */
export function decide(rules: RobotsRule[], pathWithQuery: string): PathDecision {
  const path = normalizePercentEncoding(pathWithQuery || "/");
  if (path === "/robots.txt") return { allowed: true, rule: null };

  let best: RobotsRule | null = null;
  let bestLength = -1;
  for (const rule of rules) {
    const pattern = normalizePercentEncoding(rule.pattern);
    if (!patternToRegExp(pattern).test(path)) continue;
    const length = pattern.length;
    if (length > bestLength || (length === bestLength && rule.type === "allow")) {
      best = rule;
      bestLength = length;
    }
  }
  return { allowed: best === null || best.type === "allow", rule: best };
}

export function isAllowed(robots: ParsedRobots, token: string, pathWithQuery: string): PathDecision & { match: GroupMatch } {
  const { match, rules } = selectRules(robots, token);
  return { match, ...decide(rules, pathWithQuery) };
}

// ---------------------------------------------------------------------------
// Rapport par robot
// ---------------------------------------------------------------------------

/**
 * - ok          : 2xx, le fichier est analysé ;
 * - unavailable : un vrai 4xx (404, 410...) sans signal de pare-feu, ou plus
 *                 de 5 redirections ; la RFC 9309 §2.3.1 autorise alors tout,
 *                 car c'est le cas d'un fichier absent ;
 * - blocked     : 401, 403 ou 429 sans défi identifiable. La RFC 9309 traite
 *                 ce cas comme un 4xx ordinaire (donc « tout permis »), mais
 *                 un refus nu sur robots.txt signale le plus souvent un
 *                 pare-feu qui bloque la requête elle-même, pas un fichier
 *                 absent : conclure « autorisé » serait un faux positif, donc
 *                 le verdict rendu est « à vérifier » (`unknown`) ;
 * - unreachable : 5xx, erreur réseau, ou un 503 sans défi identifiable ; la
 *                 RFC 9309 §2.3.1 permet alors de considérer que tout est
 *                 interdit (ou de réessayer plus tard) — on retient
 *                 l'interdiction, plus prudente ;
 * - challenged  : un défi anti-bot reconnu (Cloudflare, Turnstile, DataDome,
 *                 PerimeterX, Akamai Bot Manager...) a répondu à la place du
 *                 fichier, on ne peut rien conclure.
 */
export type RobotsFetchStatus = "ok" | "unavailable" | "blocked" | "unreachable" | "challenged";
export type RobotsVerdict = "allowed" | "disallowed" | "unknown";

export interface BotRobotsPolicy {
  bot: BotAgent;
  token: string;
  purpose: BotPurpose;
  verdict: RobotsVerdict;
  group: GroupMatch;
  rule: RobotsRule | null;
}

export interface RobotsReport {
  url: string;
  fetchStatus: RobotsFetchStatus;
  httpStatus: number;
  /** Chemin évalué (celui de la page scannée). */
  path: string;
  sitemaps: string[];
  policies: BotRobotsPolicy[];
}

export function buildRobotsReport(
  fetched: Pick<CrawlResult, "finalUrl" | "status" | "headers" | "html" | "errorKind">,
  robotsUrl: string,
  pagePath: string,
  bots: BotAgent[],
): RobotsReport {
  let fetchStatus: RobotsFetchStatus;
  // Plus de cinq redirections : la RFC permet de considérer le fichier indisponible.
  if (fetched.status === 0) {
    fetchStatus = fetched.errorKind === "too_many_redirects" ? "unavailable" : "unreachable";
  } else {
    const challenge = detectChallenge(fetched);
    if (challenge.challenged) fetchStatus = "challenged";
    else if (fetched.status >= 200 && fetched.status < 300) fetchStatus = "ok";
    else if (fetched.status >= 400 && fetched.status < 500) {
      // Dans la plage 4xx, seuls 401/403/429 (`blocked`) signalent un pare-feu
      // sans défi reconnu ; un 404/410 (ou tout autre 4xx hors de cette liste)
      // reste un vrai « fichier absent » au sens de la RFC.
      fetchStatus = challenge.blocked ? "blocked" : "unavailable";
    } else {
      // 5xx (dont un 503 sans défi reconnu) : la RFC 9309 §2.3.1 permet de
      // tout interdire, on ne bascule donc pas vers `blocked` ici.
      fetchStatus = "unreachable";
    }
  }

  const parsed = fetchStatus === "ok" ? parseRobotsTxt(fetched.html) : { groups: [], sitemaps: [] };

  const policies = bots.map((bot): BotRobotsPolicy => {
    const def = BOTS[bot];
    const base = { bot, token: def.robotsToken, purpose: def.purpose };
    switch (fetchStatus) {
      case "ok": {
        const decision = isAllowed(parsed, def.robotsToken, pagePath);
        return {
          ...base,
          verdict: decision.allowed ? "allowed" : "disallowed",
          group: decision.match,
          rule: decision.rule,
        };
      }
      case "unavailable":
        return { ...base, verdict: "allowed", group: "none", rule: null };
      case "unreachable":
        return { ...base, verdict: "disallowed", group: "none", rule: null };
      case "blocked":
      case "challenged":
        return { ...base, verdict: "unknown", group: "none", rule: null };
    }
  });

  return {
    url: robotsUrl,
    fetchStatus,
    httpStatus: fetched.status,
    path: pagePath,
    sitemaps: parsed.sitemaps,
    policies,
  };
}

export async function fetchRobotsReport(pageUrl: string, bots: BotAgent[], userAgent?: string): Promise<RobotsReport> {
  const page = new URL(pageUrl);
  const robotsUrl = new URL("/robots.txt", page.origin).toString();
  const fetched = await crawlUrl(robotsUrl, {
    userAgent,
    accept: "text/plain,*/*;q=0.8",
    maxBodyBytes: MAX_ROBOTS_BYTES,
  });
  return buildRobotsReport(fetched, robotsUrl, page.pathname + page.search, bots);
}
