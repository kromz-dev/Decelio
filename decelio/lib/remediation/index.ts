/**
 * Catalogue de correctifs multi-plateformes : traduit les causes techniques
 * détectées par le scanner (`lib/scanner/*`) en fiches compréhensibles par un
 * gérant de PME, avec une marche à suivre par CMS et par pare-feu/hébergeur.
 *
 * Point d'entrée public du module — voir `types.ts` pour le détail des
 * champs et `match.ts` pour la logique de correspondance.
 */
export type {
  CmsKey,
  Effort,
  FirewallKey,
  PlatformGuidance,
  RemediationCause,
  Severity,
} from "./types";
export { CMS_LABELS, FIREWALL_LABELS } from "./types";
export { REMEDIATION_CAUSES, UNKNOWN_CAUSE } from "./catalog";
export {
  collectUniqueCauses,
  matchReason,
  matchReasons,
  matchReasonsWithSource,
} from "./match";
export type { MatchedReason } from "./match";
