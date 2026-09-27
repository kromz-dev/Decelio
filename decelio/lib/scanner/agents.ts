/**
 * Registre des robots IA.
 *
 * Chaque robot a un jeton robots.txt (celui que l'éditeur documente pour
 * `User-agent:`) et une finalité :
 *   - training       : collecte pour l'entraînement des modèles ;
 *   - search         : indexation pour un moteur de réponse ;
 *   - user-triggered : récupération à la demande d'un utilisateur (un
 *                      utilisateur colle un lien dans le chat, par exemple).
 *
 * Certains jetons (Google-Extended, Applebot-Extended) ne sont que des jetons
 * robots.txt : aucune requête n'est jamais envoyée avec ce User-Agent, le
 * crawl étant fait par Googlebot / Applebot. `userAgent` vaut alors `null` et
 * le scanner ne s'en sert jamais comme en-tête.
 */
export type BotPurpose = "training" | "search" | "user-triggered";

export type BotAgent =
  | "GPTBot"
  | "OAI-SearchBot"
  | "ChatGPT-User"
  | "ClaudeBot"
  | "Claude-SearchBot"
  | "Claude-User"
  | "PerplexityBot"
  | "Perplexity-User"
  | "Google-Extended"
  | "Applebot-Extended"
  | "Omgilibot";

export interface BotDefinition {
  id: BotAgent;
  vendor: string;
  purpose: BotPurpose;
  /** Jeton à rechercher dans les lignes `User-agent:` de robots.txt. */
  robotsToken: string;
  /**
   * User-Agent publié par l'éditeur, ou `null` pour un jeton robots.txt seul.
   * Ne sert qu'aux sondes secondaires « requérant non vérifié » : nous ne
   * sommes pas ce robot et le site peut le vérifier par IP.
   */
  userAgent: string | null;
}

export const BOTS: Record<BotAgent, BotDefinition> = {
  GPTBot: {
    id: "GPTBot",
    vendor: "OpenAI",
    purpose: "training",
    robotsToken: "GPTBot",
    userAgent: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.1; +https://openai.com/gptbot",
  },
  "OAI-SearchBot": {
    id: "OAI-SearchBot",
    vendor: "OpenAI",
    purpose: "search",
    robotsToken: "OAI-SearchBot",
    userAgent: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot",
  },
  "ChatGPT-User": {
    id: "ChatGPT-User",
    vendor: "OpenAI",
    purpose: "user-triggered",
    robotsToken: "ChatGPT-User",
    userAgent: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot",
  },
  ClaudeBot: {
    id: "ClaudeBot",
    vendor: "Anthropic",
    purpose: "training",
    robotsToken: "ClaudeBot",
    userAgent: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
  },
  "Claude-SearchBot": {
    id: "Claude-SearchBot",
    vendor: "Anthropic",
    purpose: "search",
    robotsToken: "Claude-SearchBot",
    userAgent: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-SearchBot/1.0; +Claude-SearchBot@anthropic.com)",
  },
  "Claude-User": {
    id: "Claude-User",
    vendor: "Anthropic",
    purpose: "user-triggered",
    robotsToken: "Claude-User",
    userAgent: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-User/1.0; +Claude-User@anthropic.com)",
  },
  PerplexityBot: {
    id: "PerplexityBot",
    vendor: "Perplexity",
    purpose: "search",
    robotsToken: "PerplexityBot",
    userAgent: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)",
  },
  "Perplexity-User": {
    id: "Perplexity-User",
    vendor: "Perplexity",
    purpose: "user-triggered",
    robotsToken: "Perplexity-User",
    userAgent: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)",
  },
  "Google-Extended": {
    id: "Google-Extended",
    vendor: "Google",
    purpose: "training",
    robotsToken: "Google-Extended",
    userAgent: null,
  },
  "Applebot-Extended": {
    id: "Applebot-Extended",
    vendor: "Apple",
    purpose: "training",
    robotsToken: "Applebot-Extended",
    userAgent: null,
  },
  Omgilibot: {
    id: "Omgilibot",
    vendor: "Webz.io",
    purpose: "training",
    robotsToken: "omgilibot",
    userAgent: "Mozilla/5.0 (compatible; Omgilibot/1.0; +http://omgili.com/bot.html)",
  },
};

export const ALL_BOTS = Object.keys(BOTS) as BotAgent[];

/** Robots dont la politique robots.txt est rapportée par défaut. */
export const DEFAULT_SCAN_BOTS: BotAgent[] = ALL_BOTS;

/**
 * Robots sondés par défaut en « requérant non vérifié » (User-Agent public
 * requis). Ce sont eux qui déterminent le statut surveillé et les alertes
 * (voir `inngest/functions/scan-site.ts`) : les robots de **recherche** de
 * ChatGPT, Claude et Perplexity — ceux qui lisent le site pour le citer dans
 * une réponse. Un site peut légitimement refuser l'entraînement (GPTBot,
 * ClaudeBot, voir `TRAINING_BOTS`) tout en restant lisible par ces
 * robots-là : ce n'est pas une panne, donc pas une alerte.
 *
 * Jetons robots.txt / User-Agent vérifiés le 27/09/2026 (recherche web,
 * les domaines officiels étant inaccessibles depuis cet environnement) :
 * - OAI-SearchBot : https://developers.openai.com/api/docs/bots (jeton et
 *   User-Agent confirmés par plusieurs répertoires tiers indépendants,
 *   dont https://knownagents.com/agents/oai-searchbot et
 *   https://radar.cloudflare.com/bots/directory/oai-searchbot).
 * - Claude-SearchBot : https://support.anthropic.com/en/articles/8896518
 *   (« ClaudeBot, Claude-User & Claude-SearchBot ») — le jeton lui-même
 *   (« Claude-SearchBot ») est confirmé par toutes les sources croisées ;
 *   la chaîne User-Agent complète n'a pas pu être revérifiée d'après une
 *   page officielle (accès bloqué), à vérifier lors d'un prochain passage
 *   avec accès réseau complet.
 * - PerplexityBot : https://docs.perplexity.ai/docs/resources/perplexity-crawlers
 *   (jeton et User-Agent confirmés, y compris la mention explicite que ce
 *   robot ne sert pas à l'entraînement).
 */
export const DEFAULT_PROBE_BOTS: BotAgent[] = ["OAI-SearchBot", "Claude-SearchBot", "PerplexityBot"];

/**
 * Robots d'entraînement : gardés dans le rapport (politique robots.txt par
 * robot, `report.robots.policies`) à titre informatif seulement. Ils ne
 * déclenchent plus d'alerte ni de statut surveillé — voir `DEFAULT_PROBE_BOTS`.
 */
export const TRAINING_BOTS: BotAgent[] = ALL_BOTS.filter((bot) => BOTS[bot].purpose === "training");

/**
 * User-Agent honnête du scanner : il dit qui nous sommes et où lire pourquoi
 * nous passons. C'est la requête par défaut ; tout le reste est secondaire.
 */
export function decelioUserAgent(siteUrl: string = process.env.NEXT_PUBLIC_APP_URL || "https://decelio.fr"): string {
  return `DecelioBot/1.0 (+${siteUrl})`;
}

export function isBotAgent(value: string): value is BotAgent {
  return Object.prototype.hasOwnProperty.call(BOTS, value);
}
