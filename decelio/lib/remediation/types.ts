/**
 * Types du catalogue de correctifs.
 *
 * Le scanner (`lib/scanner/*`) détecte des causes techniques et les résume
 * dans `ScanCoreResult.reasons` (des chaînes courtes, en anglais, pensées
 * pour du débogage — voir `lib/scanner/core.ts#summarizeForBot`). Ce module
 * traduit chacune de ces causes en une fiche compréhensible par un gérant de
 * PME, avec une marche à suivre par plateforme.
 *
 * Principe de véracité (non négociable) : quand une plateforme ne permet pas
 * un correctif, ou qu'une étape n'a pas pu être confirmée par une source
 * fiable pendant la rédaction de ce catalogue, c'est marqué explicitement
 * (`supported: false` ou `unverified: true`) plutôt que deviné. Un « je ne
 * sais pas » honnête vaut mieux qu'une fausse manipulation.
 */

/** Gravité pour le client final : impact business si rien n'est corrigé. */
export type Severity = "critique" | "élevée" | "moyenne" | "à vérifier";

/** Effort estimé pour l'agence ou le développeur qui applique le correctif. */
export type Effort = "faible" | "moyen" | "élevé" | "variable";

/**
 * CMS et constructeurs de site couverts par le catalogue. `wordpress` seul
 * désigne un WordPress sans extension SEO ; les trois variantes qui suivent
 * couvrent les extensions SEO les plus courantes, dont le chemin de menu
 * diffère du WordPress nu.
 */
export type CmsKey =
  | "wordpress"
  | "wordpressYoast"
  | "wordpressRankMath"
  | "wordpressSeopress"
  | "shopify"
  | "wix"
  | "squarespace"
  | "webflow"
  | "drupal"
  | "prestashop"
  | "customNextNuxt"
  | "customReactVue";

/** Pare-feu, CDN et protections d'hébergeur couverts par le catalogue. */
export type FirewallKey =
  | "cloudflare"
  | "sucuri"
  | "wordfence"
  | "imperva"
  | "hostingOvh"
  | "hostingO2switch"
  | "hostingHostinger"
  | "hostingGandi";

export interface PlatformGuidance {
  /**
   * false : cette plateforme ne permet pas ce correctif (ou pas nativement).
   * `steps` est alors vide et `note` explique la limite — jamais un chemin
   * de menu inventé pour compenser.
   */
  supported: boolean;
  /** Étapes concrètes, dans l'ordre. Vide si `supported` est `false`. */
  steps: string[];
  /** Nuance importante : limite de plan, comportement à double tranchant, prérequis. */
  note?: string;
  /**
   * true : cette étape s'appuie sur une source secondaire ou une recherche
   * qui n'a pas pu être recoupée avec la documentation officielle pendant la
   * rédaction (page bloquée, wording reconstruit). À revérifier avant de la
   * transmettre telle quelle à un client.
   */
  unverified?: boolean;
}

export interface RemediationCause {
  /** Identifiant stable, utilisé pour dédupliquer plusieurs occurrences de la même cause. */
  id: string;
  /** Reconnaît une chaîne technique de `ScanCoreResult.reasons`. */
  matches: (reason: string) => boolean;
  /** Résumé en français, sans jargon technique, qui remplace la chaîne technique brute. */
  title: string;
  /** Ce que ça coûte concrètement au client, en langage d'agence — pas de jargon SEO. */
  clientImpact: string;
  severity: Severity;
  effort: Effort;
  /**
   * Nuance à afficher quand le verdict n'est pas un constat établi : la
   * « coquille vide » est une présomption sur un seul indice (le moteur de
   * rendu JS est inactif en production), et l'« erreur » peut être un faux
   * positif dû au délai de 10 secondes du scanner.
   */
  caveat?: string;
  /** Marche à suivre par CMS / constructeur de site, quand la cause dépend du site lui-même. */
  cms?: Partial<Record<CmsKey, PlatformGuidance>>;
  /** Marche à suivre par pare-feu / CDN / hébergeur, quand la cause dépend de l'accès réseau. */
  firewalls?: Partial<Record<FirewallKey, PlatformGuidance>>;
  /**
   * Checklist générique quand aucune plateforme n'a de réglage dédié (site
   * injoignable, erreur HTTP) : l'action est la même quel que soit le CMS.
   */
  generalSteps?: string[];
}

export const CMS_LABELS: Record<CmsKey, string> = {
  wordpress: "WordPress (sans extension SEO)",
  wordpressYoast: "WordPress — Yoast SEO",
  wordpressRankMath: "WordPress — Rank Math",
  wordpressSeopress: "WordPress — SEOPress",
  shopify: "Shopify",
  wix: "Wix",
  squarespace: "Squarespace",
  webflow: "Webflow",
  drupal: "Drupal",
  prestashop: "PrestaShop",
  customNextNuxt: "Site sur mesure — Next.js / Nuxt",
  customReactVue: "Site sur mesure — React / Vue (SPA statique)",
};

export const FIREWALL_LABELS: Record<FirewallKey, string> = {
  cloudflare: "Cloudflare",
  sucuri: "Sucuri",
  wordfence: "Wordfence",
  imperva: "Imperva",
  hostingOvh: "Hébergeur — OVH",
  hostingO2switch: "Hébergeur — o2switch",
  hostingHostinger: "Hébergeur — Hostinger",
  hostingGandi: "Hébergeur — Gandi",
};
