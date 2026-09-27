import type { PlatformDetection } from "@/lib/scanner/platform";

const CMS_LABEL: Record<Exclude<PlatformDetection["cms"], "unknown">, string> = {
  wordpress: "WordPress",
  shopify: "Shopify",
  wix: "Wix",
  squarespace: "Squarespace",
  webflow: "Webflow",
  drupal: "Drupal",
  prestashop: "PrestaShop",
  customNextNuxt: "Site sur mesure (Next.js ou Nuxt)",
  customReactVue: "Application React ou Vue",
};

const SEO_LABEL: Record<NonNullable<PlatformDetection["seoPlugin"]>, string> = {
  yoast: "Yoast",
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
  ovh: "OVH",
  o2switch: "o2switch",
  hostinger: "Hostinger",
  gandi: "Gandi",
};

/**
 * Phrase lisible pour le client, par exemple « WordPress, Yoast, derrière
 * Cloudflare ». Renvoie `null` quand la plateforme est inconnue : on
 * n'affiche rien plutôt qu'une supposition. Les `signals` bruts ne sont
 * jamais montrés au client.
 */
export function describePlatform(platform: PlatformDetection | undefined): string | null {
  if (!platform || platform.cms === "unknown") return null;
  const parts: string[] = [CMS_LABEL[platform.cms]];
  if (platform.seoPlugin) parts.push(SEO_LABEL[platform.seoPlugin]);
  if (platform.firewall) parts.push(`derrière ${FIREWALL_LABEL[platform.firewall]}`);
  if (platform.host) parts.push(`hébergé chez ${HOST_LABEL[platform.host]}`);
  return parts.join(", ");
}
