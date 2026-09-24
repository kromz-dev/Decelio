"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
export type { AuditData as AuditResult } from "@/components/CoverageGrid";

interface AuditFormProps {
  onAuditComplete: (data: import("./CoverageGrid").AuditData) => void;
  initialDomain?: string;
}

export function AuditForm({ onAuditComplete, initialDomain = "" }: AuditFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: formData.get("domain") }),
      });
      if (!res.ok) throw new Error("Impossible de scanner ce domaine. Vérifiez l'adresse et réessayez.");
      onAuditComplete(await res.json());
      posthog.capture("audit_completed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Le scan a échoué. Réessayez dans un instant.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mx-auto max-w-xl shadow-float">
      <CardContent className="p-6 sm:p-8">
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <h2 className="text-[22px] leading-7 font-semibold text-ink">Vérifiez la lisibilité de votre site</h2>
            <p className="mt-2 text-sm leading-6 text-ink-2">
              Saisissez l&apos;adresse de votre site pour simuler la visite de ChatGPT et Claude.
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="domain">
                Adresse de votre site
              </label>
              <Input
                defaultValue={initialDomain}
                required
                type="text"
                id="domain"
                name="domain"
                fieldSize="lg"
                placeholder="https://mon-site.com"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "domain-error" : undefined}
              />
            </div>
            {error && (
              <p id="domain-error" role="alert" className="rounded-sm border border-stop/30 bg-stop-soft p-3 text-sm text-stop">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" disabled={loading} className="mt-4 w-full">
              {loading ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Analyse en cours
                </>
              ) : (
                "Lancer le scan"
              )}
            </Button>
            <p className="mt-4 text-center type-caption text-ink-2">Résultat en 15 secondes, sans compte à créer.</p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
