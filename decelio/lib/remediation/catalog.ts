import type { RemediationCause } from "./types";
import {
  ROBOTS_TXT_CMS_GUIDANCE,
  ROBOTS_TXT_UNREACHABLE_CMS_NOTE,
} from "./robotsTxtGuidance";
import { NOINDEX_CMS_GUIDANCE, NOINDEX_GENERAL_STEPS } from "./noindexGuidance";
import { JS_DEPENDENCY_CMS_GUIDANCE } from "./jsDependencyGuidance";
import { AI_BOT_FIREWALL_GUIDANCE, ACCESS_BLOCKED_CMS_GUIDANCE } from "./firewallGuidance";

/**
 * Catalogue de correctifs.
 *
 * Chaque entrée reconnaît une (ou plusieurs) des chaînes techniques produites
 * par `summarizeForBot` dans `lib/scanner/core.ts` — voir ce fichier pour la
 * liste exacte des formats. L'ordre de ce tableau reflète la gravité
 * décroissante utilisée par le scanner (blocage avant coquille vide avant
 * indexation), pas un ordre alphabétique.
 */
export const REMEDIATION_CAUSES: RemediationCause[] = [
  {
    id: "robots-disallow-rule",
    matches: (reason) => reason.startsWith("robots.txt disallows"),
    title: "Le fichier robots.txt interdit explicitement ce robot.",
    clientImpact:
      "Ce robot respecte les règles que vous publiez et s'interdit donc de lire votre site : il ne peut ni l'indexer ni le citer dans ses réponses. Concrètement, votre entreprise n'apparaît dans aucune réponse de cet assistant IA, même si le contenu du site est excellent.",
    severity: "élevée",
    effort: "faible",
    cms: ROBOTS_TXT_CMS_GUIDANCE,
  },
  {
    id: "robots-unreachable",
    matches: (reason) => reason.startsWith("robots.txt unreachable"),
    title: "Le fichier robots.txt n'a pas pu être chargé : par prudence, tout est considéré comme interdit.",
    clientImpact:
      "La norme suivie par les robots sérieux (dont ceux des grands assistants IA) impose de tout interdire quand robots.txt ne répond pas. Résultat : le site est traité comme entièrement fermé aux robots, alors que ce n'est peut-être qu'un incident technique.",
    severity: "élevée",
    effort: "moyen",
    cms: ROBOTS_TXT_CMS_GUIDANCE,
    generalSteps: [ROBOTS_TXT_UNREACHABLE_CMS_NOTE],
  },
  {
    id: "access-challenged",
    matches: (reason) => reason.startsWith("access challenged"),
    title: "Un pare-feu ou un système anti-robot répond à la place de votre contenu (défi de sécurité).",
    clientImpact:
      "Le robot ne voit ni la page ni son contenu : il reçoit une page de vérification (souvent un défi Cloudflare ou équivalent) et abandonne. Le site est donc invisible pour cet assistant IA, même si le contenu affiché aux visiteurs humains est irréprochable.",
    severity: "élevée",
    effort: "moyen",
    firewalls: AI_BOT_FIREWALL_GUIDANCE,
  },
  {
    id: "access-blocked",
    matches: (reason) => reason.startsWith("access blocked"),
    title: "Le site refuse directement la requête de ce robot.",
    clientImpact:
      "Le robot reçoit un refus explicite (accès interdit, authentification requise, ou trop de requêtes) : il ne peut pas lire le site, donc ne peut rien en citer. C'est souvent involontaire (protection par mot de passe restée active, réglage de pare-feu trop strict).",
    severity: "élevée",
    effort: "moyen",
    cms: ACCESS_BLOCKED_CMS_GUIDANCE,
    firewalls: AI_BOT_FIREWALL_GUIDANCE,
  },
  {
    id: "js-dependent",
    matches: (reason) => reason.startsWith("js_dependent:") || reason.startsWith("likely_js_dependent:"),
    title: "Le contenu semble n'apparaître qu'après exécution de JavaScript (probablement une « coquille vide » pour ce robot).",
    clientImpact:
      "Si ce robot n'exécute pas de JavaScript (c'est le cas de la plupart des robots de citation IA aujourd'hui), il ne verra quasiment aucun texte à citer, même si la page paraît complète dans un navigateur. Le site resterait alors invisible dans les réponses des assistants IA.",
    severity: "à vérifier",
    effort: "élevé",
    caveat:
      "Ce diagnostic est une présomption, pas un constat établi : il se base sur un seul indice (le nombre de mots présents dans le HTML brut), car le moteur de rendu JavaScript du scanner n'est pas encore activé en production. Avant d'engager une refonte technique, vérifiez manuellement le contenu réel envoyé à un robot (par exemple avec un outil qui affiche le HTML brut, sans exécuter de script).",
    cms: JS_DEPENDENCY_CMS_GUIDANCE,
  },
  {
    id: "noindex",
    matches: (reason) => reason === "noindex",
    title: "Une directive « noindex » interdit l'indexation de cette page pour ce robot.",
    clientImpact:
      "Même si le robot arrive à lire la page, une instruction explicite lui demande de ne pas la retenir ni la montrer dans ses résultats. C'est souvent un réglage oublié après une mise en ligne de test, plutôt qu'un choix délibéré.",
    severity: "élevée",
    effort: "faible",
    cms: NOINDEX_CMS_GUIDANCE,
    generalSteps: NOINDEX_GENERAL_STEPS,
  },
  {
    id: "site-unreachable",
    matches: (reason) => reason.startsWith("unreachable:"),
    title: "Le site n'a pas répondu à la requête de ce robot.",
    clientImpact:
      "Un site qui ne répond pas ne peut être ni lu, ni cité par aucun assistant IA — c'est le scénario le plus grave. Mais attention avant d'alerter le client sur une « panne » : voir la remarque ci-dessous.",
    severity: "à vérifier",
    effort: "variable",
    caveat:
      "Le scanner abandonne après 10 secondes d'attente : un site simplement lent à charger (hébergement surchargé, page très lourde) peut être classé ici par erreur, sans être réellement en panne. Avant de conclure à une panne, vérifiez que le site se charge normalement dans un navigateur classique et, si besoin, mesurez son temps de réponse avec un autre outil.",
    generalSteps: [
      "Ouvrez le site dans un navigateur pour confirmer qu'il répond réellement (et mesurez, ou faites mesurer, le temps de chargement de la page).",
      "Consultez la page de statut de votre hébergeur pour écarter une panne généralisée en cours (OVH, o2switch, Hostinger et Gandi publient chacun une page de statut ou un centre d'aide dédié aux incidents).",
      "Si le site répond mais lentement, la priorité est d'améliorer son temps de réponse (voir les recommandations de performance) plutôt que de chercher un blocage volontaire.",
      "Si le site ne répond vraiment pas, contactez votre hébergeur avec l'heure exacte du contrôle.",
    ],
  },
  {
    id: "http-error",
    matches: (reason) => /^http \d+$/.test(reason),
    title: "Le site a répondu par une erreur HTTP au moment du contrôle.",
    clientImpact:
      "Le robot a bien atteint le serveur, mais celui-ci a répondu par une erreur plutôt que par la page attendue : le contenu n'a donc pas pu être lu à ce moment précis.",
    severity: "à vérifier",
    effort: "variable",
    caveat:
      "Un code d'erreur HTTP peut être ponctuel (redémarrage du serveur, pic de trafic, maintenance en cours) plutôt que permanent. Avant de conclure à un problème durable, rechargez la page et consultez les journaux (logs) du serveur autour de l'heure du contrôle.",
    generalSteps: [
      "Rechargez la page dans un navigateur pour voir si l'erreur persiste.",
      "Consultez les journaux d'erreurs du serveur (ou ceux fournis par l'hébergeur) autour de l'heure du contrôle pour identifier la cause exacte du code retourné.",
      "Si l'erreur persiste, elle nécessite une investigation applicative (page cassée, base de données inaccessible, quota d'hébergement dépassé) plutôt qu'un simple réglage de visibilité.",
    ],
  },
];

/**
 * Cause de repli : une chaîne de `reasons` qui ne correspond à aucun format
 * connu de `lib/scanner/core.ts`. Ne devrait apparaître que si le scanner
 * évolue sans que ce catalogue soit mis à jour en même temps — d'où un
 * message honnête plutôt qu'une fausse explication.
 */
export const UNKNOWN_CAUSE: RemediationCause = {
  id: "unknown",
  matches: () => false, // jamais sélectionnée automatiquement ; voir match.ts
  title: "Cause technique non reconnue par le catalogue de correctifs.",
  clientImpact:
    "Le scanner a détecté un problème, mais sa description technique brute ne correspond à aucun scénario documenté ici.",
  severity: "à vérifier",
  effort: "variable",
  generalSteps: [
    "Transmettez la mention technique brute (affichée ci-dessus) à un développeur pour investigation : ce catalogue n'a pas encore de correctif documenté pour ce cas précis.",
  ],
};
