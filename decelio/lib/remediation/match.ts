import { REMEDIATION_CAUSES, UNKNOWN_CAUSE } from "./catalog";
import type { RemediationCause } from "./types";

export interface MatchedReason {
  /** Chaîne technique brute telle que produite par `ScanCoreResult.reasons`. */
  reason: string;
  cause: RemediationCause;
}

/**
 * Associe chaque chaîne technique de `reasons` à sa cause du catalogue,
 * dans l'ordre reçu. Une chaîne non reconnue tombe sur `UNKNOWN_CAUSE` (avec
 * son texte brut conservé) plutôt que d'être silencieusement ignorée : mieux
 * vaut un « à investiguer » honnête qu'un correctif disparu sans trace.
 */
export function matchReason(reason: string): RemediationCause {
  return REMEDIATION_CAUSES.find((cause) => cause.matches(reason)) ?? UNKNOWN_CAUSE;
}

/**
 * Version dédupliquée pour un seul bot : plusieurs raisons peuvent pointer
 * vers la même cause (cela n'arrive pas avec le catalogue actuel, mais reste
 * possible si `reasons` contient un jour un doublon) — la cause n'apparaît
 * alors qu'une fois, dans l'ordre de sa première occurrence.
 */
export function matchReasons(reasons: string[]): RemediationCause[] {
  const seen = new Set<string>();
  const out: RemediationCause[] = [];
  for (const reason of reasons) {
    const cause = matchReason(reason);
    if (seen.has(cause.id)) continue;
    seen.add(cause.id);
    out.push(cause);
  }
  return out;
}

/**
 * Étend `matchReasons` en gardant le texte technique brut associé à chaque
 * cause retenue (utile pour un affichage de type « Cause : <texte traduit> »
 * qui garde une trace du signal d'origine si besoin de débogage).
 */
export function matchReasonsWithSource(reasons: string[]): MatchedReason[] {
  const seen = new Set<string>();
  const out: MatchedReason[] = [];
  for (const reason of reasons) {
    const cause = matchReason(reason);
    if (seen.has(cause.id)) continue;
    seen.add(cause.id);
    out.push({ reason, cause });
  }
  return out;
}

/**
 * Causes distinctes rencontrées à travers plusieurs résultats (par exemple
 * tous les bots d'un même rapport de scan), dans l'ordre de première
 * apparition. Sert à construire une annexe unique de correctifs plutôt que
 * de répéter les mêmes marches à suivre pour chaque bot concerné.
 */
export function collectUniqueCauses(reasonsList: string[][]): RemediationCause[] {
  const seen = new Set<string>();
  const out: RemediationCause[] = [];
  for (const reasons of reasonsList) {
    for (const cause of matchReasons(reasons)) {
      if (seen.has(cause.id)) continue;
      seen.add(cause.id);
      out.push(cause);
    }
  }
  return out;
}
