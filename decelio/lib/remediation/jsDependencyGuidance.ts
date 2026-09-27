import type { CmsKey, PlatformGuidance } from "./types";

/**
 * Marche à suivre par plateforme pour une page « coquille vide » : le HTML
 * brut ne contient presque pas de texte, le contenu n'arrivant qu'après
 * exécution de JavaScript. Un robot qui n'exécute pas de script (la plupart
 * des robots des assistants IA aujourd'hui) ne voit alors presque rien à lire.
 *
 * Rappel de fiabilité (voir `RemediationCause.caveat`) : ce diagnostic est
 * une présomption basée sur un seul indice — le nombre de mots dans le HTML
 * brut — car le moteur de rendu JavaScript du scanner est inactif en
 * production (`lib/scanner/renderer.ts` renvoie toujours `noopRenderer`).
 * Les plateformes qui rendent nativement le contenu côté serveur ne sont
 * donc listées ici que pour mémoire : le diagnostic les concerne rarement.
 */
export const JS_DEPENDENCY_CMS_GUIDANCE: Partial<Record<CmsKey, PlatformGuidance>> = {
  wordpress: {
    supported: true,
    steps: [
      "Un WordPress classique (thème PHP, rendu côté serveur) n'est presque jamais concerné par ce diagnostic.",
      "S'il apparaît malgré tout, vérifiez qu'aucune extension n'a transformé la page en application JavaScript pure (page builder qui charge son contenu uniquement après coup, thème « headless ») : dans ce cas, la correction est la même que pour un site sur mesure ci-dessous, et nécessite un développeur.",
    ],
  },
  shopify: {
    supported: true,
    steps: [
      "Les thèmes Shopify standards (Liquid, rendu côté serveur) ne sont pas concernés.",
      "Si le site utilise un front-end headless (Hydrogen, ou un thème personnalisé fortement basé sur du JavaScript côté client), il faut mettre en place un rendu côté serveur ou un pré-rendu pour les robots qui n'exécutent pas de JavaScript.",
    ],
  },
  wix: {
    supported: false,
    steps: [],
    note: "Les sites Wix classiques (éditeur Wix, Wix Studio standard) rendent l'essentiel du contenu côté serveur : ce diagnostic est rare. S'il apparaît, il s'agit probablement d'un contenu ajouté via une app tierce ou du code embarqué (iframe/JavaScript), qu'un robot sans exécution de script ne pourra pas lire — sans correctif simple depuis l'interface Wix.",
  },
  squarespace: {
    supported: false,
    steps: [],
    note: "Les sites Squarespace sont rendus côté serveur par défaut : ce diagnostic est rare, sauf contenu tiers embarqué en JavaScript, qu'un robot sans exécution de script ne pourra pas lire — sans correctif simple depuis l'interface Squarespace.",
  },
  webflow: {
    supported: false,
    steps: [],
    note: "Les sites Webflow sont rendus côté serveur/statique par défaut : ce diagnostic est rare, sauf contenu interactif tiers en JavaScript, qu'un robot sans exécution de script ne pourra pas lire — sans correctif simple depuis l'interface Webflow.",
  },
  drupal: {
    supported: true,
    steps: [
      "Les thèmes Drupal classiques (Twig, rendu côté serveur) ne sont pas concernés.",
      "Si le front-end a été découplé (Drupal « headless », consommé par une application React/Vue/Next.js séparée), voir « Site sur mesure » ci-dessous : la solution se joue côté application front, pas côté Drupal.",
    ],
  },
  prestashop: {
    supported: true,
    steps: [
      "Les thèmes PrestaShop classiques (Smarty, rendu côté serveur) ne sont pas concernés.",
      "Si une refonte a introduit un front-end JavaScript pur (PWA, thème headless), la solution est la même que pour un site sur mesure : mettre en place un rendu côté serveur ou une génération statique.",
    ],
  },
  customNextNuxt: {
    supported: true,
    steps: [
      "Next.js : privilégiez le rendu côté serveur (Server Components, ou `getServerSideProps` en Pages Router) ou la génération statique (SSG/ISR), pour que le texte soit déjà présent dans le HTML renvoyé au premier chargement, sans dépendre de l'exécution de JavaScript côté client.",
      "Nuxt : vérifiez que le mode de rendu du projet est bien SSR ou génération statique (`nuxt generate`), et non un mode application monopage pur (`ssr: false`), qui livre une coquille HTML vide au premier chargement.",
    ],
  },
  customReactVue: {
    supported: true,
    steps: [
      "Une application React/Vue en application monopage pure (par exemple créée avec Vite, sans framework de méta-rendu) livre par défaut une coquille HTML quasi vide.",
      "Pour être lisible par les robots qui n'exécutent pas de JavaScript, ajoutez un rendu côté serveur ou une génération statique — par exemple via un framework comme Next.js, Nuxt ou Astro, ou via un service de pré-rendu qui sert une version HTML aux robots.",
    ],
  },
};
