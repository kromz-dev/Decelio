/**
 * Échappe une valeur d'origine utilisateur avant de l'interpoler dans un
 * gabarit HTML d'e-mail. Les gabarits de `lib/email/resend.ts` construisent
 * leur HTML par concaténation de chaînes (pas de JSX ni d'échappement
 * automatique) : toute valeur non échappée insérée dans ce HTML permettrait
 * à l'expéditeur du formulaire d'origine d'injecter des balises (XSS/
 * relais de phishing) dans un e-mail envoyé depuis le domaine de Decelio.
 *
 * L'esperluette est échappée en premier pour ne pas doubler l'échappement
 * des autres caractères (ex. transformer `<` en `&lt;` puis `&` en `&amp;`
 * donnerait `&amp;lt;`).
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
