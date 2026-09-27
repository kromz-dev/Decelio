import type { PlatformDetection } from "../scanner/platform";
import { CMS_LABELS, FIREWALL_LABELS } from "./types";
import type { CmsKey, FirewallKey, PlatformGuidance, RemediationCause } from "./types";

/**
 * Table de correspondance entre les identifiants de détection de plateforme
 * (`lib/scanner/platform.ts`, alimentés par des indices dans les en-têtes et
 * le HTML — jamais une certitude) et les clés du catalogue de correctifs
 * (`lib/remediation/types.ts`).
 *
 * `platform.cms` (+ `platform.seoPlugin` uniquement quand `cms === "wordpress"`)
 * → `CmsKey` :
 *   - `"wordpress"` seul (aucune extension SEO détectée)  → `"wordpress"`
 *   - `"wordpress"` + `seoPlugin: "yoast"`                → `"wordpressYoast"`
 *   - `"wordpress"` + `seoPlugin: "rankMath"`             → `"wordpressRankMath"`
 *   - `"wordpress"` + `seoPlugin: "seopress"`             → `"wordpressSeopress"`
 *   - `"shopify" | "wix" | "squarespace" | "webflow" | "drupal" | "prestashop"
 *     | "customNextNuxt" | "customReactVue"`             → clé de même nom
 *   - `"unknown"`                                         → aucune correspondance (repli générique)
 *
 * `platform.firewall` → `FirewallKey` :
 *   - `"cloudflare" | "sucuri" | "wordfence" | "imperva"` → clé de même nom
 *
 * `platform.host` → `FirewallKey` (entrées « hébergeur » du catalogue) :
 *   - `"ovh"`       → `"hostingOvh"`
 *   - `"o2switch"`  → `"hostingO2switch"`
 *   - `"hostinger"` → `"hostingHostinger"`
 *   - `"gandi"`     → `"hostingGandi"`
 *
 * `firewall` et `host` sont deux signaux indépendants du scanner : les deux
 * peuvent être présents à la fois (par exemple un Cloudflare devant un
 * hébergement OVH identifié par ailleurs), auquel cas les deux marches à
 * suivre sont retenues.
 */
function cmsKeyFor(platform: PlatformDetection): CmsKey | undefined {
  if (platform.cms === "unknown") return undefined;
  if (platform.cms === "wordpress") {
    switch (platform.seoPlugin) {
      case "yoast":
        return "wordpressYoast";
      case "rankMath":
        return "wordpressRankMath";
      case "seopress":
        return "wordpressSeopress";
      default:
        return "wordpress";
    }
  }
  return platform.cms;
}

const HOST_TO_FIREWALL_KEY: Record<NonNullable<PlatformDetection["host"]>, FirewallKey> = {
  ovh: "hostingOvh",
  o2switch: "hostingO2switch",
  hostinger: "hostingHostinger",
  gandi: "hostingGandi",
};

function firewallKeysFor(platform: PlatformDetection): FirewallKey[] {
  const keys: FirewallKey[] = [];
  if (platform.firewall) keys.push(platform.firewall);
  if (platform.host) keys.push(HOST_TO_FIREWALL_KEY[platform.host]);
  return keys;
}

/** Une marche à suivre du catalogue, retenue pour la plateforme détectée. */
export interface DetectedPlatformGuidance {
  key: CmsKey | FirewallKey;
  label: string;
  guidance: PlatformGuidance;
}

export interface PlatformRemediationResult {
  /**
   * Libellé à afficher pour le CMS détecté, ex. « WordPress — Yoast SEO ».
   * Présent dès que `platform.cms` est reconnu, même quand aucune marche à
   * suivre du catalogue ne s'applique (`cms` reste alors `undefined`) : ce
   * libellé sert uniquement à afficher « Plateforme détectée : … », jamais à
   * affirmer une certitude sur la plateforme réelle du site.
   */
  cmsLabel?: string;
  /** Marche à suivre du catalogue pour ce CMS, si l'entrée est `supported: true`. */
  cms?: DetectedPlatformGuidance;
  /** Marches à suivre pour le pare-feu et/ou l'hébergeur détectés, si `supported: true`. */
  firewalls: DetectedPlatformGuidance[];
  /**
   * true quand on retombe sur les étapes génériques (`cause.generalSteps`) :
   * plateforme inconnue, absente, ou aucune entrée applicable et supportée
   * n'a été trouvée dans le catalogue pour la plateforme détectée.
   */
  usedGeneralSteps: boolean;
}

/**
 * Fonction pure : croise une cause du catalogue avec la plateforme détectée
 * pour un site donné, et renvoie la marche à suivre à mettre en avant.
 *
 * Ne présente jamais une plateforme devinée comme certaine : `cmsLabel` sert
 * uniquement à afficher une phrase du type « Plateforme détectée : WordPress
 * (d'après les indices de la page) », jamais « Votre site est sous
 * WordPress ». Le principe de véracité vient du catalogue lui-même (voir
 * `types.ts`) : cette fonction ne fait que sélectionner les entrées déjà
 * marquées `supported`/`unverified`, elle n'invente aucune étape.
 */
export function remediationForPlatform(
  cause: RemediationCause,
  platform?: PlatformDetection,
): PlatformRemediationResult {
  if (!platform || platform.cms === "unknown") {
    return { firewalls: [], usedGeneralSteps: true };
  }

  const cmsKey = cmsKeyFor(platform);
  const cmsLabel = cmsKey ? CMS_LABELS[cmsKey] : undefined;

  let cms: DetectedPlatformGuidance | undefined;
  if (cmsKey) {
    const guidance = cause.cms?.[cmsKey];
    if (guidance?.supported) {
      cms = { key: cmsKey, label: CMS_LABELS[cmsKey], guidance };
    }
  }

  const firewalls: DetectedPlatformGuidance[] = [];
  for (const key of firewallKeysFor(platform)) {
    const guidance = cause.firewalls?.[key];
    if (guidance?.supported) {
      firewalls.push({ key, label: FIREWALL_LABELS[key], guidance });
    }
  }

  const usedGeneralSteps = !cms && firewalls.length === 0;

  return { cmsLabel, cms, firewalls, usedGeneralSteps };
}
