/** Expéditeur par défaut : nécessite un domaine vérifié chez Resend. */
export const DEFAULT_EMAIL_FROM = "Decelio <bonjour@decelio.fr>";

/**
 * Expéditeur à utiliser pour tout envoi Resend (alertes, e-mails
 * transactionnels). Lit `ALERT_FROM_EMAIL` à chaque appel (jamais mis en
 * cache) pour permettre un repli configurable en local, sans domaine
 * vérifié, et sans rien changer en production tant que la variable n'est
 * pas définie.
 */
export function emailFrom(): string {
  const value = process.env.ALERT_FROM_EMAIL?.trim();
  return value ? value : DEFAULT_EMAIL_FROM;
}
