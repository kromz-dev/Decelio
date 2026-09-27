import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { BRAND_HALO, PublicPage } from "@/components/home/PublicPage";
import { RingsWatermark, SectionHeading, rank } from "@/components/home/MarketingBits";

export const metadata: Metadata = {
  title: "Baromètre : les grands sites français bloquent-ils les robots des IA ? | Decelio",
  description:
    "250 grands médias et sites e-commerce français scannés le 27 septembre 2026 : la moitié reste lisible par les robots de recherche de ChatGPT, Claude et Perplexity, un tiers en bloque au moins un. Méthode, dénominateurs et limites.",
};

/**
 * Baromètre, édition 1. Tous les chiffres viennent de
 * docs/barometre/resultats-v1.md (scan du 27/09/2026, n = 250 après
 * exclusion de 20 sites injoignables). Toujours un effectif ET un pourcentage,
 * jamais un site nommé comme bloqué (docs/13 §4, constitution).
 */
const N = 250;

const HEADLINES = [
  { value: "126", label: "restent lisibles par les trois robots de recherche", pct: "50 %" },
  { value: "78", label: "bloquent au moins un des trois", pct: "31 %" },
  { value: "45", label: "refusent même une visite ordinaire : à vérifier", pct: "18 %" },
] as const;

const SEARCH_BOTS = [
  { assistant: "ChatGPT", bot: "OAI-SearchBot", ok: 158, blocked: 45, check: 46, proof: 34, hint: 11 },
  { assistant: "Claude", bot: "Claude-SearchBot", ok: 171, blocked: 31, check: 47, proof: 27, hint: 4 },
  { assistant: "Perplexity", bot: "PerplexityBot", ok: 132, blocked: 72, check: 45, proof: 65, hint: 7 },
] as const;

const TRAINING_BOTS = [
  { assistant: "ChatGPT", bot: "GPTBot", ok: 96, blocked: 112, check: 41 },
  { assistant: "Claude", bot: "ClaudeBot", ok: 121, blocked: 87, check: 41 },
] as const;

const LIMITS = [
  "Un blocage par le pare-feu est un indice, jamais une preuve : notre requête se présente comme le robot, mais le vrai robot, reconnu par son adresse, pourrait passer.",
  "Certains réglages de pare-feu visent les vrais robots reconnus par leur adresse, que nous ne pouvons pas imiter : le taux réel de blocage est probablement plus élevé.",
  "C'est une photographie du 27 septembre 2026 : les règles d'un site peuvent changer du jour au lendemain.",
  "Un seul point de sortie réseau a servi au scan.",
  "Ce sont de grands médias et de grandes enseignes, pas un tirage des sites français, ni des PME.",
  "20 sites injoignables au moment du scan sont exclus des pourcentages.",
] as const;

function pct(n: number) {
  return `${Math.round((n / N) * 100)} %`;
}

export default async function BarometrePage() {
  const session = await auth();

  return (
    <PublicPage isLoggedIn={!!session}>
      <main id="contenu">
        <section className="px-4 pb-16 pt-20 text-center sm:px-6 lg:px-8" style={BRAND_HALO}>
          <p className="animate-cascade type-caption mb-4 text-ink-2">Baromètre Decelio, édition 1, mesures du 27 septembre 2026</p>
          <h1 className="font-display animate-cascade mx-auto max-w-4xl text-[38px] font-bold leading-[1.03] tracking-[-0.04em] text-ink sm:text-[58px]" style={{ animationDelay: "120ms" }}>
            Un grand site français sur trois bloque au moins un robot de recherche des IA
          </h1>
          <p className="animate-cascade mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-2 sm:text-xl" style={{ animationDelay: "220ms" }}>
            Sur 250 grands médias et sites e-commerce français, la moitié reste lisible par les trois robots qui
            lisent un site pour répondre dans ChatGPT, Claude et Perplexity. Un tiers en bloque au moins un, le plus
            souvent par une règle écrite dans son fichier robots.txt. Aucun site n&apos;est nommé.
          </p>
        </section>

        <section aria-labelledby="chiffres-titre" className="px-4 pb-24 sm:px-6 lg:px-8">
          <h2 id="chiffres-titre" className="sr-only">Les chiffres clés</h2>
          <ul className="mx-auto grid max-w-[1100px] grid-cols-1 gap-5 md:grid-cols-3">
            {HEADLINES.map((item, i) => (
              <li key={item.label} style={rank(i)} className="reveal rounded-[1.75rem] border border-line bg-surface p-7">
                <p className="font-display text-[56px] font-bold leading-none tracking-[-0.04em] text-ink">
                  {item.value}
                  <span className="font-sans text-lg font-normal tracking-normal text-ink-2"> sur {N}</span>
                </p>
                <p className="mt-3 text-[16px] leading-relaxed text-ink-2">
                  <span className="font-semibold text-ink">{item.pct}</span> {item.label}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="recherche-titre" className="border-y border-line bg-surface px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1100px]">
            <SectionHeading id="recherche-titre" title="Les robots de recherche, assistant par assistant">
              Ce sont les robots qui lisent un site au moment où quelqu&apos;un pose une question. Un robot bloqué ici ne
              peut plus lire le site pour répondre.
            </SectionHeading>
            <div className="reveal overflow-x-auto rounded-[1.25rem] border border-line bg-paper">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <caption className="sr-only">Statut des robots de recherche sur 250 sites, en effectifs et pourcentages</caption>
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className="px-5 py-4 font-semibold text-ink-2">Assistant</th>
                    <th scope="col" className="px-5 py-4 font-semibold text-ok">Lisible</th>
                    <th scope="col" className="px-5 py-4 font-semibold text-stop">Bloqué</th>
                    <th scope="col" className="px-5 py-4 font-semibold text-ink-2">dont règle robots.txt</th>
                    <th scope="col" className="px-5 py-4 font-semibold text-ink-2">À vérifier</th>
                  </tr>
                </thead>
                <tbody>
                  {SEARCH_BOTS.map((row) => (
                    <tr key={row.bot} className="border-b border-line/60 last:border-b-0">
                      <th scope="row" className="px-5 py-4 font-semibold text-ink">
                        {row.assistant}
                        <span className="block font-mono text-xs font-normal text-ink-2">{row.bot}</span>
                      </th>
                      <td className="px-5 py-4 text-ink">{row.ok} <span className="text-ink-2">({pct(row.ok)})</span></td>
                      <td className="px-5 py-4 text-ink">{row.blocked} <span className="text-ink-2">({pct(row.blocked)})</span></td>
                      <td className="px-5 py-4 text-ink-2">{row.proof} ({pct(row.proof)})</td>
                      <td className="px-5 py-4 text-ink-2">{row.check} ({pct(row.check)})</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-ink-2">
              La plupart des blocages sont des règles écrites dans le fichier robots.txt du site, donc prouvées. Le reste
              est un indice venu du pare-feu. Sur 13 blocages relus à la main, les 13 sont confirmés.
            </p>
          </div>
        </section>

        <section aria-labelledby="entrainement-titre" className="px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-[1100px] grid-cols-1 items-center gap-10 md:grid-cols-2">
            <div className="reveal">
              <h2 id="entrainement-titre" className="font-display mb-5 text-[32px] font-bold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[44px]">
                Bloquer l&apos;entraînement est plus fréquent, et souvent volontaire
              </h2>
              <p className="text-lg leading-relaxed text-ink-2">
                Les robots d&apos;entraînement lisent les pages pour entraîner les futurs modèles. Les refuser protège le
                contenu, sans empêcher la recherche. <strong className="font-semibold text-ink">34 sites sur 250</strong>{" "}
                ({pct(34)}) le font justement : ils bloquent l&apos;entraînement et restent lisibles par les trois
                robots de recherche.
              </p>
              <Link href="/#robots" className="mt-5 inline-block font-semibold text-ink underline underline-offset-4 hover:text-brand">
                Comprendre la différence entre les deux robots
              </Link>
            </div>
            <ul className="space-y-4">
              {TRAINING_BOTS.map((row, i) => (
                <li key={row.bot} style={rank(i)} className="reveal rounded-[1.25rem] border border-line bg-surface p-6">
                  <p className="font-semibold text-ink">
                    {row.assistant} <span className="font-mono text-xs font-normal text-ink-2">{row.bot}</span>
                  </p>
                  <p className="mt-2 text-[15px] text-ink-2">
                    Bloqué sur <span className="font-semibold text-ink">{row.blocked} sites ({pct(row.blocked)})</span>,
                    lisible sur {row.ok} ({pct(row.ok)}), à vérifier sur {row.check} ({pct(row.check)}).
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="plateformes-titre" className="border-y border-line bg-surface px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1100px]">
            <SectionHeading id="plateformes-titre" title="Qui est derrière ces sites">
              D&apos;après les indices lisibles dans les pages, quand le site les laisse voir.
            </SectionHeading>
            <ul className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {[
                { title: "Pare-feu identifié", value: 83, detail: "dont Cloudflare sur 74, Imperva sur 7, Sucuri sur 2" },
                { title: "Plateforme identifiée", value: 76, detail: "dont WordPress sur 53, Drupal sur 12, Next.js ou Nuxt sur 11" },
                { title: "Hébergeur identifié", value: 14, detail: "dont OVHcloud sur 11, o2switch sur 2, Gandi sur 1" },
              ].map((item, i) => (
                <li key={item.title} style={rank(i)} className="reveal rounded-[1.25rem] border border-line bg-paper p-6">
                  <p className="text-sm font-semibold text-ink-2">{item.title}</p>
                  <p className="font-display mt-1 text-[34px] font-bold tracking-[-0.03em] text-ink">
                    {item.value}<span className="font-sans text-base font-normal tracking-normal text-ink-2"> sur {N} ({pct(item.value)})</span>
                  </p>
                  <p className="mt-2 text-[15px] text-ink-2">{item.detail}.</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="methode-titre" className="px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[800px]">
            <SectionHeading id="methode-titre" title="Méthode et limites" />
            <div className="reveal mb-8 rounded-[1.25rem] border border-line bg-surface p-6 text-[16px] leading-relaxed text-ink-2">
              <p>
                270 sites tirés de listes publiques : le classement d&apos;audience de la presse française (ACPM) pour
                226 médias, les classements de la FEVAD et d&apos;E-Commerce Nation pour 44 sites e-commerce. Chaque site
                a été lu un par un, le 27 septembre 2026, avec deux secondes d&apos;attente entre deux sites. 20 sites
                injoignables sont exclus : les pourcentages portent sur 250 sites (210 médias, 40 e-commerce).
              </p>
            </div>
            <ul className="space-y-3">
              {LIMITS.map((limit, i) => (
                <li key={limit} style={rank(i % 3)} className="reveal flex gap-3 rounded-[1.25rem] border border-line bg-surface px-5 py-4 text-[15px] leading-relaxed text-ink-2">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  {limit}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="final-barometre-titre" className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="reveal relative mx-auto max-w-[1100px] overflow-hidden rounded-[2rem] bg-ink px-6 py-16 text-center sm:px-12">
            <RingsWatermark className="pointer-events-none absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 text-brand-soft/25" />
            <div className="relative">
              <h2 id="final-barometre-titre" className="font-display mx-auto mb-4 max-w-2xl text-[32px] font-bold leading-[1.05] tracking-[-0.035em] text-surface sm:text-[44px]">
                Et les sites de vos clients&nbsp;?
              </h2>
              <p className="mx-auto mb-8 max-w-xl text-lg text-surface-2">
                Vérifiez un site gratuitement, sans compte, avec la même méthode.
              </p>
              <Link href="/#scan" className="inline-flex rounded-full bg-surface px-8 py-3.5 font-semibold text-ink transition-transform duration-300 hover:-translate-y-0.5">
                Scanner un site
              </Link>
            </div>
          </div>
        </section>
      </main>
    </PublicPage>
  );
}
