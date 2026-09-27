import type { Metadata } from "next";
import { auth } from "@/auth";
import { PublicPage } from "@/components/home/PublicPage";
import { LastUpdated, LegalHero, LegalSection, ToFill } from "@/components/home/LegalBits";

export const metadata: Metadata = {
  title: "Mentions légales | Decelio",
  description: "Éditeur, hébergeur et propriété intellectuelle du site Decelio, conformément à l'article 6 de la LCEN.",
};

export default async function MentionsLegalesPage() {
  const session = await auth();

  return (
    <PublicPage isLoggedIn={!!session}>
      <main id="contenu">
        <LegalHero title="Mentions légales" />

        <div className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[70ch]">
            <LastUpdated>
              <ToFill>date</ToFill>
            </LastUpdated>

            <LegalSection id="editeur" title="Éditeur du site">
              <ul>
                <li>
                  Nom ou raison sociale : <ToFill>nom et prénom, ou raison sociale de l&apos;éditeur</ToFill>
                </li>
                <li>Statut juridique : micro-entreprise</li>
                <li>
                  SIREN / SIRET : <ToFill>numéro SIREN ou SIRET</ToFill>
                </li>
                <li>
                  Immatriculation : <ToFill>numéro RCS ou RNE et ville du greffe</ToFill>
                </li>
                <li>
                  Siège social : <ToFill>adresse postale du siège</ToFill>
                </li>
                <li>
                  TVA intracommunautaire :{" "}
                  <ToFill>numéro de TVA intracommunautaire, ou mention de franchise en base</ToFill>
                </li>
                <li>Directeur de la publication : <ToFill>nom et prénom</ToFill></li>
                <li>
                  Contact : <a href="mailto:contact@decelio.fr">contact@decelio.fr</a>
                </li>
              </ul>
            </LegalSection>

            <LegalSection id="hebergement" title="Hébergement">
              <p>
                Le site est hébergé par Render Services, Inc.,{" "}
                <ToFill>adresse postale de Render, à vérifier sur render.com</ToFill>, sur des serveurs situés à
                Francfort (Allemagne).
              </p>
            </LegalSection>

            <LegalSection id="propriete-intellectuelle" title="Propriété intellectuelle">
              <p>
                L&apos;ensemble des textes, du logo et du code de ce site appartient à l&apos;éditeur mentionné
                ci-dessus. Toute reproduction ou représentation, totale ou partielle, sans autorisation préalable est
                interdite.
              </p>
            </LegalSection>

            <LegalSection id="credits" title="Crédits">
              <p>
                Les polices utilisées sur ce site sont auto-hébergées : aucune requête n&apos;est envoyée à un
                service tiers pour les afficher.
              </p>
            </LegalSection>
          </div>
        </div>
      </main>
    </PublicPage>
  );
}
