import Image from "next/image";
import Link from "next/link";
import HeroConcentric from "./HeroConcentric";
import { SiteFooter } from "./SiteChrome";
import { Check, RingsWatermark, SectionHeading, rank } from "./MarketingBits";
import { Verdict } from "@/components/ui/verdict";
import { StripeMark } from "@/components/ui/stripe-logo";
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
      "Wordfence se met à jour dans la nuit, et sa limitation de débit peut bloquer GPTBot. Le site répond normalement à vos yeux : rien ne signale le blocage.",
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
      "Le Bot Fight Mode de Cloudflare ou la case « Block AI Bots » peuvent bloquer aussi les robots de recherche, pas seulement ceux qui servent à l'entraînement.",
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
  "Le diagnostic est gratuit et sans compte, et il vous donne la cause du blocage.",
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
    slug: "SOLO",
    name: "Freelance",
    price: 39,
    pitch: "Pour sécuriser vos premiers sites clients.",
    values: ["10 sites", true, true, false] as const,
    featured: false,
  },
  {
    slug: "PRO",
    name: "Agence",
    price: 99,
    pitch: "Le portefeuille complet d'une agence.",
    values: ["30 sites", true, true, true] as const,
    featured: true,
  },
  {
    slug: "SCALE",
    name: "Studio",
    price: 249,
    pitch: "Les agences à fort volume.",
    values: ["100 sites", true, true, true] as const,
    featured: false,
  },
] as const;

/**
 * Comparatif : Decelio face aux deux familles d'outils qu'une agence utilise
 * deja. Prix releves sur les pages tarifaires officielles le 27/09/2026
 * (wp-umbrella.com/pricing, managewp.com/pricing, citeme.io/pricing,
 * semrush.com/pricing/ai). Le prix de Peec AI n'a pas pu etre lu sur sa page
 * officielle (charge en JavaScript) : aucun chiffre n'est donc affiche pour lui.
 * Peec AI annonce une lecture des regles robots.txt : d'ou « en partie ».
 */
const COMPARISON_COLUMNS = [
  { key: "decelio", label: "Decelio" },
  { key: "maintenance", label: "Outils de maintenance WordPress", tools: "WP Umbrella, ManageWP" },
  { key: "visibility", label: "Outils de visibilité IA", tools: "Citeme, Peec AI, Semrush AI Toolkit" },
  { key: "manual", label: "Vérification manuelle" },
] as const;

const COMPARISON = [
  {
    criterion: "Vérifie chaque jour que les robots IA peuvent lire le site (robots.txt, pare-feu, page sans JavaScript)",
    values: ["Oui, chaque jour", "Non", "En partie selon l'outil : règles robots.txt", "Une fois, à la main"],
  },
  {
    criterion: "Mesure la présence d'une marque dans les réponses des IA",
    values: ["En préparation", "Non", "Oui, c'est leur métier", "Non"],
  },
  {
    criterion: "Mises à jour et sauvegardes WordPress",
    values: ["Non", "Oui, c'est leur métier", "Non", "Non"],
  },
  {
    criterion: "Portefeuille de sites clients",
    values: ["Oui", "Oui", "Par projet ou par domaine", "Non"],
  },
  {
    criterion: "Prix d'entrée relevé",
    values: [
      "39 € par mois pour 10 sites",
      "WP Umbrella : 1,99 € par site et par mois. ManageWP : base gratuite, modules payants par site",
      "Citeme : dès 49 € par mois. Semrush AI Toolkit : 94,94 € par mois pour un domaine, engagement annuel. Peec AI : voir l'éditeur",
      "Gratuit",
    ],
  },
] as const;

/**
 * Questions telles que les agences les posent aux assistants IA : chaque
 * reponse tient en moins de 50 mots et se lit sans contexte (bloc FAQPage).
 */
const faqs = [
  {
    q: "Qu'est-ce que Decelio ?",
    a: "Decelio est un service de surveillance pour agences web. Il vérifie chaque jour si les robots des assistants IA (ChatGPT, Claude, Perplexity…) peuvent lire les sites de vos clients, et vous alerte avec la cause et le correctif quand l'un d'eux est bloqué.",
  },
  {
    q: "Quels robots IA sont vérifiés ?",
    a: "GPTBot, OAI-SearchBot et ChatGPT-User pour OpenAI, ClaudeBot, Claude-SearchBot et Claude-User pour Anthropic, PerplexityBot et Perplexity-User. Les règles robots.txt visant Google-Extended et Applebot-Extended sont aussi relues.",
  },
  {
    q: "Decelio mesure-t-il si ChatGPT cite mes clients ?",
    a: "Pas aujourd'hui. Decelio vérifie que les robots des IA peuvent lire vos sites. La mesure de la présence dans leurs réponses est en préparation.",
  },
  {
    q: "Que se passe-t-il quand un robot est bloqué ?",
    a: "Vous recevez un e-mail au scan suivant, avec la cause (règle robots.txt, pare-feu, page vide sans JavaScript) et le correctif à appliquer. Quand un signal ne permet pas de conclure, l'alerte l'écrit : « à vérifier ».",
  },
  {
    q: "Combien coûte Decelio ?",
    a: "De 39 € par mois pour 10 sites à 249 € par mois pour 100 sites, sans engagement, avec 14 jours d'essai gratuit. Le diagnostic d'une adresse est gratuit et ne demande pas de compte.",
  },
  {
    q: "Quelle différence avec Semrush ?",
    a: "Semrush audite le référencement classique. Decelio vérifie uniquement l'accès technique des robots IA à vos sites, chaque jour.",
  },
  {
    q: "Decelio remplace-t-il WP Umbrella ou ManageWP ?",
    a: "Non, il les complète : eux gèrent les mises à jour et les sauvegardes, Decelio vérifie chaque jour que les robots des assistants IA peuvent lire les sites.",
  },
  {
    q: "Faut-il installer un plugin WordPress ?",
    a: "Non. Decelio interroge chaque site depuis l'extérieur, comme le ferait un robot IA. Aucun script ni accès n'est requis.",
  },
  {
    q: "Puis-je facturer ce service à mes clients ?",
    a: "Oui. À partir de la formule Agence, le rapport mensuel en PDF porte le logo de votre agence : vous pouvez ajouter une ligne « surveillance IA » à vos contrats de maintenance.",
  },
];

/**
 * Robots d'entrainement et robots de recherche, par editeur. Noms verifies
 * dans la documentation publique d'OpenAI et d'Anthropic, et identiques a
 * ceux que le scanner interroge (lib/scanner/agents.ts).
 */
const BOT_FAMILIES = [
  { vendor: "OpenAI (ChatGPT)", training: "GPTBot", search: "OAI-SearchBot" },
  { vendor: "Anthropic (Claude)", training: "ClaudeBot", search: "Claude-SearchBot" },
] as const;

/** Exemple de robots.txt : refuser l'entrainement, rester lisible pour la recherche. */
const ROBOTS_EXAMPLE = [
  "# Refuser l'entraînement",
  "User-agent: GPTBot",
  "Disallow: /",
  "",
  "User-agent: ClaudeBot",
  "Disallow: /",
  "",
  "# Rester lisible pour la recherche",
  "User-agent: OAI-SearchBot",
  "Allow: /",
  "",
  "User-agent: Claude-SearchBot",
  "Allow: /",
].join("\n");

/** Les deux publics de Decelio, et ce que chacun en tire. */
const AUDIENCES = [
  {
    title: "Agences de maintenance WordPress",
    body: "Vous gérez des dizaines de sites sous contrat. Soyez prévenu avant votre client quand une mise à jour ferme un site aux IA.",
    points: [
      "Alerte au scan suivant, avec le correctif",
      "Rapport mensuel à votre marque",
      "Une ligne de plus à facturer",
    ],
  },
  {
    title: "Agences SEO et GEO",
    body: "Vous travaillez la présence de vos clients dans les moteurs de réponse. Sans accès des robots, le reste de ce travail ne sert à rien.",
    points: [
      "Une cause technique vérifiable, robot par robot",
      "Robots d'entraînement et robots de recherche distingués",
      "Un historique quotidien pour vos audits",
    ],
  },
] as const;

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

            {/*
              Un vrai diagnostic, date et reproductible, plutot qu'un temoignage : le produit n'a pas encore
              de clients (constitution, principe II). Valeurs relevees le 27/09/2026 a 07:38 sur
              /analyse/wordpress.org ; le lien relance le meme diagnostic en direct.
            */}
            <figure className="reveal mt-8 overflow-hidden rounded-[1.75rem] border border-line bg-surface">
              <div className="flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
                <div>
                  <figcaption className="type-caption text-ink-2">Diagnostic réel, vérifié le 27 septembre 2026</figcaption>
                  <p className="font-display mt-1 text-[26px] font-bold tracking-[-0.02em] text-ink">wordpress.org</p>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
                    Plateforme détectée : WordPress (d&apos;après les indices de la page). 502 mots lisibles sans
                    exécuter de JavaScript.
                  </p>
                </div>
                <ul className="flex flex-wrap gap-2">
                  {["ChatGPT", "Claude", "Perplexity"].map((assistant) => (
                    <li key={assistant} className="flex items-center gap-2 rounded-full border border-line bg-paper py-1.5 pl-3 pr-2">
                      <span className="text-sm font-medium text-ink">{assistant}</span>
                      <Verdict value="lu" variant="inline" size="sm" />
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-line bg-paper px-6 py-4 sm:px-8">
                <a href="/analyse/wordpress.org" className="text-sm font-semibold text-ink underline underline-offset-4 hover:text-brand">
                  Relancer ce diagnostic en direct
                </a>
              </div>
            </figure>
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
                    Le Bot Fight Mode de Cloudflare, la limitation de d&eacute;bit de Wordfence ou le pare-feu de
                    l&apos;h&eacute;bergeur peuvent bloquer les robots IA sans pr&eacute;venir personne, souvent sans que
                    l&apos;agence l&apos;ait voulu. Chaque jour, Decelio envoie &agrave; chaque site des requ&ecirc;tes qui se
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
                  <p className="mt-4 max-w-md text-lg font-semibold text-surface">
                    Prouvez chaque mois &agrave; votre client que les robots des assistants IA peuvent lire son site.
                  </p>
                </div>
                <figure className="relative w-full rounded-xl bg-surface p-4 shadow-float md:w-64 md:rotate-2">
                  <figcaption className="sr-only">Exemple de rapport mensuel</figcaption>
                  <div className="mb-4 flex items-center gap-3 border-b border-line pb-4">
                    <div aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full border border-brand/15 bg-brand-soft">
                      <Image src="/logo-decelio.png" alt="" width={502} height={565} className="h-4 w-auto" />
                    </div>
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
                  <p className="type-caption mt-4 text-ink-2">Exemple. Le rapport envoyé à vos clients porte le logo de votre agence.</p>
                </figure>
              </article>

            </div>
          </div>
        </section>

        {/* 3a. Pedagogie : entrainement et recherche sont deux robots, donc deux decisions */}
        <section id="robots" aria-labelledby="robots-titre" className="scroll-mt-16 bg-paper pb-28">
          <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8">
            <SectionHeading id="robots-titre" title="Refuser l’entraînement, rester lisible pour la recherche">
              Chaque assistant envoie plusieurs robots. Un robot d&apos;exploration est le programme qui lit les
              pages d&apos;un site pour le compte d&apos;une IA. L&apos;un sert &agrave; entra&icirc;ner les
              mod&egrave;les, l&apos;autre &agrave; r&eacute;pondre aux questions en direct&nbsp;: ce sont deux
              d&eacute;cisions distinctes.
            </SectionHeading>

            <div className="reveal overflow-hidden rounded-[1.75rem] border border-line bg-surface">
              <div className="grid grid-cols-1 border-b border-line md:grid-cols-3">
                <p className="hidden px-8 py-4 text-sm font-semibold text-ink-2 md:block">Assistant</p>
                <p className="px-8 py-4 text-sm font-semibold text-ink-2 md:border-l md:border-line">
                  Robot d&apos;entra&icirc;nement
                  <span className="block font-normal">Lit les pages pour entra&icirc;ner les futurs mod&egrave;les</span>
                </p>
                <p className="bg-brand-soft/60 px-8 py-4 text-sm font-semibold text-brand md:border-l md:border-line">
                  Robot de recherche
                  <span className="block font-normal text-ink-2">Lit les pages pour r&eacute;pondre et citer ses sources</span>
                </p>
              </div>
              {BOT_FAMILIES.map((family, i) => (
                <div key={family.vendor} className={`grid grid-cols-1 md:grid-cols-3 ${i > 0 ? "border-t border-line" : ""}`}>
                  <p className="px-8 pb-2 pt-5 font-semibold text-ink md:py-5">{family.vendor}</p>
                  <p className="px-8 py-2 font-mono text-sm text-ink-2 md:border-l md:border-line md:py-5">{family.training}</p>
                  <p className="bg-brand-soft/40 px-8 pb-5 pt-2 font-mono text-sm font-medium text-ink md:border-l md:border-line md:py-5">{family.search}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div style={rank(0)} className="reveal rounded-[1.75rem] border border-line bg-surface p-8">
                <h3 className="font-display mb-3 text-[22px] font-bold tracking-[-0.02em] text-ink">Ce que cela permet</h3>
                <p className="text-[16px] leading-relaxed text-ink-2">
                  Le fichier robots.txt dit &agrave; chaque robot ce qu&apos;il a le droit de lire. Une agence peut
                  y refuser GPTBot et ClaudeBot, donc l&apos;entra&icirc;nement, tout en laissant passer
                  OAI-SearchBot et Claude-SearchBot&nbsp;: le site reste lisible quand un assistant cherche une
                  r&eacute;ponse.
                </p>
              </div>
              <figure style={rank(1)} className="reveal rounded-[1.75rem] border border-line bg-surface p-8">
                <figcaption className="type-caption mb-3 text-ink-2">Exemple de robots.txt</figcaption>
                <pre className="overflow-x-auto rounded-[10px] bg-paper px-4 py-3 font-mono text-[13px] leading-relaxed text-ink">{ROBOTS_EXAMPLE}</pre>
                <p className="mt-3 text-sm text-ink-2">
                  Decelio v&eacute;rifie chaque jour que ces r&egrave;gles, et le pare-feu, laissent bien passer les
                  robots que vous avez choisis.
                </p>
              </figure>
            </div>
          </div>
        </section>

        {/* 3bis. Pour qui : les deux publics, et un appel au moment ou le lecteur est convaincu */}
        <section id="pour-qui" aria-labelledby="pour-qui-titre" className="scroll-mt-16 bg-paper pb-28">
          <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8">
            <SectionHeading id="pour-qui-titre" title="Pensé pour deux métiers" />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {AUDIENCES.map((audience, i) => (
                <article key={audience.title} style={rank(i)} className="reveal rounded-[1.75rem] border border-line bg-surface p-8">
                  <h3 className="font-display mb-3 text-[26px] font-bold tracking-[-0.02em] text-ink">{audience.title}</h3>
                  <p className="mb-6 text-lg text-ink-2">{audience.body}</p>
                  <ul className="space-y-3">
                    {audience.points.map((point) => (
                      <li key={point} className="flex items-start gap-3 text-[15px] text-ink">
                        <Check className="mt-0.5 text-brand" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>

            <div className="reveal mt-10 flex flex-col items-center justify-between gap-6 rounded-[1.75rem] border border-brand/20 bg-brand-soft px-8 py-8 text-center md:flex-row md:text-left">
              <p className="font-display text-[24px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[28px]">
                Un de vos sites est peut-&ecirc;tre d&eacute;j&agrave; bloqu&eacute;.
                <span className="block text-lg font-normal tracking-normal text-ink-2 [font-family:var(--font-marketing)]">V&eacute;rifiez-le maintenant, sans cr&eacute;er de compte.</span>
              </p>
              <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row">
                <a href="#scan" className="rounded-full bg-ink px-7 py-3 text-center font-semibold text-paper transition-transform duration-300 hover:-translate-y-0.5">
                  Scanner un site
                </a>
                <a href="#tarifs" className="rounded-full border border-ink/20 bg-surface px-7 py-3 text-center font-semibold text-ink transition-colors hover:bg-surface-2">
                  Voir les tarifs
                </a>
              </div>
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
              Ajoutez une ligne &laquo;&nbsp;surveillance IA&nbsp;&raquo; &agrave; votre contrat de maintenance, et
              prouvez chaque mois &agrave; votre client que les robots des assistants IA peuvent lire son site.
              Par exemple, trente sites refactur&eacute;s entre 10 et 20&nbsp;&euro; par mois font{" "}
              <strong className="font-semibold text-ink">300 &agrave; 600&nbsp;&euro; par mois</strong> pour un
              abonnement Agence &agrave; 99&nbsp;&euro;. Le r&eacute;sultat d&eacute;pend du tarif que vous fixez.
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
                            <span aria-hidden="true" className="w-5 shrink-0 text-center leading-5 text-ink-2">&times;</span>
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
                "Essai gratuit de 14 jours",
                "Facturation mensuelle, sans engagement",
                "TVA non applicable (art. 293 B du CGI)",
                "Paiement par carte, via Stripe",
                "Rien à installer chez vos clients",
                "Au-delà du quota, Decelio indique le palier suivant",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5">
                  {item.endsWith("Stripe") && <StripeMark className="h-4 w-4" />}
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-center text-sm text-ink-2">
              Essai gratuit de 14&nbsp;jours sur les trois formules&nbsp;: la carte est demand&eacute;e au d&eacute;part,
              le premier pr&eacute;l&egrave;vement a lieu &agrave; la fin de l&apos;essai, sauf r&eacute;siliation avant. Et
              le diagnostic d&apos;une URL reste gratuit et sans compte.{" "}
              <a href="#scan" className="font-semibold text-ink underline underline-offset-4 hover:text-brand">Scanner un site</a>
            </p>
          </div>
        </section>

        {/* 6. Comparatif honnete */}
        <section id="comparatif" aria-labelledby="comparatif-titre" className="border-y border-line bg-surface py-28">
          <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8">
            <SectionHeading id="comparatif-titre" title="Un complément, pas un remplaçant">
              Vos outils de maintenance mettent les sites &agrave; jour. Les outils de visibilit&eacute; IA mesurent si
              une marque appara&icirc;t dans les r&eacute;ponses. Decelio v&eacute;rifie la cause technique en amont&nbsp;:
              les robots peuvent-ils lire le site&nbsp;?
            </SectionHeading>

            {/* Bureau : tableau. Mobile : une carte par critere, pour eviter le defilement horizontal. */}
            <div className="reveal hidden overflow-hidden rounded-[1.25rem] border border-line bg-paper lg:block">
              <table className="w-full border-collapse text-left">
                <caption className="sr-only">
                  Comparaison entre Decelio, les outils de maintenance WordPress, les outils de visibilit&eacute; IA et une v&eacute;rification manuelle
                </caption>
                <thead>
                  <tr className="border-b border-line align-top">
                    <th scope="col" className="w-[24%] px-5 py-4 text-sm font-semibold text-ink-2">Crit&egrave;re</th>
                    {COMPARISON_COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        scope="col"
                        className={`px-5 py-4 text-sm font-semibold ${col.key === "decelio" ? "bg-brand-soft/60 text-brand" : "text-ink"}`}
                      >
                        {col.label}
                        {"tools" in col && <span className="mt-1 block text-xs font-normal text-ink-2">{col.tools}</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-sm text-ink-2">
                  {COMPARISON.map((row, i) => (
                    <tr key={row.criterion} className={`align-top ${i < COMPARISON.length - 1 ? "border-b border-line/60" : ""}`}>
                      <th scope="row" className="px-5 py-4 font-semibold text-ink">{row.criterion}</th>
                      {row.values.map((value, v) => (
                        <td key={COMPARISON_COLUMNS[v].key} className={`px-5 py-4 ${v === 0 ? "bg-brand-soft/40 font-medium text-ink" : ""}`}>
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-4 lg:hidden">
              {COMPARISON.map((row, i) => (
                <section key={row.criterion} style={rank(i % 3)} aria-label={row.criterion} className="reveal rounded-[1.25rem] border border-line bg-paper p-5">
                  <h3 className="mb-3 font-semibold text-ink">{row.criterion}</h3>
                  <dl className="space-y-2 text-sm">
                    {row.values.map((value, v) => (
                      <div key={COMPARISON_COLUMNS[v].key} className={v === 0 ? "rounded-[10px] bg-brand-soft/60 p-3" : "px-3"}>
                        <dt className={`font-semibold ${v === 0 ? "text-brand" : "text-ink"}`}>{COMPARISON_COLUMNS[v].label}</dt>
                        <dd className="text-ink-2">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>

            {/* Un prix concurrent non date devient faux avec le temps. */}
            <p className="mt-4 text-sm text-ink-2">
              Prix relev&eacute;s sur les pages tarifaires publiques des &eacute;diteurs le 27 septembre 2026, hors promotion
              temporaire. Ils changent&nbsp;: v&eacute;rifiez chez l&apos;&eacute;diteur avant de vous d&eacute;cider.
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
              <li className="flex items-center gap-2"><StripeMark className="h-5 w-5" /> Paiement s&eacute;curis&eacute; par Stripe</li>
              <li className="flex items-center gap-2"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></svg> H&eacute;berg&eacute; en Europe</li>
              <li className="flex items-center gap-2"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> Conforme RGPD</li>
            </ul>
          </div>
        </section>

        {/* 7bis. Qui est derriere : sans clients, le meilleur signal de confiance est une personne identifiable */}
        <section aria-labelledby="fondateur-titre" className="px-4 pb-16 sm:px-6 lg:px-8">
          <div className="reveal mx-auto flex max-w-[800px] flex-col items-center gap-6 rounded-[1.75rem] border border-line bg-surface p-8 text-center sm:flex-row sm:text-left">
            {/* Avatar servi depuis notre domaine : le charger depuis GitHub enverrait l'IP du visiteur a un tiers. */}
            <Image
              src="/fondateur-kromz.jpg"
              alt="Avatar de kromz-dev, fondateur de Decelio"
              width={400}
              height={400}
              className="h-16 w-16 shrink-0 rounded-full object-cover ring-4 ring-brand-soft"
            />
            <div>
              <h2 id="fondateur-titre" className="font-display mb-2 text-[22px] font-bold tracking-[-0.02em] text-ink">
                Construit par un fondateur ind&eacute;pendant, en France
              </h2>
              <p className="text-[16px] leading-relaxed text-ink-2">
                Decelio n&apos;a pas encore de clients&nbsp;: pas de faux logos ni de faux avis ici. Une question sur
                la m&eacute;thode ou sur un r&eacute;sultat&nbsp;? &Eacute;crivez &agrave;{" "}
                <a href="mailto:contact@decelio.fr" className="font-semibold text-ink underline underline-offset-4 hover:text-brand">contact@decelio.fr</a>{" "}
                ou retrouvez-moi sur GitHub&nbsp;:{" "}
                <a href="https://github.com/kromz-dev" rel="me noopener" target="_blank" className="font-semibold text-ink underline underline-offset-4 hover:text-brand">
                  kromz-dev<span className="sr-only"> (s&apos;ouvre dans un nouvel onglet)</span>
                </a>.{" "}
                <a href="/a-propos" className="font-semibold text-ink underline underline-offset-4 hover:text-brand">Qui est derrière Decelio</a>
              </p>
            </div>
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
                Sachez si les robots des IA sont bloqu&eacute;s sur votre domaine.
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

      <SiteFooter isLoggedIn={isLoggedIn} />
    </div>
  );
}
