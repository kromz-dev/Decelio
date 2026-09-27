/**
 * Substitut de `next/font/google` pour les tests Vitest.
 *
 * `next/font/google` s'appuie sur une transformation SWC propre à la
 * compilation Next.js (téléchargement des polices au build, génération d'une
 * classe locale). Hors de ce pipeline — donc sous Vitest — le module réel
 * n'expose pas de fonction appelable et casse tout test qui importe, même
 * indirectement, `components/home/fonts.ts` ou `lib/fonts.ts`.
 *
 * Ce substitut retourne, pour n'importe quel nom de police Google demandé,
 * un objet à la même forme que celui produit par `next/font` (`className`,
 * `variable`, `style`), sans réseau ni build : suffisant pour les rendus de
 * test, qui ne vérifient jamais l'apparence des polices.
 */
function createFontStub() {
  return () => ({
    className: "font-stub",
    variable: "--font-stub",
    style: { fontFamily: "system-ui, sans-serif" },
  });
}

export const Bricolage_Grotesque = createFontStub();
export const Schibsted_Grotesk = createFontStub();
export const Geist_Mono = createFontStub();
export const Inter = createFontStub();
