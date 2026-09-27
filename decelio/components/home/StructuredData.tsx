/**
 * Données structurées JSON-LD de la page d'accueil.
 *
 * Règle appliquée ici : on ne balise que ce qui est vrai et déjà visible sur la
 * page. Pas d'`aggregateRating` ni de `review` tant qu'il n'y a pas d'avis réels
 * — ce serait le faux chiffre interdit par `docs/08-constitution.md` (principe I),
 * et les moteurs de réponse filtrent le balisage invérifiable.
 *
 * Les questions FAQ sont passées en propriété plutôt que recopiées, pour que le
 * balisage ne puisse pas diverger du texte affiché.
 *
 * Voir `docs/11-audit-landing-page.md` §2.1.
 */

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://decelio.fr";

const DESCRIPTION =
  "Decelio vérifie chaque jour si les robots des assistants IA peuvent lire les sites " +
  "que vous maintenez, et vous alerte avec la cause et le correctif dès qu'un accès se bloque. " +
  "Pour les agences de maintenance WordPress et les agences SEO/GEO.";

type Faq = { q: string; a: string };

/** Les trois paliers affichés dans la grille tarifaire de la page. */
const PLANS = [
  { name: "Freelance", price: "39", description: "Jusqu'à 10 sites clients." },
  { name: "Agence", price: "99", description: "Jusqu'à 30 sites clients, rapport mensuel à la marque de l'agence." },
  { name: "Studio", price: "249", description: "Jusqu'à 100 sites clients." },
];

export function StructuredData({ faqs }: { faqs: readonly Faq[] }) {
  const organization = {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "Decelio",
    url: SITE_URL,
    logo: `${SITE_URL}/logo-decelio.png`,
    description: DESCRIPTION,
    areaServed: { "@type": "Country", name: "France" },
  };

  const application = {
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#software`,
    name: "Decelio",
    url: SITE_URL,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Surveillance de l'accès des robots IA",
    operatingSystem: "Web",
    inLanguage: "fr-FR",
    description: DESCRIPTION,
    publisher: { "@id": `${SITE_URL}/#organization` },
    offers: PLANS.map((plan) => ({
      "@type": "Offer",
      name: plan.name,
      description: plan.description,
      price: plan.price,
      priceCurrency: "EUR",
      url: `${SITE_URL}/pricing`,
      availability: "https://schema.org/InStock",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: plan.price,
        priceCurrency: "EUR",
        billingDuration: 1,
        billingIncrement: 1,
        unitCode: "MON",
      },
    })),
  };

  const faqPage = {
    "@type": "FAQPage",
    "@id": `${SITE_URL}/#faq`,
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  const graph = {
    "@context": "https://schema.org",
    "@graph": [organization, application, faqPage],
  };

  return (
    <script
      type="application/ld+json"
      // Contenu entièrement statique, défini dans ce fichier et dans le tableau
      // `faqs` de la page : aucune donnée utilisateur n'y transite.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
