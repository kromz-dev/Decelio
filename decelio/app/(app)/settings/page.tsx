import { auth } from "@/auth";
import { db } from "@/lib/db";
import { SubscriptionSection } from "./SubscriptionSection";
import { PersonalDataSection } from "./PersonalDataSection";
import { WhiteLabelSection } from "./WhiteLabelSection";
import { SettingsClient } from "./SettingsClient";

export const metadata = {
  title: "Paramètres | Decelio",
};

/**
 * Route Paramètres : lit la session pour transmettre à `SettingsClient` les
 * quelques données réelles dont ses sections encore sommaires ont besoin
 * (e-mail du compte, nom), plutôt que d'afficher des exemples inventés.
 */
export default async function SettingsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const user = userId
    ? await db.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, stripeTrialEnd: true },
      })
    : null;

  // Essai gratuit de 14 jours (T-essai-gratuit-14-jours) : `null` hors
  // essai (jamais démarré, résilié ou déjà converti — le webhook Stripe
  // remet `stripeTrialEnd` à `null` dans les deux derniers cas). Calculée
  // ici, dans ce fichier serveur, pour que l'équipe Design l'affiche sans
  // avoir à interroger Stripe elle-même.
  const trialEndsAt: Date | null = user?.stripeTrialEnd ?? null;

  return (
    <SettingsClient
      subscriptionSection={<SubscriptionSection />}
      personalDataSection={<PersonalDataSection />}
      whiteLabelSection={<WhiteLabelSection />}
      userName={user?.name ?? null}
      userEmail={user?.email ?? null}
      trialEndsAt={trialEndsAt}
    />
  );
}
