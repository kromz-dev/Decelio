import { auth } from "@/auth";
import { createCheckoutSession } from "@/lib/billing/actions";
import type { Metadata } from "next";
import Link from "next/link";
import { schibsted } from "@/components/home/fonts";
import tokens from "@/components/home/tokens.module.css";
import styles from "./pricing.module.css";

export const metadata: Metadata = {
  title: "Tarifs — Decelio",
  description:
    "Le prix d'une ligne de plus dans votre forfait de maintenance. Scan gratuit sans compte, paliers de 10 à 249 € par mois, sans engagement.",
};

type PlanId = "SOLO" | "PRO" | "SCALE";

type PlanColumn = {
  id: PlanId | "FREE";
  name: string;
  price: string;
  priceUnit?: string;
  recommended?: boolean;
  cta: { label: string; href: string; primary?: boolean };
};

const getPlans = (isLoggedIn: boolean): PlanColumn[] => [
  {
    id: "FREE",
    name: "Scan libre",
    price: "0 €",
    cta: { label: "Scanner un site", href: "/analyse" },
  },
  {
    id: "SOLO",
    name: "Freelance",
    price: "39 €",
    priceUnit: "/mois",
    cta: { label: isLoggedIn ? "Souscrire" : "Essayer Freelance", href: isLoggedIn ? "/settings#abonnement" : "/register?plan=SOLO" },
  },
  {
    id: "PRO",
    name: "Agence",
    price: "99 €",
    priceUnit: "/mois",
    recommended: true,
    cta: { label: isLoggedIn ? "Souscrire" : "Choisir Agence", href: isLoggedIn ? "/settings#abonnement" : "/register?plan=PRO", primary: true },
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
  {
    label: "Sites suivis",
    values: ["1 URL, à la demande", "10 sites", "30 sites", "100 sites"],
  },
  {
    label: "Fréquence du scan",
    values: ["À la demande", "Quotidienne", "Quotidienne", "Quotidienne"],
  },
  {
    label: "Verdict par assistant (ChatGPT, Claude, Perplexity)",
    values: ["yes", "yes", "yes", "yes"],
  },
  {
    label: "Alerte e-mail avec cause et correctif",
    values: ["no", "yes", "yes", "yes"],
  },
  {
    label: "Rapport mensuel à votre logo",
    values: ["no", "no", "yes", "yes"],
  },
  {
    label: "Slack et webhook",
    values: ["no", "no", "soon", "soon"],
  },
  {
    label: "Plusieurs utilisateurs",
    values: ["no", "no", "no", "soon"],
  },
  {
    label: "Accès API",
    values: ["no", "no", "no", "soon"],
  },
  {
    label: "Compte requis",
    values: ["no", "yes", "yes", "yes"],
  },
];

function Cell({ value }: { value: CellValue }) {
  if (value === "yes") return <span>Inclus</span>;
  if (value === "no") return <span className={styles.dash}>—</span>;
  if (value === "soon") return <span className={styles.upcoming}>En préparation</span>;
  return <span>{value}</span>;
}


export default async function PricingPage() {
  const session = await auth();

  return (
    <div className={`${schibsted.variable} ${tokens.root} ${styles.page}`}>
      <header className={styles.header}>
        <div className={`${styles.shell} ${styles.headerRow}`}>
          <Link href="/" className={styles.logo}>
            Decelio<span className={styles.logoMark}>.</span>
          </Link>
          <nav aria-label="Navigation principale" className={styles.nav}>
            <Link href="/#fonctionnement" className={styles.navLink}>
              Fonctionnement
            </Link>
            <Link href="/pricing" className={styles.navLinkActive} aria-current="page">
              Tarifs
            </Link>
            {session ? (
              <Link href="/dashboard" className={styles.navLink}>
                Tableau de bord
              </Link>
            ) : (
              <Link href="/login" className={styles.navLink}>
                Connexion
              </Link>
            )}
          </nav>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.shell}>
          <h1 className={styles.h1}>
            Le prix d&apos;une ligne de plus dans votre forfait de maintenance.
          </h1>
          <p className={styles.lede}>
            Decelio vérifie chaque jour que ChatGPT, Claude et Perplexity peuvent
            lire vos sites clients, et vous prévient avant que le client ne
            s&apos;en aperçoive. Facturation mensuelle, sans engagement. Le
            scan d&apos;un site reste gratuit et sans compte.
          </p>
        </div>
      </section>

      <section className={styles.tableSection}>
        <div className={styles.shell}>
          <h2 className={styles.sectionHeading}>Les quatre paliers</h2>
          <p className={styles.scrollHint}>Faites glisser pour comparer les paliers.</p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption>
                Prix hors taxes, facturation mensuelle. Le palier s&apos;ajuste
                au nombre de sites surveillés.
              </caption>
              <thead>
                <tr>
                  <th scope="col">
                    <span className={styles.srOnly}>Fonctionnalité</span>
                  </th>
                  {getPlans(!!session).map((plan) => (
                    <th
                      key={plan.id}
                      scope="col"
                      className={`${styles.planHead} ${
                        plan.recommended ? styles.planColumn : ""
                      }`}
                    >
                      <span className={styles.planName}>{plan.name}</span>
                      <span className={styles.planPrice}>
                        <span className={styles.planPriceValue}>{plan.price}</span>
                        {plan.priceUnit ? (
                          <span className={styles.planPriceUnit}>
                            {" "}
                            {plan.priceUnit}
                          </span>
                        ) : null}
                      </span>
                      {plan.recommended ? (
                        <span className={styles.recommendedTag}>recommandé</span>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className={styles.rowHead}>
                      {row.label}
                    </th>
                    {row.values.map((value, i) => (
                      <td
                        key={getPlans(!!session)[i].id}
                        className={
                          getPlans(!!session)[i].recommended ? styles.planColumn : undefined
                        }
                      >
                        <Cell value={value} />
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <th scope="row" className={styles.rowHead}>
                    <span className={styles.srOnly}>Choisir ce palier</span>
                  </th>
                  {getPlans(!!session).map((plan) => {
                    const cellClass = `${styles.ctaCell} ${
                      plan.recommended ? styles.planColumn : ""
                    }`;
                    const btnClass = plan.cta.primary
                      ? styles.ctaButtonPrimary
                      : styles.ctaButton;

                    if (session && plan.id !== "FREE") {
                      const handleCheckout = async () => {
                        "use server";
                        await createCheckoutSession(plan.id);
                      };
                      return (
                        <td key={plan.id} className={cellClass}>
                          <form action={handleCheckout}>
                            <button type="submit" className={btnClass} style={{ width: "100%" }}>
                              {plan.cta.label}
                            </button>
                          </form>
                        </td>
                      );
                    }

                    return (
                      <td key={plan.id} className={cellClass}>
                        <Link href={plan.cta.href} className={btnClass}>
                          {plan.cta.label}
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          <div className={styles.terms}>
            <p>
              <strong>Au-delà de 100 sites :</strong> 2 € par site et par
              mois. Ce n&apos;est pas activable depuis le compte : demandez-le
              en répondant à l&apos;e-mail de bienvenue après votre
              inscription, et nous l&apos;activons à la main.
            </p>
            <p>
              <strong>Paiement annuel :</strong> le paiement en ligne est
              mensuel. Deux mois offerts sur demande, en répondant à
              l&apos;e-mail de bienvenue après votre inscription.
            </p>
            <p>
              <strong>Offre fondatrice :</strong> −50 % à vie pour les 10
              premières agences, en échange d&apos;un retour écrit chaque
              mois sur ce qui fonctionne et ce qui manque. Indiquez-le en
              répondant à l&apos;e-mail de bienvenue après votre inscription.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.mathSection} aria-labelledby="refacturation-heading">
        <div className={styles.shell}>
          <div className={styles.mathIntro}>
            <h2 id="refacturation-heading">
              Refacturez 10 à 20 € par site à vos clients
            </h2>
            <p>
              Decelio s&apos;ajoute à votre forfait de maintenance comme une
              ligne de plus, avec un rapport mensuel à votre logo : prouvez
              chaque mois à votre client que les robots des assistants IA
              peuvent lire son site. Voici un exemple de calcul, pas une
              promesse de résultat.
            </p>
          </div>
          <div className={styles.equation}>
            <div className={styles.equationRow}>
              <span className={styles.num}>30</span> sites ×{" "}
              <span className={styles.num}>10 €</span> ={" "}
              <span className={styles.num}>300 €</span> facturés par mois
            </div>
            <div className={styles.equationRow}>
              moins <span className={styles.num}>99 €</span> payés à Decelio
              (palier Agence)
            </div>
            <div className={styles.equationResult}>
              = <span className={styles.num}>201 €</span> de marge, chaque
              mois
            </div>
          </div>
          <p className={styles.mathNote}>
            Exemple avec le bas de la fourchette de refacturation (10 €/site)
            et le palier Agence à 30 sites. Le résultat dépend du tarif que
            vous fixez à vos clients et du palier choisi.
          </p>
        </div>
      </section>

      <section className={styles.faqSection}>
        <div className={styles.shell}>
          <h2 className={styles.sectionHeading}>Questions courantes</h2>
          <div className={styles.faqList}>
            <details className={styles.faqItem}>
              <summary>Y a-t-il un engagement de durée ?</summary>
              <p className={styles.faqAnswer}>
                Non. Les paliers Freelance, Agence et Studio sont facturés au
                mois. Vous changez de palier ou vous arrêtez depuis les
                paramètres du compte, sans durée minimale.
              </p>
            </details>
            <details className={styles.faqItem}>
              <summary>Que se passe-t-il si je dépasse mon quota de sites ?</summary>
              <p className={styles.faqAnswer}>
                L&apos;ajout d&apos;un site est refusé une fois la limite de
                votre palier atteinte ; le message indique le palier
                supérieur à choisir. Au-delà de 100 sites, demandez-le en
                répondant à l&apos;e-mail de bienvenue après votre
                inscription : nous activons l&apos;ajout à 2 €/site/mois à la
                main.
              </p>
            </details>
            <details className={styles.faqItem}>
              <summary>Le rapport mensuel porte-t-il ma marque ?</summary>
              <p className={styles.faqAnswer}>
                Oui, à partir du palier Agence. Le rapport mensuel affiche le
                logo de votre agence, pas celui de Decelio : vos clients voient
                votre suivi.
              </p>
            </details>
            <details className={styles.faqItem}>
              <summary>Decelio remplace-t-il WP Umbrella ou ManageWP ?</summary>
              <p className={styles.faqAnswer}>
                Non, il les compl&egrave;te&nbsp;: eux g&egrave;rent les mises &agrave; jour et les sauvegardes, Decelio
                v&eacute;rifie chaque jour que les robots des assistants IA peuvent lire les sites.
              </p>
            </details>
            <details className={styles.faqItem}>
              <summary>Comment fonctionnent la facturation et la TVA ?</summary>
              <p className={styles.faqAnswer}>
                Les prix affichés sont HT. Une facture est disponible après
                chaque paiement depuis l&apos;espace client, avec la TVA
                applicable à votre pays.
              </p>
            </details>
          </div>
        </div>
      </section>

      <section className={styles.closing}>
        <div className={`${styles.shell} ${styles.closingRow}`}>
          <p className={styles.closingText}>
            Commencez par scanner <strong>un site, gratuitement</strong>.
            Ajoutez les autres quand le verdict vous aura convaincu.
          </p>
          <Link href="/analyse" className={styles.ctaButtonPrimary}>
            Scanner un site
          </Link>
        </div>
      </section>
    </div>
  );
}










