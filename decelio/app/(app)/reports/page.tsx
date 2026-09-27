import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { previousMonth, monthPeriod } from "@/lib/reports/monthlyReport";
import {
  computeDailyPortfolioAvailability,
  type DailyAvailabilityPoint,
} from "@/lib/reports/portfolio";
import { ReportsClient } from "./ReportsClient";
import {
  buildAvailablePeriods,
  type ClientReportItem,
  type PeriodOption,
} from "./reports-data";

export const metadata = {
  title: "Rapports | Decelio",
  description: "Rapports mensuels de lecture par les robots IA, par client, exportables en PDF.",
};

export default async function ReportsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
    return null;
  }

  // Chargement des clients du compte avec leurs sites et leurs rapports mensuels
  const clients = await db.client.findMany({
    where: { userId },
    include: {
      sites: {
        select: {
          id: true,
          name: true,
          url: true,
        },
        orderBy: { createdAt: "asc" },
      },
      reports: {
        select: {
          id: true,
          period: true,
          availabilityPct: true,
          incidentCount: true,
          generatedAt: true,
        },
        orderBy: { period: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  // Construction des périodes disponibles
  const now = new Date();
  const existingReportPeriods = clients.flatMap((c) => c.reports.map((r) => r.period));
  const availablePeriods: PeriodOption[] = buildAvailablePeriods(existingReportPeriods, now);
  const sortedPeriods = availablePeriods.map((p) => p.period);
  const prevPeriod = previousMonth(now);

  // Par défaut, le mois précédent (période close de maintenance),
  // ou le premier mois disponible
  const defaultPeriod = sortedPeriods.includes(prevPeriod) ? prevPeriod : sortedPeriods[0] ?? prevPeriod;

  // Récupération des logs de scan pour calculer l'historique quotidien du portefeuille
  const siteIds = clients.flatMap((c) => c.sites.map((s) => s.id));
  const dailyAvailabilityByPeriod: Record<string, DailyAvailabilityPoint[]> = {};

  if (siteIds.length > 0) {
    // On charge les logs des périodes affichables
    const oldestPeriod = sortedPeriods[sortedPeriods.length - 1] ?? prevPeriod;
    const { start: oldestStart } = monthPeriod(oldestPeriod);

    const logs = await db.scanLog.findMany({
      where: {
        siteId: { in: siteIds },
        createdAt: { gte: oldestStart },
      },
      select: {
        siteId: true,
        createdAt: true,
        simpleStatus: true,
      },
      orderBy: { createdAt: "asc" },
    });

    for (const p of sortedPeriods) {
      const periodRange = monthPeriod(p);
      dailyAvailabilityByPeriod[p] = computeDailyPortfolioAvailability(logs, periodRange);
    }
  }

  // Formatage des clients pour le composant client
  const initialClients: ClientReportItem[] = clients.map((c) => ({
    id: c.id,
    name: c.name,
    sitesCount: c.sites.length,
    reports: c.reports.map((r) => ({
      id: r.id,
      period: r.period,
      availabilityPct: r.availabilityPct,
      incidentCount: r.incidentCount,
      generatedAt: r.generatedAt.toISOString(),
    })),
  }));

  return (
    <ReportsClient
      initialClients={initialClients}
      availablePeriods={availablePeriods}
      defaultPeriod={defaultPeriod}
      dailyAvailabilityByPeriod={dailyAvailabilityByPeriod}
    />
  );
}
