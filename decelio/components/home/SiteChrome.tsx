import Image from "next/image";
import Link from "next/link";
import { bricolage } from "./fonts";

/**
 * En-tete et pied de page communs a toutes les pages publiques (accueil,
 * tarifs, analyse, connexion). Une meme section porte le meme nom partout
 * (docs/11-audit-landing-page.md, Reprise §2).
 *
 * Les liens pointent vers des ancres de l'accueil (`/#…`) : depuis l'accueil,
 * le navigateur fait defiler la page sans la recharger ; depuis une autre
 * page, il y revient.
 */
export const NAV_LINKS = [
  { href: "/#probleme", label: "Le problème" },
  { href: "/#controles", label: "Les contrôles" },
  { href: "/#methode", label: "Comment ça marche" },
  { href: "/pricing", label: "Tarifs" },
  { href: "/#faq", label: "Questions" },
] as const;

/**
 * Marque Decelio : le « D » du logo sert de premiere lettre, suivi de
 * « ecelio ». Les lecteurs d'ecran lisent « Decelio » (texte masque), le
 * logo et « ecelio » visibles sont decoratifs.
 */
export function Wordmark({ light, size = "md" }: { light?: boolean | "invert"; size?: "md" | "lg" }) {
  const text = size === "lg" ? "text-[28px]" : "text-[24px]";
  const logo = size === "lg" ? "h-[27px]" : "h-[23px]";
  // `light` force le logo blanc pour un fond toujours sombre (pied de page
  // marketing). Sans cette prop, le logo suit le thème de la coque
  // d'application (`.dark` sur <html>) : bleu sur papier clair, blanc sur
  // papier sombre. Les deux images sont posées côte à côte et affichées ou
  // masquées par `dark:`, sans dépendre du JavaScript client.
  // `light="invert"` : bandeau à fond `bg-ink`, dont la couleur s'inverse
  // elle-même avec le thème (clair -> encre marine, sombre -> encre claire,
  // voir OnboardingClient/OnboardingPlanStep). Le logo doit donc suivre
  // l'inverse du thème, pas le thème lui-même.
  return (
    // La variable de police est posee ici : le nom reste en Bricolage meme hors
    // du cadre des pages publiques (coque de l'application).
    <span className={`${bricolage.variable} inline-flex items-baseline`}>
      <span className="sr-only">Decelio</span>
      {light === undefined || light === "invert" ? (
        <>
          <Image
            src="/logo-decelio.png"
            alt=""
            aria-hidden="true"
            width={502}
            height={565}
            priority
            className={`${logo} w-auto self-baseline translate-y-[3px] ${light === "invert" ? "hidden dark:block" : "dark:hidden"}`}
          />
          <Image
            src="/logo-decelio-blanc.png"
            alt=""
            aria-hidden="true"
            width={502}
            height={565}
            className={`${logo} w-auto self-baseline translate-y-[3px] ${light === "invert" ? "dark:hidden" : "hidden dark:block"}`}
          />
        </>
      ) : (
        <Image
          src={light ? "/logo-decelio-blanc.png" : "/logo-decelio.png"}
          alt=""
          aria-hidden="true"
          width={502}
          height={565}
          priority={!light}
          className={`${logo} w-auto self-baseline translate-y-[3px]`}
        />
      )}
      <span aria-hidden="true" className={`font-display ${text} font-bold leading-none tracking-[-0.03em] ${light ? "text-paper" : "text-ink"}`}>
        ecelio
      </span>
    </span>
  );
}

export function SiteHeader({ isLoggedIn, current }: { isLoggedIn?: boolean; current?: string }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-line/70 bg-paper/75 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Decelio, accueil" className="flex items-center">
          <Wordmark />
        </Link>

        <nav aria-label="Navigation principale" className="hidden items-center gap-7 text-sm font-medium text-ink-2 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={current === link.href ? "page" : undefined}
              className={`nav-link pb-0.5 hover:text-ink ${current === link.href ? "text-ink [background-size:100%_1px]" : ""}`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <Link href="/dashboard" className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-ink/90">
              Tableau de bord
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden px-3 text-sm font-medium text-ink-2 transition-colors hover:text-ink sm:block">
                Connexion
              </Link>
              <Link href="/register" className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper shadow-float transition-all duration-300 hover:-translate-y-0.5">
                Cr&eacute;er un compte
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

const footerLink = "nav-link transition-colors hover:text-paper focus-visible:text-paper";

export function SiteFooter({ isLoggedIn }: { isLoggedIn?: boolean }) {
  return (
    <footer className="bg-ink py-16 text-paper">
      <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8">
        <div className="mb-12 grid grid-cols-1 gap-12 md:grid-cols-5 md:gap-8">
          <div className="md:col-span-2">
            <Link href="/" aria-label="Decelio, accueil" className="mb-4 inline-flex items-center">
              <Wordmark light size="lg" />
            </Link>
            <p className="max-w-sm leading-relaxed text-paper/70">
              Surveillez l&apos;acc&egrave;s des robots de recherche IA aux sites de vos clients. Rep&eacute;rez les blocages techniques, sans confondre acc&egrave;s et citations.
            </p>
          </div>

          <nav aria-label="Navigation du pied de page" className="grid grid-cols-1 gap-8 sm:grid-cols-3 md:col-span-3">
            <div>
              <h2 className="mb-5 font-semibold">Decelio</h2>
              <ul className="space-y-3 font-medium text-paper/70">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className={footerLink}>{link.label}</a>
                  </li>
                ))}
                <li><Link href="/a-propos" className={footerLink}>Qui est derrière Decelio</Link></li>
              </ul>
            </div>

            <div>
              <h2 className="mb-5 font-semibold">Votre compte</h2>
              <ul className="space-y-3 font-medium text-paper/70">
                {isLoggedIn ? (
                  <li><Link href="/dashboard" className={footerLink}>Tableau de bord</Link></li>
                ) : (
                  <>
                    <li><Link href="/login" className={footerLink}>Connexion</Link></li>
                    <li><Link href="/register" className={footerLink}>Cr&eacute;er un compte</Link></li>
                  </>
                )}
              </ul>
            </div>

            <div>
              <h2 className="mb-5 font-semibold">Contact</h2>
              <ul className="space-y-3 font-medium text-paper/70">
                <li><a href="mailto:contact@decelio.fr" className={footerLink}>contact@decelio.fr</a></li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="flex flex-col gap-6 border-t border-paper/20 pt-8 text-sm text-paper/70">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row">
            <p>&copy; {new Date().getFullYear()} Decelio. Tous droits r&eacute;serv&eacute;s.</p>
            <p className="max-w-xl md:text-right">
              <strong className="font-semibold text-paper">Ce que mesure l&apos;outil :</strong> Decelio v&eacute;rifie l&apos;acc&egrave;s technique des robots aux sites. Un acc&egrave;s ouvert ne suffit pas &agrave; ce qu&apos;une IA cite votre marque.
            </p>
          </div>
          <nav aria-label="Mentions légales" className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/mentions-legales" className={footerLink}>Mentions l&eacute;gales</Link>
            <Link href="/cgv" className={footerLink}>CGV</Link>
            <Link href="/confidentialite" className={footerLink}>Confidentialit&eacute;</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
