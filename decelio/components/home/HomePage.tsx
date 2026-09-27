import Image from "next/image";
import Link from "next/link";
import HeroConcentric from "./HeroConcentric";
import { StructuredData } from "./StructuredData";
import { schibsted } from "./fonts";
import tokens from "./tokens.module.css";
import styles from "./home.module.css";







/**
 * Grille tarifaire.
 *
 * Les trois paliers exposent exactement les memes lignes, dans le meme ordre.
 * Une grille ou chaque carte enumere des choses differentes ne se compare pas :
 * le lecteur ne peut pas voir ce que le palier d'entree n'a pas. Ici, ce qui
 * manque est ecrit, pas omis.
 */
/**
 * Les quatre bascules de la section « Aujourd'hui / Avec Decelio ».
 *
 * Chaque ligne decrit une situation que vit une agence, et en face, ce que le
 * produit fait reellement -- verification d'acces, jamais mesure de citation.
 * La version precedente promettait « la visibilite reelle sur ChatGPT » et des
 * « alertes immediates » : ni l'une ni l'autre n'existe.
 */
const SWITCHES = [
  {
    before:
      "Un plugin de sécurité se met à jour dans la nuit et bloque GPTBot. Le site répond normalement à vos yeux : rien ne signale le blocage.",
    after:
      "Vous recevez un e-mail au scan suivant, avec la règle en cause et le correctif à appliquer.",
  },
  {
    before:
      "Vérifier qu'un robot IA passe demande de changer l'User-Agent à la main, site par site. Personne ne le fait quarante fois par semaine.",
    after:
      "Chaque site du portefeuille est vérifié une fois par jour, sans extension à installer ni accès à demander.",
  },
  {
    before:
      "Cocher « Block AI Bots » chez Cloudflare bloque aussi les robots qui citent, pas seulement ceux qui entraînent.",
    after:
      "Les deux familles sont distinguées : un site peut refuser l'entraînement tout en restant citable.",
  },
  {
    before:
      "Votre rapport de maintenance ne dit rien de l'IA. Il n'y a donc rien de plus à facturer.",
    after:
      "Un rapport mensuel à votre marque, à glisser dans celui que vous envoyez déjà.",
  },
] as const;

const PLAN_FEATURES = [
  "Sites clients surveillés",
  "Vérification quotidienne des robots IA",
  "Alerte par e-mail avec la cause et le correctif",
  "Rapport mensuel à la marque de votre agence",
] as const;

const PLANS = [
  {
    slug: "freelance",
    name: "Freelance",
    price: 39,
    pitch: "Pour sécuriser vos premiers sites clients.",
    values: ["10 sites", true, true, false] as const,
    featured: false,
  },
  {
    slug: "agence",
    name: "Agence",
    price: 99,
    pitch: "Le portefeuille complet d'une agence.",
    values: ["30 sites", true, true, true] as const,
    featured: true,
  },
  {
    slug: "studio",
    name: "Studio",
    price: 249,
    pitch: "Les agences à fort volume.",
    values: ["100 sites", true, true, true] as const,
    featured: false,
  },
] as const;

/** Coche des listes de paliers. */
function Check() {
  return (
    <svg
      aria-hidden="true"
      className="shrink-0 text-ok"
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

const faqs = [
  {
    q: "Qu'est-ce que Decelio ?",
    a: "Decelio est un outil de surveillance automatisé pour agences web. Il centralise le contrôle technique de l'accessibilité AEO pour tout votre portefeuille de sites.",
  },
  {
    q: "Quelle différence avec Semrush ?",
    a: "Semrush audite le référencement classique. Decelio vérifie uniquement l'accès technique des robots IA à vos sites.",
  },
  {
    q: "Faut-il installer un plugin WordPress ?",
    a: "Non. Decelio interroge chaque site depuis l'extérieur, comme le ferait un visiteur IA. Aucun script ni accès requis.",
  },
  {
    q: "Est-ce compatible avec tous les hébergeurs ?",
    a: "Oui. Decelio analyse la réponse HTTP publique de votre site, quel que soit l'hébergeur ou le CMS utilisé.",
  },
  {
    q: "Comment sont envoyées les alertes ?",
    a: "Dès qu'un robot IA est bloqué, vous recevez une alerte par e-mail avec la cause probable et sa solution.",
  },
  {
    q: "Puis-je facturer ce service à mes clients ?",
    a: "Absolument. Nos rapports PDF en marque blanche vous permettent d'ajouter une ligne de facturation à vos contrats de maintenance.",
  },
];

export function HomePage({ isLoggedIn }: { isLoggedIn?: boolean }) {
  return (
    <div className={`${schibsted.variable} ${tokens.root} ${styles.page}`}>
      <a href="#contenu" className={styles.skipLink}>Aller au contenu</a>

      <StructuredData faqs={faqs} />

      <HeroConcentric isLoggedIn={isLoggedIn} />

      <main id="contenu">

        {/* Problem/Solution Comparison Table */}
        <section
          id="solutions"
          className="relative pt-32 pb-24 overflow-hidden border-b border-line"
          style={{ background: "linear-gradient(to bottom, var(--paper) 0%, var(--surface) 250px)" }}
        >
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-extrabold text-ink tracking-tight mb-6">
                Marre de croiser les doigts pour que l&apos;IA vous lise&nbsp;?
              </h2>
              <p className="text-xl text-ink-2 max-w-2xl mx-auto leading-relaxed">
                Un plugin qui se met &agrave; jour, une r&egrave;gle de pare-feu qui change, et les robots des
                IA ne peuvent plus lire le site d&apos;un client. Personne ne re&ccedil;oit d&apos;alerte&nbsp;:
                pour un outil de supervision classique, rien n&apos;est tomb&eacute; en panne.
              </p>
            </div>

            {/*
              Quatre paires alignees plutot que deux colonnes de six puces. Une
              liste de douze affirmations ne se compare pas : on lit les six
              premieres, puis les six suivantes, sans jamais mettre les deux en
              regard. Ici chaque ligne oppose une situation reelle a ce que le
              produit fait -- et rien d'autre, car promettre plus serait faux.
            */}
            <div className="bg-paper rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-line overflow-hidden">
              <div className="hidden md:grid grid-cols-2 border-b border-line">
                <p className="px-8 py-4 text-sm font-semibold text-ink-2">Aujourd&apos;hui</p>
                <p className="px-8 py-4 text-sm font-semibold text-ink border-l border-line">Avec Decelio</p>
              </div>

              {SWITCHES.map((row, i) => (
                <div
                  key={row.before}
                  className={`grid grid-cols-1 md:grid-cols-2 ${i > 0 ? "border-t border-line" : ""}`}
                >
                  <p className="px-8 py-6 text-[15px] leading-relaxed text-ink-2">{row.before}</p>
                  <p className="px-8 pb-6 md:py-6 text-[15px] leading-relaxed text-ink md:border-l border-line">
                    {row.after}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. Proof (measurable, no invented metrics per constitution I & II) */}
        <section className="py-24 bg-paper border-b border-line text-center">
          <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight mb-4">
              Testez avant de nous croire
            </h2>
            <ul className="space-y-6 text-left mt-10">
              <li className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-ok text-white flex items-center justify-center shrink-0 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <span className="text-lg text-ink-2">Le diagnostic est gratuit, sans compte, et vous donne la cause en 15 secondes.</span>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-ok text-white flex items-center justify-center shrink-0 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <span className="text-lg text-ink-2">Chaque verdict est reli&eacute; &agrave; une cause v&eacute;rifiable&nbsp;: r&egrave;gle robots.txt (le fichier qui autorise ou bloque les robots), code HTTP, challenge du pare-feu, ou d&eacute;pendance au JavaScript.</span>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-ok text-white flex items-center justify-center shrink-0 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <span className="text-lg text-ink-2">Quand nous ne pouvons pas conclure, nous &eacute;crivons &laquo;&nbsp;&agrave; v&eacute;rifier&nbsp;&raquo; &mdash; jamais un verdict tranch&eacute;.</span>
              </li>
            </ul>
          </div>
        </section>

        <section id="produits" className="relative py-24 bg-paper">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-extrabold text-ink tracking-tight mb-6">
                Le seul moniteur con&ccedil;u pour l&apos;Answer Engine Optimization
              </h2>
              <p className="text-xl text-ink-2 max-w-3xl mx-auto">
                Un uptime de 100% ne sert &agrave; rien si ChatGPT est bloqu&eacute; par votre pare-feu. Prenez le contr&ocirc;le de ce que les LLMs voient vraiment.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 1: 2-col wide (Surveillance Pare-feu) */}
              <div className="md:col-span-2 bg-surface rounded-[2rem] p-8 shadow-sm border border-line relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 text-cobalt opacity-[0.03] group-hover:opacity-10 transition-opacity duration-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                </div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-cobalt/10 text-cobalt flex items-center justify-center mb-6">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                    </div>
                    <h3 className="text-2xl font-bold text-ink mb-3">D&eacute;tection des blocages WAF silencieux</h3>
                    <p className="text-ink-2 text-lg mb-8 max-w-md">
                      Cloudflare et Wordfence bloquent souvent les bots IA par d&eacute;faut. Nous v&eacute;rifions chaque jour que les requ&ecirc;tes de ChatGPT, Perplexity et Claude traversent votre pare-feu.
                    </p>
                  </div>
                  {/* Mock UI snippet */}
                  <div className="bg-paper rounded-xl p-4 border border-line/50 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-ink">Requ&ecirc;te non v&eacute;rifi&eacute;e se pr&eacute;sentant comme GPTBot</span>
                      <span className="text-xs font-bold text-ok bg-ok-soft px-2 py-1 rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-ok animate-pulse"></span>200 OK</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-ink">Requ&ecirc;te non v&eacute;rifi&eacute;e se pr&eacute;sentant comme ClaudeBot</span>
                      <span className="text-xs font-bold text-ok bg-ok-soft px-2 py-1 rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-ok animate-pulse"></span>200 OK</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: 1-col wide (Contenu Brut) */}
              <div className="col-span-1 bg-surface rounded-[2rem] p-8 shadow-sm border border-line relative overflow-hidden group">
                <div className="relative z-10 h-full flex flex-col">
                  <div className="w-12 h-12 rounded-2xl bg-cobalt/10 text-cobalt flex items-center justify-center mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                  </div>
                  <h3 className="text-2xl font-bold text-ink mb-3">Extraction du DOM s&eacute;curis&eacute;e</h3>
                  <p className="text-ink-2 text-lg">
                    Les LLMs scannent le HTML brut. Nous garantissons que vos textes vitaux sont bien pr&eacute;sents c&ocirc;t&eacute; serveur, sans d&eacute;pendre du JavaScript.
                  </p>
                  <div className="mt-auto pt-8">
                     <div className="w-full h-2 bg-line rounded-full mb-2"></div>
                     <div className="w-3/4 h-2 bg-line rounded-full mb-2"></div>
                     <div className="w-5/6 h-2 bg-line rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Card 3: 1-col wide (Veille Robots.txt) */}
              <div className="col-span-1 bg-surface rounded-[2rem] p-8 shadow-sm border border-line relative overflow-hidden group">
                <div className="relative z-10 h-full flex flex-col">
                  <div className="w-12 h-12 rounded-2xl bg-cobalt/10 text-cobalt flex items-center justify-center mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  </div>
                  <h3 className="text-2xl font-bold text-ink mb-3">Surveillance robots.txt</h3>
                  <p className="text-ink-2 text-lg">
                    Une r&egrave;gle &quot;Disallow&quot; d&eacute;ploy&eacute;e par erreur ? Soyez alert&eacute; avant m&ecirc;me que GPTBot ne d&eacute;sindexe le site de votre client.
                  </p>
                  <div className="mt-auto pt-8 flex items-center gap-2">
                     <span className="text-stop font-mono text-xs bg-stop-soft px-2 py-1 rounded">Disallow: /</span>
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-line-strong"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                     <span className="text-ok font-mono text-xs bg-ok-soft px-2 py-1 rounded">Allow: /</span>
                  </div>
                </div>
              </div>

              {/* Card 4: 2-col wide (Rapports Marque Blanche) */}
              <div className="md:col-span-2 bg-ink rounded-[2rem] p-8 shadow-lg relative overflow-hidden group">
                <div className="relative z-10 h-full flex flex-col md:flex-row items-center gap-8">
                  <div className="flex-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface/10 text-surface text-xs font-bold uppercase tracking-wider mb-6">
                      <span className="w-2 h-2 rounded-full bg-ok" />
                      Inclus &agrave; partir du plan Agence
                    </div>
                    <h3 className="text-2xl font-bold text-surface mb-3">Rapports AEO Marque Blanche</h3>
                    <p className="text-surface-2 text-lg max-w-md">
                      Prouvez la rentabilit&eacute; de votre prestation mensuelle. G&eacute;n&eacute;rez des audits PDF &agrave; vos couleurs d&eacute;montrant la visibilit&eacute; IA des sites de vos clients.
                    </p>
                  </div>
                  {/* Mock UI snippet */}
                  <div className="w-full md:w-64 bg-surface rounded-xl p-4 shadow-2xl rotate-2 group-hover:rotate-0 transition-transform duration-500">
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-line">
                       <div className="w-8 h-8 rounded-full bg-paper flex items-center justify-center text-xs font-bold text-ink">Logo</div>
                       <div className="text-sm font-bold text-ink">Rapport AEO</div>
                    </div>
                    <div className="space-y-3">
                       <div className="flex items-center justify-between">
                         <div className="w-24 h-2 bg-line rounded-full"></div>
                         <div className="w-8 h-2 bg-ok rounded-full"></div>
                       </div>
                       <div className="flex items-center justify-between">
                         <div className="w-16 h-2 bg-line rounded-full"></div>
                         <div className="w-8 h-2 bg-ok rounded-full"></div>
                       </div>
                       <div className="flex items-center justify-between">
                         <div className="w-20 h-2 bg-line rounded-full"></div>
                         <div className="w-8 h-2 bg-ok rounded-full"></div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* 6. Mid-page CTA */}
        <section className="py-24 bg-surface border-y border-line text-center">
          <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-ink tracking-tight mb-6">
              Pr&ecirc;t &agrave; auditer votre premier site ?
            </h2>
            <p className="text-xl text-ink-2 mb-10">
              D&eacute;couvrez en moins de 15 secondes si les LLMs sont bloqu&eacute;s sur votre domaine principal. Le diagnostic est gratuit et ne demande pas de compte.
            </p>
            <Link href="/register" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-ink text-surface font-bold text-lg hover:opacity-90 transition-opacity">
              D&eacute;marrer gratuitement
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
            </Link>
          </div>
        </section>
        {/* 7. How It Works */}
        <section id="comment-ca-marche" className="py-24 bg-surface">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-extrabold text-ink tracking-tight mb-4">
                En pilote automatique
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-paper p-8 rounded-3xl relative overflow-hidden group">
                <div className="text-6xl font-black text-line-strong mb-6 opacity-50 group-hover:opacity-100 transition-opacity">1</div>
                <h3 className="text-2xl font-bold text-ink mb-3">Ajoutez vos clients</h3>
                <p className="text-ink-2 text-lg">L&apos;URL de chaque client suffit. D&eacute;posez le logo de votre agence pour le rapport mensuel, et c&apos;est tout.</p>
              </div>
              <div className="bg-paper p-8 rounded-3xl relative overflow-hidden group">
                <div className="text-6xl font-black text-line-strong mb-6 opacity-50 group-hover:opacity-100 transition-opacity">2</div>
                <h3 className="text-2xl font-bold text-ink mb-3">Une v&eacute;rification par jour</h3>
                <p className="text-ink-2 text-lg">Decelio interroge chaque site depuis l&apos;ext&eacute;rieur, en imitant l&apos;en-t&ecirc;te des robots IA pour d&eacute;tecter les blocages WAF.</p>
              </div>
              <div className="bg-paper p-8 rounded-3xl relative overflow-hidden group">
                <div className="text-6xl font-black text-line-strong mb-6 opacity-50 group-hover:opacity-100 transition-opacity">3</div>
                <h3 className="text-2xl font-bold text-ink mb-3">Alerte avec correctif</h3>
                <p className="text-ink-2 text-lg">Un e-mail d&egrave;s qu&apos;un robot IA est bloqu&eacute;, avec la cause et le correctif technique. Le site r&eacute;pond normalement &agrave; un visiteur humain&nbsp;: c&apos;est ce qui rend le blocage invisible sans alerte. Rapport r&eacute;capitulatif envoy&eacute; en fin de mois.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 8. Tarifs (Pricing) */}
        <section id="tarifs" className="py-24 bg-paper border-y border-line">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-extrabold text-ink tracking-tight mb-4">
                Des tarifs con&ccedil;us pour &ecirc;tre refactur&eacute;s
              </h2>
              <p className="text-xl text-ink-2 max-w-2xl mx-auto leading-relaxed">
                Ajoutez une ligne &laquo;&nbsp;surveillance IA&nbsp;&raquo; &agrave; votre contrat de maintenance, entre
                10 et 20&nbsp;&euro; par site et par mois. Sur trente sites factur&eacute;s 10&nbsp;&euro;,
                cela fait <strong className="text-ink font-semibold">300&nbsp;&euro; par mois</strong> pour un
                abonnement &agrave; 99&nbsp;&euro;.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-[1000px] mx-auto items-start">
              {PLANS.map((plan) => (
                <div
                  key={plan.slug}
                  className={
                    plan.featured
                      ? "bg-ink rounded-3xl p-8 shadow-xl border border-ink flex flex-col relative md:-translate-y-4"
                      : "bg-surface rounded-3xl p-8 shadow-sm border border-line flex flex-col"
                  }
                >
                  {plan.featured && (
                    <div className="absolute top-0 inset-x-0 -translate-y-1/2 flex justify-center">
                      <span className="bg-ink text-paper text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                        Pour 10 &agrave; 30 sites
                      </span>
                    </div>
                  )}

                  <h3 className={`text-2xl font-bold mb-2 ${plan.featured ? "text-surface" : "text-ink"}`}>
                    {plan.name}
                  </h3>
                  <p className={`mb-6 ${plan.featured ? "text-surface-2" : "text-ink-2"}`}>{plan.pitch}</p>
                  <div className={`text-4xl font-extrabold mb-8 ${plan.featured ? "text-surface" : "text-ink"}`}>
                    {plan.price}&euro;
                    <span className={`text-lg font-normal ${plan.featured ? "text-surface-2" : "text-ink-2"}`}>
                      /mois
                    </span>
                  </div>

                  {/* Memes lignes, meme ordre, sur les trois paliers : ce qui manque se voit. */}
                  <ul className="space-y-4 mb-8 flex-1">
                    {PLAN_FEATURES.map((feature, i) => {
                      const value = plan.values[i];
                      const absent = value === false;
                      const tone = plan.featured
                        ? absent
                          ? "text-surface-2"
                          : "text-surface-2"
                        : absent
                          ? "text-ink-2"
                          : "text-ink-2";
                      return (
                        <li key={feature} className="flex items-start gap-3">
                          {absent ? (
                            <span aria-hidden="true" className="shrink-0 w-5 text-center leading-5 text-ink-3">
                              &mdash;
                            </span>
                          ) : (
                            <Check />
                          )}
                          <span className={`text-[15px] leading-5 ${tone}`}>
                            {typeof value === "string" ? (
                              <>
                                <strong className={plan.featured ? "text-surface font-semibold" : "text-ink font-semibold"}>
                                  {value}
                                </strong>{" "}
                                {feature.toLowerCase()}
                              </>
                            ) : (
                              feature
                            )}
                            {absent && <span className="sr-only"> : non inclus</span>}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  {/* Meme verbe sur les trois paliers, et le meme que dans l'application. */}
                  <Link
                    href={`/register?plan=${plan.slug}`}
                    className={
                      plan.featured
                        ? "w-full text-center px-6 py-3 rounded-full bg-surface text-ink font-bold hover:opacity-90 transition-opacity"
                        : "w-full text-center px-6 py-3 rounded-full border border-line text-ink font-bold hover:bg-surface-2 transition-colors"
                    }
                  >
                    Choisir {plan.name}
                  </Link>
                </div>
              ))}
            </div>

            {/* Les quatre questions qu'une agence se pose devant trois prix.
                Chaque reponse est verifiable dans le code de facturation :
                abonnement Stripe mensuel, sans periode d'essai, carte requise,
                et quota applique par PLAN_LIMITS. */}
            <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-2">
              <li>Facturation mensuelle, sans engagement</li>
              <li aria-hidden="true" className="text-ink-3">&middot;</li>
              <li>Paiement par carte, via Stripe</li>
              <li aria-hidden="true" className="text-ink-3">&middot;</li>
              <li>Rien &agrave; installer chez vos clients</li>
              <li aria-hidden="true" className="text-ink-3">&middot;</li>
              <li>Au-del&agrave; du quota, Decelio indique le palier suivant</li>
            </ul>
            <p className="mt-4 text-center text-sm text-ink-2">
              Pas de p&eacute;riode d&apos;essai&nbsp;: le diagnostic d&apos;une URL est gratuit et sans compte, autant
              l&apos;utiliser avant de payer.{" "}
              <a href="#scan" className="font-semibold text-ink underline underline-offset-4 hover:text-brand">
                Scanner un site
              </a>
            </p>
          </div>
        </section>

        {/* 8bis. Comparatif honnete */}
        <section id="comparatif" className="py-24 bg-surface border-y border-line">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight mb-4">
                Decelio, une suite SEO ou une v&eacute;rification manuelle&nbsp;?
              </h2>
              <p className="text-lg text-ink-2 max-w-2xl mx-auto">
                Trois outils, trois questions diff&eacute;rentes. Voici, sans enjoliver, ce que Decelio fait et ce qu&apos;il ne fait pas.
              </p>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <caption className="sr-only">
                  Comparaison entre Decelio, les suites SEO comme Semrush ou Ahrefs, et une v&eacute;rification manuelle du blocage des robots IA
                </caption>
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className="px-4 py-3 text-sm font-bold text-ink">Crit&egrave;re</th>
                    <th scope="col" className="px-4 py-3 text-sm font-bold text-ink">Decelio</th>
                    <th scope="col" className="px-4 py-3 text-sm font-bold text-ink">Semrush / Ahrefs</th>
                    <th scope="col" className="px-4 py-3 text-sm font-bold text-ink">V&eacute;rification manuelle</th>
                  </tr>
                </thead>
                <tbody className="text-ink-2 text-sm">
                  <tr className="border-b border-line/60">
                    <th scope="row" className="px-4 py-3 font-semibold text-ink">V&eacute;rifie l&apos;acc&egrave;s des robots IA</th>
                    <td className="px-4 py-3">Oui, chaque jour</td>
                    <td className="px-4 py-3">Non</td>
                    <td className="px-4 py-3">Une seule fois</td>
                  </tr>
                  <tr className="border-b border-line/60">
                    <th scope="row" className="px-4 py-3 font-semibold text-ink">Portefeuille multi-clients</th>
                    <td className="px-4 py-3">Oui</td>
                    <td className="px-4 py-3">Oui</td>
                    <td className="px-4 py-3">Non</td>
                  </tr>
                  <tr className="border-b border-line/60">
                    <th scope="row" className="px-4 py-3 font-semibold text-ink">Volume de donn&eacute;es SEO</th>
                    <td className="px-4 py-3">Aucun</td>
                    <td className="px-4 py-3">Tr&egrave;s important</td>
                    <td className="px-4 py-3">Aucun</td>
                  </tr>
                  <tr className="border-b border-line/60">
                    <th scope="row" className="px-4 py-3 font-semibold text-ink">Suivi de positions et backlinks</th>
                    <td className="px-4 py-3">Non</td>
                    <td className="px-4 py-3">Oui</td>
                    <td className="px-4 py-3">Non</td>
                  </tr>
                  <tr className="border-b border-line/60">
                    <th scope="row" className="px-4 py-3 font-semibold text-ink">Alerte au changement d&apos;&eacute;tat</th>
                    <td className="px-4 py-3">Oui</td>
                    <td className="px-4 py-3">Non</td>
                    <td className="px-4 py-3">Non</td>
                  </tr>
                  <tr className="border-b border-line/60">
                    <th scope="row" className="px-4 py-3 font-semibold text-ink">Rapport &agrave; votre marque</th>
                    <td className="px-4 py-3">Oui, &agrave; partir de 99&nbsp;&euro;</td>
                    <td className="px-4 py-3">Oui</td>
                    <td className="px-4 py-3">Non</td>
                  </tr>
                  <tr>
                    <th scope="row" className="px-4 py-3 font-semibold text-ink">Prix de d&eacute;part</th>
                    <td className="px-4 py-3">39&nbsp;&euro;</td>
                    <td className="px-4 py-3">Plus de 130&nbsp;&euro;</td>
                    <td className="px-4 py-3">Gratuit</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {/* Un prix concurrent non date devient faux avec le temps. */}
            <p className="mt-4 text-sm text-ink-2">
              Prix des suites SEO relevés sur leurs pages publiques en septembre 2026, pour leur
              premier palier mensuel. Ils changent&nbsp;: vérifiez chez l’éditeur avant de
              vous décider.
            </p>
          </div>
        </section>

        {/* 9. FAQ & Trust */}
        <section id="faq" className="py-24 bg-surface">
          <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-extrabold text-ink tracking-tight">Questions courantes</h2>
            </div>
            
            <div className="space-y-4 mb-16">
              {faqs.map((f, i) => (
                <details
                  key={f.q}
                  /* La premiere reponse est ouverte : six barres fermees ne montrent rien a lire. */
                  open={i === 0}
                  className="group bg-paper rounded-2xl border border-line overflow-hidden"
                >
                  <summary className="cursor-pointer px-6 py-4 font-bold text-ink flex items-center justify-between list-none">
                    {f.q}
                    <span className="text-ink-3 group-open:rotate-45 transition-transform">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </span>
                  </summary>
                  <div className="px-6 pb-4 text-ink-2">
                    <p>{f.a}</p>
                  </div>
                </details>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-6 text-sm font-semibold text-ink-2">
              <span className="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Paiement s&eacute;curis&eacute; Stripe</span>
              <span className="hidden sm:block text-line-strong">&bull;</span>
              <span className="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></svg> H&eacute;berg&eacute; en Europe</span>
              <span className="hidden sm:block text-line-strong">&bull;</span>
              <span className="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> Conforme RGPD</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-ink text-paper py-16">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-12 md:gap-8 mb-12">
            
            <div className="md:col-span-2">
              <Link href="/" aria-label="Decelio, accueil" className="inline-flex items-center gap-3 mb-4">
                <Image
                  src="/logo-decelio-blanc.png"
                  alt=""
                  width={502}
                  height={565}
                  className="h-9 w-auto"
                />
                <span className="text-2xl font-black tracking-tight">Decelio</span>
              </Link>
              <p className="text-paper/70 max-w-sm leading-relaxed">
                Surveillez l&apos;acc&egrave;s des robots de recherche IA aux sites de vos clients. Rep&eacute;rez les blocages techniques, sans confondre acc&egrave;s et citations.
              </p>
            </div>
            
            <nav aria-label="Navigation du pied de page" className="grid grid-cols-1 sm:grid-cols-3 gap-8 md:col-span-3">
              <div>
                <h2 className="font-bold mb-5">Produit</h2>
                <ul className="space-y-3 text-paper/70 font-medium">
                  <li><Link href="#comment-ca-marche" className="hover:text-paper focus-visible:text-paper transition-colors">Comment &ccedil;a marche</Link></li>
                  <li><Link href="#produits" className="hover:text-paper focus-visible:text-paper transition-colors">Fonctionnalit&eacute;s</Link></li>
                  <li><Link href="#tarifs" className="hover:text-paper focus-visible:text-paper transition-colors">Tarifs</Link></li>
                  <li><Link href="#faq" className="hover:text-paper focus-visible:text-paper transition-colors">Questions fr&eacute;quentes</Link></li>
                </ul>
              </div>

              <div>
                <h2 className="font-bold mb-5">Votre compte</h2>
                <ul className="space-y-3 text-paper/70 font-medium">
                  {isLoggedIn ? (
                    <li><Link href="/dashboard" className="hover:text-paper focus-visible:text-paper transition-colors">Tableau de bord</Link></li>
                  ) : (
                    <>
                      <li><Link href="/login" className="hover:text-paper focus-visible:text-paper transition-colors">Connexion</Link></li>
                      <li><Link href="/register" className="hover:text-paper focus-visible:text-paper transition-colors">Cr&eacute;er un compte</Link></li>
                    </>
                  )}
                </ul>
              </div>

              <div>
                <h2 className="font-bold mb-5">Contact</h2>
                <ul className="space-y-3 text-paper/70 font-medium">
                  <li><a href="mailto:contact@decelio.app" className="hover:text-paper focus-visible:text-paper transition-colors">Nous contacter</a></li>
                </ul>
              </div>
            </nav>

          </div>
          
          <div className="pt-8 border-t border-paper/20 flex flex-col md:flex-row justify-between items-start gap-6 text-sm text-paper/70">
            <p>&copy; {new Date().getFullYear()} Decelio. Tous droits r&eacute;serv&eacute;s.</p>
            <p className="max-w-xl md:text-right">
              <strong className="text-paper font-semibold">Ce que mesure l&apos;outil :</strong> Decelio v&eacute;rifie l&apos;acc&egrave;s technique des robots aux sites. Cela ne garantit pas qu&apos;une IA citera votre marque.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
