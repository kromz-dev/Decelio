/**
 * Version de référence des CGV, enregistrée sur `User.termsVersion` au moment
 * où le compte accepte les conditions. Une ligne déjà écrite n'est jamais
 * réécrite : elle garde la version acceptée ce jour-là.
 *
 * ## Quand augmenter cette valeur
 *
 * Dès qu'un commit modifie le **fond** de `app/(marketing)/cgv/page.tsx` :
 * une clause, un prix, une durée, un engagement, une obligation, le
 * responsable du traitement, l'adresse de contact, la durée d'essai.
 * Mise en forme seule (titre, espacement, couleur, ordre de deux phrases
 * équivalentes, correction d'orthographe) : on ne touche pas à la version.
 *
 * ## Format
 *
 * `AAAA-MM-JJ` — la date de publication du nouveau texte. Deuxième
 * modification de fond le même jour : on suffixe (`2026-09-27-2`), sinon
 * deux textes différents porteraient la même version.
 *
 * ## Qui fait quoi
 *
 * La page `/cgv` appartient au Design, ce fichier à l'Ingénierie. Une demande
 * de fusion qui change le fond des CGV annonce la nouvelle version dans sa
 * description ; l'Ingénierie la pose ici dans la même fusion. Sans cela, des
 * comptes sont enregistrés comme ayant accepté un texte qu'ils n'ont pas lu.
 */
export const TERMS_VERSION = "2026-09-27";
