"use server";

import { inngest } from "@/inngest/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

/**
 * T089 (EF-002) : relance un scan depuis la fiche d'un site.
 *
 * Envoie l'événement `app/scan.site` (contrat documenté en tête de
 * `inngest/functions/scan-site.ts`), le seul que `scanSiteJob` écoute.
 * L'ancien code envoyait `campaign.run`, un événement que rien n'écoute :
 * la requête répondait 200 mais aucun scan n'avait jamais lieu.
 *
 * Le site doit être un `MonitoredSite` appartenant à l'utilisateur connecté
 * — c'est le seul modèle que `scanSiteJob` sait lire. Un identifiant du
 * modèle hérité `Site` n'existe pas dans `MonitoredSite`, donc le job ne
 * trouverait rien : on refuse explicitement plutôt que d'envoyer un
 * événement voué à échouer silencieusement.
 *
 * Volontairement sans `id` de déduplication : contrairement à l'onboarding
 * (`app/(app)/onboarding/actions.ts`), une relance manuelle est une action
 * demandée explicitement par l'utilisateur et doit pouvoir être répétée
 * tout de suite (deux clics rapprochés, un scan précédent jugé pas assez
 * récent). Un id déterministe ferait dédupliquer le second scan par
 * Inngest pendant 24 h, contre l'intention de l'utilisateur.
 *
 * Si `inngest.send` échoue (clés absentes en développement, service
 * injoignable), l'erreur remonte telle quelle à l'appelant : c'est à
 * l'interface (T090) de dire la vérité plutôt que d'annoncer un scan lancé.
 */
export async function launchAuditCampaign(siteId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Non authentifié.");
  }

  const site = await db.monitoredSite.findFirst({
    where: { id: siteId, userId: session.user.id },
    select: { id: true },
  });

  if (!site) {
    throw new Error("Ce site n'est pas surveillé : aucun scan à relancer.");
  }

  await inngest.send({
    name: "app/scan.site",
    data: { siteId: site.id },
  });

  revalidatePath(`/sites/${site.id}`);
}
