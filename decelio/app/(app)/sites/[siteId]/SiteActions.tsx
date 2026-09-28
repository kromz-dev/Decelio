"use client";

import { useState, useTransition } from "react";
import { launchAuditCampaign } from "./actions";
import { Loader2, RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteActions({ siteId }: { siteId: string }) {
  const [isPending, startTransition] = useTransition();
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackIsError, setFeedbackIsError] = useState(false);

  const handleRescan = () => {
    setFeedbackMessage(null);
    setFeedbackIsError(false);
    startTransition(async () => {
      try {
        await launchAuditCampaign(siteId);
        // Le scan est asynchrone (Inngest) : il est lancé, pas terminé.
        // Annoncer un résultat ici serait faux (constitution, article I).
        setFeedbackIsError(false);
        setFeedbackMessage("Scan lancé. Le résultat apparaîtra dans quelques instants.");
        setTimeout(() => setFeedbackMessage(null), 4000);
      } catch (error) {
        // Échec réel : on le dit, avec la cause quand elle est connue.
        // Ne jamais afficher un succès simulé (constitution, article I).
        setFeedbackIsError(true);
        setFeedbackMessage(
          error instanceof Error
            ? `Échec de la relance du scan : ${error.message}`
            : "Échec de la relance du scan.",
        );
        // Le message d'erreur reste affiché : l'utilisateur doit pouvoir le lire.
      }
    });
  };

  const handleExport = () => {
    window.print();
  };

  return (
    <div className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center">
      {feedbackMessage && (
        <span
          role={feedbackIsError ? "alert" : "status"}
          className={
            feedbackIsError
              ? "animate-fade-in rounded-sm border border-stop/30 bg-stop-soft px-2.5 py-1.5 text-sm font-medium text-stop"
              : "animate-fade-in rounded-sm border border-ok/30 bg-ok-soft px-2.5 py-1.5 text-sm font-medium text-ok"
          }
        >
          {feedbackMessage}
        </span>
      )}
      <Button variant="outline" size="lg" onClick={handleRescan} disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Scan en cours
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" data-icon="inline-start" />
            Relancer un scan
          </>
        )}
      </Button>

      <Button size="lg" onClick={handleExport}>
        <Download className="h-4 w-4" data-icon="inline-start" />
        Exporter le rapport
      </Button>
    </div>
  );
}
