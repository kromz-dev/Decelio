import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import HeroConcentric, { NAV_LINKS } from "./HeroConcentric";
import { Verdict } from "@/components/ui/verdict";
import { StructuredData } from "./StructuredData";
import { RevealOnScroll } from "./RevealOnScroll";
import { bricolage, schibsted } from "./fonts";
import tokens from "./tokens.module.css";
import styles from "./home.module.css";

/**
 * Les quatre bascules de la section « Aujourd'hui / Avec Decelio ».
 *
 * Chaque ligne decrit une situation que vit une agence, et en face, ce que le
 * produit fait reellement -- verification d'acces, jamais mesure de citation.
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

/** Trois engagements verifiables : ce qu'on peut tester avant de payer. */
const PROOFS = [
  "Le diagnostic est gratuit, sans compte, et vous donne la cause en 15 secondes.",
  "Chaque verdict est relié à une cause vérifiable : règle robots.txt, code HTTP, challenge du pare-feu ou dépendance au JavaScript.",
  "Quand nous ne pouvons pas conclure, nous écrivons « à vérifier », jamais un verdict tranché.",
] as const;

/** Une vraie sequence : la numerotation porte l'ordre des etapes. */
const STEPS = [
  {
    title: "Ajoutez vos clients",
    body: "L'adresse de chaque site suffit. Déposez le logo de votre agence pour le rapport mensuel, et c'est tout.",
  },
  {
    title: "Une vérification par jour",
    body: "Decelio interroge chaque site depuis l'extérieur, en se présentant comme les robots IA, pour repérer les blocages du pare-feu.",
  },
  {
    title: "Une alerte avec le correctif",
    body: "Un e-mail dès qu'un robot IA est bloqué, avec la cause et le correctif. En fin de mois, un rapport récapitulatif.",
  },
] as const;

/**
 * Grille tarifaire.
 *
 * Les trois paliers exposent exactement les memes lignes, dans le meme ordre :
 * ce qui manque est ecrit, pas omis.
 */
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

const COMPARISON = [
  ["Vérifie l'accès des robots IA", "Oui, chaque jour", "Non", "Une seule fois"],
  ["Portefeuille multi-clients", "Oui", "Oui", "Non"],
  ["Volume de données SEO", "Aucun", "Très important", "Aucun"],
  ["Suivi de positions et backlinks", "Non", "Oui", "Non"],
  ["Alerte au changement d'état", "Oui", "Non", "Non"],
  ["Rapport à votre marque", "Oui, à partir de 99 €", "Oui", "Non"],
  ["Prix de départ", "39 €", "Plus de 130 €", "Gratuit"],
] as const;

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

/** Rang d'un element dans une cascade de defilement (voir `.reveal`, globals.css). */
function rank(i: number): CSSProperties {
  return { ["--i" as string]: i };
}

/** Coche des listes. */
function Check({ className = "text-ok" }: { className?: string }) {
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
function SectionHeading({ id, title, children }: { id: string; title: ReactNode; children?: ReactNode }) {
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
function RingsWatermark({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 400 400" className={className}>
      {[60, 95, 130, 165, 200].map((r, i) => (
        <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity={0.5 - i * 0.08} />
      ))}
    </svg>
  );
}

export function HomePage({ isLoggedIn }: { isLoggedIn?: boolean }) {
  return (
    <div className={`${schibsted.variable} ${bricolage.variable} ${tokens.root} ${styles.page}`}>
      <a href="#contenu" className={styles.skipLink}>Aller au contenu</a>

      <StructuredData faqs={faqs} />
      <RevealOnScroll />

      <HeroConcentric isLoggedIn={isLoggedIn} />

      <main id="contenu">

        {/* 1. Le probleme, et ce que Decelio change, ligne a ligne */}
        <section id="probleme" aria-labelledby="probleme-titre" className="scroll-mt-16 border-b border-line bg-surface py-28">
          <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8">
            <SectionHeading id="probleme-titre" title={<>Un robot bloqu&eacute; ne d&eacute;clenche aucune alarme</>}>
              Un plugin qui se met &agrave; jour, une r&egrave;gle de pare-feu qui change, et les robots des IA ne
              peuvent plus lire le site d&apos;un client. Pour un outil de supervision classique, rien n&apos;est
              tomb&eacute; en panne.
            </SectionHeading>

            {/* Quatre paires alignees : chaque ligne oppose une situation reelle a ce que le produit fait. */}
            <div className="overflow-hidden rounded-[1.75rem] border border-line bg-paper">
              <div className="hidden grid-cols-2 border-b border-line md:grid">
                <p className="px-8 py-4 text-sm font-semibold text-ink-2">Aujourd&apos;hui</p>
                <p className="border-l border-line bg-brand-soft/60 px-8 py-4 text-sm font-semibold text-brand">Avec Decelio</p>
              </div>
              {SWITCHES.map((row, i) => (
                <div
                  key={row.before}
                  style={rank(i)}
                  className={`reveal grid grid-cols-1 md:grid-cols-2 ${i > 0 ? "border-t border-line" : ""}`}
                >
                  <p className="px-8 pb-3 pt-6 text-[15px] leading-relaxed text-ink-2 md:py-6">{row.before}</p>
                  <p className="flex gap-3 bg-brand-soft/40 px-8 pb-6 pt-3 text-[15px] leading-relaxed text-ink md:border-l md:border-line md:py-6">
                    <Check className="mt-0.5 text-brand" />
                    <span>{row.after}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 2. Preuve : ce qu'on peut verifier soi-meme, sans chiffre invente */}
        <section aria-labelledby="preuve-titre" className="border-b border-line bg-paper py-24">
          <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8">
            <h2 id="preuve-titre" className="reveal font-display mb-12 text-center text-[32px] font-bold tracking-[-0.03em] text-ink sm:text-[40px]">
              Testez avant de nous croire
            </h2>
            <ul className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {PROOFS.map((proof, i) => (
                <li key={proof} style={rank(i)} className="reveal flex gap-4 rounded-[1.25rem] border border-line bg-surface p-6">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ok-soft">
                    <Check className="h-4 w-4 text-ok" />
                  </span>
                  <span className="text-[16px] leading-relaxed text-ink-2">{proof}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/*
          3. Ce que le produit verifie, et ce que l'agence en recoit. Chaque carte
          decrit une verification qui existe dans le scanner, et rien d'autre.
          Les maquettes portent la mention « Exemple » (constitution, principe II).
        */}
        <section id="controles" aria-labelledby="controles-titre" className="relative scroll-mt-16 bg-paper pb-28">
          <div className="relative z-10 mx-auto max-w-[1100px] px-4 pt-24 sm:px-6 lg:px-8">
            <SectionHeading id="controles-titre" title="Ce que Decelio vérifie chaque jour">
              Un site peut r&eacute;pondre normalement &agrave; vos visiteurs et rester ferm&eacute; aux robots des
              assistants IA. Voici les trois contr&ocirc;les que Decelio fait sur chaque site, et le rapport que
              vous en tirez.
            </SectionHeading>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

              {/* Carte 1, deux colonnes : le pare-feu */}
              <article style={rank(0)} className="reveal flex flex-col justify-between gap-8 rounded-[1.75rem] border border-line bg-surface p-8 md:col-span-2">
                <div>
                  <div aria-hidden="true" className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                  </div>
                  <h3 className="font-display mb-3 text-[26px] font-bold tracking-[-0.02em] text-ink">Blocages du pare-feu</h3>
                  <p className="max-w-xl text-lg text-ink-2">
                    Cloudflare, Wordfence ou le pare-feu de l&apos;h&eacute;bergeur bloquent parfois les robots IA sans
                    pr&eacute;venir personne. Chaque jour, Decelio envoie &agrave; chaque site des requ&ecirc;tes qui se
                    pr&eacute;sentent comme GPTBot, ClaudeBot ou PerplexityBot, et note la r&eacute;ponse. C&apos;est un
                    indice solide, pas une preuve&nbsp;: les vrais robots partent d&apos;autres adresses.
                  </p>
                </div>
                <figure className="rounded-xl border border-line bg-paper p-4">
                  <figcaption className="type-caption mb-3 text-ink-2">Exemple</figcaption>
                  <ul className="flex flex-col gap-3">
                    <li className="flex items-center justify-between gap-4">
                      <span className="text-sm font-medium text-ink">Requ&ecirc;te non v&eacute;rifi&eacute;e se pr&eacute;sentant comme GPTBot</span>
                      <Verdict value="lu" variant="inline" size="sm" detail="200" />
                    </li>
                    <li className="flex items-center justify-between gap-4">
                      <span className="text-sm font-medium text-ink">Requ&ecirc;te non v&eacute;rifi&eacute;e se pr&eacute;sentant comme ClaudeBot</span>
                      <Verdict value="refuse" variant="inline" size="sm" detail="403" />
                    </li>
                  </ul>
                </figure>
              </article>

              {/* Carte 2 : le contenu sans JavaScript */}
              <article style={rank(1)} className="reveal flex flex-col rounded-[1.75rem] border border-line bg-surface p-8">
                <div aria-hidden="true" className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                </div>
                <h3 className="font-display mb-3 text-[26px] font-bold tracking-[-0.02em] text-ink">Texte lisible sans JavaScript</h3>
                <p className="text-lg text-ink-2">
                  Les robots IA lisent en g&eacute;n&eacute;ral la page telle que le serveur l&apos;envoie, sans
                  ex&eacute;cuter le JavaScript. Decelio v&eacute;rifie qu&apos;il y reste assez de texte utile. Sinon,
                  le verdict est &laquo;&nbsp;Vide&nbsp;&raquo;.
                </p>
                <figure className="mt-auto pt-8">
                  <figcaption className="type-caption mb-2 text-ink-2">Exemple</figcaption>
                  <Verdict value="vide" variant="stamp" size="sm" />
                </figure>
              </article>

              {/* Carte 3 : robots.txt */}
              <article style={rank(0)} className="reveal flex flex-col rounded-[1.75rem] border border-line bg-surface p-8">
                <div aria-hidden="true" className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                </div>
                <h3 className="font-display mb-3 text-[26px] font-bold tracking-[-0.02em] text-ink">R&egrave;gles robots.txt</h3>
                <p className="text-lg text-ink-2">
                  Le fichier robots.txt dit aux robots ce qu&apos;ils ont le droit de lire. Une ligne
                  &laquo;&nbsp;Disallow&nbsp;&raquo; publi&eacute;e par erreur, et un assistant perd l&apos;acc&egrave;s
                  au site. Decelio relit ce fichier &agrave; chaque v&eacute;rification et vous alerte quand une
                  r&egrave;gle bloque un robot IA.
                </p>
                <figure className="mt-auto pt-8">
                  <figcaption className="type-caption mb-2 text-ink-2">Exemple de r&egrave;gle d&eacute;tect&eacute;e</figcaption>
                  <pre className="rounded-xs bg-stop-soft px-3 py-2 font-mono text-xs text-stop">{"User-agent: GPTBot\nDisallow: /"}</pre>
                </figure>
              </article>

              {/* Carte 4, deux colonnes : le rapport en marque blanche */}
              <article style={rank(1)} className="reveal relative flex flex-col gap-8 overflow-hidden rounded-[1.75rem] bg-ink p-8 md:col-span-2 md:flex-row md:items-center">
                <RingsWatermark className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] text-brand-soft/40" />
                <div className="relative flex-1">
                  <p className="mb-6 inline-flex items-center rounded-full bg-surface/10 px-3 py-1 text-sm font-medium text-surface">
                    Inclus dans les formules Agence et Studio
                  </p>
                  <h3 className="font-display mb-3 text-[26px] font-bold tracking-[-0.02em] text-surface">Rapport mensuel &agrave; votre marque</h3>
                  <p className="max-w-md text-lg text-surface-2">
                    Un PDF par client, &agrave; votre logo et vos couleurs&nbsp;: l&apos;&eacute;tat de chaque site pour
                    chaque assistant, l&apos;historique du mois, les incidents avec leur cause et le correctif propos&eacute;.
                    Il dit si les robots peuvent lire le site, pas si une IA le cite.
                  </p>
                </div>
                <figure className="relative w-full rounded-xl bg-surface p-4 shadow-float md:w-64 md:rotate-2">
                  <figcaption className="sr-only">Exemple de rapport mensuel</figcaption>
                  <div className="mb-4 flex items-center gap-3 border-b border-line pb-4">
                    <div aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-paper text-xs font-bold text-ink">Logo</div>
                    <p className="text-sm font-bold text-ink">Rapport mensuel</p>
                  </div>
                  <ul className="space-y-3">
                    <li className="flex items-center justify-between gap-3">
                      <span className="text-sm text-ink-2">ChatGPT</span>
                      <Verdict value="lu" variant="inline" size="sm" />
                    </li>
                    <li className="flex items-center justify-between gap-3">
                      <span className="text-sm text-ink-2">Claude</span>
                      <Verdict value="lu" variant="inline" size="sm" />
                    </li>
                    <li className="flex items-center justify-between gap-3">
                      <span className="text-sm text-ink-2">Perplexity</span>
                      <Verdict value="refuse" variant="inline" size="sm" />
                    </li>
                  </ul>
                  <p className="type-caption mt-4 text-ink-2">Exemple</p>
                </figure>
              </article>

            </div>
          </div>
        </section>

        {/* 4. Comment ca marche : une vraie sequence, reliee par une onde */}
        <section id="methode" aria-labelledby="methode-titre" className="scroll-mt-16 border-y border-line bg-surface py-28">
          <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8">
            <SectionHeading id="methode-titre" title="En pilote automatique">
              Trois &eacute;tapes, puis plus rien &agrave; faire jusqu&apos;&agrave; la prochaine alerte.
            </SectionHeading>

            <ol className="relative grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
              {/* Le fil qui relie les etapes, trace comme les anneaux du logo */}
              <svg aria-hidden="true" focusable="false" viewBox="0 0 1000 40" preserveAspectRatio="none" className="pointer-events-none absolute left-[16%] right-[16%] top-7 hidden h-10 w-[68%] text-brand/40 md:block">
                <path d="M0 20 C 125 0, 250 40, 375 20 S 625 0, 750 20 S 875 40, 1000 20" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6 8" vectorEffect="non-scaling-stroke" />
              </svg>
              {STEPS.map((step, i) => (
                <li key={step.title} style={rank(i)} className="reveal relative flex flex-col items-center text-center">
                  <span className="font-display relative mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-brand/20 bg-brand-soft text-2xl font-bold text-brand shadow-[0_0_0_8px_var(--surface)]">
                    {i + 1}
                  </span>
                  <h3 className="font-display mb-3 text-[24px] font-bold tracking-[-0.02em] text-ink">{step.title}</h3>
                  <p className="max-w-xs text-[16px] leading-relaxed text-ink-2">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 5. Tarifs */}
        <section id="tarifs" aria-labelledby="tarifs-titre" className="scroll-mt-16 bg-paper py-28">
          <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8">
            <SectionHeading id="tarifs-titre" title="Des tarifs conçus pour être refacturés">
              Ajoutez une ligne &laquo;&nbsp;surveillance IA&nbsp;&raquo; &agrave; votre contrat de maintenance, entre
              10 et 20&nbsp;&euro; par site et par mois. Sur trente sites factur&eacute;s 10&nbsp;&euro;, cela fait{" "}
              <strong className="font-semibold text-ink">300&nbsp;&euro; par mois</strong> pour un abonnement &agrave; 99&nbsp;&euro;.
            </SectionHeading>

            <div className="mx-auto grid max-w-[1000px] grid-cols-1 items-start gap-8 md:grid-cols-3">
              {PLANS.map((plan, i) => (
                <div
                  key={plan.slug}
                  style={rank(i)}
                  className={
                    plan.featured
                      ? "reveal relative flex flex-col overflow-hidden rounded-[1.75rem] border border-ink bg-ink p-8 shadow-[0_30px_60px_-30px_rgb(29_76_164/0.7)] md:-translate-y-4"
                      : "reveal relative flex flex-col rounded-[1.75rem] border border-line bg-surface p-8"
                  }
                >
                  {plan.featured && (
                    <>
                      <RingsWatermark className="pointer-events-none absolute -right-28 -top-28 h-[320px] w-[320px] text-brand-soft/30" />
                      <span className="relative mb-4 inline-flex w-fit rounded-full bg-surface/10 px-3 py-1 text-xs font-semibold text-surface">
                        Pour 10 &agrave; 30 sites
                      </span>
                    </>
                  )}

                  <h3 className={`font-display relative mb-2 text-[26px] font-bold tracking-[-0.02em] ${plan.featured ? "text-surface" : "text-ink"}`}>
                    {plan.name}
                  </h3>
                  <p className={`relative mb-6 ${plan.featured ? "text-surface-2" : "text-ink-2"}`}>{plan.pitch}</p>
                  <p className={`font-display relative mb-8 text-5xl font-bold tracking-[-0.03em] ${plan.featured ? "text-surface" : "text-ink"}`}>
                    {plan.price}&nbsp;&euro;
                    <span className={`font-sans text-lg font-normal tracking-normal ${plan.featured ? "text-surface-2" : "text-ink-2"}`}> /mois</span>
                  </p>

                  {/* Memes lignes, meme ordre, sur les trois paliers : ce qui manque se voit. */}
                  <ul className="relative mb-8 flex-1 space-y-4">
                    {PLAN_FEATURES.map((feature, f) => {
                      const value = plan.values[f];
                      const absent = value === false;
                      const tone = plan.featured ? "text-surface-2" : "text-ink-2";
                      return (
                        <li key={feature} className="flex items-start gap-3">
                          {absent ? (
                            <span aria-hidden="true" className="w-5 shrink-0 text-center leading-5 text-ink-3">&mdash;</span>
                          ) : (
                            <Check className={plan.featured ? "text-[#4fcb8e]" : "text-ok"} />
                          )}
                          <span className={`text-[15px] leading-5 ${tone}`}>
                            {typeof value === "string" ? (
                              <>
                                <strong className={plan.featured ? "font-semibold text-surface" : "font-semibold text-ink"}>{value}</strong>{" "}
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
                        ? "relative w-full rounded-full bg-surface px-6 py-3 text-center font-semibold text-ink transition-transform duration-300 hover:-translate-y-0.5"
                        : "relative w-full rounded-full border border-line-strong/40 px-6 py-3 text-center font-semibold text-ink transition-colors hover:bg-surface-2"
                    }
                  >
                    Choisir {plan.name}
                  </Link>
                </div>
              ))}
            </div>

            {/* Les questions qu'une agence se pose devant trois prix, verifiables dans le code de facturation. */}
            <ul className="mt-12 flex flex-wrap items-center justify-center gap-x-3 gap-y-3 text-sm text-ink-2">
              {[
                "Facturation mensuelle, sans engagement",
                "Paiement par carte, via Stripe",
                "Rien à installer chez vos clients",
                "Au-delà du quota, Decelio indique le palier suivant",
              ].map((item) => (
                <li key={item} className="rounded-full border border-line bg-surface px-4 py-1.5">{item}</li>
              ))}
            </ul>
            <p className="mt-5 text-center text-sm text-ink-2">
              Pas de p&eacute;riode d&apos;essai&nbsp;: le diagnostic d&apos;une URL est gratuit et sans compte, autant
              l&apos;utiliser avant de payer.{" "}
              <a href="#scan" className="font-semibold text-ink underline underline-offset-4 hover:text-brand">Scanner un site</a>
            </p>
          </div>
        </section>

        {/* 6. Comparatif honnete */}
        <section id="comparatif" aria-labelledby="comparatif-titre" className="border-y border-line bg-surface py-28">
          <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8">
            <SectionHeading id="comparatif-titre" title="Decelio, une suite SEO ou une vérification manuelle ?">
              Trois outils, trois questions diff&eacute;rentes. Voici, sans enjoliver, ce que Decelio fait et ce qu&apos;il ne fait pas.
            </SectionHeading>
            <div className="reveal overflow-x-auto rounded-[1.25rem] border border-line bg-paper">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <caption className="sr-only">
                  Comparaison entre Decelio, les suites SEO comme Semrush ou Ahrefs, et une v&eacute;rification manuelle du blocage des robots IA
                </caption>
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className="px-5 py-4 text-sm font-semibold text-ink-2">Crit&egrave;re</th>
                    <th scope="col" className="bg-brand-soft/60 px-5 py-4 text-sm font-semibold text-brand">Decelio</th>
                    <th scope="col" className="px-5 py-4 text-sm font-semibold text-ink-2">Semrush / Ahrefs</th>
                    <th scope="col" className="px-5 py-4 text-sm font-semibold text-ink-2">V&eacute;rification manuelle</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-ink-2">
                  {COMPARISON.map(([criterion, decelio, suite, manual], i) => (
                    <tr key={criterion} className={i < COMPARISON.length - 1 ? "border-b border-line/60" : ""}>
                      <th scope="row" className="px-5 py-3.5 font-semibold text-ink">{criterion}</th>
                      <td className="bg-brand-soft/40 px-5 py-3.5 font-medium text-ink">{decelio}</td>
                      <td className="px-5 py-3.5">{suite}</td>
                      <td className="px-5 py-3.5">{manual}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Un prix concurrent non date devient faux avec le temps. */}
            <p className="mt-4 text-sm text-ink-2">
              Prix des suites SEO relevés sur leurs pages publiques en septembre 2026, pour leur premier palier
              mensuel. Ils changent&nbsp;: vérifiez chez l’éditeur avant de vous décider.
            </p>
          </div>
        </section>

        {/* 7. Questions */}
        <section id="faq" aria-labelledby="faq-titre" className="scroll-mt-16 bg-paper py-28">
          <div className="mx-auto max-w-[800px] px-4 sm:px-6 lg:px-8">
            <SectionHeading id="faq-titre" title="Questions courantes" />

            <div className="mb-16 space-y-3">
              {faqs.map((f, i) => (
                <details
                  key={f.q}
                  /* La premiere reponse est ouverte : six barres fermees ne montrent rien a lire. */
                  open={i === 0}
                  style={rank(i % 3)}
                  className="reveal group overflow-hidden rounded-[1.25rem] border border-line bg-surface transition-colors open:border-brand/30"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 font-semibold text-ink">
                    {f.q}
                    <span className="text-ink-3 transition-transform duration-300 group-open:rotate-45 group-open:text-brand">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </span>
                  </summary>
                  <div className="px-6 pb-5 text-ink-2">
                    <p>{f.a}</p>
                  </div>
                </details>
              ))}
            </div>

            <ul className="flex flex-col items-center justify-center gap-4 text-sm font-medium text-ink-2 sm:flex-row sm:gap-8">
              <li className="flex items-center gap-2"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Paiement s&eacute;curis&eacute; Stripe</li>
              <li className="flex items-center gap-2"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></svg> H&eacute;berg&eacute; en Europe</li>
              <li className="flex items-center gap-2"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> Conforme RGPD</li>
            </ul>
          </div>
        </section>

        {/* 8. Appel final : on termine comme on a commence, par l'onde */}
        <section aria-labelledby="final-titre" className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="reveal relative mx-auto max-w-[1100px] overflow-hidden rounded-[2rem] bg-ink px-6 py-20 text-center sm:px-12">
            <RingsWatermark className="pointer-events-none absolute left-1/2 top-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 text-brand-soft/25" />
            <div className="relative">
              <h2 id="final-titre" className="font-display mx-auto mb-5 max-w-2xl text-[36px] font-bold leading-[1.04] tracking-[-0.035em] text-surface sm:text-[52px]">
                Pr&ecirc;t &agrave; v&eacute;rifier votre premier site&nbsp;?
              </h2>
              <p className="mx-auto mb-10 max-w-xl text-lg text-surface-2">
                En une quinzaine de secondes, sachez si les robots des IA sont bloqu&eacute;s sur votre domaine.
                Le diagnostic est gratuit et ne demande pas de compte.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a href="#scan" className="w-full rounded-full bg-surface px-8 py-3.5 font-semibold text-ink transition-transform duration-300 hover:-translate-y-0.5 sm:w-auto">
                  Scanner un site
                </a>
                {!isLoggedIn && (
                  <Link href="/register" className="w-full rounded-full border border-surface/30 px-8 py-3.5 font-semibold text-surface transition-colors hover:bg-surface/10 sm:w-auto">
                    Cr&eacute;er un compte
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-ink py-16 text-paper">
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8">
          <div className="mb-12 grid grid-cols-1 gap-12 md:grid-cols-5 md:gap-8">

            <div className="md:col-span-2">
              <Link href="/" aria-label="Decelio, accueil" className="mb-4 inline-flex items-center gap-3">
                <Image src="/logo-decelio-blanc.png" alt="" width={502} height={565} className="h-9 w-auto" />
                <span className="font-display text-2xl font-bold tracking-[-0.03em]">Decelio</span>
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
                      <a href={link.href} className="nav-link transition-colors hover:text-paper focus-visible:text-paper">{link.label}</a>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h2 className="mb-5 font-semibold">Votre compte</h2>
                <ul className="space-y-3 font-medium text-paper/70">
                  {isLoggedIn ? (
                    <li><Link href="/dashboard" className="nav-link transition-colors hover:text-paper focus-visible:text-paper">Tableau de bord</Link></li>
                  ) : (
                    <>
                      <li><Link href="/login" className="nav-link transition-colors hover:text-paper focus-visible:text-paper">Connexion</Link></li>
                      <li><Link href="/register" className="nav-link transition-colors hover:text-paper focus-visible:text-paper">Cr&eacute;er un compte</Link></li>
                    </>
                  )}
                </ul>
              </div>

              <div>
                <h2 className="mb-5 font-semibold">Contact</h2>
                <ul className="space-y-3 font-medium text-paper/70">
                  <li><a href="mailto:contact@decelio.fr" className="nav-link transition-colors hover:text-paper focus-visible:text-paper">contact@decelio.fr</a></li>
                </ul>
              </div>
            </nav>

          </div>

          <div className="flex flex-col items-start justify-between gap-6 border-t border-paper/20 pt-8 text-sm text-paper/70 md:flex-row">
            <p>&copy; {new Date().getFullYear()} Decelio. Tous droits r&eacute;serv&eacute;s.</p>
            <p className="max-w-xl md:text-right">
              <strong className="font-semibold text-paper">Ce que mesure l&apos;outil :</strong> Decelio v&eacute;rifie l&apos;acc&egrave;s technique des robots aux sites. Cela ne garantit pas qu&apos;une IA citera votre marque.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
