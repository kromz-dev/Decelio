import type { ReactNode } from "react";
import { RevealOnScroll } from "./RevealOnScroll";
import { SiteFooter, SiteHeader } from "./SiteChrome";
import { bricolage, schibsted } from "./fonts";
import tokens from "./tokens.module.css";

/**
 * Cadre commun des pages publiques hors accueil (tarifs, analyse, pages
 * legales) : memes polices, memes jetons, meme en-tete et meme pied de page,
 * meme cascade au defilement. L'accueil garde son heros propre.
 */
export function PublicPage({
  children,
  isLoggedIn,
  current,
}: {
  children: ReactNode;
  isLoggedIn?: boolean;
  current?: string;
}) {
  return (
    <div className={`${schibsted.variable} ${bricolage.variable} ${tokens.root} min-h-screen`}>
      <RevealOnScroll />
      <SiteHeader isLoggedIn={isLoggedIn} current={current} />
      {children}
      <SiteFooter isLoggedIn={isLoggedIn} />
    </div>
  );
}

/** Halo de la marque derriere l'en-tete d'une page, comme sur le heros de l'accueil. */
export const BRAND_HALO = {
  background:
    "radial-gradient(60% 70% at 50% 0%, var(--brand-soft) 0%, color-mix(in oklab, var(--brand-soft) 35%, var(--paper)) 45%, var(--paper) 80%)",
} as const;
