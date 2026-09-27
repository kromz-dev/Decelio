import { Bricolage_Grotesque, Schibsted_Grotesk } from "next/font/google";

/**
 * Texte courant (marketing et application) : grotesque éditoriale,
 * chiffres tabulaires disponibles (`font-variant-numeric: tabular-nums`).
 * Poids : 400 texte, 500 interface, 600 titres d'application.
 */
export const schibsted = Schibsted_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-marketing",
  display: "swap",
});

/**
 * Titres d'affichage des pages marketing uniquement (classe `font-display`).
 * Grotesque à taille optique : serrée et dessinée en grand corps, elle porte
 * l'identité là où Schibsted reste neutre. Jamais pour du texte courant.
 *
 * `next/font` télécharge la police au build et la sert depuis notre domaine :
 * aucune requête vers Google depuis le navigateur du visiteur.
 */
export const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-bricolage",
  display: "swap",
});
