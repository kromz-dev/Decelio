"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Verdict, type VerdictValue } from "@/components/ui/verdict";

export interface AlertRow {
  id: string;
  siteId: string;
  domain: string;
  type: "REGRESSION" | "RESOLUTION";
  cause: string;
  sentAt: string;
}

const filters = [
  { id: "all", label: "Tout" },
  { id: "REGRESSION", label: "Passages au rouge" },
  { id: "RESOLUTION", label: "Retours au vert" },
] as const;

function verdictFor(type: AlertRow["type"]): VerdictValue {
  return type === "REGRESSION" ? "refuse" : "lu";
}

export function AlertsJournal({ alerts }: { alerts: AlertRow[] }) {
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const visible = alerts.filter((item) => filter === "all" || item.type === filter);

  return (
    <div className="mx-auto max-w-6xl pb-16">
      <div className="border-b border-line pb-8">
        <h1 className="font-display text-[28px] leading-[34px] font-semibold tracking-[-0.02em] text-ink sm:text-[34px] sm:leading-[40px]">
          Journal des changements de verdict
        </h1>
        <p className="mt-3 max-w-[60ch] text-sm leading-6 text-ink-2">
          Une alerte est créée lorsqu&apos;un domaine change d&apos;état, jamais à chaque scan. Un seul e-mail
          part par compte à chaque passage.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 py-6">
        {filters.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="lg"
            variant={filter === item.id ? "default" : "outline"}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </Button>
        ))}
        <span className="type-table text-ink-2">{alerts.length} alertes sur les 30 derniers jours</span>
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        {visible.length > 0 ? (
          <div className="divide-y divide-line">
            {visible.map((alert) => (
              <div key={alert.id} className="flex flex-wrap items-center gap-4 p-5 md:px-6">
                <Verdict value={verdictFor(alert.type)} variant="glyph" size="lg" />
                <div className="min-w-[280px] flex-1">
                  <div className="text-[15px] leading-5 font-semibold text-ink">{alert.domain}</div>
                  <div className="mt-1 text-[13px] leading-5 text-ink-2">{alert.cause}</div>
                </div>
                <span className="type-table min-w-[130px] text-ink-2 tnum">
                  {new Date(alert.sentAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                </span>
                <Link
                  href={`/sites/${alert.siteId}`}
                  className="type-table font-medium text-ink underline-offset-4 hover:text-cobalt hover:underline"
                >
                  Détail
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-ink">Aucune alerte pour ce filtre.</p>
            <p className="mt-1 text-sm text-ink-2">Les changements de lisibilité apparaîtront ici après un scan.</p>
          </div>
        )}
      </div>
    </div>
  );
}
