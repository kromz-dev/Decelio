import type { ReactNode } from "react";

/**
 * Elements partages par les trois pages legales (mentions legales, CGV,
 * confidentialite) : emplacement a completer, sommaire ancre, date de mise a
 * jour. Toujours dans `PublicPage`, colonne `max-w-[70ch]`.
 */

/**
 * Emplacement visible pour une information absente du brief ou du code.
 * Jamais de contenu invente : ce composant rend l'absence impossible a
 * manquer, a l'ecran comme au clavier.
 */
export function ToFill({ children }: { children: ReactNode }) {
  return (
    <span className="inline rounded-sm border border-warn/40 bg-warn-soft px-1.5 py-0.5 font-medium text-warn">
      <span className="sr-only">à compléter : </span>
      {children}
    </span>
  );
}

export interface TocEntry {
  id: string;
  label: string;
}

/** Sommaire ancre en tete des pages longues (CGV, confidentialite). */
export function LegalToc({ entries }: { entries: TocEntry[] }) {
  return (
    <nav aria-label="Sommaire" className="mb-10 rounded-[1.25rem] border border-line bg-surface p-6">
      <h2 className="mb-3 text-[15px] font-semibold text-ink">Sommaire</h2>
      <ol className="grid grid-cols-1 gap-x-6 gap-y-2 text-[15px] sm:grid-cols-2">
        {entries.map((entry, i) => (
          <li key={entry.id}>
            <a href={`#${entry.id}`} className="nav-link text-ink-2 transition-colors hover:text-ink">
              {i + 1}. {entry.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Ligne de derniere mise a jour, identique sur les trois pages. */
export function LastUpdated({ children }: { children: ReactNode }) {
  return <p className="mb-10 text-sm text-ink-2">Dernière mise à jour : {children}</p>;
}

/** En-tete commun (titre H1 + intro courte) sous le halo de marque. */
export function LegalHero({ title, intro }: { title: string; intro?: ReactNode }) {
  return (
    <section className="px-4 pb-12 pt-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[70ch]">
        <h1 className="font-display text-[34px] font-bold leading-[1.05] tracking-[-0.03em] text-ink sm:text-[44px]">
          {title}
        </h1>
        {intro && <p className="mt-4 text-lg leading-relaxed text-ink-2">{intro}</p>}
      </div>
    </section>
  );
}

/** Section numerotee de corps de texte, ancre pour le sommaire. */
export function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-titre`} className="scroll-mt-24 border-t border-line py-8 first:border-t-0 first:pt-0">
      <h2 id={`${id}-titre`} className="mb-3 text-[22px] font-semibold leading-7 text-ink">
        {title}
      </h2>
      <div className="space-y-3 text-[17px] leading-relaxed text-ink-2 [&_a]:nav-link [&_a]:text-ink [&_a]:transition-colors [&_a:hover]:text-brand [&_h3]:text-[17px] [&_h3]:font-semibold [&_h3]:leading-6 [&_h3]:text-ink [&_h3]:mt-4 [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-ink [&_ul]:space-y-1.5">
        {children}
      </div>
    </section>
  );
}
