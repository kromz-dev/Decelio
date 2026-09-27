import type { FirewallId, HostId, PlatformDetection, PlatformId, SeoPluginId } from "@/lib/scanner/platform";
import { platformSchema } from "@/lib/scanner/platform-schema";

// Mêmes identifiants que les unions de `lib/scanner/platform.ts`. Le schéma
// partagé (`lib/scanner/platform-schema.ts`) reste volontairement large
// (`z.string()`) pour ne pas dupliquer ces unions à l'usage de la route PDF,
// qui accepte un rapport reconstruit côté client ; mais relire notre propre
// `ScanLog.payload` (écrit par notre scanner) permet de resserrer ici sur les
// valeurs réellement possibles, sans quoi une valeur hors union (ancien
// format, migration future) serait affichée telle quelle par `PlatformLine`.
const PLATFORM_IDS: readonly PlatformId[] = [
  "wordpress",
  "shopify",
  "wix",
  "squarespace",
  "webflow",
  "drupal",
  "prestashop",
  "customNextNuxt",
  "customReactVue",
];
const SEO_PLUGIN_IDS: readonly SeoPluginId[] = ["yoast", "rankMath", "seopress"];
const FIREWALL_IDS: readonly FirewallId[] = ["cloudflare", "sucuri", "wordfence", "imperva"];
const HOST_IDS: readonly HostId[] = ["ovh", "o2switch", "hostinger", "gandi"];

function isPlatformCms(value: string): value is PlatformId | "unknown" {
  return value === "unknown" || (PLATFORM_IDS as readonly string[]).includes(value);
}

function isKnownOrUndefined<T extends string>(value: string | undefined, allowed: readonly T[]): value is T | undefined {
  return value === undefined || (allowed as readonly string[]).includes(value);
}

function readPlatformPayload(payload: string): unknown {
  const parsed: unknown = JSON.parse(payload);
  if (typeof parsed !== "object" || parsed === null || !("report" in parsed)) return undefined;
  const report = (parsed as { report: unknown }).report;
  if (typeof report !== "object" || report === null || !("platform" in report)) return undefined;
  return (report as { platform: unknown }).platform;
}

/**
 * Relit `ScanLog.payload` du plus récent au plus ancien pour retrouver la
 * dernière plateforme détectée. `payload` n'est écrit que lorsque le verdict
 * change (voir `inngest/functions/scan-site.ts`) : la plupart des journaux
 * ont `payload: null`, il faut donc parcourir l'historique jusqu'au premier
 * payload exploitable, dans le style de `assistantSnapshots`
 * (`lib/sites/latest-bots.ts`).
 *
 * Ne lève jamais : un payload corrompu, un JSON invalide ou une valeur hors
 * union retombe sur `undefined`, jamais sur une exception qui casserait la
 * page. `cms === "unknown"` sans aucun autre champ détecté est aussi traité
 * comme absent : `PlatformLine` n'a rien d'honnête à afficher dans ce cas.
 */
export function latestPlatform(logs: { payload: string | null }[]): PlatformDetection | undefined {
  for (const log of logs) {
    if (!log.payload) continue;

    let rawPlatform: unknown;
    try {
      rawPlatform = readPlatformPayload(log.payload);
    } catch {
      continue;
    }
    if (rawPlatform === undefined) continue;

    const result = platformSchema.safeParse(rawPlatform);
    if (!result.success) continue;

    const { cms, seoPlugin, firewall, host, signals } = result.data;
    if (!isPlatformCms(cms)) continue;
    if (!isKnownOrUndefined(seoPlugin, SEO_PLUGIN_IDS)) continue;
    if (!isKnownOrUndefined(firewall, FIREWALL_IDS)) continue;
    if (!isKnownOrUndefined(host, HOST_IDS)) continue;

    if (cms === "unknown" && !seoPlugin && !firewall && !host) continue;

    return { cms, seoPlugin, firewall, host, signals: signals ?? [] };
  }

  return undefined;
}
