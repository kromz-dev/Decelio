/**
 * Détection de plateforme (CMS, extension SEO, pare-feu, hébergeur) à partir
 * des données DÉJÀ récupérées par le scanner (`crawler.ts`). Ce module ne
 * fait AUCUNE requête réseau supplémentaire : il ne fait que relire les
 * en-têtes et le HTML de la réponse honnête (`CrawlResult`).
 *
 * Honnêteté de la mesure : un identifiant n'est renvoyé que si un signal
 * concret l'a déclenché (`signals`), jamais par déduction. Des signaux
 * contradictoires (deux plateformes mutuellement exclusives détectées à la
 * fois) donnent `"unknown"` plutôt qu'un choix arbitraire — voir
 * `docs/08-constitution.md`.
 */

/** CMS et constructeurs de site reconnus. Alignés sur `CmsKey` de
 * `lib/remediation/types.ts` (branche `feat/audit-backend-e2e`, non fusionnée) :
 * cette branche ne dépend pas de cette autre branche, mais réutilise les
 * mêmes identifiants pour que le branchement futur soit direct. */
export type PlatformId =
  | "wordpress"
  | "shopify"
  | "wix"
  | "squarespace"
  | "webflow"
  | "drupal"
  | "prestashop"
  | "customNextNuxt"
  | "customReactVue";

export type SeoPluginId = "yoast" | "rankMath" | "seopress";

export type FirewallId = "cloudflare" | "sucuri" | "wordfence" | "imperva";

export type HostId = "ovh" | "o2switch" | "hostinger" | "gandi";

export interface PlatformDetectionInput {
  /** En-têtes de la réponse finale, noms en minuscules (voir `CrawlResult.headers`). */
  headers: Record<string, string>;
  html: string;
}

export interface PlatformDetection {
  cms: PlatformId | "unknown";
  seoPlugin?: SeoPluginId;
  firewall?: FirewallId;
  host?: HostId;
  /** Un signal par détection retenue, et aussi pour les contradictions écartées. */
  signals: string[];
}

/**
 * Le générateur meta / les scripts d'amorçage apparaissent dans le `<head>`
 * ou tout début de page. Au-delà, on ne gagne rien à analyser un corps de
 * page potentiellement énorme (le crawler borne déjà à 2 Mo, on borne encore
 * plus court ici pour la détection de plateforme).
 */
const ANALYSIS_WINDOW = 200_000;

interface CmsCandidate {
  id: PlatformId;
  signals: string[];
}

function truncatedHtml(html: string): string {
  return html.length > ANALYSIS_WINDOW ? html.slice(0, ANALYSIS_WINDOW) : html;
}

function includesCI(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/** Capture bornée, sans quantificateurs imbriqués : pas de risque de ReDoS. */
function matchGenerator(html: string): string | null {
  const m = html.match(/<meta\s+name=["']generator["']\s+content=["']([^"'<>]{0,120})["']/i);
  return m ? m[1].trim() : null;
}

function detectCms(headers: Record<string, string>, html: string): CmsCandidate[] {
  const candidates: CmsCandidate[] = [];
  const generator = matchGenerator(html);

  // --- WordPress ---
  {
    const signals: string[] = [];
    if (generator && /wordpress/i.test(generator)) signals.push(`meta generator: ${generator}`);
    if (includesCI(html, "/wp-content/")) signals.push("chemin /wp-content/ présent dans le HTML");
    if (includesCI(html, "/wp-includes/")) signals.push("chemin /wp-includes/ présent dans le HTML");
    if (signals.length > 0) candidates.push({ id: "wordpress", signals });
  }

  // --- Shopify ---
  {
    const signals: string[] = [];
    const shopifyHeader = Object.keys(headers).find((h) => h.startsWith("x-shopify-"));
    if (shopifyHeader) signals.push(`header ${shopifyHeader}: ${headers[shopifyHeader]}`);
    if (includesCI(html, "cdn.shopify.com")) signals.push("référence cdn.shopify.com dans le HTML");
    if (generator && /shopify/i.test(generator)) signals.push(`meta generator: ${generator}`);
    if (signals.length > 0) candidates.push({ id: "shopify", signals });
  }

  // --- Wix ---
  {
    const signals: string[] = [];
    if (headers["x-wix-request-id"]) signals.push(`header x-wix-request-id: ${headers["x-wix-request-id"]}`);
    if (includesCI(html, "static.wixstatic.com")) signals.push("référence static.wixstatic.com dans le HTML");
    if (signals.length > 0) candidates.push({ id: "wix", signals });
  }

  // --- Squarespace ---
  {
    const signals: string[] = [];
    if (includesCI(html, "squarespace.com")) signals.push("référence squarespace.com dans le HTML");
    if (generator && /squarespace/i.test(generator)) signals.push(`meta generator: ${generator}`);
    if (signals.length > 0) candidates.push({ id: "squarespace", signals });
  }

  // --- Webflow ---
  {
    const signals: string[] = [];
    if (generator && /webflow/i.test(generator)) signals.push(`meta generator: ${generator}`);
    if (includesCI(html, "website-files.com")) signals.push("référence website-files.com dans le HTML");
    if (includesCI(html, "Made in Webflow")) signals.push("mention « Made in Webflow » dans le HTML");
    if (signals.length > 0) candidates.push({ id: "webflow", signals });
  }

  // --- Drupal ---
  {
    const signals: string[] = [];
    if (headers["x-generator"] && /drupal/i.test(headers["x-generator"])) {
      signals.push(`header x-generator: ${headers["x-generator"]}`);
    }
    if (generator && /drupal/i.test(generator)) signals.push(`meta generator: ${generator}`);
    if (includesCI(html, "Drupal.settings")) signals.push("global Drupal.settings dans le HTML");
    if (signals.length > 0) candidates.push({ id: "drupal", signals });
  }

  // --- PrestaShop ---
  {
    const signals: string[] = [];
    if (includesCI(html, "var prestashop")) signals.push("global JS `prestashop` dans le HTML");
    if (includesCI(html, "/modules/prestashop")) signals.push("chemin /modules/prestashop dans le HTML");
    if (signals.length > 0) candidates.push({ id: "prestashop", signals });
  }

  // --- Next.js / Nuxt sur mesure ---
  {
    const signals: string[] = [];
    if (headers["x-powered-by"] && /next\.js/i.test(headers["x-powered-by"])) {
      signals.push(`header x-powered-by: ${headers["x-powered-by"]}`);
    }
    if (includesCI(html, "__NEXT_DATA__")) signals.push("marqueur __NEXT_DATA__ dans le HTML");
    if (includesCI(html, "__NUXT__")) signals.push("marqueur __NUXT__ dans le HTML");
    if (/<div[^>]+id=["'](__next|__nuxt)["']/i.test(html)) signals.push("racine <div id=\"__next\"|\"__nuxt\">");
    if (signals.length > 0) candidates.push({ id: "customNextNuxt", signals });
  }

  // --- SPA React/Vue générique (uniquement si aucun signal Next/Nuxt) ---
  {
    const alreadyNextNuxt = candidates.some((c) => c.id === "customNextNuxt");
    if (!alreadyNextNuxt) {
      const signals: string[] = [];
      if (/<div[^>]+id=["'](root|app)["'][^>]*>\s*(<!--[\s\S]{0,200}?-->\s*)?<\/div>/i.test(html)) {
        signals.push("coquille SPA <div id=\"root\"|\"app\"> quasi vide");
      }
      if (signals.length > 0) candidates.push({ id: "customReactVue", signals });
    }
  }

  return candidates;
}

interface SeoPluginCandidate {
  id: SeoPluginId;
  signals: string[];
}

function detectSeoPlugin(html: string): SeoPluginCandidate[] {
  const candidates: SeoPluginCandidate[] = [];

  {
    const signals: string[] = [];
    if (includesCI(html, "Yoast SEO plugin")) signals.push("commentaire « Yoast SEO plugin » dans le HTML");
    if (/generator["']\s+content=["']Yoast/i.test(html)) signals.push("meta generator Yoast");
    if (signals.length > 0) candidates.push({ id: "yoast", signals });
  }
  {
    const signals: string[] = [];
    if (includesCI(html, "Rank Math WordPress SEO plugin")) signals.push("commentaire « Rank Math » dans le HTML");
    if (includesCI(html, "seo-by-rank-math")) signals.push("chemin /plugins/seo-by-rank-math/ dans le HTML");
    if (signals.length > 0) candidates.push({ id: "rankMath", signals });
  }
  {
    const signals: string[] = [];
    if (includesCI(html, "SEOPress")) signals.push("mention « SEOPress » dans le HTML");
    if (signals.length > 0) candidates.push({ id: "seopress", signals });
  }

  return candidates;
}

interface FirewallCandidate {
  id: FirewallId;
  signals: string[];
}

function detectFirewall(headers: Record<string, string>, html: string): FirewallCandidate[] {
  const candidates: FirewallCandidate[] = [];

  {
    const signals: string[] = [];
    if (headers["cf-ray"]) signals.push(`header cf-ray: ${headers["cf-ray"]}`);
    if (headers.server && /cloudflare/i.test(headers.server)) signals.push(`header server: ${headers.server}`);
    if (signals.length > 0) candidates.push({ id: "cloudflare", signals });
  }
  {
    const signals: string[] = [];
    if (headers["x-sucuri-id"]) signals.push(`header x-sucuri-id: ${headers["x-sucuri-id"]}`);
    if (headers["x-sucuri-cache"]) signals.push(`header x-sucuri-cache: ${headers["x-sucuri-cache"]}`);
    if (signals.length > 0) candidates.push({ id: "sucuri", signals });
  }
  {
    const signals: string[] = [];
    if (headers["x-iinfo"]) signals.push(`header x-iinfo: ${headers["x-iinfo"]}`);
    if (headers["x-cdn"] && /imperva|incapsula/i.test(headers["x-cdn"])) signals.push(`header x-cdn: ${headers["x-cdn"]}`);
    if (signals.length > 0) candidates.push({ id: "imperva", signals });
  }
  {
    const signals: string[] = [];
    if (includesCI(html, "Generated by Wordfence")) signals.push("mention « Generated by Wordfence » dans le HTML");
    if (signals.length > 0) candidates.push({ id: "wordfence", signals });
  }

  return candidates;
}

interface HostCandidate {
  id: HostId;
  signals: string[];
}

/**
 * Signal volontairement faible : la plupart des hébergeurs ne se déclarent
 * nulle part. On ne détecte que le cas où un en-tête ou le HTML nomme
 * littéralement l'hébergeur (rare) — sinon `host` reste `undefined`, ce qui
 * est le résultat honnête pour l'immense majorité des sites.
 */
function detectHost(headers: Record<string, string>, html: string): HostCandidate[] {
  const needles: { id: HostId; needle: string }[] = [
    { id: "ovh", needle: "ovh" },
    { id: "o2switch", needle: "o2switch" },
    { id: "hostinger", needle: "hostinger" },
    { id: "gandi", needle: "gandi" },
  ];
  const candidates: HostCandidate[] = [];

  for (const { id, needle } of needles) {
    const signals: string[] = [];
    for (const [name, value] of Object.entries(headers)) {
      if (includesCI(value, needle)) signals.push(`header ${name}: ${value}`);
    }
    if (includesCI(html, needle)) signals.push(`mention « ${needle} » dans le HTML`);
    if (signals.length > 0) candidates.push({ id, signals });
  }

  return candidates;
}

function pickSingle<T extends { id: string; signals: string[] }>(
  candidates: T[],
): { picked: T["id"] | undefined; signals: string[] } {
  const distinctIds = new Set(candidates.map((c) => c.id));
  const allSignals = candidates.flatMap((c) => c.signals);
  if (distinctIds.size === 1) return { picked: candidates[0].id, signals: allSignals };
  // Zéro ou plusieurs identifiants distincts : rien de concluant.
  return { picked: undefined, signals: distinctIds.size > 1 ? allSignals : [] };
}

export function detectPlatform(input: PlatformDetectionInput): PlatformDetection {
  const headers = input.headers ?? {};
  const html = truncatedHtml(input.html ?? "");

  const cmsCandidates = detectCms(headers, html);
  const { picked: cms, signals: cmsSignals } = pickSingle(cmsCandidates);

  const signals = [...cmsSignals];

  let seoPlugin: SeoPluginId | undefined;
  if (cms === "wordpress") {
    const seoCandidates = detectSeoPlugin(html);
    const { picked, signals: seoSignals } = pickSingle(seoCandidates);
    seoPlugin = picked;
    signals.push(...seoSignals);
  }

  const firewallCandidates = detectFirewall(headers, html);
  const { picked: firewall, signals: firewallSignals } = pickSingle(firewallCandidates);
  signals.push(...firewallSignals);

  const hostCandidates = detectHost(headers, html);
  const { picked: host, signals: hostSignals } = pickSingle(hostCandidates);
  signals.push(...hostSignals);

  return {
    cms: cms ?? "unknown",
    seoPlugin,
    firewall,
    host,
    signals,
  };
}
