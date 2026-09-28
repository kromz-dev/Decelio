"use server";

import { inngest } from "@/inngest/client";
import { addMonitoredSitesBulk } from "@/app/actions/sites";

export interface OnboardingImportResult {
  created: { id: string; name: string; url: string }[];
  skipped: { line: string; reason: string }[];
  /**
   * `true` seulement si l'événement Inngest de premier scan a réellement été
   * envoyé avec succès. `false` ne veut pas dire que l'ajout a échoué — les
   * sites créés dans `created` existent bien en base — seulement que le scan
   * n'a pas pu être déclenché tout de suite (clés Inngest absentes en
   * développement, service indisponible). Principe II de la constitution :
   * on n'affiche jamais un scan comme lancé s'il ne l'est pas réellement.
   */
  scanTriggered: boolean;
}

/**
 * T043 (EF-061, EF-062) : raccorde l'étape « Ajouter les domaines » de
 * l'onboarding à `addMonitoredSitesBulk` (dé-duplication, garde SSRF via
 * `assertSafeUrl`, quota par plan — tout est déjà géré par cette action, voir
 * `app/actions/sites.ts`) puis déclenche un vrai premier scan en envoyant,
 * pour chaque site créé, l'événement Inngest `app/scan.site` avec
 * `{ siteId }` — le contrat de déclenchement unitaire documenté dans
 * `inngest/functions/scan-site.ts` ("Un déclenchement unitaire (onboarding)
 * doit continuer à envoyer `siteId`."). Aucune nouvelle fonction Inngest :
 * `scanSiteJob` écoute déjà cet événement, que ce soit un lot du passage
 * quotidien ou un site isolé ici.
 *
 * Si `addMonitoredSitesBulk` retourne une erreur (session absente, panne
 * base de données), elle est retransmise telle quelle — jamais convertie en
 * faux succès.
 */
/**
 * Forme minimale attendue de `addMonitoredSitesBulk`, annotée explicitement :
 * son retour est inféré par TypeScript comme une union où la branche
 * `{ data }` porte un `error?: undefined` fantôme, ce qui empêche
 * `"error" in result` de rétrécir proprement (les deux branches restent
 * possibles). L'annotation ci-dessous force une union discriminée propre
 * sans changer le comportement de `addMonitoredSitesBulk` lui-même.
 */
type BulkSitesResult =
  | { error: string }
  | {
      data: {
        created: { id: string; name: string; url: string }[];
        skipped: { line: string; reason: string }[];
      };
    };

export async function importOnboardingDomains(
  raw: string,
): Promise<{ error: string } | { data: OnboardingImportResult }> {
  // `triggerScan: false` : cette fonction envoie déjà ses propres événements
  // `app/scan.site` juste après (id `onboarding-scan-<id>`). Sans ce
  // garde-fou, `addMonitoredSitesBulk` enverrait un second événement par
  // site sous l'id `scan-site-<id>` (T091) — deux identifiants différents,
  // donc deux scans que la déduplication Inngest ne peut pas rattraper.
  const result: BulkSitesResult = await addMonitoredSitesBulk(raw, { triggerScan: false });

  if ("error" in result) {
    return result;
  }

  const { created, skipped } = result.data;
  let scanTriggered = false;

  if (created.length > 0) {
    try {
      await inngest.send(
        created.map((site) => ({
          name: "app/scan.site" as const,
          // Id déterministe : un double envoi (retente réseau, double clic)
          // reste dédupliqué par Inngest sur sa fenêtre de 24 h plutôt que
          // de lancer deux scans pour le même site.
          id: `onboarding-scan-${site.id}`,
          data: { siteId: site.id },
        })),
      );
      scanTriggered = true;
    } catch {
      // Clés Inngest absentes en développement, ou service injoignable :
      // les sites restent créés, mais on ne prétend pas qu'un scan a
      // démarré. `scanTriggered` reste `false`, à afficher tel quel.
      scanTriggered = false;
    }
  }

  return { data: { created, skipped, scanTriggered } };
}
