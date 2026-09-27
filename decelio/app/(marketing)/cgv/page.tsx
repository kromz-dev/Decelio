import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { PublicPage } from "@/components/home/PublicPage";
import { LastUpdated, LegalHero, LegalSection, LegalToc, ToFill, type TocEntry } from "@/components/home/LegalBits";

export const metadata: Metadata = {
  title: "CGV | Decelio",
  description:
    "Conditions générales de vente de Decelio, réservées aux clients professionnels : service, prix, paiement, résiliation.",
};

const TOC: TocEntry[] = [
  { id: "champ-application", label: "Champ d'application" },
  { id: "service", label: "Description du service" },
  { id: "honnetete", label: "Honnêteté de la mesure" },
  { id: "formules-prix", label: "Formules et prix" },
  { id: "essai", label: "Essai" },
  { id: "paiement", label: "Paiement" },
  { id: "resiliation", label: "Résiliation" },
  { id: "changement-formule", label: "Changement de formule" },
  { id: "quota", label: "Quota" },
  { id: "obligations-client", label: "Obligations du client" },
  { id: "responsabilite", label: "Responsabilité" },
  { id: "donnees", label: "Données personnelles" },
  { id: "droit-applicable", label: "Droit applicable et litiges" },
];

export default async function CgvPage() {
  const session = await auth();

  return (
    <PublicPage isLoggedIn={!!session}>
      <main id="contenu">
        <LegalHero
          title="Conditions générales de vente"
          intro="Ces conditions s'appliquent uniquement aux clients professionnels : Decelio est un service vendu à des agences et des indépendants, pas à des particuliers."
        />

        <div className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[70ch]">
            <LastUpdated>
              <ToFill>date</ToFill>
            </LastUpdated>

            <LegalToc entries={TOC} />

            <LegalSection id="champ-application" title="Champ d'application">
              <p>
                Les présentes conditions générales de vente s&apos;appliquent à tout abonnement souscrit auprès de
                Decelio par un client professionnel, à l&apos;exclusion de tout consommateur au sens du code de la
                consommation. En souscrivant un abonnement, le client déclare agir dans le cadre de son activité
                professionnelle.
              </p>
            </LegalSection>

            <LegalSection id="service" title="Description du service">
              <p>
                Decelio vérifie chaque jour que les robots des assistants IA (ChatGPT, Claude, Perplexity et autres)
                peuvent lire techniquement les sites que le client surveille. En cas de blocage, Decelio envoie une
                alerte par e-mail avec une cause probable et un correctif. Un rapport PDF mensuel récapitule les
                vérifications ; il porte la marque du client (logo) à partir de la formule Agence.
              </p>
            </LegalSection>

            <LegalSection id="honnetete" title="Honnêteté de la mesure">
              <p>
                Les vérifications imitent l&apos;identité des robots des assistants IA depuis nos serveurs. C&apos;est
                un indice fort de ce que ces robots peuvent lire, jamais une preuve absolue : nous ne consultons pas
                les journaux du serveur du client. Quand un résultat ne permet pas de conclure, il est affiché
                « à vérifier » plutôt que comme un blocage certain.
              </p>
              <p>
                <strong>Decelio ne mesure pas si un assistant IA cite ou recommande un site</strong>, et ne garantit
                ni visibilité, ni trafic, ni citation dans les réponses d&apos;un assistant IA. Le service porte
                exclusivement sur l&apos;accès technique des robots au contenu des sites surveillés.
              </p>
            </LegalSection>

            <LegalSection id="formules-prix" title="Formules et prix">
              <p>
                Trois formules mensuelles sont proposées : Freelance à 39 €, Agence à 99 € et Studio à 249 € par
                mois. Le détail de ce qui est inclus dans chaque formule (nombre de sites, alerte, rapport en marque
                blanche) figure sur la page{" "}
                <Link href="/pricing">tarifs</Link>.
              </p>
              <p>TVA non applicable, article 293 B du Code général des impôts.</p>
              <p>
                Une offre fondatrice à moins 50 % à vie est proposée aux dix premières agences, contre un retour
                écrit mensuel sur l&apos;usage du service ; voir la page tarifs pour les modalités.
              </p>
            </LegalSection>

            <LegalSection id="essai" title="Essai">
              <p>
                <ToFill>
                  période d&apos;essai de 14 jours, à activer après fusion du code d&apos;essai
                </ToFill>
              </p>
            </LegalSection>

            <LegalSection id="paiement" title="Paiement">
              <p>
                Le paiement est mensuel, prélevé par carte bancaire via Stripe, notre prestataire de paiement.
                L&apos;abonnement est sans engagement de durée.
              </p>
              <p>
                En cas de retard de paiement, des pénalités au taux d&apos;intérêt légal majoré de 10 points sont
                appliquées, ainsi qu&apos;une indemnité forfaitaire de 40 € pour frais de recouvrement, conformément
                à l&apos;article L441-10 du Code de commerce (vente entre professionnels).
              </p>
            </LegalSection>

            <LegalSection id="resiliation" title="Résiliation">
              <p>
                Le client résilie à tout moment depuis « Gérer mon abonnement » dans son espace client, qui ouvre le
                portail de facturation Stripe. La résiliation prend effet à la fin de la période déjà payée, sans
                remboursement au prorata. <ToFill>confirmer la politique de remboursement</ToFill>
              </p>
            </LegalSection>

            <LegalSection id="changement-formule" title="Changement de formule">
              <p>
                Le client change de formule à tout moment depuis son espace client. Le montant est ajusté au prorata
                par Stripe.
              </p>
            </LegalSection>

            <LegalSection id="quota" title="Quota">
              <p>
                Chaque formule limite le nombre de sites surveillés. Au-delà du quota, les sites supplémentaires ne
                sont pas surveillés ; aucun site déjà ajouté n&apos;est supprimé.
              </p>
            </LegalSection>

            <LegalSection id="obligations-client" title="Obligations du client">
              <p>
                Le client garantit être autorisé à faire surveiller chaque site qu&apos;il ajoute à son compte. Il
                est seul responsable des modifications qu&apos;il applique à ses sites, y compris à la suite d&apos;un
                correctif suggéré par une alerte Decelio.
              </p>
            </LegalSection>

            <LegalSection id="responsabilite" title="Responsabilité">
              <p>
                Decelio est tenu à une obligation de moyens : nous mettons en œuvre les vérifications décrites
                ci-dessus, sans engagement de résultat ni niveau de service chiffré. Notre responsabilité est
                limitée à <ToFill>plafond de responsabilité</ToFill>.
              </p>
            </LegalSection>

            <LegalSection id="donnees" title="Données personnelles">
              <p>
                Le traitement des données personnelles est décrit dans notre page{" "}
                <Link href="/confidentialite">confidentialité</Link>.
              </p>
            </LegalSection>

            <LegalSection id="droit-applicable" title="Droit applicable et litiges">
              <p>
                Les présentes conditions sont soumises au droit français. Tout litige relève du tribunal compétent de{" "}
                <ToFill>ville du siège</ToFill>. Le client étant un professionnel, aucune médiation de la
                consommation ne s&apos;applique.
              </p>
            </LegalSection>
          </div>
        </div>
      </main>
    </PublicPage>
  );
}
