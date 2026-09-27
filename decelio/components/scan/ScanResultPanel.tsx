"use client";

import * as React from "react";
import { LoaderCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Verdict } from "@/components/ui/verdict";
import type { ScanCoreResult, ScanReport } from "@/lib/scanner/core";
import {
  ASSISTANTS,
  RISK_LABEL,
  accessSummary,
  formatTime,
  jsSummary,
  robotsSummary,
  verdictForBot,
  type ResultSummary,
} from "@/lib/scanner/verdicts";
import { describePlatform } from "./platformLabel";

/**
 * Résultat d'un appel à `/api/scan`. Type partagé entre `ScanForm` (scan
 * depuis la page d'accueil) et la page de résultat partageable
 * `/analyse/[domain]` : les deux affichent le même rapport avec le même
 * composant, pour ne jamais faire diverger les verdicts présentés.
 */
export type ScanApiResponse = { results: ScanCoreResult[]; report: ScanReport };

function ResultRow({ title, value, cause, fix }: { title: string } & ResultSummary) {
  return (
    <div className="flex flex-col gap-1 border-t border-line pt-3 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-2">
        <Verdict value={value} variant="inline" size="sm" />
        <span className="type-table font-medium text-ink">{title}</span>
      </div>
      <p className="type-caption text-ink-2">{cause}</p>
      {fix && (
        <p className="type-caption text-ink-2">
          <span className="font-medium text-ink">Correctif : </span>
          {fix}
        </p>
      )}
    </div>
  );
}

export function ScanResultPanel({ data, submittedUrl }: { data: ScanApiResponse; submittedUrl: string }) {
  const { report } = data;
  const [downloading, setDownloading] = React.useState(false);

  async function handleDownloadPdf() {
    setDownloading(true);
    try {
      const res = await fetch("/api/pdf/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report, results: data.results }),
      });
      if (!res.ok) throw new Error("Erreur lors de la génération du PDF.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.style.display = "none";
      const disposition = res.headers.get("Content-Disposition");
      let filename = "diagnostic.pdf";
      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (err) {
      console.error("Failed to download PDF", err);
      alert("Impossible de télécharger le PDF. Veuillez réessayer.");
    } finally {
      setDownloading(false);
    }
  }

  const platformLabel = describePlatform(report.platform);

  // Verdicts par assistant qui ne sont pas « Lu » : leur cause doit etre lisible,
  // en particulier « a verifier » (blocage general sans preuve de ciblage).
  // Regroupees par cause identique pour ne pas repeter trois fois la meme phrase.
  const verdicts = ASSISTANTS.map(({ label, bot }) => ({ label, bot, ...verdictForBot(report, bot) }));
  const causeGroups = verdicts
    .filter((v) => v.value !== "lu")
    .reduce<{ labels: string[]; cause: string; fix?: string }[]>((groups, v) => {
      const existing = groups.find((g) => g.cause === v.cause);
      if (existing) existing.labels.push(v.label);
      else groups.push({ labels: [v.label], cause: v.cause, fix: v.fix });
      return groups;
    }, []);

  const redirectCount = report.access.redirects.length;
  const redirected = redirectCount > 0 && report.finalUrl !== submittedUrl;

  return (
    <Card size="sm" className="mt-6 w-full max-w-[560px]">
      <CardContent className="flex flex-col gap-4">
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <p className="type-table min-w-0 truncate font-semibold text-ink">{report.finalUrl}</p>
            <p className="type-caption shrink-0 text-ink-2">
              Vérifié à <span className="tnum">{formatTime(report.scannedAt)}</span>
            </p>
          </div>
          {platformLabel && (
            <p className="mt-1 type-caption text-ink-2">
              <span className="font-medium text-ink">Plateforme d&eacute;tect&eacute;e&nbsp;: </span>
              {platformLabel}
            </p>
          )}
          {redirected && (
            <p className="mt-1 type-caption text-ink-2">
              Redirigé depuis {submittedUrl} ({redirectCount} redirection{redirectCount > 1 ? "s" : ""}).
            </p>
          )}
        </div>

        <ul className="flex flex-wrap gap-2">
          {verdicts.map((v) => (
            <li
              key={v.bot}
              className="flex items-center gap-1.5 rounded-sm border border-line bg-paper px-2 py-1.5"
            >
              <Badge>{v.label}</Badge>
              <Verdict value={v.value} variant="inline" size="sm" />
            </li>
          ))}
        </ul>

        {causeGroups.length > 0 && (
          <ul className="flex flex-col gap-2">
            {causeGroups.map((group) => (
              <li key={group.cause} className="rounded-sm border border-line bg-paper px-3 py-2">
                <p className="type-caption text-ink">
                  <span className="font-medium">{group.labels.join(", ")}&nbsp;: </span>
                  {group.cause}
                </p>
                {group.fix && (
                  <p className="mt-1 type-caption text-ink-2">
                    <span className="font-medium text-ink">Correctif : </span>
                    {group.fix}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-3">
          <ResultRow title="Politique robots.txt" {...robotsSummary(report)} />
          <ResultRow title="Accès / pare-feu" {...accessSummary(report)} />
          <ResultRow title="Dépendance JavaScript" {...jsSummary(report)} />
        </div>

        {report.access.unverifiedProbes.length > 0 && (
          <div className="border-t border-line pt-3">
            <p className="type-caption font-medium text-ink-2">Signaux indicatifs (requêtes non vérifiées)</p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {report.access.unverifiedProbes.map((probe) => (
                <li key={probe.claimedBot} className="type-caption text-ink-2">
                  {probe.claimedBot} : {RISK_LABEL[probe.risk] ?? probe.risk} (HTTP {probe.httpStatus}),
                  indicatif, non vérifié.
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-2 border-t border-line pt-4 flex justify-center">
          <Button variant="outline" onClick={handleDownloadPdf} disabled={downloading} className="w-full sm:w-auto">
            {downloading ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Télécharger le rapport (PDF)
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
