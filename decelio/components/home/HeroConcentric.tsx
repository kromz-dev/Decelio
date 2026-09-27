import Link from 'next/link';
import { ScanForm } from './ScanForm';

/**
 * Icones des orbites du hero.
 *
 * Toutes les icones sont servies localement depuis public/icons/ (aucun
 * hotlinking vers un CDN tiers : voir docs/08-constitution.md, principes I et III
 * -- chaque requete vers un CDN externe envoie l'IP du visiteur a un tiers, ce qui
 * est indefendable pour un produit qui vend l'honnetete de la mesure et affiche un
 * badge "Conforme RGPD").
 *
 * Certains moteurs n'ont pas de SVG local disponible dans le depot. Plutot que
 * d'aller les televerser depuis Internet (ce qui recree le probleme), ces
 * orbites utilisent un repli neutre : un monogramme sur cercle, aux couleurs du
 * design system, via la propriete fallback au lieu de icon.
 *
 * ICONES EN REPLI (a remplacer par de vraies icones locales quand elles seront
 * telechargees par le fondateur) : Gemini, Mistral, Meta, Grok, Perplexity, Groq.
 */
type OrbitIcon = {
  name: string;
  angle: number;
  size: number;
  iconSize: number;
} & ({ icon: string; fallback?: undefined } | { icon?: undefined; fallback: string });

const orbits: { size: number; delay: string; icons: OrbitIcon[] }[] = [
  {
    size: 800, delay: "0", icons: [
      { name: "OpenAI", icon: "/icons/openai.svg", angle: 95, size: 56, iconSize: 28 }
    ]
  },
  {
    size: 900, delay: "200", icons: [
      { name: "Claude", icon: "/icons/claude.svg", angle: -95, size: 48, iconSize: 24 }
    ]
  },
  {
    size: 1000, delay: "400", icons: [
      { name: "Gemini", fallback: "G", angle: 105, size: 64, iconSize: 32 }
    ]
  },
  {
    size: 1100, delay: "600", icons: [
      { name: "DuckDuckGo", icon: "/icons/duckduckgo.svg", angle: 75, size: 56, iconSize: 28 }
    ]
  },
  {
    size: 1200, delay: "800", icons: [
      { name: "Mistral", fallback: "M", angle: -105, size: 52, iconSize: 26 }
    ]
  },
  {
    size: 1300, delay: "1000", icons: [
      { name: "Meta", fallback: "M", angle: -75, size: 64, iconSize: 32 }
    ]
  },
  {
    size: 1400, delay: "1200", icons: [
      { name: "GitHub Copilot", icon: "/icons/github-copilot.svg", angle: 110, size: 52, iconSize: 26 }
    ]
  },
  {
    size: 1500, delay: "1400", icons: [
      { name: "Grok", fallback: "X", angle: -110, size: 56, iconSize: 28 }
    ]
  },
  {
    size: 1600, delay: "1600", icons: [
      { name: "Perplexity", fallback: "P", angle: 85, size: 56, iconSize: 28 }
    ]
  },
  {
    size: 1700, delay: "1800", icons: [
      { name: "Groq", fallback: "Q", angle: -85, size: 60, iconSize: 30 }
    ]
  }
];

export default function HeroConcentric({ isLoggedIn }: { isLoggedIn?: boolean }) {
  return (
    <section className="relative min-h-[100dvh] w-full bg-paper overflow-hidden flex flex-col pt-4">
      {/* HEADER BAR */}
      <header className="relative z-50 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between mb-8 animate-cascade delay-100">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-ink text-paper rounded-full flex items-center justify-center font-bold shadow-panel">
             <div className="w-2.5 h-2.5 bg-paper rounded-full"></div>
           </div>
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

        {/* BACKGROUND RINGS - HIGH END LIQUID GLASS STYLE */}
        <div className="absolute top-1/2 left-1/2 w-0 h-0 pointer-events-none z-0">
          {orbits.map((orbit, i) => (
            <div
              key={i}
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-line/60 animate-cascade`}
              style={{
                width: orbit.size,
                height: orbit.size,
                animationDelay: `${orbit.delay}ms`
              }}
            >
              {orbit.icons.map((icon, j) => (
                <div
                  key={j}
                  className="absolute inset-0 pointer-events-auto"
                  style={{ transform: `rotate(${icon.angle}deg)` }}
                >
                  <div
                    className="absolute top-0 left-1/2 bg-surface/80 backdrop-blur-md rounded-full shadow-glass border border-line flex items-center justify-center transition-transform hover:scale-110 duration-300 cursor-pointer"
                    style={{
                      width: icon.size,
                      height: icon.size,
                      transform: `translate(-50%, -50%) rotate(${-icon.angle}deg)`
                    }}
                  >
                    {icon.icon ? (
                      <img src={icon.icon} alt={icon.name} style={{ width: icon.iconSize, height: icon.iconSize }} />
                    ) : (
                      <span
                        role="img"
                        aria-label={icon.name}
                        className="flex items-center justify-center rounded-full bg-ink/5 text-ink-2 font-bold border border-line"
                        style={{ width: icon.iconSize, height: icon.iconSize, fontSize: icon.iconSize * 0.5 }}
                      >
                        {icon.fallback}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* CENTRAL CONTENT */}
        <div className="relative z-20 flex flex-col items-center text-center max-w-4xl px-4 mx-auto">

        {/* Headline - Pro Max Typography using the Design System utility */}
        <h1 className="animate-cascade delay-500 type-display !text-5xl sm:!text-6xl md:!text-7xl text-ink mb-6 leading-[1.05]">
          Vos sites web, <br className="hidden sm:block" />
          visibles par <span className="text-transparent bg-clip-text bg-gradient-to-br from-ink via-ink-2 to-line-strong">toutes les IA</span>
        </h1>

        {/* Phrase d'extraction AEO : formulation destinee a etre reprise telle
            quelle par les moteurs de reponse (ChatGPT, Claude, Perplexity...).
            Visible dans le corps du document, jamais masquee. */}
        <blockquote className="animate-cascade delay-600 text-base sm:text-lg text-ink-2 mb-6 max-w-2xl mx-auto leading-relaxed border-l-2 border-line-strong pl-4 text-left sm:text-center sm:border-l-0 sm:pl-0">
          Decelio est un service de surveillance pour agences web qui v&eacute;rifie chaque jour si les robots des IA comme ChatGPT, Claude et Perplexity peuvent acc&eacute;der aux sites de vos clients, et vous alerte avec la cause exacte d&egrave;s qu&apos;un acc&egrave;s se bloque.
        </blockquote>

        {/* Subheadline */}
        <p className="animate-cascade delay-700 text-lg sm:text-xl text-ink-2 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
          Surveillez chaque jour l&apos;accessibilit&eacute; de votre portefeuille client aux robots comme ChatGPT, Claude et Perplexity. Gardez votre agence une &eacute;tape en avance.
        </p>

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

        {/* Glowing floating cards simulation - Vertical Stack Refraction */}
        <div id="scan" className="relative w-full max-w-lg mx-auto animate-cascade delay-[1100ms] group perspective-[1000px] mb-20">
          {/* Ambient Glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-cobalt/20 via-cobalt-soft/10 to-transparent blur-[80px] rounded-[3rem] pointer-events-none transition-all duration-700 opacity-80" />

          <div className="relative w-full mb-32">
            {/* Bottom Card - Z-10 */}
            <div className="absolute -bottom-[105px] origin-bottom left-0 right-0 mx-auto bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_4px_20px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.6)] rounded-2xl pt-8 pb-3 px-4 z-10 w-[85%] transform scale-[0.90] transition-all duration-500 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-slate-100 shadow-sm">
                {/* Pas d'icone locale pour Perplexity : repli monogramme (voir note en haut du fichier) */}
                <span role="img" aria-label="Perplexity" className="w-4 h-4 rounded-full bg-ink/5 text-ink-2 text-[9px] font-bold flex items-center justify-center">P</span>
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-ink-2">Perplexity a scann&eacute; la page d&apos;accueil</p>
                <p className="text-[10px] text-ink-3 font-medium">Il y a 4 heures &bull; Succ&egrave;s</p>
              </div>
            </div>

            {/* Middle Card - Z-20 */}
            <div className="absolute -bottom-[55px] origin-bottom left-0 right-0 mx-auto bg-white/85 backdrop-blur-2xl border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)] rounded-2xl pt-8 pb-3 px-4 z-20 w-[92%] transform scale-[0.95] transition-all duration-500 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-slate-100 shadow-sm">
                <img src="/icons/claude.svg" alt="Claude" className="w-4 h-4 drop-shadow-sm" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-ink">Claude a acc&eacute;d&eacute; au /pricing</p>
                <p className="text-[10px] text-ink-2 font-medium">Il y a 2 minutes &bull; R&eacute;solu</p>
              </div>
            </div>

            {/* Main Top Card (ScanForm) - Z-30 */}
            <div className="relative bg-white/95 backdrop-blur-3xl border border-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,1)] rounded-[1.5rem] p-6 z-30 w-full transition-all duration-500">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cobalt/5 text-cobalt flex items-center justify-center border border-cobalt/10 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
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
