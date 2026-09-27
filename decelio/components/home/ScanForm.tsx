"use client";

import * as React from "react";
import { LoaderCircle } from "lucide-react";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScanResultPanel, type ScanApiResponse } from "@/components/scan/ScanResultPanel";

export function ScanForm() {
  const [url, setUrl] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [result, setResult] = React.useState<ScanApiResponse | null>(null);
  const [submittedUrl, setSubmittedUrl] = React.useState("");

  const abortControllerRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    setResult(null);

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
        signal: abortControllerRef.current.signal,
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Réponse inattendue du serveur.");
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Impossible de scanner ce domaine. Vérifiez l'URL.");
      }

      setSubmittedUrl(trimmed);
      setResult(data as ScanApiResponse);
      posthog.capture("scan_completed");
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full flex-col items-start">
      <form onSubmit={handleSubmit} className="flex w-full max-w-[520px] flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <label htmlFor="scan-url" className="sr-only">
            URL du site à scanner
          </label>
          <Input
            id="scan-url"
            type="url"
            fieldSize="lg"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://votre-site.com"
            required
            disabled={loading}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "scan-error" : undefined}
            className="rounded-full px-5"
          />
        </div>
        <Button type="submit" size="lg" disabled={loading || !url.trim()} className="w-full sm:w-auto rounded-full px-8 font-semibold">
          {loading ? (
            <>
              <LoaderCircle className="animate-spin" aria-hidden />
              Analyse…
            </>
          ) : (
            "Scanner"
          )}
        </Button>
      </form>

      <p className="mt-2 type-caption text-ink-2">Gratuit, sans compte, résultat en 15 secondes.</p>

      {error && (
        <p id="scan-error" role="alert" className="mt-3 text-sm font-medium text-stop">
          {error}
        </p>
      )}

      {result && <ScanResultPanel data={result} submittedUrl={submittedUrl} />}
    </div>
  );
}
