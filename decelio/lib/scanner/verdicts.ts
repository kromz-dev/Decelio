import type { BotAgent } from "./agents";
import type { ScanReport } from "./core";
import type { VerdictValue } from "@/components/ui/verdict";

/**
 * Un assistant par bot (pas d'entraînement) : c'est le robot qui lit
 * les pages quand l'assistant cherche une réponse.
 *
 * Logique partagée entre `ScanForm` (scan depuis la page d'accueil) et la
 * page de résultat partageable `/analyse/[domain]` : mêmes verdicts, pour
 * ne pas dupliquer ni faire diverger les deux affichages.
 */
export const ASSISTANTS: { label: string; bot: BotAgent }[] = [
  { label: "ChatGPT", bot: "OAI-SearchBot" },
  { label: "Claude", bot: "Claude-SearchBot" },
  { label: "Perplexity", bot: "PerplexityBot" },
];

export interface ResultSummary {
  value: VerdictValue;
  cause: string;
  fix?: string;
}

export function verdictForBot(report: ScanReport, bot: BotAgent): ResultSummary {
  const { access, robots, jsDependency } = report;

  // robots.txt réellement lu qui nomme ce robot est une preuve indépendante
  // de la requête honnête : elle prime sur tout le reste. Un simple défaut de
  // lecture de robots.txt (injoignable / challengé) donne aussi un verdict
  // « disallowed » par précaution, mais ce n'est pas un ciblage nommé — voir
  // plus bas, une fois le blocage général écarté.
  const policy = robots.policies.find((p) => p.bot === bot);
  const robotsNamesThisBot = robots.fetchStatus === "ok" && policy?.verdict === "disallowed";
  const robotsUnreadablePrecaution = robots.fetchStatus !== "ok" && policy?.verdict === "disallowed";

  if (robotsNamesThisBot) {
    return {
      value: "refuse",
      cause: `Le fichier robots.txt interdit ${policy!.token}.`,
      fix: "Autoriser ce robot dans robots.txt.",
    };
  }

  // Priorité à « inconnu » (site injoignable) : si la requête honnête n'a
  // aucune réponse, c'est ce qu'il faut signaler, pas une précaution sur
  // robots.txt.
  if (access.risk === "unreachable" || access.risk === "http_error") {
    return {
      value: "inconnu",
      cause:
        access.risk === "unreachable"
          ? `Le site n'a pas répondu${access.error ? ` (${access.error})` : ""}.`
          : `Le site a répondu avec une erreur HTTP ${access.httpStatus}.`,
    };
  }

  // Blocage général : la requête honnête elle-même est refusée ou challengée.
  // Rien (ni robots.txt, ni une sonde) ne prouve que ce robot précis est
  // visé — un robots.txt illisible à cause du même blocage n'est pas un
  // ciblage nommé — donc « à vérifier », jamais un verdict tranché
  // (constitution, principe I).
  if (access.risk === "challenged" || access.risk === "blocked") {
    return {
      value: "inconnu",
      cause:
        "Le site refuse toutes les requêtes, y compris une visite ordinaire : impossible de dire si les robots IA sont visés en particulier. À vérifier.",
      fix: "Vérifier manuellement, dans les journaux du serveur ou du pare-feu, si ce robot est explicitement visé.",
    };
  }

  // La page se charge normalement, mais robots.txt lui-même est injoignable
  // ou challengé : par précaution, on refuse.
  if (robotsUnreadablePrecaution) {
    return {
      value: "refuse",
      cause: "Le fichier robots.txt est injoignable ; par précaution, tout est interdit.",
      fix: "Vérifier que /robots.txt répond correctement depuis l'hébergeur.",
    };
  }

  // La requête honnête passe, mais une sonde qui se présente comme ce robot
  // est bloquée : un indice à forte valeur, jamais une preuve (le site peut
  // vérifier ce robot par IP, ce que nous ne faisons pas).
  const probe = access.unverifiedProbes.find((p) => p.claimedBot === bot);
  if (probe && probe.differsFromBaseline && probe.rateLimitUnconfirmed) {
    // 429 isolé pendant la rafale de requêtes vers le même hôte, sans
    // confirmation par une nouvelle tentative (budget insuffisant) : ce
    // n'est pas la preuve d'un blocage (fix/scanner-sans-auto-429).
    return {
      value: "inconnu",
      cause: `Une requête non vérifiée se présentant comme ${bot} a reçu un code 429 (limite de débit), non confirmé par une nouvelle tentative. Un 429 isolé n'est pas la preuve d'un blocage. À vérifier.`,
    };
  }
  if (probe && probe.differsFromBaseline && (probe.risk === "blocked" || probe.risk === "challenged")) {
    return {
      value: "refuse",
      cause: `Une requête non vérifiée se présentant comme ${bot} a été bloquée (HTTP ${probe.httpStatus}) alors que notre visite ordinaire passe. Un indice, pas une preuve : le site vérifie peut-être ce robot par IP.`,
      fix: "Vérifier dans les journaux du serveur si ce robot est explicitement bloqué, puis l'autoriser.",
    };
  }

  if (jsDependency.verdict === "js_dependent" || jsDependency.verdict === "likely_js_dependent") {
    return {
      value: "vide",
      cause: `La page arrive quasi vide sans exécuter de JavaScript (${jsDependency.rawWordCount} mots).`,
      fix: "Pré-rendre le contenu côté serveur (SSR/SSG) pour les robots qui n'exécutent pas de script.",
    };
  }

  // Texte court, mais aucun indice de rendu côté client (pas de racine
  // d'application, pas de bundle d'hydratation, pas de <noscript>) : ce
  // n'est pas une preuve de dépendance au JavaScript, juste une page peu
  // textuelle. « À vérifier », jamais un verdict tranché.
  if (jsDependency.verdict === "low_text") {
    return {
      value: "inconnu",
      cause: `Le HTML brut est court (${jsDependency.rawWordCount} mots), mais rien n'indique qu'il dépend du JavaScript. À vérifier.`,
    };
  }

  return { value: "lu", cause: "Le robot peut lire le contenu normalement." };
}

export function robotsSummary(report: ScanReport): ResultSummary {
  const { robots } = report;
  // Chaque valeur de `fetchStatus` a son propre retour anticipé : une nouvelle
  // valeur s'ajoute comme un bloc `if` de plus, sans toucher au reste de la
  // fonction. Seul un robots.txt réellement lu (« ok ») arrive au calcul final.
  if (robots.fetchStatus === "unreachable") {
    return {
      value: "inconnu",
      cause: "Le fichier robots.txt est injoignable (panne ou délai dépassé).",
      fix: "Vérifier que /robots.txt répond correctement depuis l'hébergeur.",
    };
  }
  if (robots.fetchStatus === "challenged") {
    return {
      value: "inconnu",
      cause: "Un pare-feu répond à la place du fichier robots.txt : sa politique est illisible.",
    };
  }
  if (robots.fetchStatus === "blocked") {
    // 401/403/429 sans page de challenge reconnue : le plus souvent un
    // pare-feu qui refuse la requête vers robots.txt elle-même. Conclure
    // « tout est autorisé » comme pour un 404 serait un verdict non prouvé.
    return {
      value: "inconnu",
      cause: "Le serveur refuse l'accès au fichier robots.txt : ses règles sont illisibles. À vérifier.",
      fix: "Vérifier que /robots.txt s'ouvre normalement et qu'aucun pare-feu ne le bloque.",
    };
  }
  if (robots.fetchStatus === "unavailable") {
    return { value: "lu", cause: "Le fichier robots.txt n'existe pas (404) : tout est autorisé par défaut." };
  }
  const disallowed = ASSISTANTS.filter(
    (a) => robots.policies.find((p) => p.bot === a.bot)?.verdict === "disallowed"
  );
  if (disallowed.length === 0) {
    return { value: "lu", cause: "robots.txt autorise ChatGPT, Claude et Perplexity à lire ce site." };
  }
  return {
    value: "refuse",
    cause: `robots.txt interdit ${disallowed.map((a) => a.label).join(", ")}.`,
    fix: "Autoriser ces robots dans robots.txt avec un groupe User-agent dédié.",
  };
}

export function accessSummary(report: ScanReport): ResultSummary {
  const { access } = report;
  switch (access.risk) {
    case "ok":
      return { value: "lu", cause: `Le site répond normalement (HTTP ${access.httpStatus}).` };
    case "challenged":
      // Blocage général : même logique qu'en verdictForBot. Voir ligne ~63.
      // Rien ne prouve que ce blocage vise spécifiquement les robots IA.
      return {
        value: "inconnu",
        cause: `Un pare-feu ou un challenge de sécurité répond à la place du contenu${
          access.signals.length ? ` (${access.signals.join(", ")})` : ""
        }. À vérifier.`,
        fix: "Vérifier manuellement si ce pare-feu cible spécifiquement les robots IA.",
      };
    case "blocked":
      // Blocage général : même logique qu'en verdictForBot. Voir ligne ~63.
      // Rien ne prouve que ce refus vise spécifiquement les robots IA.
      return {
        value: "inconnu",
        cause: `Le site refuse toutes les requêtes (HTTP ${access.httpStatus}). À vérifier.`,
        fix: "Vérifier manuellement, dans les journaux du serveur, si ce refus cible spécifiquement les robots IA.",
      };
    case "http_error":
      return { value: "inconnu", cause: `Le site répond avec une erreur HTTP ${access.httpStatus}.` };
    case "unreachable":
      return {
        value: "inconnu",
        cause: `Le site n'a pas répondu${access.error ? ` : ${access.error}` : "."}`,
      };
  }
}

export function jsSummary(report: ScanReport): ResultSummary {
  const { jsDependency, access } = report;
  if (access.risk !== "ok") {
    return { value: "inconnu", cause: "Non mesuré : la page n'a pas pu être chargée normalement (voir Accès)." };
  }
  switch (jsDependency.verdict) {
    case "static":
      return { value: "lu", cause: `Le texte utile est présent dans le HTML brut (${jsDependency.rawWordCount} mots).` };
    case "partial":
      return {
        value: "vide",
        cause: `Une partie du texte n'apparaît qu'après exécution du JavaScript (${jsDependency.rawWordCount} mots sur ${jsDependency.renderedWordCount ?? "?"} rendus).`,
        fix: "Pré-rendre les éléments importants côté serveur pour les robots qui n'exécutent pas de script.",
      };
    case "js_dependent":
      return {
        value: "vide",
        cause: `Le HTML brut est quasi vide (${jsDependency.rawWordCount} mots) : le contenu n'arrive qu'après JavaScript.`,
        fix: "Passer en rendu côté serveur (SSR/SSG) ou générer une version statique pour les robots.",
      };
    case "likely_js_dependent":
      return {
        value: "vide",
        cause: `Le HTML brut est très court (${jsDependency.rawWordCount} mots), sans confirmation par un rendu.`,
        fix: "Vérifier avec un rendu JavaScript, ou passer en rendu côté serveur.",
      };
    case "low_text":
      return {
        value: "inconnu",
        cause: `Le HTML brut est court (${jsDependency.rawWordCount} mots), sans indice de rendu côté client. À vérifier.`,
      };
    case "unknown":
      return { value: "inconnu", cause: "Impossible de mesurer le contenu de la page." };
  }
}

export const RISK_LABEL: Record<string, string> = {
  ok: "accès normal",
  challenged: "défi de sécurité",
  blocked: "bloqué",
  http_error: "erreur HTTP",
  unreachable: "injoignable",
};

export function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  } catch {
    return "";
  }
}
