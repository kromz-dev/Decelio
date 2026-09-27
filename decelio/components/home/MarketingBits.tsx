import type { CSSProperties, ReactNode } from "react";

/**
 * Petits elements partages par les pages publiques (accueil, tarifs, analyse),
 * pour qu'une meme chose ait le meme aspect partout.
 */

/** Rang d'un element dans une cascade de defilement (voir `.reveal`, globals.css). */
export function rank(i: number): CSSProperties {
  return { ["--i" as string]: i };
}

/** Coche des listes. */
export function Check({ className = "text-ok" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`shrink-0 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/** Titre de section : meme echelle et meme police partout sur la page. */
export function SectionHeading({ id, title, children }: { id: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="reveal mx-auto mb-14 max-w-3xl text-center">
      <h2 id={id} className="font-display mb-5 text-[36px] font-bold leading-[1.04] tracking-[-0.035em] text-ink sm:text-[52px]">
        {title}
      </h2>
      {children && <p className="mx-auto max-w-2xl text-lg leading-relaxed text-ink-2 sm:text-xl">{children}</p>}
    </div>
  );
}

/** Anneaux du logo, en filigrane des blocs sombres. */
export function RingsWatermark({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 400 400" className={className}>
      {[60, 95, 130, 165, 200].map((r, i) => (
        <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity={0.5 - i * 0.08} />
      ))}
    </svg>
  );
}

