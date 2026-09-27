import type { BotAgent } from "./agents";
import type { ScanReport } from "./core";
import type { VerdictValue } from "@/components/ui/verdict";

/**
 * Un assistant par bot de citation (pas d'entraînement) : c'est ce qui
 * détermine si l'assistant peut citer le site dans une réponse.
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

  if (access.risk === "unreachable" || access.risk === "http_error") {
    return {
      value: "inconnu",
      cause:
        access.risk === "unreachable"
          ? `Le site n'a pas répondu${access.error ? ` (${access.error})` : ""}.`
          : `Le site a répondu avec une erreur HTTP ${access.httpStatus}.`,
    };
  }

  const policy = robots.policies.find((p) => p.bot === bot);
  if (policy?.verdict === "disallowed") {
    return {
      value: "refuse",
      cause:
        robots.fetchStatus === "unreachable"
          ? "Le fichier robots.txt est injoignable ; par précaution, tout est interdit."
          : `Le fichier robots.txt interdit ${policy.token}.`,
      fix: "Autoriser ce robot dans robots.txt.",
    };
  }

  if (access.risk === "challenged" || access.risk === "blocked") {
    return {
      value: "refuse",
      cause:
        access.risk === "challenged"
          ? "Un pare-feu ou un challenge de sécurité répond avant le contenu."
          : `Le site refuse la requête (HTTP ${access.httpStatus}).`,
      fix: "Autoriser ce robot dans les règles du pare-feu ou du plugin de sécurité.",
    };
  }

  if (jsDependency.verdict === "js_dependent" || jsDependency.verdict === "likely_js_dependent") {
    return {
      value: "vide",
      cause: `La page arrive quasi vide sans exécuter de JavaScript (${jsDependency.rawWordCount} mots).`,
      fix: "Pré-rendre le contenu côté serveur (SSR/SSG) pour les robots qui n'exécutent pas de script.",
    };
  }

  return { value: "lu", cause: "Le robot peut lire le contenu normalement." };
}

export function robotsSummary(report: ScanReport): ResultSummary {
  const { robots } = report;
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
    return { value: "lu", cause: "robots.txt autorise ChatGPT, Claude et Perplexity à citer ce site." };
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
      return {
        value: "refuse",
        cause: `Un pare-feu ou un challenge de sécurité répond à la place du contenu${
          access.signals.length ? ` (${access.signals.join(", ")})` : ""
        }.`,
        fix: "Autoriser les robots IA vérifiés dans les règles du pare-feu (Cloudflare, Wordfence, hébergeur).",
      };
    case "blocked":
      return {
        value: "refuse",
        cause: `Le site refuse la requête (HTTP ${access.httpStatus}).`,
        fix: "Vérifier les règles de sécurité qui bloquent ce code réponse.",
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
