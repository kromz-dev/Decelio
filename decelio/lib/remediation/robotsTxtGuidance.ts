import type { CmsKey, PlatformGuidance } from "./types";

/**
 * Marche à suivre par plateforme pour retirer une règle qui bloque un robot
 * dans robots.txt (ou pour s'assurer que le fichier est bien accessible).
 * Partagée entre les causes « robots.txt interdit ce robot » et « robots.txt
 * injoignable », dont le correctif final est le même une fois le fichier de
 * nouveau accessible.
 */
export const ROBOTS_TXT_CMS_GUIDANCE: Partial<Record<CmsKey, PlatformGuidance>> = {
  wordpress: {
    supported: true,
    steps: [
      "Si aucune extension SEO n'est installée : WordPress affiche un robots.txt « virtuel » tant qu'aucun fichier physique n'existe à la racine. Créez ou modifiez directement ce fichier via le gestionnaire de fichiers de l'hébergeur ou en FTP.",
      "Retirez la ligne « Disallow » qui vise ce robot dans le groupe User-agent correspondant (ou dans le groupe générique « User-agent: * » si aucun groupe dédié n'existe).",
    ],
    // Source : developer.wordpress.org/reference/functions/do_robots/
    // (WordPress ne sert un fichier réel que si l'un existe physiquement à la racine).
  },
  wordpressYoast: {
    supported: true,
    steps: [
      "Dans le tableau de bord WordPress : Yoast SEO > Outils > Éditeur de fichiers (File editor).",
      "Modifiez directement le contenu du fichier robots.txt affiché, retirez la ligne Disallow visant ce robot, puis enregistrez.",
    ],
    note: "Yoast recommande de ne modifier le robots.txt que pour des cas complexes ; pour retirer un simple site ou une page de l'index, une balise noindex est en général l'outil plus sûr.",
    // Source : https://yoast.com/help/how-to-edit-robots-txt-through-yoast-seo/
    // et https://developer.yoast.com/features/robots-txt/functional-specification/
  },
  wordpressRankMath: {
    supported: true,
    steps: [
      "Activez le « Mode avancé » (Advanced Mode) dans Rank Math SEO : l'éditeur robots.txt n'apparaît qu'à partir de ce mode.",
      "Allez dans Rank Math SEO > Réglages généraux (General Settings) > Modifier le robots.txt (Edit robots.txt), retirez la ligne Disallow visant ce robot, puis enregistrez.",
    ],
    note: "Si un fichier robots.txt physique existe déjà sur le serveur, l'éditeur virtuel de Rank Math n'a aucun effet : il faut alors modifier ce fichier par FTP, ou le supprimer pour laisser Rank Math prendre le relais.",
    // Source : https://rankmath.com/kb/how-to-edit-robots-txt-with-rank-math/
    // et https://rankmath.com/kb/cant-edit-robots-txt/
  },
  wordpressSeopress: {
    supported: true,
    steps: [
      "Allez dans SEO > PRO > onglet robots.txt, activez « Enable robots.txt virtual file ».",
      "Modifiez le contenu dans le champ « Virtual Robots.txt file », retirez la ligne Disallow visant ce robot, puis cliquez sur Enregistrer.",
    ],
    note: "Fonctionnalité de la version PRO. SEOPress conserve un historique des 30 dernières versions du fichier, utile pour revenir en arrière en cas d'erreur.",
    // Source : https://www.seopress.org/support/guides/edit-robots-txt-file/
  },
  shopify: {
    supported: true,
    steps: [
      "Depuis l'admin Shopify : Boutique en ligne > Modifier le code, sur le thème actif.",
      "Dans le dossier Templates, créez (s'il n'existe pas) ou ouvrez le fichier « robots.txt.liquid ».",
      "Ajoutez une règle Liquid qui autorise explicitement ce robot, en vous appuyant sur les blocs générés par défaut par Shopify plutôt qu'en réécrivant tout le fichier — cela conserve les mises à jour automatiques de Shopify sur le reste du fichier.",
    ],
    note: "Modification explicitement qualifiée de « non supportée » par Shopify : une erreur peut faire perdre tout le trafic des moteurs de recherche. Faites relire par un partenaire Shopify si vous n'êtes pas à l'aise avec Liquid.",
    // Source : https://shopify.dev/docs/storefronts/themes/seo/robots-txt
    // et https://help.shopify.com/en/manual/promoting-marketing/seo/editing-robots-txt
  },
  wix: {
    supported: true,
    steps: [
      "Dans le tableau de bord Wix : SEO (ou « SEO & GEO ») > Outils avancés > Éditeur de robots.txt (Robots.txt Editor).",
      "Repérez la ligne Disallow visant ce robot et supprimez-la, ou ajustez le groupe User-agent correspondant.",
    ],
    note: "Wix qualifie cette fonctionnalité d'« avancée » et précise explicitement que son service client n'aide pas au débogage des modifications qui y sont apportées : testez avant de publier.",
    // Source : https://support.wix.com/en/article/editing-your-sites-robotstxt-file
  },
  squarespace: {
    supported: true,
    steps: [
      "Allez dans Réglages > Exploration (Crawlers) et décochez la case « Bloquer les robots d'IA connus », si elle est cochée : Squarespace pilote une liste fixe d'une trentaine de robots IA (dont GPTBot, ClaudeBot, Google-Extended) via cette seule case.",
    ],
    note: "Squarespace ne permet ni d'écrire une règle Disallow personnalisée pour un robot absent de sa liste fixe, ni d'éditer librement le fichier robots.txt ; cette case n'existe que sur les plans Business et supérieurs (Personal : aucun contrôle natif). Si le robot bloqué n'est pas dans la liste Squarespace, il n'y a pas de correctif possible depuis l'interface : à signaler au client comme une limite de la plateforme plutôt que d'inventer un réglage qui n'existe pas.",
    // Source : synthèse de la documentation Squarespace (Request that AI models exclude your site)
    // et de guides tiers recoupés (collaborada.com, squareranked.com) ; le libellé exact du menu
    // (« Crawlers ») est à reconfirmer dans l'interface au moment de l'intervention.
    unverified: true,
  },
  webflow: {
    supported: true,
    steps: [
      "Dans Project Settings > SEO > Indexing, ouvrez l'éditeur de robots.txt.",
      "Retirez la ligne Disallow visant ce robot, puis republiez le site : les changements ne s'appliquent qu'après publication.",
    ],
    note: "Fonctionnalité réservée aux sites sur un plan payant avec un domaine personnalisé connecté (plan gratuit : non disponible).",
    // Source : https://developers.webflow.com/data/reference/enterprise/site-configuration/robots-txt/put
    // (existence de l'API confirmée) ; l'emplacement exact du menu dans l'éditeur (Project Settings >
    // SEO > Indexing) provient de guides tiers recoupés et reste à reconfirmer dans l'interface actuelle.
    unverified: true,
  },
  drupal: {
    supported: true,
    steps: [
      "Si le module contributif « RobotsTxt » (drupal/robotstxt) est installé : Administration > Configuration > Recherche et métadonnées > RobotsTxt, retirez la ligne Disallow visant ce robot.",
      "Sans ce module : robots.txt est un fichier statique livré par le cœur de Drupal à la racine du site ; modifiez-le directement par FTP/SFTP ou via le gestionnaire de fichiers de l'hébergeur.",
    ],
    note: "Si le module est installé, un fichier robots.txt physique doit être supprimé/renommé à la racine, sinon le serveur web le sert en priorité et le module n'a aucun effet.",
    // Source : https://www.drupal.org/project/robotstxt
  },
  prestashop: {
    supported: true,
    steps: [
      "Dans le back-office : Paramètres de la boutique > Trafic & SEO, bouton « Générer le fichier robots.txt ».",
      "Ajoutez ensuite manuellement la ligne qui autorise ce robot dans le fichier généré (par FTP ou gestionnaire de fichiers).",
    ],
    note: "Cliquer sur « Générer le fichier robots.txt » réécrit tout le fichier selon les réglages de PrestaShop et efface les modifications manuelles précédentes : ajoutez toujours vos règles personnalisées après une régénération, jamais avant.",
    // Source : https://docs.prestashop-project.org/v.8-documentation/user-guide/configuring-shop/shop-parameters/traffic/seo-and-urls
    // et https://build.prestashop-project.org/test-scenarios/scenarios/core/functional/bo/shop-parameters/trafic-and-seo/seo-and-urls/robots-file-generation.html
  },
  customNextNuxt: {
    supported: true,
    steps: [
      "Next.js (App Router) : éditez le fichier app/robots.ts (ou robots.js), qui génère la réponse /robots.txt. Retirez la règle Disallow visant ce robot dans l'objet retourné, puis redéployez.",
      "Nuxt : éditez la configuration du module de robots (« Nuxt Robots » / @nuxtjs/robots) dans nuxt.config, retirez la règle Disallow visant ce robot, puis redéployez.",
    ],
    // Source : https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
    // et https://nuxtseo.com/docs/robots/guides/nuxt-config
  },
  customReactVue: {
    supported: true,
    steps: [
      "Sur un site généré sans méta-framework (React/Vue en application monopage, build statique), robots.txt est un simple fichier statique servi tel quel (souvent dans le dossier public/ ou dist/) : modifiez-le directement dans le dépôt de code, puis redéployez.",
    ],
    note: "Il n'y a pas d'interface d'administration pour ce cas : la correction passe systématiquement par un développeur et un redéploiement.",
  },
};

export const ROBOTS_TXT_UNREACHABLE_CMS_NOTE =
  "Vérifiez d'abord que https://votre-domaine/robots.txt s'affiche bien dans un navigateur. S'il ne charge pas du tout (page blanche, erreur serveur), il s'agit probablement d'un problème d'hébergement ou de pare-feu plutôt que d'un réglage à changer dans le CMS : voir la section pare-feu / hébergeur ci-dessous une fois l'accès rétabli.";
