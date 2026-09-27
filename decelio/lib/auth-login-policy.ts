import { createHash } from "node:crypto";

/**
 * Limitation de débit sur la connexion par identifiants.
 *
 * Deux clés, deux seuils :
 * - par IP (`callerKey(request, "login")`) : 10 tentatives par 15 minutes.
 *   Couvre la force brute depuis une seule source.
 * - par e-mail normalisé : 5 tentatives par 15 minutes. Couvre le bourrage
 *   d'identifiants (« credential stuffing ») mené depuis des IP différentes
 *   contre un même compte.
 *
 * Chaque tentative compte, réussie ou non : la fenêtre est incrémentée avant
 * la vérification du mot de passe (voir `authorizeCredentials` dans
 * `auth.ts`). Un utilisateur légitime ne se trompe pas dix fois de mot de
 * passe ni ne recharge la page de connexion dix fois en quinze minutes ; ces
 * seuils laissent de la marge à une erreur de frappe répétée sans ouvrir la
 * porte à un essai systématique.
 */
export const LOGIN_IP_LIMIT = 10;
export const LOGIN_IP_WINDOW_MS = 15 * 60 * 1000;

export const LOGIN_EMAIL_LIMIT = 5;
export const LOGIN_EMAIL_WINDOW_MS = 15 * 60 * 1000;

/**
 * Clé de limitation de débit par e-mail, sans jamais stocker l'e-mail en
 * clair : seul son empreinte SHA-256 est écrite en base (table `RateLimit`).
 */
export function loginEmailRateLimitKey(email: string): string {
  const normalized = email.trim().toLowerCase();
  const digest = createHash("sha256").update(normalized).digest("hex");
  return `login-email:${digest}`;
}
