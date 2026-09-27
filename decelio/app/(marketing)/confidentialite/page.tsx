import type { Metadata } from "next";
import { auth } from "@/auth";
import { PublicPage } from "@/components/home/PublicPage";
import { LastUpdated, LegalHero, LegalSection, LegalToc, ToFill, type TocEntry } from "@/components/home/LegalBits";

export const metadata: Metadata = {
  title: "Confidentialité | Decelio",
  description:
    "Politique de confidentialité de Decelio : données collectées, finalités, sous-traitants, conservation et droits RGPD.",
};

const TOC: TocEntry[] = [
  { id: "responsable", label: "Responsable du traitement" },
  { id: "donnees-collectees", label: "Données collectées" },
  { id: "finalites", label: "Finalités et bases légales" },
  { id: "sous-traitants", label: "Sous-traitants" },
  { id: "transferts", label: "Transferts hors Union européenne" },
  { id: "conservation", label: "Durée de conservation" },
  { id: "droits", label: "Vos droits" },
  { id: "cookies", label: "Cookies et mesure d'audience" },
  { id: "securite", label: "Sécurité" },
];

export default async function ConfidentialitePage() {
  const session = await auth();

  return (
    <PublicPage isLoggedIn={!!session}>
      <main id="contenu">
        <LegalHero title="Confidentialité" />

        <div className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[70ch]">
            <LastUpdated>
              <ToFill>date</ToFill>
            </LastUpdated>

            <LegalToc entries={TOC} />

            <LegalSection id="responsable" title="Responsable du traitement">
              <p>
                Le responsable du traitement des données personnelles collectées sur ce site et dans
                l&apos;application est <ToFill>identité de l&apos;éditeur, voir mentions légales</ToFill>. Pour
                toute question, écrivez à <a href="mailto:contact@decelio.fr">contact@decelio.fr</a>.
              </p>
            </LegalSection>

            <LegalSection id="donnees-collectees" title="Données collectées">
              <ul>
                <li>Compte : nom, e-mail, mot de passe haché ou connexion Google.</li>
                <li>Sites surveillés et résultats des vérifications quotidiennes.</li>
                <li>Réglages de marque blanche : nom, logo et couleur affichés sur le rapport mensuel.</li>
                <li>
                  Facturation : gérée par Stripe. Decelio ne voit jamais le numéro de carte bancaire du client.
                </li>
                <li>
                  Mesure d&apos;audience : PostHog (hébergé dans l&apos;Union européenne), sans cookie, sans
                  enregistrement de session, avec un identifiant interne et jamais l&apos;e-mail. Les données de mesure
                  transitent par notre propre domaine : votre adresse IP n&apos;est pas transmise à PostHog.
                </li>
                <li>
                  Journaux techniques et limitation de débit : adresse IP, conservés pour une durée courte.
                </li>
              </ul>
            </LegalSection>

            <LegalSection id="finalites" title="Finalités et bases légales">
              <ul>
                <li>Exécution du contrat : fourniture du service, facturation.</li>
                <li>
                  Intérêt légitime : sécurité du service (limitation des tentatives de connexion), lutte contre les
                  abus, mesure d&apos;audience agrégée.
                </li>
                <li>Obligation légale : conservation des factures.</li>
              </ul>
            </LegalSection>

            <LegalSection id="sous-traitants" title="Sous-traitants">
              {/* Entités relevées sur les pages officielles des prestataires le 27/09/2026 (DPA, politiques de
                  confidentialité, conditions d'utilisation, registre dataprivacyframework.gov). */}
              <ul>
                <li>Stripe Payments Europe, Limited (Irlande) : paiement et facturation.</li>
                <li>
                  Resend, exploité par Plus Five Five, Inc. (États-Unis ; envoi depuis la région Irlande) : envoi des
                  e-mails transactionnels et d&apos;alerte.
                </li>
                <li>PostHog (hébergement PostHog Cloud EU, Francfort, Allemagne) : mesure d&apos;audience.</li>
                <li>Neon, LLC, filiale de Databricks, Inc. (États-Unis ; base hébergée à Francfort, Allemagne) : base de données.</li>
                <li>Render Services, Inc. (États-Unis ; serveurs à Francfort, Allemagne) : hébergement.</li>
                <li>Inngest Inc (États-Unis) : tâches planifiées (purge des comptes résiliés, rapports).</li>
                <li>
                  Google Ireland Limited (Irlande) : uniquement si le client se connecte avec un compte Google.
                </li>
              </ul>
            </LegalSection>

            <LegalSection id="transferts" title="Transferts hors Union européenne">
              <p>
                Certains prestataires sont des sociétés américaines, ou appartiennent à des groupes américains.
                Les transferts de données vers les États-Unis sont encadrés par le Data Privacy Framework UE-États-Unis,
                auquel sont certifiés Stripe, Inc., Plus Five Five, Inc. (Resend), Render Services, Inc., Databricks,
                Inc. et Neon, LLC, PostHog et Google LLC, et, selon les prestataires, par les clauses contractuelles
                types de la Commission européenne prévues dans leur accord de traitement des données.
              </p>
              <p>
                Inngest Inc&nbsp;:{" "}
                <ToFill>
                  cadre du transfert non publié (ni certification Data Privacy Framework ni clauses contractuelles
                  types trouvées) ; à demander à Inngest ou à vérifier sur dataprivacyframework.gov
                </ToFill>
              </p>
            </LegalSection>

            <LegalSection id="conservation" title="Durée de conservation">
              <p>
                Les données du compte sont conservées tant que l&apos;abonnement est actif. En cas de résiliation,
                elles sont supprimées automatiquement 60 jours après, y compris la fiche client chez Stripe (
                <ToFill>suppression de la fiche client Stripe à la purge, en cours de mise en œuvre</ToFill>) ;
                Stripe conserve ses propres registres légaux de facturation. Les factures sont conservées 10 ans,
                conformément à l&apos;obligation légale de conservation comptable.
              </p>
            </LegalSection>

            <LegalSection id="droits" title="Vos droits">
              <p>
                Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement,
                de portabilité (export de vos données depuis les paramètres du compte), d&apos;opposition et de
                limitation du traitement. Pour exercer ces droits, écrivez à{" "}
                <a href="mailto:contact@decelio.fr">contact@decelio.fr</a>. Vous pouvez aussi introduire une
                réclamation auprès de la CNIL (<a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">cnil.fr</a>).
              </p>
            </LegalSection>

            <LegalSection id="cookies" title="Cookies et mesure d'audience">
              <p>
                L&apos;application dépose un seul cookie, nécessaire à la connexion (session NextAuth). La mesure
                d&apos;audience PostHog fonctionne sans cookie, en mémoire : elle ne conserve rien entre deux visites
                du même navigateur.
              </p>
            </LegalSection>

            <LegalSection id="securite" title="Sécurité">
              <ul>
                <li>Connexion chiffrée (HTTPS) et en-tête HSTS sur toutes les pages.</li>
                <li>Mots de passe stockés hachés, jamais en clair.</li>
                <li>Limitation du nombre de tentatives de connexion.</li>
                <li>Sauvegardes assurées par l&apos;hébergeur de la base de données.</li>
              </ul>
            </LegalSection>
          </div>
        </div>
      </main>
    </PublicPage>
  );
}
