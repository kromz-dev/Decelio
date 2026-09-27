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
 * D'ou l'etiquetage : une courbe de niveau porte son nom sur la ligne, comme sur
 * une carte topographique.
 *
 * Aucun etat n'est affiche -- ni « lu », ni « bloque ». Tant qu'aucun scan n'a
 * eu lieu, ce serait un resultat invente (docs/08-constitution.md, principe I).
 *
 * Toutes les icones sont servies depuis public/icons/. Aucun hotlinking vers un
 * CDN tiers : chaque requete vers un CDN externe enverrait l'IP du visiteur a
 * OpenAI ou Google, ce qui est indefendable sous un badge « Conforme RGPD ».
 */

/** Repere du schema : carre de 1200, centre en (600, 600). */
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
 * Cinq anneaux concentriques, du plus interieur au plus exterieur. Ils reprennent
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
 *
 * Les angles sont choisis pour qu'aucune pastille ne passe derriere le titre,
 * le paragraphe ou la carte de scan, et qu'aucune ne sorte du cadre en hauteur.
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

/** Position en pourcentage du conteneur carre, pour un angle et un rayon donnes. */
function polarPercent(radius: number, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  return {
    left: `${((C + radius * Math.cos(a)) / VIEW) * 100}%`,
    top: `${((C + radius * Math.sin(a)) / VIEW) * 100}%`,
  };
}

export default function HeroConcentric({ isLoggedIn }: { isLoggedIn?: boolean }) {
  return (
    <section className="relative min-h-[100dvh] w-full bg-paper overflow-hidden flex flex-col pt-4">
      {/* HEADER BAR */}
      <header className="relative z-50 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between mb-8 animate-cascade delay-100">
        <div className="flex items-center gap-2.5">
           <Image
             src="/logo-decelio.png"
             alt=""
             width={502}
             height={565}
             priority
             className="h-8 w-auto"
           />
           <span className="font-bold text-xl tracking-tight text-ink">Decelio</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-ink-2">
          <a href="#solutions" className="hover:text-ink transition-colors">Solutions</a>
          <a href="#produits" className="hover:text-ink transition-colors">Produits</a>
          <a href="#tarifs" className="hover:text-ink transition-colors">Tarifs</a>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2">
             {isLoggedIn ? (
               <Link href="/dashboard" className="bg-ink text-paper text-sm font-medium px-5 py-2.5 rounded-full hover:bg-ink/90 transition-colors shadow-panel">Dashboard</Link>
             ) : (
               <>
                 <Link href="/login" className="text-sm font-medium text-ink-2 hover:text-ink px-2 hidden sm:block transition-colors">Connexion</Link>
                 <Link href="/register" className="bg-ink text-paper text-sm font-medium px-5 py-2.5 rounded-full shadow-float hover:-translate-y-0.5 transition-all duration-300">S&apos;inscrire</Link>
               </>
             )}
           </div>
        </div>
      </header>

      {/* CENTRAL WRAPPER TO KEEP CIRCLES AND TEXT ALIGNED ON ZOOM */}
      <div className="relative flex-1 flex flex-col items-center justify-center w-full mb-12">

        {/* SCHEMA : les trois controles, traces en courbes de niveau */}
        <div
          role="img"
          aria-label="Illustration : les robots de ChatGPT, Claude, Perplexity, Gemini, Mistral, Grok, Copilot et DuckDuckGo gravitent autour du contenu d’un site."
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 aspect-square w-[min(1340px,148vmin)] -translate-x-1/2 -translate-y-1/2"
        >
          <svg
            viewBox={`0 0 ${VIEW} ${VIEW}`}
            className="absolute inset-0 h-full w-full overflow-visible"
            aria-hidden="true"
            focusable="false"
          >
            {RINGS.map((ring, i) => (
              <path
                key={ring.radius}
                d={contourPath(ring.radius, ring.amp, ring.lobes, ring.phase)}
                fill="none"
                stroke="var(--brand)"
                strokeWidth={1.5}
                strokeOpacity={0.3 - i * 0.035}
                className="animate-cascade"
                style={{ animationDelay: `${300 + i * 140}ms` }}
              />
            ))}
          </svg>


          {/* Les assistants restent dehors : ils demandent a entrer, ils n'y sont pas. */}
          {ASSISTANTS.map((assistant, i) => (
            <span
              key={assistant.name}
              aria-hidden="true"
              className="animate-cascade absolute hidden -translate-x-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-line bg-surface/90 py-1.5 pl-1.5 pr-3.5 shadow-glass backdrop-blur-md lg:flex"
              style={{ ...polarPercent(assistant.radius, assistant.angle), animationDelay: `${900 + i * 110}ms` }}
            >
              <Image
                src={assistant.icon}
                alt=""
                width={24}
                height={24}
                className="h-6 w-6 rounded-full bg-surface"
              />
              <span className="text-[13px] font-medium leading-none text-ink-2">{assistant.name}</span>
            </span>
          ))}
        </div>

        {/* CENTRAL CONTENT */}
        <div className="relative z-20 flex flex-col items-center text-center max-w-4xl px-4 mx-auto">

        {/* Headline - Pro Max Typography using the Design System utility */}
        <h1 className="animate-cascade delay-500 type-display !text-5xl sm:!text-6xl md:!text-7xl text-ink mb-6 leading-[1.05]">
          {/* Titre d'un seul tenant : le degrade sur « toutes les IA » eclaircissait
              la fin du titre, ce qui affaiblissait le contraste au moment ou la
              phrase porte son sens. */}
          Vos sites web, <br className="hidden sm:block" />
          visibles par toutes les IA
        </h1>

        {/* Phrase d'extraction AEO : formulation destinee a etre reprise telle
            quelle par les moteurs de reponse (ChatGPT, Claude, Perplexity...).
            Visible dans le corps du document, jamais masquee. */}
        {/* Un seul paragraphe : le second disait la meme chose en plus faible, et
            le schema porte desormais l'explication des trois controles. La largeur
            reste en deca de l'anneau interieur pour que le texte n'empiete pas
            sur le trace. */}
        <blockquote className="animate-cascade delay-600 text-lg sm:text-xl text-ink-2 mb-10 max-w-2xl mx-auto leading-relaxed border-l-2 border-line-strong pl-4 text-left sm:text-center sm:border-l-0 sm:pl-0">
          Decelio est un service de surveillance pour agences web qui v&eacute;rifie chaque jour si les robots des IA comme ChatGPT, Claude et Perplexity peuvent acc&eacute;der aux sites de vos clients, et vous alerte avec la cause exacte d&egrave;s qu&apos;un acc&egrave;s se bloque.
        </blockquote>

        {/* CTA Buttons */}
        <div className="animate-cascade delay-900 flex flex-col sm:flex-row items-center justify-center gap-4 mb-6 w-full sm:w-auto">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="bg-ink hover:bg-ink/90 text-paper font-semibold py-2.5 px-6 rounded-full shadow-float hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto"
            >
              Aller au tableau de bord
            </Link>
          ) : (
            <Link
              href="/register"
              className="bg-ink hover:bg-ink/90 text-paper font-semibold py-2.5 px-6 rounded-full shadow-float hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto"
            >
              D&eacute;marrer gratuitement
            </Link>
          )}
        </div>

        {/*
          Sous 1024 px, les pastilles en orbite n'ont plus la place de tenir
          autour du texte : les memes assistants reviennent ici, en une rangee
          compacte. Meme information, autre disposition -- et non l'information
          escamotee.
        */}
        <ul
          aria-label="Assistants IA dont Decelio vérifie l’accès"
          className="animate-cascade delay-900 mb-10 flex max-w-xs flex-wrap items-center justify-center gap-2 lg:hidden"
        >
          {ASSISTANTS.map((assistant) => (
            <li
              key={assistant.name}
              className="flex items-center gap-1.5 rounded-full border border-line bg-surface/90 py-1 pl-1 pr-2.5"
            >
              <Image src={assistant.icon} alt="" width={18} height={18} className="h-[18px] w-[18px]" />
              <span className="text-[11px] font-medium leading-none text-ink-2">{assistant.name}</span>
            </li>
          ))}
        </ul>

        {/* Glowing floating cards simulation - Vertical Stack Refraction */}
        <div id="scan" className="relative w-full max-w-lg mx-auto animate-cascade delay-[1100ms] group perspective-[1000px] mb-20">
          {/* Ambient Glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-cobalt/20 via-cobalt-soft/10 to-transparent blur-[80px] rounded-[3rem] pointer-events-none transition-all duration-700 opacity-80" />

          {/*
            Aucune carte de resultat en exemple ici : afficher « Claude a accede
            au /pricing, il y a 2 minutes » reviendrait a montrer des evenements
            de scan inventes comme s'ils etaient reels, et a promettre du temps
            reel alors que les scans sont quotidiens. Voir docs/08-constitution.md,
            principes I et III, et docs/11-audit-landing-page.md.
          */}
          <div className="relative w-full">
            {/* Main Card (ScanForm) - Z-30 */}
            <div className="relative bg-white/95 backdrop-blur-3xl border border-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,1)] rounded-[1.5rem] p-6 z-30 w-full transition-all duration-500">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-soft flex items-center justify-center border border-brand/15 shadow-sm">
                    <Image
                      src="/logo-decelio.png"
                      alt=""
                      width={502}
                      height={565}
                      className="h-5 w-auto"
                    />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-ink">Diagnostic AEO</p>
                    <p className="text-xs text-ink-2 font-medium">Testez si votre site est bloqu&eacute;</p>
                  </div>
                </div>
              </div>
              <ScanForm />
            </div>
          </div>
        </div>

      </div>
      {/* END CENTRAL CONTENT */}
      </div>
      {/* END CENTRAL WRAPPER */}

    </section>
  );
}
