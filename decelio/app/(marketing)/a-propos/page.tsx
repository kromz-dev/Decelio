import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { BRAND_HALO, PublicPage } from "@/components/home/PublicPage";
import { Check, RingsWatermark, rank } from "@/components/home/MarketingBits";
import { ToFill } from "@/components/home/LegalBits";

export const metadata: Metadata = {
  title: "Qui est derrière Decelio | Decelio",
  description:
    "Decelio est construit par un fondateur indépendant, en France, sans investisseur. Qui est derrière le service, comment il est fait, et les règles qu'il s'impose.",
};

/**
 * Page « Qui est derriere Decelio » (T067).
 *
 * Tout ce qui est ecrit ici est verifiable dans le depot ou dans les pages
 * legales. L'histoire personnelle du fondateur reste un emplacement a remplir :
 * rien n'est invente (constitution, principe II).
 */
const PRINCIPLES = [
  {
    title: "Un indice n'est pas une preuve",
    body: "Nos vérifications se présentent comme les robots des IA depuis nos serveurs. Elles donnent un indice solide, jamais une preuve de ce que voit le vrai robot. Quand on ne peut pas conclure, on écrit « à vérifier ».",
  },
  {
    title: "Aucun chiffre ni avis inventé",
    body: "Decelio n'a pas encore de clients : pas de logos, pas de témoignages, pas de compteur d'utilisateurs. Les seuls chiffres affichés sont des prix et des mesures datées.",
  },
  {
    title: "Vos données restent chez nous",
    body: "Site et base de données hébergés à Francfort. Aucune police ni aucun script chargé depuis un service tiers sur nos pages publiques. Mesure d'audience sans cookie, via notre propre domaine.",
  },
  {
    title: "Ce qui n'existe pas est marqué comme tel",
    body: "Une fonction pas encore construite porte la mention « en préparation ». La mesure des citations dans les réponses des IA en fait partie.",
  },
] as const;

export default async function AboutPage() {
  const session = await auth();

  return (
    <PublicPage isLoggedIn={!!session}>
      <main id="contenu">
        <section className="px-4 pb-16 pt-20 sm:px-6 lg:px-8" style={BRAND_HALO}>
          <div className="mx-auto flex max-w-[900px] flex-col items-center gap-8 text-center">
            <Image
              src="/fondateur-kromz.jpg"
              alt="Avatar de kromz-dev, fondateur de Decelio"
              width={400}
              height={400}
              priority
              className="animate-cascade h-28 w-28 rounded-full object-cover ring-8 ring-brand-soft"
            />
            <div>
              <h1 className="font-display animate-cascade text-[40px] font-bold leading-[1.02] tracking-[-0.04em] text-ink sm:text-[60px]" style={{ animationDelay: "120ms" }}>
                Qui est derrière Decelio
              </h1>
              <p className="animate-cascade mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-2 sm:text-xl" style={{ animationDelay: "220ms" }}>
                Decelio est construit et exploité par un fondateur indépendant, en France, sous le statut de
                micro-entreprise. Pas d&apos;investisseur, pas d&apos;équipe commerciale : le service se finance par
                ses abonnements.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="pourquoi-titre" className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="reveal mx-auto max-w-[70ch] rounded-[1.75rem] border border-line bg-surface p-8 sm:p-10">
            <h2 id="pourquoi-titre" className="font-display mb-4 text-[28px] font-bold tracking-[-0.03em] text-ink">
              Pourquoi Decelio existe
            </h2>
            <p className="mb-4 text-[17px] leading-relaxed text-ink-2">
              Un site peut répondre normalement à ses visiteurs et rester fermé aux robots des assistants IA. Une mise
              à jour de plugin, une règle de pare-feu, une case cochée chez l&apos;hébergeur suffisent. Personne
              n&apos;est prévenu, parce que rien n&apos;est tombé en panne. Decelio vérifie ce point chaque jour, pour
              les agences qui maintiennent les sites de leurs clients.
            </p>
            <p className="text-[17px] leading-relaxed text-ink-2">
              <ToFill>ton histoire en deux ou trois phrases : ce qui t&apos;a amené à créer Decelio</ToFill>
            </p>
          </div>
        </section>

        <section aria-labelledby="principes-titre" className="border-y border-line bg-surface px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1100px]">
            <h2 id="principes-titre" className="reveal font-display mb-12 text-center text-[34px] font-bold tracking-[-0.035em] text-ink sm:text-[46px]">
              Les règles que nous nous imposons
            </h2>
            <ul className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {PRINCIPLES.map((principle, i) => (
                <li key={principle.title} style={rank(i % 2)} className="reveal flex gap-4 rounded-[1.25rem] border border-line bg-paper p-6">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft">
                    <Check className="h-4 w-4 text-brand" />
                  </span>
                  <div>
                    <h3 className="font-display mb-2 text-[20px] font-bold tracking-[-0.02em] text-ink">{principle.title}</h3>
                    <p className="text-[15px] leading-relaxed text-ink-2">{principle.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="contact-titre" className="px-4 py-24 sm:px-6 lg:px-8">
          <div className="reveal relative mx-auto max-w-[1100px] overflow-hidden rounded-[2rem] bg-ink px-6 py-16 text-center sm:px-12">
            <RingsWatermark className="pointer-events-none absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 text-brand-soft/25" />
            <div className="relative">
              <h2 id="contact-titre" className="font-display mx-auto mb-4 max-w-2xl text-[32px] font-bold leading-[1.05] tracking-[-0.035em] text-surface sm:text-[44px]">
                Une question ? Écrivez-moi directement
              </h2>
              <p className="mx-auto mb-8 max-w-xl text-lg text-surface-2">
                Une remarque sur la méthode, un résultat qui vous étonne, une idée : c&apos;est moi qui lis et qui
                réponds.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a href="mailto:contact@decelio.fr" className="w-full rounded-full bg-surface px-8 py-3.5 font-semibold text-ink transition-transform duration-300 hover:-translate-y-0.5 sm:w-auto">
                  contact@decelio.fr
                </a>
                <a
                  href="https://github.com/kromz-dev"
                  rel="me noopener"
                  target="_blank"
                  className="w-full rounded-full border border-surface/30 px-8 py-3.5 font-semibold text-surface transition-colors hover:bg-surface/10 sm:w-auto"
                >
                  GitHub : kromz-dev<span className="sr-only"> (s&apos;ouvre dans un nouvel onglet)</span>
                </a>
              </div>
              <p className="mt-8 text-sm text-surface-2">
                Informations légales : <Link href="/mentions-legales" className="underline underline-offset-4 hover:text-surface">mentions légales</Link>.
              </p>
            </div>
          </div>
        </section>
      </main>
    </PublicPage>
  );
}
