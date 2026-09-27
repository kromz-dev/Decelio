import type { PlatformDetection } from "@/lib/scanner/platform";

const CMS_LABEL: Record<Exclude<PlatformDetection["cms"], "unknown">, string> = {
  wordpress: "WordPress",
  shopify: "Shopify",
  wix: "Wix",
  squarespace: "Squarespace",
  webflow: "Webflow",
  drupal: "Drupal",
  prestashop: "PrestaShop",
  customNextNuxt: "site sur mesure (Next.js ou Nuxt)",
  customReactVue: "application JavaScript (React ou Vue)",
};

const SEO_LABEL: Record<NonNullable<PlatformDetection["seoPlugin"]>, string> = {
  yoast: "Yoast SEO",
  rankMath: "Rank Math",
  seopress: "SEOPress",
};

const FIREWALL_LABEL: Record<NonNullable<PlatformDetection["firewall"]>, string> = {
  cloudflare: "Cloudflare",
  sucuri: "Sucuri",
  wordfence: "Wordfence",
  imperva: "Imperva",
};

const HOST_LABEL: Record<NonNullable<PlatformDetection["host"]>, string> = {
  ovh: "OVHcloud",
  o2switch: "o2switch",
  hostinger: "Hostinger",
  gandi: "Gandi",
};

/**
 * Phrase lisible pour le client, par exemple « WordPress, Yoast SEO,
 * derrière Cloudflare ». Libellés fixés avec l'Ingénierie ; toujours affichée
 * avec la mention « d'après les indices de la page » (PLATFORM_CAVEAT). Renvoie `null` quand la plateforme est inconnue : on
 * n'affiche rien plutôt qu'une supposition. Les `signals` bruts ne sont
 * jamais montrés au client.
 */
/** Réserve obligatoire : une détection est un indice, jamais une certitude. */
export const PLATFORM_CAVEAT = "d'après les indices de la page";

export function describePlatform(platform: PlatformDetection | undefined): string | null {
  if (!platform || platform.cms === "unknown") return null;
  const parts: string[] = [CMS_LABEL[platform.cms]];
  if (platform.seoPlugin) parts.push(SEO_LABEL[platform.seoPlugin]);
  if (platform.firewall) parts.push(`derrière ${FIREWALL_LABEL[platform.firewall]}`);
  if (platform.host) parts.push(`hébergé chez ${HOST_LABEL[platform.host]}`);
  return parts.join(", ");
}
