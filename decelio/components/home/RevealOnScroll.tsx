"use client";

import { useEffect } from "react";

/**
 * Cascade au defilement : chaque element `.reveal` monte a son tour quand il
 * entre dans l'ecran, avec un decalage selon son rang (`--i`).
 *
 * L'animation se declenche une fois et va jusqu'au bout : un bloc n'est
 * jamais laisse a mi-course si le visiteur arrete de defiler (defaut de la
 * version liee au defilement, qui laissait la derniere ligne transparente).
 *
 * Le contenu reste visible sans JavaScript et pour les robots : l'etat masque
 * n'existe que sous `html.reveal-ready`, pose ici, apres avoir deja marque
 * visibles les blocs presents a l'ecran (pas de clignotement au chargement).
 * Rien n'est masque pour qui demande moins d'animation.
 */
export function RevealOnScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const root = document.documentElement;
    const elements = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));

    for (const el of elements) {
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("is-visible");
    }
    root.classList.add("reveal-ready");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    for (const el of elements) if (!el.classList.contains("is-visible")) observer.observe(el);

    return () => {
      observer.disconnect();
      root.classList.remove("reveal-ready");
    };
  }, []);

  return null;
}
