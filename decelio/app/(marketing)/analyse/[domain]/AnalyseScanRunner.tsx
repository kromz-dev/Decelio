"use client";

import * as React from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScanResultPanel, type ScanApiResponse } from "@/components/scan/ScanResultPanel";
import { domainToScanUrl } from "@/lib/scanner/domain";

/**
 * Page de résultat partageable (T049, décision §14.3 du PRD) : aucun résultat
 * n'est stocké pour un domaine anonyme (voir `prisma/schema.prisma` —
 * `ScanResult` est rattaché à un `Site` authentifié, pas à un domaine public
 * anonyme). Plutôt qu'afficher un exemple inventé, la page propose de lancer
 * le diagnostic réel pour ce domaine via `/api/scan` — la même route, avec
 * les mêmes vérifications SSRF et la même limite de débit que `ScanForm`.
 *
 * Déclenché par un clic (et non automatiquement au chargement) : un lien
 * partagé peut être ouvert plusieurs fois sans consommer à chaque fois la
 * limite de débit de `/api/scan`, et l'écran garde une seule action
 * principale (voir docs/07-design-system.md, principe 1).
 */
export function AnalyseScanRunner({ domain }: { domain: string }) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [result, setResult] = React.useState<ScanApiResponse | null>(null);
  const submittedUrl = domainToScanUrl(domain);

  const abortControllerRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  async function runScan() {
    setLoading(true);
    setError("");

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: submittedUrl }),
        signal: abortControllerRef.current.signal,
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Réponse inattendue du serveur.");
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Impossible de scanner ce domaine.");
      }

      setResult(data as ScanApiResponse);
      posthog.capture("scan_completed", { source: "analyse_domain_page" });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setResult(null);
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="flex w-full flex-col items-center">
        <ScanResultPanel data={result} submittedUrl={submittedUrl} />
        <div className="mt-6 flex flex-col items-center gap-2">
          <Button type="button" variant="outline" onClick={runScan} disabled={loading}>
            {loading ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Nouveau diagnostic…
              </>
            ) : (
              "Relancer le diagnostic"
            )}
          </Button>
          <Link href="/" className="text-sm font-medium text-cobalt hover:underline">
            Scanner un autre site
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <Button type="button" size="lg" onClick={runScan} disabled={loading}>
        {loading ? (
          <>
            <LoaderCircle className="animate-spin" aria-hidden />
            Analyse…
          </>
        ) : (
          `Lancer le diagnostic pour ${domain}`
        )}
      </Button>
      <p className="type-caption text-ink-2">Gratuit et sans compte.</p>

      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-stop">
          {error}
        </p>
      )}
    </div>
  );
}
