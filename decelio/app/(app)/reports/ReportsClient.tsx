"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Loader2, FileText, RefreshCw, AlertCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import { generateMonthlyReport } from "@/app/actions/reports";
import type { DailyAvailabilityPoint } from "@/lib/reports/portfolio";

import {
  type ClientReportItem,
  type PeriodOption,
  type ReportsClientProps,
  calculateReportsKpi,
} from "./reports-data";

export { type ClientReportItem, type PeriodOption, type ReportsClientProps };

export function ReportsClient({
  initialClients,
  availablePeriods,
  defaultPeriod,
  dailyAvailabilityByPeriod,
}: ReportsClientProps) {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState<string>(defaultPeriod);
  const [clients, setClients] = useState<ClientReportItem[]>(initialClients);
  const [generatingClientId, setGeneratingClientId] = useState<string | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rapports pour la période sélectionnée
  const clientsWithReports = clients.map((client) => ({
    ...client,
    currentReport: client.reports.find((r) => r.period === selectedPeriod),
  }));

  const reportsForSelectedPeriod = clientsWithReports
    .map((c) => c.currentReport)
    .filter((r): r is NonNullable<typeof r> => !!r);

  // KPIs
  const { avgAvailability, totalDomains, totalIncidents, readyReportsCount } =
    calculateReportsKpi(clients, selectedPeriod);

  const dailyPoints = dailyAvailabilityByPeriod[selectedPeriod] ?? [];

  // Téléchargement programmatique d'un PDF
  const triggerDownload = (reportId: string, clientName: string) => {
    const link = document.createElement("a");
    link.href = `/api/reports/${reportId}/pdf`;
    link.download = `rapport-${clientName}-${selectedPeriod}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Génération à la demande d'un rapport pour un client
  const handleGenerate = async (clientId: string, clientName: string) => {
    setError(null);
    setGeneratingClientId(clientId);

    try {
      const response = await generateMonthlyReport(clientId, selectedPeriod);

      if ("error" in response) {
        setError(response.error ?? "Erreur inconnue");
        return;
      }

      if (!response.data) {
        setError("Données de rapport indisponibles");
        return;
      }

      const generatedData = response.data;

      // Mise à jour de l'état local
      setClients((prev) =>
        prev.map((c) => {
          if (c.id !== clientId) return c;
          const otherReports = c.reports.filter((r) => r.period !== selectedPeriod);
          return {
            ...c,
            reports: [
              ...otherReports,
              {
                id: generatedData.id,
                period: generatedData.period,
                availabilityPct: 100,
                incidentCount: 0,
                generatedAt: new Date().toISOString(),
              },
            ],
          };
        }),
      );

      triggerDownload(generatedData.id, clientName);
      router.refresh();
    } catch {
      setError("Impossible de générer le rapport. Veuillez réessayer.");
    } finally {
      setGeneratingClientId(null);
    }
  };

  // Génération de tous les rapports manquants pour la période
  const handleGenerateAll = async () => {
    const clientsToGenerate = clientsWithReports.filter(
      (c) => !c.currentReport && c.sitesCount > 0,
    );

    if (clientsToGenerate.length === 0) return;

    setError(null);
    setGeneratingAll(true);

    try {
      for (const client of clientsToGenerate) {
        const response = await generateMonthlyReport(client.id, selectedPeriod);
        if ("data" in response && response.data) {
          const generatedData = response.data;
          setClients((prev) =>
            prev.map((c) => {
              if (c.id !== client.id) return c;
              const otherReports = c.reports.filter((r) => r.period !== selectedPeriod);
              return {
                ...c,
                reports: [
                  ...otherReports,
                  {
                    id: generatedData.id,
                    period: generatedData.period,
                    availabilityPct: 100,
                    incidentCount: 0,
                    generatedAt: new Date().toISOString(),
                  },
                ],
              };
            }),
          );
        }
      }
      router.refresh();
    } catch {
      setError("Une erreur est survenue lors de la génération groupée.");
    } finally {
      setGeneratingAll(false);
    }
  };

  const firstAvailableReport = reportsForSelectedPeriod[0];

  return (
    <div className="mx-auto max-w-6xl pb-16">
      {/* En-tête */}
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-line pb-8">
        <div>
          <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em] text-ink sm:text-[34px] sm:leading-[40px]">
            Rapport mensuel d&apos;accès des robots IA
          </h1>
          <p className="mt-3 max-w-[58ch] text-sm leading-6 text-ink-2">
            À joindre au reporting de maintenance de chaque client. Généré automatiquement chaque mois, exportable en PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {availablePeriods.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-sm border border-line p-1 bg-surface">
              {availablePeriods.map((p) => (
                <Button
                  key={p.period}
                  type="button"
                  size="lg"
                  variant={selectedPeriod === p.period ? "default" : "ghost"}
                  onClick={() => setSelectedPeriod(p.period)}
                >
                  {p.shortLabel}
                </Button>
              ))}
            </div>
          )}

          {firstAvailableReport ? (
            <a
              href={`/api/reports/${firstAvailableReport.id}/pdf`}
              download
              className={cn(buttonVariants({ variant: "default", size: "lg" }), "gap-2")}
            >
              <Download className="size-4" />
              Exporter en PDF
            </a>
          ) : clients.some((c) => c.sitesCount > 0) ? (
            <Button
              type="button"
              variant="default"
              size="lg"
              disabled={generatingAll}
              onClick={handleGenerateAll}
            >
              {generatingAll ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Génération en cours…
                </>
              ) : (
                <>
                  <RefreshCw className="size-4" />
                  Générer les rapports
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-stop/30 bg-stop/10 p-3 text-sm text-stop">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Cartes KPI */}
      <div className="mt-8 grid grid-cols-2 gap-px border-x border-y border-line bg-line md:grid-cols-4">
        <div className="bg-surface p-5 md:px-6 md:py-[22px]">
          <div className="type-caption font-medium text-ink-2">Disponibilité IA moyenne</div>
          <div className="mt-1.5 text-3xl leading-tight font-semibold text-ink tnum md:text-[32px]">
            {avgAvailability !== null ? `${avgAvailability} %` : "—"}
          </div>
        </div>

        <div className="bg-surface p-5 md:px-6 md:py-[22px]">
          <div className="type-caption font-medium text-ink-2">Domaines surveillés</div>
          <div className="mt-1.5 text-3xl leading-tight font-semibold text-ink tnum md:text-[32px]">
            {totalDomains}
          </div>
        </div>

        <div className="bg-surface p-5 md:px-6 md:py-[22px]">
          <div className="type-caption font-medium text-ink-2">Incidents</div>
          <div
            className={cn(
              "mt-1.5 text-3xl leading-tight font-semibold tnum md:text-[32px]",
              totalIncidents > 0 ? "text-stop" : "text-ink",
            )}
          >
            {reportsForSelectedPeriod.length > 0 ? totalIncidents : "—"}
          </div>
        </div>

        <div className="bg-surface p-5 md:px-6 md:py-[22px]">
          <div className="type-caption font-medium text-ink-2">Rapports prêts</div>
          <div className="mt-1.5 text-3xl leading-tight font-semibold text-ink tnum md:text-[32px]">
            {readyReportsCount} / {clients.length}
          </div>
        </div>
      </div>

      {/* Tableau par client */}
      <div className="border-b border-line py-10">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ink">Par client</h2>
          {clients.length > 0 && (
            <span className="text-sm text-ink-2">
              Période : {availablePeriods.find((p) => p.period === selectedPeriod)?.label ?? selectedPeriod}
            </span>
          )}
        </div>

        {clients.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-surface p-12 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-paper">
              <FileText className="size-6 text-ink-2" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-ink">Aucun client configuré</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-2">
              Les rapports mensuels regroupent vos domaines surveillés par client d&apos;agence.
              Ajoutez vos clients et associez leurs domaines pour générer et télécharger automatiquement vos rapports PDF.
            </p>
            <div className="mt-6">
              <Link href="/dashboard" className={buttonVariants({ variant: "default", size: "lg" })}>
                Gérer mes domaines
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full min-w-[640px] border-collapse text-left type-table">
              <caption className="sr-only">Disponibilité IA et incidents par client</caption>
              <thead>
                <tr className="border-b border-ink text-left type-caption font-medium text-ink-2">
                  <th scope="col" className="px-6 py-3 font-medium">Client</th>
                  <th scope="col" className="px-3 py-3 font-medium">Domaines</th>
                  <th scope="col" className="px-3 py-3 font-medium">Disponibilité IA</th>
                  <th scope="col" className="px-3 py-3 font-medium">Incidents</th>
                  <th scope="col" className="px-6 py-3 text-right font-medium">Rapport</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {clientsWithReports.map((client) => {
                  const report = client.currentReport;
                  const isGenerating = generatingClientId === client.id;

                  return (
                    <tr key={client.id} className="h-12 hover:bg-paper">
                      <td className="px-6 py-3 font-medium text-ink">
                        {client.name}
                      </td>
                      <td className="px-3 py-3 text-ink tnum">
                        {client.sitesCount}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-3 tnum",
                          report?.availabilityPct !== null &&
                            report?.availabilityPct !== undefined &&
                            report.availabilityPct < 90
                            ? "font-semibold text-stop"
                            : "text-ink",
                        )}
                      >
                        {report && report.availabilityPct !== null
                          ? `${report.availabilityPct} %`
                          : "—"}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-3 text-sm",
                          report && report.incidentCount > 0
                            ? "font-semibold text-stop"
                            : "text-ink-2",
                        )}
                      >
                        {report
                          ? report.incidentCount > 0
                            ? `${report.incidentCount} incident${report.incidentCount > 1 ? "s" : ""}`
                            : "0 incident"
                          : "—"}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {report ? (
                          <div className="flex items-center justify-end gap-3">
                            <a
                              href={`/api/reports/${report.id}/pdf`}
                              download
                              className="inline-flex items-center gap-1.5 font-medium text-ink underline-offset-4 hover:text-cobalt hover:underline"
                            >
                              <Download className="size-4" />
                              Télécharger
                            </a>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={isGenerating}
                              onClick={() => handleGenerate(client.id, client.name)}
                              title="Régénérer le rapport PDF pour ce client"
                            >
                              {isGenerating ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                "Régénérer"
                              )}
                            </Button>
                          </div>
                        ) : client.sitesCount > 0 ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isGenerating}
                            onClick={() => handleGenerate(client.id, client.name)}
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 className="size-3.5 animate-spin" />
                                Génération…
                              </>
                            ) : (
                              <>
                                <FileText className="size-3.5" />
                                Générer le PDF
                              </>
                            )}
                          </Button>
                        ) : (
                          <span className="text-xs text-ink-2">Aucun domaine</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section Disponibilité du portefeuille & Ce que contient le PDF */}
      <div className="grid grid-cols-1 items-start gap-6 py-10 md:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface p-6 md:p-8">
          <h2 className="text-xl font-semibold text-ink">Disponibilité du portefeuille</h2>
          <p className="mt-1.5 text-sm text-ink-2">
            Part des domaines lisibles par les IA, jour par jour sur la période sélectionnée.
          </p>

          {dailyPoints.length > 0 ? (
            <>
              <div
                className="mt-6 flex h-[130px] items-end gap-1.5 px-1 pt-4"
                role="img"
                aria-label={`Disponibilité IA quotidienne du ${dailyPoints[0]?.day} au ${dailyPoints[dailyPoints.length - 1]?.day} : ${dailyPoints.map((item) => `${item.day} ${item.value} %`).join(", ")}`}
              >
                {dailyPoints.map((item, index) => (
                  <div
                    key={index}
                    className="group relative flex h-full flex-1 flex-col items-center justify-end"
                  >
                    <div
                      style={{ height: `${item.value}%` }}
                      className={cn(
                        "w-full rounded-t-xs transition-opacity group-hover:opacity-85",
                        item.isAlert ? "bg-stop" : "bg-line-strong",
                      )}
                    />
                    <div className="pointer-events-none absolute -top-9 z-10 hidden flex-col items-center group-hover:flex">
                      <span className="whitespace-nowrap rounded-xs bg-ink px-2 py-0.5 type-caption tnum text-paper">
                        {item.day} : {item.value} %
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex justify-between type-caption font-medium text-ink-2">
                <span>{dailyPoints[0]?.day}</span>
                <span>{dailyPoints[dailyPoints.length - 1]?.day}</span>
              </div>
            </>
          ) : (
            <div className="mt-6 flex h-[130px] items-center justify-center rounded border border-line bg-paper/50 text-sm text-ink-2">
              Aucun scan enregistré sur cette période.
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between rounded-lg border border-line bg-surface p-6 md:p-8">
          <div>
            <h2 className="text-xl font-semibold text-ink">Ce que contient le PDF</h2>
            <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 text-sm leading-6 text-ink">
              <div>Verdict actuel et historique de chaque domaine du client.</div>
              <div>Liste des incidents, avec date d&apos;apparition et de résolution.</div>
              <div>Réponse brute des bots IA, en annexe technique.</div>
              <div>Logo et coordonnées de votre agence en en-tête.</div>
            </div>
          </div>

          <div className="mt-6">
            <Link href="/settings" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Personnaliser l&apos;en-tête
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
