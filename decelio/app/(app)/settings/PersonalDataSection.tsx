import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { formatExportDateLabel, formatPurgeLabel } from "./personal-data-summary";

/**
 * Section Données personnelles des paramètres (EF-015, ENF-003).
 *
 * Server Component, même schéma que `SubscriptionSection` : lit la session
 * et la base directement. Le bouton d'export est un simple lien vers le
 * Route Handler `GET /api/account/export` (attribut `download`), pas un
 * appel client + Blob : le navigateur gère le téléchargement nativement
 * grâce à l'en-tête `Content-Disposition` renvoyé par la route.
 */
export async function PersonalDataSection() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { dataExportedAt: true, cancelledAt: true, purgeAt: true },
  });

  if (!user) return null;

  const exportLabel = formatExportDateLabel(user.dataExportedAt);
  const purgeLabel = formatPurgeLabel(user);

  return (
    <section id="donnees" className="scroll-mt-8">
      <h2 className="text-xl font-semibold text-ink">Données personnelles</h2>
      <p className="mt-1.5 mb-4.5 max-w-[60ch] text-sm text-ink-2">
        Export complet au format JSON : profil, sites surveillés, clients, réglages de marque et historique
        d&apos;alertes.
      </p>

      <div className="flex flex-wrap items-center gap-2.5">
        <Button size="lg" nativeButton={false} render={<a href="/api/account/export" download />}>
          Exporter mes données (JSON)
        </Button>
      </div>

      <div className="mt-3.5 space-y-1 text-sm text-ink-2">
        {exportLabel && <p>{exportLabel}</p>}
        <p>{purgeLabel}</p>
      </div>
    </section>
  );
}
