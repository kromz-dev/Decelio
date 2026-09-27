import Link from "next/link";
import type { ReactNode } from "react";

import { Wordmark } from "./SiteChrome";
import { bricolage, schibsted } from "./fonts";
import tokens from "./tokens.module.css";
import { BRAND_HALO } from "./PublicPage";

/**
 * Cadre commun aux quatre pages de connexion (connexion, inscription, mot de
 * passe oublié, réinitialisation) : même halo de marque et même carte que le
 * diagnostic du héros (`HeroConcentric.tsx`), pour qu'une agence qui vient de
 * l'accueil reconnaisse la même interface.
 *
 * Un seul mouvement d'entrée, discret (`.animate-cascade`, coupé par
 * `prefers-reduced-motion` comme partout ailleurs) : pas d'anneaux qui se
 * tracent ici, ces pages ne sont pas le héros.
 */
export function AuthShell({
  eyebrow,
  title,
  lede,
  children,
  footer,
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      className={`${schibsted.variable} ${bricolage.variable} ${tokens.root} flex min-h-screen flex-col`}
      style={BRAND_HALO}
    >
      <header className="w-full px-4 py-6 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Decelio, accueil" className="inline-flex items-center">
          <Wordmark />
        </Link>
      </header>

      <main id="contenu" className="flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-2 sm:px-6">
        <div className="animate-cascade w-full max-w-[440px]">
          <p className="mb-2 text-center text-sm font-medium text-ink-2">{eyebrow}</p>
          <h1 className="font-display mb-2.5 text-center text-[32px] font-bold leading-[1.08] tracking-[-0.03em] text-ink sm:text-[36px]">
            {title}
          </h1>
          {lede && (
            <p className="mx-auto mb-7 max-w-sm text-center text-[15px] leading-relaxed text-ink-2">{lede}</p>
          )}

          <div className="relative rounded-[1.75rem] border border-white bg-white/90 p-6 text-left shadow-[0_24px_60px_-24px_rgb(29_76_164/0.45),inset_0_1px_0_rgb(255_255_255)] backdrop-blur-2xl sm:p-8">
            {children}
          </div>

          {footer && <div className="mt-6 text-center text-sm text-ink-2">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
