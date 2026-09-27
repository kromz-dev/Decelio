import { auth } from "@/auth";
import { createCheckoutSession } from "@/lib/billing/actions";
import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_HALO, PublicPage } from "@/components/home/PublicPage";
import { Check, RingsWatermark, SectionHeading, rank } from "@/components/home/MarketingBits";
import { StripeMark } from "@/components/ui/stripe-logo";

export const metadata: Metadata = {
  title: "Tarifs | Decelio",
  description:
    "Le prix d'une ligne de plus dans votre forfait de maintenance. Scan gratuit sans compte, paliers de 39 à 249 € par mois, sans engagement.",
};

type PlanId = "SOLO" | "PRO" | "SCALE";

type PlanColumn = {
  id: PlanId | "FREE";
  name: string;
  price: string;
  priceUnit?: string;
  recommended?: boolean;
  cta: { label: string; href: string };
};

/**
 * Essai gratuit de 14 jours sur les trois formules (ADR-002), carte demandee
 * au depart par Stripe Checkout. Le scan libre renvoie au diagnostic de
 * l'accueil : /analyse seul n'existe pas, seul /analyse/[domain] existe.
 */
const getPlans = (isLoggedIn: boolean): PlanColumn[] => [
  {
    id: "FREE",
    name: "Scan libre",
    price: "0 €",
    cta: { label: "Scanner un site", href: "/#scan" },
  },
  {
    id: "SOLO",
    name: "Freelance",
    price: "39 €",
    priceUnit: "/mois",
    cta: { label: isLoggedIn ? "Souscrire" : "Choisir Freelance", href: isLoggedIn ? "/settings#abonnement" : "/register?plan=SOLO" },
  },
  {
    id: "PRO",
    name: "Agence",
    price: "99 €",
    priceUnit: "/mois",
    recommended: true,
    cta: { label: isLoggedIn ? "Souscrire" : "Choisir Agence", href: isLoggedIn ? "/settings#abonnement" : "/register?plan=PRO" },
  },
  {
    id: "SCALE",
    name: "Studio",
    price: "249 €",
    priceUnit: "/mois",
    cta: { label: isLoggedIn ? "Souscrire" : "Choisir Studio", href: isLoggedIn ? "/settings#abonnement" : "/register?plan=SCALE" },
  },
];

type CellValue = string | "yes" | "no" | "soon";

type FeatureRow = {
  label: string;
  values: [CellValue, CellValue, CellValue, CellValue];
};

const ROWS: FeatureRow[] = [
  { label: "Sites suivis", values: ["1 URL, à la demande", "10 sites", "30 sites", "100 sites"] },
  { label: "Fréquence du scan", values: ["À la demande", "Quotidienne", "Quotidienne", "Quotidienne"] },
  { label: "Verdict par assistant (ChatGPT, Claude, Perplexity)", values: ["yes", "yes", "yes", "yes"] },
  { label: "Alerte e-mail avec cause et correctif", values: ["no", "yes", "yes", "yes"] },
  { label: "Rapport mensuel à votre logo", values: ["no", "no", "yes", "yes"] },
  { label: "Slack et webhook", values: ["no", "no", "soon", "soon"] },
  { label: "Plusieurs utilisateurs", values: ["no", "no", "no", "soon"] },
  { label: "Accès API", values: ["no", "no", "no", "soon"] },
  { label: "Essai gratuit de 14 jours", values: ["no", "yes", "yes", "yes"] },
  { label: "Compte requis", values: ["no", "yes", "yes", "yes"] },
];

const TERMS = [
  {
    title: "Essai gratuit de 14 jours",
    body: "Sur les trois formules, un essai par compte. La carte est demandée au départ ; le premier prélèvement a lieu à la fin de l'essai, et un e-mail vous prévient 3 jours avant. Résiliez avant la fin et rien n'est prélevé.",
  },
  {
    title: "Au-delà de 100 sites",
    body: "2 € par site et par mois. Ce n'est pas activable depuis le compte : demandez-le en répondant à l'e-mail de bienvenue après votre inscription, et nous l'activons à la main.",
  },
  {
    title: "Paiement annuel",
    body: "Le paiement en ligne est mensuel. Deux mois offerts sur demande, en répondant à l'e-mail de bienvenue après votre inscription.",
  },
  {
    title: "Offre fondatrice",
    body: "Moins 50 % à vie pour les 10 premières agences, en échange d'un retour écrit chaque mois sur ce qui fonctionne et ce qui manque. Indiquez-le en répondant à l'e-mail de bienvenue.",
  },
] as const;

const PRICING_FAQ = [
  {
    q: "Comment fonctionne l'essai gratuit ?",
    a: "14 jours sur la formule de votre choix, un essai par compte. La carte est demandée au départ par Stripe ; le premier prélèvement a lieu à la fin de l'essai, et un e-mail vous prévient 3 jours avant. Vous pouvez résilier avant depuis « Gérer mon abonnement ».",
  },
  {
    q: "Y a-t-il un engagement de durée ?",
    a: "Non. Les paliers Freelance, Agence et Studio sont facturés au mois. Vous changez de palier ou vous arrêtez depuis les paramètres du compte, sans durée minimale.",
  },
  {
    q: "Que se passe-t-il si je dépasse mon quota de sites ?",
    a: "L'ajout d'un site est refusé une fois la limite de votre palier atteinte ; le message indique le palier supérieur à choisir. Au-delà de 100 sites, demandez-le en répondant à l'e-mail de bienvenue : nous activons l'ajout à 2 € par site et par mois à la main.",
  },
  {
    q: "Le rapport mensuel porte-t-il ma marque ?",
    a: "Oui, à partir du palier Agence. Le rapport mensuel affiche le logo de votre agence : vos clients voient votre suivi.",
  },
  {
    q: "Decelio remplace-t-il WP Umbrella ou ManageWP ?",
    a: "Non, il les complète : eux gèrent les mises à jour et les sauvegardes, Decelio vérifie chaque jour que les robots des assistants IA peuvent lire les sites.",
  },
  {
    q: "Comment fonctionnent la facturation et la TVA ?",
    a: "TVA non applicable (art. 293 B du CGI) : le prix affiché est le prix payé. Une facture est disponible après chaque paiement depuis l'espace client. Le paiement passe par Stripe.",
  },
] as const;

/** Une cellule : un mot lisible, jamais un tiret seul. */
function Cell({ value, onDark }: { value: CellValue; onDark?: boolean }) {
  if (value === "yes")
    return (
      <span className={`inline-flex items-center gap-1.5 font-medium ${onDark ? "text-surface" : "text-ink"}`}>
        <Check className={`h-4 w-4 ${onDark ? "text-[#4fcb8e]" : "text-ok"}`} />
        Inclus
      </span>
    );
  if (value === "no") return <span className={onDark ? "text-surface-2" : "text-ink-2"}>Non inclus</span>;
  if (value === "soon")
    return (
      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${onDark ? "bg-surface/10 text-surface" : "bg-brand-soft text-brand"}`}>
        En préparation
      </span>
    );
  return <span className={`font-medium ${onDark ? "text-surface" : "text-ink"}`}>{value}</span>;
}

function PlanPrice({ plan, onDark }: { plan: PlanColumn; onDark?: boolean }) {
  return (
    <span className={`font-display mt-1 block text-[34px] font-bold tracking-[-0.03em] ${onDark ? "text-surface" : "text-ink"}`}>
      {plan.price}
      {plan.priceUnit && (
        <span className={`font-sans text-sm font-normal tracking-normal ${onDark ? "text-surface-2" : "text-ink-2"}`}> {plan.priceUnit}</span>
      )}
    </span>
  );
}

export default async function PricingPage() {
  const session = await auth();
  const plans = getPlans(!!session);

  /** Bouton d'un palier : paiement Stripe si connecte, lien sinon. */
  function PlanCta({ plan }: { plan: PlanColumn }) {
    const className = plan.recommended
      ? "block w-full rounded-full bg-surface px-5 py-2.5 text-center text-sm font-semibold text-ink transition-transform duration-300 hover:-translate-y-0.5"
      : "block w-full rounded-full border border-line-strong/40 bg-surface px-5 py-2.5 text-center text-sm font-semibold text-ink transition-colors hover:bg-surface-2";
    if (session && plan.id !== "FREE") {
      const planId = plan.id;
      const handleCheckout = async () => {
        "use server";
        await createCheckoutSession(planId);
      };
      return (
        <form action={handleCheckout}>
          <button type="submit" className={className}>{plan.cta.label}</button>
        </form>
      );
    }
    return <Link href={plan.cta.href} className={className}>{plan.cta.label}</Link>;
  }

  return (
    <PublicPage isLoggedIn={!!session} current="/pricing">
      <main id="contenu">
        <section className="px-4 pb-16 pt-20 text-center sm:px-6 lg:px-8" style={BRAND_HALO}>
          <h1 className="font-display animate-cascade mx-auto max-w-4xl text-[40px] font-bold leading-[1.02] tracking-[-0.04em] text-ink sm:text-[60px]">
            Le prix d&apos;une ligne de plus dans votre forfait de maintenance
          </h1>
          <p className="animate-cascade mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-2 sm:text-xl" style={{ animationDelay: "200ms" }}>
            Decelio v&eacute;rifie chaque jour que les robots de ChatGPT, Claude et Perplexity peuvent lire vos sites
            clients, et vous pr&eacute;vient avant que le client ne s&apos;en aper&ccedil;oive. 14&nbsp;jours d&apos;essai
            gratuit, puis facturation mensuelle, sans engagement. Le scan d&apos;un site reste gratuit et sans compte.
          </p>
        </section>

        <section aria-labelledby="paliers-titre" className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1100px]">
            <h2 id="paliers-titre" className="sr-only">Les quatre paliers</h2>

            {/* Grand ecran : tableau comparatif. Mobile : une carte par palier, sans defilement horizontal. */}
            <div className="reveal hidden overflow-hidden rounded-[1.75rem] border border-line bg-surface lg:block">
              <table className="w-full border-collapse text-left text-sm">
                <caption className="sr-only">
                  TVA non applicable (art. 293 B du CGI), facturation mensuelle. Le palier s&apos;ajuste au nombre de sites surveill&eacute;s.
                </caption>
                <thead>
                  <tr className="align-top">
                    <th scope="col" className="w-[26%] px-6 py-6"><span className="sr-only">Fonctionnalit&eacute;</span></th>
                    {plans.map((plan) => (
                      <th key={plan.id} scope="col" className={`px-5 py-6 ${plan.recommended ? "bg-ink" : ""}`}>
                        {plan.recommended && (
                          <span className="mb-2 inline-flex rounded-full bg-surface/10 px-2.5 py-0.5 text-xs font-semibold text-surface">Recommand&eacute;</span>
                        )}
                        <span className={`font-display block text-[22px] font-bold tracking-[-0.02em] ${plan.recommended ? "text-surface" : "text-ink"}`}>{plan.name}</span>
                        <PlanPrice plan={plan} onDark={plan.recommended} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row) => (
                    <tr key={row.label} className="border-t border-line">
                      <th scope="row" className="px-6 py-4 font-semibold text-ink">{row.label}</th>
                      {row.values.map((value, i) => (
                        <td key={plans[i].id} className={`px-5 py-4 ${plans[i].recommended ? "bg-brand-soft/60" : ""}`}>
                          <Cell value={value} />
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="border-t border-line">
                    <th scope="row" className="px-6 py-5"><span className="sr-only">Choisir ce palier</span></th>
                    {plans.map((plan) => (
                      <td key={plan.id} className={`px-5 py-5 ${plan.recommended ? "bg-ink" : ""}`}>
                        <PlanCta plan={plan} />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:hidden">
              {plans.map((plan, p) => (
                <article
                  key={plan.id}
                  style={rank(p % 2)}
                  className={`reveal relative overflow-hidden rounded-[1.75rem] border p-6 ${plan.recommended ? "border-ink bg-ink" : "border-line bg-surface"}`}
                >
                  {plan.recommended && (
                    <RingsWatermark className="pointer-events-none absolute -right-24 -top-24 h-[280px] w-[280px] text-brand-soft/30" />
                  )}
                  <div className="relative">
                    {plan.recommended && (
                      <span className="mb-2 inline-flex rounded-full bg-surface/10 px-2.5 py-0.5 text-xs font-semibold text-surface">Recommand&eacute;</span>
                    )}
                    <h3 className={`font-display text-[22px] font-bold tracking-[-0.02em] ${plan.recommended ? "text-surface" : "text-ink"}`}>{plan.name}</h3>
                    <div className="mb-5">
                      <PlanPrice plan={plan} onDark={plan.recommended} />
                    </div>
                    <dl className="mb-6 space-y-2.5 text-sm">
                      {ROWS.map((row) => (
                        <div key={row.label} className="flex items-start justify-between gap-4">
                          <dt className={plan.recommended ? "text-surface-2" : "text-ink-2"}>{row.label}</dt>
                          <dd className="shrink-0 text-right">
                            <Cell value={row.values[p]} onDark={plan.recommended} />
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <PlanCta plan={plan} />
                  </div>
                </article>
              ))}
            </div>

            <p className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm text-ink-2">
              TVA non applicable (art. 293 B du CGI). Facturation mensuelle, paiement par carte via
              <span className="inline-flex items-center gap-1.5 font-medium text-ink">
                <StripeMark className="h-4 w-4" /> Stripe
              </span>
            </p>

            <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
              {TERMS.map((term, i) => (
                <div key={term.title} style={rank(i)} className="reveal rounded-[1.25rem] border border-line bg-surface p-6">
                  <h3 className="font-display mb-2 text-[20px] font-bold tracking-[-0.02em] text-ink">{term.title}</h3>
                  <p className="text-[15px] leading-relaxed text-ink-2">{term.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="refacturation-heading" className="border-y border-line bg-surface px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-[1100px] grid-cols-1 items-center gap-12 md:grid-cols-2">
            <div className="reveal">
              <h2 id="refacturation-heading" className="font-display mb-5 text-[34px] font-bold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[46px]">
                Refacturez 10 &agrave; 20&nbsp;&euro; par site &agrave; vos clients
              </h2>
              <p className="text-lg leading-relaxed text-ink-2">
                Decelio s&apos;ajoute &agrave; votre forfait de maintenance comme une ligne de plus, avec un rapport mensuel
                &agrave; votre logo&nbsp;: prouvez chaque mois &agrave; votre client que les robots des assistants IA peuvent
                lire son site. Voici un exemple de calcul, pas une promesse de r&eacute;sultat.
              </p>
            </div>
            <figure style={rank(1)} className="reveal rounded-[1.75rem] border border-line bg-paper p-8">
              <figcaption className="type-caption mb-4 text-ink-2">Exemple</figcaption>
              <dl className="space-y-3 text-[17px] text-ink-2">
                <div className="flex items-baseline justify-between gap-4">
                  <dt>30 sites &times; 10&nbsp;&euro; factur&eacute;s par mois</dt>
                  <dd className="font-display text-2xl font-bold text-ink">300&nbsp;&euro;</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt>Moins l&apos;abonnement Decelio (palier Agence)</dt>
                  <dd className="font-display text-2xl font-bold text-ink">99&nbsp;&euro;</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
                  <dt className="font-semibold text-ink">Marge, chaque mois</dt>
                  <dd className="font-display text-4xl font-bold text-brand">201&nbsp;&euro;</dd>
                </div>
              </dl>
              <p className="mt-5 text-sm text-ink-2">
                Avec le bas de la fourchette de refacturation (10&nbsp;&euro; par site) et le palier Agence &agrave; 30
                sites. Le r&eacute;sultat d&eacute;pend du tarif que vous fixez &agrave; vos clients et du palier choisi.
              </p>
            </figure>
          </div>
        </section>

        <section aria-labelledby="faq-tarifs-titre" className="px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[800px]">
            <SectionHeading id="faq-tarifs-titre" title="Questions sur les tarifs" />
            <div className="space-y-3">
              {PRICING_FAQ.map((f, i) => (
                <details
                  key={f.q}
                  open={i === 0}
                  style={rank(i % 3)}
                  className="reveal group overflow-hidden rounded-[1.25rem] border border-line bg-surface transition-colors open:border-brand/30"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 font-semibold text-ink">
                    {f.q}
                    <span className="text-ink-3 transition-transform duration-300 group-open:rotate-45 group-open:text-brand">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </span>
                  </summary>
                  <p className="px-6 pb-5 text-ink-2">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="final-tarifs-titre" className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="reveal relative mx-auto max-w-[1100px] overflow-hidden rounded-[2rem] bg-ink px-6 py-16 text-center sm:px-12">
            <RingsWatermark className="pointer-events-none absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 text-brand-soft/25" />
            <div className="relative">
              <h2 id="final-tarifs-titre" className="font-display mx-auto mb-4 max-w-2xl text-[32px] font-bold leading-[1.05] tracking-[-0.035em] text-surface sm:text-[44px]">
                Commencez par un site, gratuitement
              </h2>
              <p className="mx-auto mb-8 max-w-xl text-lg text-surface-2">Ajoutez les autres quand le verdict vous aura convaincu.</p>
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
