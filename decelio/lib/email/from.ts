/** Expediteur par defaut : necessite un domaine verifie chez Resend. */
export const DEFAULT_EMAIL_FROM = "Decelio <bonjour@decelio.fr>";

/**
 * Expediteur a utiliser pour tout envoi Resend (alertes, e-mails
 * transactionnels). Lit `ALERT_FROM_EMAIL` a chaque appel (jamais mis en
 * cache) pour permettre un repli configurable en local, sans domaine
 * verifie, sans jamais changer le comportement en production tant que la
 * variable n'est pas definie.
 */
export function emailFrom(): string {
  const value = process.env.ALERT_FROM_EMAIL?.trim();
  return value ? value : DEFAULT_EMAIL_FROM;
}
