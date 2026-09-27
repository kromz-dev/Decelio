import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { SiteActions } from "./SiteActions";
import { Card, CardContent } from "@/components/ui/card";
import { Verdict } from "@/components/ui/verdict";
import { consecutiveDaysDown } from "@/lib/sites/consecutive-days";
import { assistantSnapshots } from "@/lib/sites/latest-bots";
import { buildScanHistory } from "@/lib/sites/scan-history";
import { resolveDomainName } from "@/lib/sites/domain-name";
import { verdictForSiteStatus } from "@/lib/sites/site-status";

export const metadata = {
  title: "Détail du domaine | Decelio",
};

export default async function SiteDetailPage(props: { params: Promise<{ siteId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { siteId } = await props.params;

  // Retrieve site from MonitoredSite or legacy Site
  const monitoredSite = await db.monitoredSite.findFirst({
    where: { id: siteId, userId: session.user.id },
    include: { scanLogs: { orderBy: { createdAt: "desc" }, take: 60 } },
  });

  const legacySite = !monitoredSite
    ? await db.site.findFirst({
        where: { id: siteId, userId: session.user.id },
        include: {
          pages: {
            include: {
              botScans: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
      })
    : null;

  // Domain display details — jamais un domaine inventé si le site n'existe pas (T051, principe II).
  const domainName = resolveDomainName(monitoredSite, legacySite, siteId);

  const clientName = monitoredSite?.name || legacySite?.name || "Ce domaine";

  const history = buildScanHistory(monitoredSite?.scanLogs ?? []);
  const latest = monitoredSite?.scanLogs?.[0] ?? null;
  const bots = assistantSnapshots(latest);
  const daysInRed = consecutiveDaysDown(history);

  return (
    <div className="mx-auto max-w-[1240px] pb-16 text-ink">
      {/* En-tête */}
      <section className="border-b border-line pb-7 pt-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" />
          Portefeuille
        </Link>

        <div className="mt-3.5 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em] text-ink">
              {domainName}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Verdict
                value={latest?.simpleStatus ? verdictForSiteStatus(latest.simpleStatus) : "inconnu"}
                detail={latest?.simpleStatus === "À VÉRIFIER" ? "à vérifier" : latest?.httpStatus ? String(latest.httpStatus) : "non mesuré"}
              />
              <span className="text-sm text-ink-2">Site surveillé, client : {clientName}</span>
            </div>
          </div>

          <SiteActions siteId={siteId} />
        </div>
      </section>

      {/* Indicateurs clés */}
      <section className="border-b border-line py-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {bots.length === 0 ? (
            <Card size="sm">
              <CardContent>
                <div className="type-caption text-ink-2">Dernier scan</div>
                <div className="mt-1 text-sm text-ink-2">Aucun journal pour ce domaine.</div>
              </CardContent>
            </Card>
          ) : (
            bots.slice(0, 3).map((bot) => (
              <Card size="sm" key={bot.agent}>
                <CardContent>
                  <div className="type-caption text-ink-2">{bot.agent}</div>
                  <div className={`mt-1 text-[28px] leading-8 font-semibold tnum ${bot.httpStatus !== null && bot.httpStatus >= 400 ? "text-stop" : "text-ink"}`}>
                    {bot.httpStatus ?? "non mesuré"}
                  </div>
                  <p className="mt-1 text-sm text-ink-2">{bot.cause}</p>
                </CardContent>
              </Card>
            ))
          )}

          <Card size="sm">
            <CardContent>
              <div className="type-caption text-ink-2">Jours au rouge</div>
              <div className={`mt-1 text-[28px] leading-8 font-semibold tnum ${daysInRed > 0 ? "text-stop" : "text-ink"}`}>
                {daysInRed}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Historique des verdicts */}
      <section className="border-b border-line py-10">
        <h2 className="text-[22px] leading-7 font-semibold text-ink">Historique des verdicts</h2>
        <p className="mt-1.5 mb-6 text-sm text-ink-2">
          Un scan par jour. Chaque barre est le verdict du jour ; l&apos;encre rouge signale un site invisible pour les IA.
        </p>

        {history.length === 0 ? (
          <p className="text-sm text-ink-2">Aucun scan n&apos;a encore été enregistré pour ce domaine.</p>
        ) : (
          <>
            <div className="flex h-[120px] items-end gap-1.5 pt-4" role="img" aria-label="Historique des scans de ce domaine">
              {history.map((point) => (
                <span
                  key={point.date}
                  title={`${point.label} : ${point.degraded ? "dégradé" : "lisible"}`}
                  className={`flex-1 rounded-t-xs ${point.degraded ? "h-full bg-stop" : "h-[70%] bg-line"}`}
                />
              ))}
            </div>
            <div className="mt-2.5 flex justify-between text-xs text-ink-2">
              <span>{history[0]?.label}</span>
              <span>{history[history.length - 1]?.label}</span>
            </div>
          </>
        )}
      </section>

      {/* Trace technique et piste de correction */}
      <section className="grid grid-cols-1 items-start gap-9 border-b border-line py-10 lg:grid-cols-2">
        {/* Trace */}
        <div>
          <h2 className="mb-2.5 text-[22px] leading-7 font-semibold text-ink">
            Réponse servie aux bots IA
          </h2>
          {bots.length === 0 ? (
            <p className="text-sm text-ink-2">Aucune trace : ce domaine n&apos;a pas encore de scan.</p>
          ) : (
            <ul className="space-y-3 text-sm text-ink">
              {bots.map((bot) => (
                <li key={bot.agent}>
                  <span className="font-medium">{bot.agent}</span>
                  <span className="tnum text-ink-2"> · HTTP {bot.httpStatus ?? "non mesuré"}</span>
                  <p className="text-ink-2">{bot.cause}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="mb-2.5 text-[22px] leading-7 font-semibold text-ink">
            Piste de correction
          </h2>
          {bots.length === 0 ? (
            <p className="text-sm text-ink-2">Le correctif apparaîtra après le premier scan.</p>
          ) : (
            <ul className="space-y-3 text-sm text-ink">
              {bots.map((bot) => (
                <li key={`${bot.agent}-fix`}>
                  <span className="font-medium">{bot.agent}.</span> {bot.fix}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Pages suivies */}
      <section className="pt-10">
        <h2 className="mb-5 text-[22px] leading-7 font-semibold text-ink">
          Pages suivies
        </h2>

        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left type-table">
              <caption className="sr-only">Pages suivies pour {domainName}</caption>
              <thead className="border-b border-ink text-ink-2">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">Page</th>
                  <th scope="col" className="px-3 py-2 font-medium">Verdict</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Code</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Texte utile</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Dernier scan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {bots.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-sm text-ink-2">Aucun scan enregistré.</td>
                  </tr>
                ) : (
                  bots.map((bot) => (
                    <tr key={bot.agent} className="h-11 hover:bg-paper">
                      <td className="px-3 py-2 font-medium text-ink">{domainName}</td>
                      <td className="px-3 py-2 text-ink-2">{bot.agent}</td>
                      <td className="px-3 py-2 text-right text-ink-2 tnum">{bot.httpStatus ?? "non mesuré"}</td>
                      <td className="px-3 py-2 text-right text-ink-2">{bot.cause}</td>
                      <td className="px-3 py-2 text-right text-ink-2 tnum">
                        {latest ? latest.createdAt.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
