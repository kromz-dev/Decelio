import type { CmsKey, PlatformGuidance } from "./types";

/**
 * Marche à suivre par plateforme pour retirer une directive « noindex »,
 * qu'elle vienne d'une balise <meta name="robots"> ou d'un en-tête HTTP
 * X-Robots-Tag (les deux sont fusionnés par `lib/scanner/analyzer.ts` avant
 * d'arriver au scanner, donc le catalogue ne les distingue pas non plus).
 */
export const NOINDEX_CMS_GUIDANCE: Partial<Record<CmsKey, PlatformGuidance>> = {
  wordpress: {
    supported: true,
    steps: [
      "Vérifiez d'abord Réglages > Lecture > case « Décourager les moteurs de recherche d'indexer ce site » : si elle est cochée, c'est la cause la plus fréquente, et elle s'applique alors à tout le site, pas seulement à une page.",
      "Sans extension SEO, un noindex sur une page précise vient en général du thème ou d'une extension tierce : il faut retrouver et modifier le code qui l'ajoute (souvent un réglage oublié après une mise en ligne de test).",
    ],
    // Source : comportement documenté par de nombreux guides WordPress (wpbeginner.com, kinsta.com,
    // wp-umbrella.com) qui décrivent tous ce même réglage « Discourage search engines from indexing
    // this site » dans Réglages > Lecture ; il s'agit d'un réglage natif de WordPress, pas d'une extension.
  },
  wordpressYoast: {
    supported: true,
    steps: [
      "Ouvrez la page ou l'article concerné, dans l'encart Yoast SEO en bas de l'éditeur, onglet « Advanced » (Avancé).",
      "Réglez « Autoriser les moteurs de recherche à afficher cette page dans les résultats de recherche ? » sur Oui.",
    ],
    // Source : https://yoast.com/wordpress-noindex-post/
  },
  wordpressRankMath: {
    supported: true,
    steps: [
      "Ouvrez la page ou l'article concerné, dans l'encart Rank Math, onglet Advanced (Avancé), section Robots Meta.",
      "Décochez la case No Index.",
      "Si la page reste indexée nulle part malgré tout, vérifiez aussi Rank Math SEO > Titres & Metas > (type de contenu concerné) : un réglage « No Index » peut avoir été appliqué par défaut à tout un type de contenu.",
    ],
    // Source : https://rankmath.com/kb/how-to-noindex-urls/ et https://rankmath.com/kb/advanced-tab/
  },
  wordpressSeopress: {
    supported: true,
    steps: [
      "Ouvrez la page ou l'article concerné, dans l'encart SEOPress, onglet « Advanced » (le libellé exact peut varier selon la version : chercher la section « Meta Robots »).",
      "Décochez No Index.",
    ],
    note: "L'intitulé précis de l'onglet (Advanced vs Social & Robots Meta selon les versions de SEOPress) n'a pas pu être confirmé pendant la rédaction de ce catalogue.",
    // Source : https://www.seopress.org/support/guides/manage-meta-robots/
    unverified: true,
  },
  shopify: {
    supported: true,
    steps: [
      "Si la page a été volontairement masquée via le metafield « seo.hidden » ou via du code Liquid conditionnel injectant <meta name=\"robots\" content=\"noindex\">, retirez cette règle pour la page concernée.",
      "Vérifiez aussi que le produit ou la page n'a pas le statut « Non répertorié » (Unlisted), qui le masque du sitemap et donc de la découverte par les robots.",
    ],
    // Source : https://help.shopify.com/en/manual/promoting-marketing/seo/hide-a-page-from-search-engines
  },
  wix: {
    supported: true,
    steps: [
      "Ouvrez les réglages SEO de la page concernée (panneau SEO côté page dans l'éditeur Wix) et vérifiez l'option qui exclut la page des résultats de recherche : décochez-la si elle est activée.",
    ],
    note: "Le libellé exact de cette option dans l'interface Wix actuelle n'a pas été reconfirmé pendant la rédaction de ce catalogue.",
    unverified: true,
  },
  squarespace: {
    supported: true,
    steps: [
      "Ouvrez l'onglet SEO du panneau de réglages de la page concernée, et vérifiez l'option qui la cache des moteurs de recherche : décochez-la si elle est activée.",
    ],
    note: "Le libellé exact de cette option dans l'interface Squarespace actuelle n'a pas été reconfirmé pendant la rédaction de ce catalogue.",
    unverified: true,
  },
  webflow: {
    supported: true,
    steps: [
      "Dans les réglages de la page (Page Settings) > onglet SEO, vérifiez l'option qui exclut la page des moteurs de recherche : décochez-la si elle est activée, puis republiez le site.",
    ],
    note: "Le libellé exact de cette option dans l'interface Webflow actuelle n'a pas été reconfirmé pendant la rédaction de ce catalogue.",
    unverified: true,
  },
  drupal: {
    supported: true,
    steps: [
      "Si le module Metatag est utilisé (le plus courant sur Drupal) : Configuration > Recherche et métadonnées > Metatag, et retirez la balise robots noindex définie globalement ou pour ce type de contenu.",
    ],
    note: "Suppose l'utilisation du module Metatag ; un site sans ce module peut définir le noindex directement dans le thème (Twig), auquel cas il faut chercher dans le code.",
    unverified: true,
  },
  prestashop: {
    supported: true,
    steps: [
      "Dans la fiche produit ou la page CMS concernée, vérifiez le réglage de référencement (méta-balises) et retirez toute directive noindex ajoutée manuellement ou par un module tiers de SEO.",
    ],
    unverified: true,
  },
  customNextNuxt: {
    supported: true,
    steps: [
      "Next.js : retirez `robots: { index: false }` (ou équivalent) de l'export `metadata` / `generateMetadata` de la page concernée.",
      "Nuxt : retirez la meta noindex ajoutée via useSeoMeta/useHead, ou le réglage correspondant dans la configuration du module SEO, pour cette route précise.",
    ],
    // Source : https://nextjs.org/learn/seo/metatags
  },
  customReactVue: {
    supported: true,
    steps: [
      "Cherchez dans le code la balise <meta name=\"robots\" content=\"noindex\"> injectée pour cette page, et retirez-la.",
      "Si aucune balise de ce type n'existe dans le code, l'en-tête est probablement ajouté par le serveur ou le CDN plutôt que par l'application (voir la section pare-feu / hébergeur).",
    ],
  },
};

export const NOINDEX_GENERAL_STEPS = [
  // Source : http.dev/x-robots-tag, MDN (X-Robots-Tag header) et Search Engine Journal.
  "Si aucun des réglages ci-dessus n'est activé, vérifiez que ce n'est pas le serveur ou le CDN qui ajoute l'en-tête HTTP X-Robots-Tag: noindex (par exemple une ligne « Header set X-Robots-Tag » dans un fichier .htaccess Apache, ou « add_header X-Robots-Tag » dans une configuration Nginx).",
];
