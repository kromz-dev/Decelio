import Image from 'next/image';
import Link from 'next/link';
import { ScanForm } from './ScanForm';

/**
 * Schema du hero : les trois controles, en courbes de niveau.
 *
 * Les anneaux ne sont pas decoratifs. Chacun est l'un des trois controles que
 * Decelio effectue reellement, de l'exterieur vers l'interieur : le robots.txt,
 * puis le pare-feu, puis le HTML servi sans JavaScript. Les assistants IA
 * arrivent par la gauche, hors du premier anneau : ils sont dehors, et c'est ce
 * qui les separe du contenu que le produit mesure.
 *
 * Le trace ondule reprend le logo, fait de lignes concentriques irregulieres.
 * Au chargement, les anneaux se tracent du centre vers l'exterieur, puis une
 * onde lente s'echappe du centre : c'est le seul mouvement non demande de la
 * page (voir globals.css, section 6).
 *
 * Aucun etat n'est affiche -- ni « lu », ni « bloque ». Tant qu'aucun scan n'a
 * eu lieu, ce serait un resultat invente (docs/08-constitution.md, principe I).
 *
 * Toutes les icones sont servies depuis public/icons/. Aucun hotlinking vers un
 * CDN tiers : chaque requete vers un CDN externe enverrait l'IP du visiteur a
 * OpenAI ou Google, ce qui est indefendable sous un badge « Conforme RGPD ».
 */

/** Repere du schema : carre de 1600, centre en (800, 800). */
const VIEW = 1600;
const C = VIEW / 2;

/**
 * Cercle legerement ondule, echo du trace du logo.
 *
 * `amp` reste sous 2 % du rayon : au-dela, l'anneau cesse de se lire comme un
 * cercle et le schema perd sa regularite.
 */
function contourPath(radius: number, amp: number, lobes: number, phase: number): string {
  const steps = 180;
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const r = radius + amp * Math.sin(lobes * a + phase);
    points.push(`${(C + r * Math.cos(a)).toFixed(1)},${(C + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${points.join("L")}Z`;
}

/**
 * Six anneaux concentriques, du plus interieur au plus exterieur. Ils reprennent
 * le trace irregulier du logo : chaque anneau a son propre nombre de lobes et sa
 * propre phase, donc aucun ne se superpose exactement a un autre.
 */
const RINGS = [
  { radius: 360, amp: 6, lobes: 7, phase: 2.3 },
  { radius: 450, amp: 7, lobes: 6, phase: 1.1 },
  { radius: 540, amp: 8, lobes: 5, phase: 0.4 },
  { radius: 630, amp: 9, lobes: 6, phase: 2.9 },
  { radius: 710, amp: 10, lobes: 5, phase: 1.7 },
  { radius: 780, amp: 11, lobes: 7, phase: 0.8 },
];

/**
 * Huit assistants, repartis de part et d'autre de la colonne de texte et
 * etages sur des anneaux differents. Les deux anneaux interieurs restent nus :
 * le centre appartient au contenu.
 */
const ASSISTANTS = [
  { name: "Mistral", icon: "/icons/mistral.svg", radius: 540, angle: 192 },
  { name: "Grok", icon: "/icons/x-twitter.svg", radius: 540, angle: -20 },
  { name: "Gemini", icon: "/icons/gemini.svg", radius: 630, angle: 34 },
  { name: "Perplexity", icon: "/icons/perplexity.svg", radius: 710, angle: 160 },
  { name: "Claude", icon: "/icons/claude.svg", radius: 710, angle: -14 },
  { name: "DuckDuckGo", icon: "/icons/duckduckgo.svg", radius: 780, angle: -34 },
  { name: "ChatGPT", icon: "/icons/openai.svg", radius: 780, angle: 206 },
  { name: "Copilot", icon: "/icons/github-copilot.svg", radius: 780, angle: 150 },
];

/**
 * Navigation unique, partagee par l'en-tete et le pied de page : une meme
 * section porte le meme nom partout (docs/11-audit-landing-page.md, Reprise §2).
 */
export const NAV_LINKS = [
  { href: "#probleme", label: "Le problème" },
  { href: "#controles", label: "Les contrôles" },
  { href: "#methode", label: "Comment ça marche" },
  { href: "#tarifs", label: "Tarifs" },
  { href: "#faq", label: "Questions" },
] as const;

/** Titre decoupe en mots pour l'entree en cascade. Deux lignes, coupees au sens. */
const TITLE_LINES = [
  ["Vos", "sites", "clients,"],
  ["lisibles", "par", "toutes", "les", "IA"],
] as const;

/** Position en pourcentage du conteneur carre, pour un angle et un rayon donnes. */
function polarPercent(radius: number, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  return {
    left: `${((C + radius * Math.cos(a)) / VIEW) * 100}%`,
    top: `${((C + radius * Math.sin(a)) / VIEW) * 100}%`,
  };
}

export default function HeroConcentric({ isLoggedIn }: { isLoggedIn?: boolean }) {
  let wordIndex = 0;

  return (
    <>
      {/* En-tete colle en haut : il reste a portee pendant toute la lecture. */}
      <header className="sticky top-0 z-50 w-full border-b border-line/70 bg-paper/75 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Decelio, accueil" className="flex items-center gap-2.5">
            <Image src="/logo-decelio.png" alt="" width={502} height={565} priority className="h-8 w-auto" />
            <span className="font-display text-[22px] font-bold tracking-[-0.03em] text-ink">Decelio</span>
          </Link>

          <nav aria-label="Navigation principale" className="hidden items-center gap-7 text-sm font-medium text-ink-2 lg:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="nav-link pb-0.5 hover:text-ink">
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

      <section
        aria-labelledby="hero-titre"
        className="relative flex min-h-[calc(100dvh-4rem)] w-full flex-col overflow-hidden"
        style={{
          background:
            "radial-gradient(60% 55% at 50% 42%, var(--brand-soft) 0%, color-mix(in oklab, var(--brand-soft) 35%, var(--paper)) 45%, var(--paper) 75%)",
        }}
      >
        <div className="relative flex w-full flex-1 flex-col items-center justify-center pb-16 pt-14">

          {/* SCHEMA : les trois controles, traces en courbes de niveau */}
          <div
            role="img"
            aria-label="Illustration : les robots de ChatGPT, Claude, Perplexity, Gemini, Mistral, Grok, Copilot et DuckDuckGo gravitent autour du contenu d’un site."
            className="pointer-events-none absolute left-1/2 top-1/2 z-0 aspect-square w-[min(1340px,148vmin)] -translate-x-1/2 -translate-y-1/2"
          >
            <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true" focusable="false">
              {RINGS.map((ring, i) => (
                <path
                  key={ring.radius}
                  d={contourPath(ring.radius, ring.amp, ring.lobes, ring.phase)}
                  pathLength={1}
                  fill="none"
                  stroke="var(--brand)"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeOpacity={0.42 - i * 0.05}
                  className="ring-draw"
                  style={{ animationDelay: `${i * 160}ms` }}
                />
              ))}
              {/* L'onde : repart du centre, lentement, a la maniere du controle quotidien. */}
              <path
                d={contourPath(780, 11, 7, 0.8)}
                fill="none"
                stroke="var(--brand)"
                strokeWidth={2}
                className="ripple"
              />
            </svg>

            {/* Les assistants restent dehors : ils demandent a entrer, ils n'y sont pas. */}
            {ASSISTANTS.map((assistant, i) => (
              <span
                key={assistant.name}
                aria-hidden="true"
                className="animate-cascade absolute hidden -translate-x-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-white/80 bg-white/80 py-1.5 pl-1.5 pr-3.5 shadow-float backdrop-blur-md lg:flex"
                style={{ ...polarPercent(assistant.radius, assistant.angle), animationDelay: `${1300 + i * 110}ms` }}
              >
                <Image src={assistant.icon} alt="" width={24} height={24} className="h-6 w-6 rounded-full bg-surface" />
                <span className="text-[13px] font-medium leading-none text-ink-2">{assistant.name}</span>
              </span>
            ))}
          </div>

          {/* CONTENU CENTRAL */}
          <div className="relative z-20 mx-auto flex max-w-4xl flex-col items-center px-4 text-center">
            {/* Ce que c'est et pour qui, avant le titre : les mots que les agences cherchent. */}
            <p className="animate-cascade mb-6 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-white/70 px-4 py-1.5 text-sm font-medium text-brand backdrop-blur-md" style={{ animationDelay: "200ms" }}>
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand" />
              Surveillance des robots IA pour agences web
            </p>
            <h1
              id="hero-titre"
              className="font-display mb-7 text-[44px] font-bold leading-[0.98] tracking-[-0.04em] text-ink sm:text-[64px] md:text-[80px]"
            >
              {TITLE_LINES.map((line, l) => (
                <span key={l} className="block">
                  {line.map((word) => {
                    const i = wordIndex++;
                    return (
                      <span key={word} className="word" style={{ ["--i" as string]: i }}>
                        {word}
                        {" "}
                      </span>
                    );
                  })}
                </span>
              ))}
            </h1>

            {/* Phrase d'extraction AEO : formulation destinee a etre reprise telle
                quelle par les moteurs de reponse. Visible, jamais masquee. */}
            <blockquote
              className="animate-cascade mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-ink-2 sm:text-xl"
              style={{ animationDelay: "900ms" }}
            >
              Decelio est un service de surveillance pour agences web qui v&eacute;rifie chaque jour si les robots des IA comme ChatGPT, Claude et Perplexity peuvent acc&eacute;der aux sites de vos clients, et vous alerte avec la cause exacte d&egrave;s qu&apos;un acc&egrave;s se bloque.
            </blockquote>

            {/* Sous 1024 px, les pastilles en orbite n'ont plus la place : les memes
                assistants reviennent ici, en une rangee compacte. */}
            <ul
              aria-label="Assistants IA dont Decelio vérifie l’accès"
              className="animate-cascade mb-10 flex max-w-sm flex-wrap items-center justify-center gap-2 lg:hidden"
              style={{ animationDelay: "1000ms" }}
            >
              {ASSISTANTS.map((assistant) => (
                <li key={assistant.name} className="flex items-center gap-1.5 rounded-full border border-line bg-surface/90 py-1 pl-1 pr-2.5">
                  <Image src={assistant.icon} alt="" width={18} height={18} className="h-[18px] w-[18px]" />
                  <span className="text-[11px] font-medium leading-none text-ink-2">{assistant.name}</span>
                </li>
              ))}
            </ul>

            {/* L'action principale de l'ecran : le diagnostic, directement. */}
            <div id="scan" className="animate-cascade relative mx-auto w-full max-w-xl scroll-mt-28" style={{ animationDelay: "1100ms" }}>
              <div aria-hidden="true" className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-brand/15 blur-3xl" />
              <div className="relative rounded-[1.75rem] border border-white bg-white/90 p-6 text-left shadow-[0_24px_60px_-24px_rgb(29_76_164/0.45),inset_0_1px_0_rgb(255_255_255)] backdrop-blur-2xl">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-brand/15 bg-brand-soft">
                    <Image src="/logo-decelio.png" alt="" width={502} height={565} className="h-5 w-auto" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">Diagnostic gratuit</p>
                    <p className="text-xs font-medium text-ink-2">Collez l&apos;adresse d&apos;un site pour savoir s&apos;il est bloqu&eacute;</p>
                  </div>
                </div>
                <ScanForm />
              </div>
              <p className="relative mt-5 text-center text-sm text-ink-2">
                Vous g&eacute;rez tout un portefeuille de sites&nbsp;?{" "}
                <a href="#tarifs" className="font-semibold text-ink underline underline-offset-4 hover:text-brand">Voir les tarifs</a>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
