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
export const TERMS_VERSION = "2026-09-27-2";

const MOIS_FRANCAIS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/**
 * Formate en français lisible les trois premiers segments (`AAAA-MM-JJ`)
 * d'une version de CGV, en ignorant le suffixe éventuel (`-2`).
 *
 * Pas d'`Intl.DateTimeFormat` : sa sortie dépend de la version d'ICU
 * embarquée dans l'environnement d'exécution, donc pas déterministe d'un
 * poste ou d'un serveur à l'autre. Un tableau explicite des douze mois est
 * une donnée qu'on peut relire et vérifier soi-même à 2 h du matin, sans
 * dépendre d'un comportement externe (principe VI de la constitution).
 */
export function formatTermsDate(version: string): string {
  const [annee, mois, jour] = version.split("-");
  const nomMois = MOIS_FRANCAIS[Number(mois) - 1];
  return `${Number(jour)} ${nomMois} ${annee}`;
}

/**
 * Étiquette lisible de la date de mise à jour des CGV, affichée sur la page
 * publique `/cgv`. Dérivée de `TERMS_VERSION` plutôt qu'écrite en dur : une
 * seconde constante à maintenir à la main finirait par diverger le jour où
 * l'une change sans l'autre — exactement le défaut que cette étiquette sert
 * à éviter.
 *
 * Le suffixe de `TERMS_VERSION` (`-2`, deuxième texte publié le même jour)
 * n'apparaît jamais dans l'étiquette : il ne sert qu'à distinguer deux textes
 * côté base, alors que la page affiche toujours le texte courant, dont la
 * date de mise à jour est la même dans les deux cas.
 */
export const TERMS_UPDATED_LABEL = formatTermsDate(TERMS_VERSION);
