"use client";

import { useState } from "react";
import posthog from "posthog-js";
import { captureLead } from "@/app/actions/lead";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Verdict } from "@/components/ui/verdict";
import { CoverageMatrix } from "@/components/geo/CoverageMatrix";
import { Mail, TriangleAlert, Check } from "lucide-react";
import { DEFAULT_PROBE_BOTS } from "@/lib/scanner/agents";

export interface RunData {
  agent: string;
  status: string;
  wordCount: number;
  hasAppRoot: boolean;
  httpStatus: number;
  durationMs: number;
}

export interface PageScanResult {
  path: string;
  runs: RunData[];
}

export interface AuditData {
  domain: string;
  score: number;
  pages: PageScanResult[];
}

interface CoverageGridProps {
  data: AuditData;
}

export function CoverageGrid({ data }: CoverageGridProps) {
  const { domain, score, pages } = data;
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [leadError, setLeadError] = useState("");

  async function handleSubmitLead(formData: FormData) {
    setLoading(true);
    setLeadError("");
    const result = await captureLead(formData, JSON.stringify({ domain, score, type: "v3-technical-scan" }));
    setSubmitted(result.success);
    if (result.success) posthog.capture("lead_submitted");
    else setLeadError("L'envoi a échoué. Vérifiez l'adresse et réessayez.");
    setLoading(false);
  }

  // Robots sondés par /api/audit (la requête de référence CitedBot n'est pas affichée)
  const aiBots = DEFAULT_PROBE_BOTS;

  // Convertir les résultats de l'API pour le CoverageMatrix
  const matrixRows = pages.map((page) => {
    return {
      label: page.path,
      cells: aiBots.map(botName => {
        const run = page.runs.find(r => r.agent === botName);
        if (!run) return "absent";
        return run.status === "ACCESSIBLE" ? "cited" : "absent";
      })
    };
  });

  const isVulnerable = score < 100;

  return (
    <Card className="mx-auto mt-8 max-w-4xl overflow-hidden">
      <CardHeader className="flex flex-col gap-5 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="info">Scan terminé</Badge>
          <h2 className="mt-3 text-[22px] leading-7 font-semibold text-ink">
            Diagnostic de <span className="text-cobalt">{domain}</span>
          </h2>
          <p className="mt-2 text-sm text-ink-2">
            Ce que les robots IA voient réellement sur votre site.
          </p>
        </div>
        <div className="sm:text-right">
          <div className="type-caption text-ink-2">Statut</div>
          <Verdict
            value={isVulnerable ? "refuse" : "lu"}
            variant="inline"
            size="lg"
            className="justify-end"
          />
        </div>
      </CardHeader>

      <CardContent>
        <h3 className="mb-4 text-[17px] leading-6 font-semibold text-ink">Grille de lisibilité IA</h3>
        <CoverageMatrix
          columns={aiBots}
          rows={matrixRows}
        />

        {isVulnerable ? (
          <div className="mt-6 flex flex-col gap-4 rounded-lg border border-stop/30 bg-stop-soft p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="flex items-center gap-2 font-semibold text-stop"><TriangleAlert className="h-4 w-4" /> Correctif recommandé</h4>
              <p className="mt-1 text-sm text-ink">Vos pages apparaissent vides ou inaccessibles pour certains bots IA. Installez le middleware Edge Cited pour servir une version pré-rendue.</p>
            </div>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-4 rounded-lg border border-ok/30 bg-ok-soft p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="flex items-center gap-2 font-semibold text-ok"><Check className="h-4 w-4" /> Site optimisé</h4>
              <p className="mt-1 text-sm text-ink">Votre site est lisible par tous les robots IA majeurs suivis.</p>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex-col items-stretch gap-3 py-6">
        <h3 className="flex items-center gap-2 text-[17px] leading-6 font-semibold text-ink"><Mail className="h-5 w-5" /> Recevez le guide d&apos;installation</h3>
        <p className="max-w-lg text-sm leading-6 text-ink-2">Nous vous envoyons le code exact à copier-coller (Next.js, Cloudflare Worker ou Nginx) pour corriger ce problème.</p>
        {leadError && <p role="alert" className="rounded-sm border border-stop/30 bg-stop-soft p-3 text-sm text-stop">{leadError}</p>}
        {submitted ? (
          <p className="rounded-sm border border-ok/30 bg-ok-soft p-4 text-sm text-ok">Guide envoyé. Consultez votre boîte mail.</p>
        ) : (
          <form action={handleSubmitLead} className="flex max-w-lg flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="lead-email">Adresse email</label>
            <input
              id="lead-email"
              type="email"
              name="email"
              required
              placeholder="votre@email.com"
              className="h-11 min-w-0 flex-1 rounded-sm border border-line-strong bg-surface px-3 text-sm text-ink outline-none focus-visible:border-cobalt focus-visible:ring-3 focus-visible:ring-cobalt/25"
            />
            <button
              type="submit"
              disabled={loading}
              className="h-11 rounded-sm bg-ink px-4 text-sm font-medium text-surface hover:bg-ink/88 disabled:opacity-50"
            >
              {loading ? "Envoi…" : "Recevoir le correctif"}
            </button>
          </form>
        )}
      </CardFooter>
    </Card>
  );
}
