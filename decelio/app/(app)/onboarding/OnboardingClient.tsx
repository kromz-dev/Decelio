"use client";

import { useState, useTransition, ChangeEvent, useRef } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wordmark } from "@/components/home/SiteChrome";
import { Loader2 } from "lucide-react";
import { buildAlertChannels } from "@/app/(app)/settings/alerts-summary";
import { importOnboardingDomains } from "./actions";
import posthog from "posthog-js";

/**
 * Étapes « Ajouter les domaines » et « Choisir les alertes » de l'onboarding.
 *
 * Rendues quand `shouldSkipPlanStep` (voir `onboarding-plan.ts`) dit que le
 * compte a déjà un abonnement actif — sinon `page.tsx` affiche
 * `OnboardingPlanStep` à la place.
 *
 * L'ajout de domaines appelle réellement `importOnboardingDomains` (T043,
 * EF-061/EF-062) : création via `addMonitoredSitesBulk` (dé-duplication,
 * garde SSRF, quota) puis déclenchement de l'événement Inngest de premier
 * scan pour chaque site créé. Le résultat affiché (sites ajoutés, lignes
 * ignorées et leur raison, scan démarré ou en attente) reflète toujours ce
 * que l'action serveur a réellement fait — jamais un état simulé (principe
 * II de la constitution). Les canaux d'alerte viennent de
 * `buildAlertChannels` (même source que la page Paramètres, EF-038) : seul
 * l'e-mail est réellement actif, Slack et le webhook restent des mentions
 * « en préparation » non interactives.
 */
type ImportOutcome =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "success";
      createdCount: number;
      skipped: { line: string; reason: string }[];
      scanTriggered: boolean;
    };
export function OnboardingClient({
  userEmail,
  maxSites,
}: {
  userEmail: string | null;
  /** Quota réel du palier de l'utilisateur (PLAN_LIMITS), jamais une valeur figée. */
  maxSites: number;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [domainsText, setDomainsText] = useState("");
  const [recapSchedule, setRecapSchedule] = useState("Lundi matin");
  const [threshold, setThreshold] = useState("200 car.");

  const [isPending, startTransition] = useTransition();
  const [outcome, setOutcome] = useState<ImportOutcome>({ status: "idle" });

  const alertChannels = buildAlertChannels(userEmail);

  // Compute number of non-empty domain lines
  const domainsList = domainsText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const domainCount = domainsList.length;

  const handleCsvUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const lines = content
          .split(/[\r\n]+/)
          .map((l) => l.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
          .filter(
            (l) =>
              l.length > 0 &&
              !l.toLowerCase().startsWith("url") &&
              !l.toLowerCase().startsWith("domaine")
          );

        if (lines.length > 0) {
          setDomainsText(lines.slice(0, maxSites).join("\n"));
        }
      }
    };
    reader.readAsText(file);
  };

  const handleStartScan = () => {
    posthog.capture("onboarding_scan_started", { domain_count: domainCount });
    startTransition(async () => {
      const result = await importOnboardingDomains(domainsText);

      if ("error" in result) {
        posthog.capture("onboarding_scan_failed", { reason: result.error });
        setOutcome({ status: "error", message: result.error });
        return;
      }

      posthog.capture("onboarding_scan_completed", {
        created_count: result.data.created.length,
        skipped_count: result.data.skipped.length,
        scan_triggered: result.data.scanTriggered,
      });
      setOutcome({
        status: "success",
        createdCount: result.data.created.length,
        skipped: result.data.skipped,
        scanTriggered: result.data.scanTriggered,
      });
    });
  };

  return (
    <div className="-m-6 flex min-h-screen flex-col bg-paper text-ink md:-m-10">
      <header className="bg-ink text-paper">
        <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between px-6 py-3.5">
          <Link href="/" aria-label="Decelio, accueil" className="mr-auto inline-flex items-center">
            <Wordmark light />
          </Link>
          <span className="type-caption font-medium opacity-70">Étapes 2 et 3 sur 3</span>
        </div>
      </header>

      <div className="flex h-1.5 bg-ink/15">
        <span className="flex-[2] bg-cobalt" />
        <span className="flex-1" />
      </div>

      <main className="grid flex-1 grid-cols-1 lg:grid-cols-2">
        {/* Étape 2 · Ajouter les domaines */}
        <div className="flex justify-center border-b border-line bg-paper p-6 sm:p-12 lg:border-r lg:border-b-0">
          <div className="w-full max-w-[460px]">
            <p className="mb-2.5 text-sm font-medium text-ink-2">Étape 2 · Ajouter les domaines</p>
            <h1 className="font-display mb-2.5 text-[28px] leading-[1.1] font-semibold tracking-[-0.02em] text-ink sm:text-[32px]">
              Collez votre portefeuille, un domaine par ligne
            </h1>
            <p className="mb-[22px] text-sm leading-6 text-ink-2">
              Le premier scan démarre dès la validation. Comptez une minute pour vingt domaines.
            </p>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="o-doms" className="text-sm font-medium text-ink">
                Domaines
              </label>
              <textarea
                id="o-doms"
                rows={8}
                value={domainsText}
                onChange={(e) => setDomainsText(e.target.value)}
                className="w-full rounded-sm border border-line-strong bg-surface p-3 font-mono text-[13px] leading-[1.8] text-ink outline-none transition-colors focus-visible:border-cobalt focus-visible:ring-3 focus-visible:ring-cobalt/25"
                placeholder="exemple.com"
                aria-invalid={outcome.status === "error" ? true : undefined}
                aria-describedby={outcome.status === "error" ? "onboarding-import-error" : undefined}
              />
              <p className="type-caption text-ink-2">Un domaine par ligne, sans http(s)://.</p>
            </div>

            <div className="mt-3.5 flex items-center justify-between border-t border-line pt-3.5 text-sm text-ink-2">
              <span>{domainCount} domaines sur {maxSites} inclus dans votre palier</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="font-medium text-cobalt hover:underline"
              >
                Importer un CSV
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={handleCsvUpload}
              />
            </div>

            <div className="mt-[22px] flex flex-wrap gap-2.5">
              <Button
                type="button"
                size="lg"
                onClick={handleStartScan}
                disabled={isPending || domainCount === 0}
                className="flex-[1_1_200px]"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Import en cours…
                  </>
                ) : (
                  "Lancer le premier scan"
                )}
              </Button>
              <Link href="/register" className="inline-flex min-h-12 items-center justify-center rounded-sm border border-line-strong px-6 text-sm font-medium text-ink transition-colors hover:bg-surface-2">
                Retour
              </Link>
            </div>

            {outcome.status === "error" && (
              <div
                id="onboarding-import-error"
                role="alert"
                className="mt-3.5 rounded-sm border border-stop/30 bg-stop-soft p-3 text-sm text-stop"
              >
                <p className="font-medium">L&apos;import a échoué, aucun site n&apos;a été ajouté.</p>
                <p className="mt-1">{outcome.message}</p>
              </div>
            )}

            {outcome.status === "success" && (
              <div className="mt-3.5 rounded-sm border border-line bg-surface p-3.5 text-sm text-ink">
                <p className="font-medium">
                  {outcome.createdCount > 0
                    ? `${outcome.createdCount} site${outcome.createdCount > 1 ? "s" : ""} ajouté${outcome.createdCount > 1 ? "s" : ""} à votre portefeuille.`
                    : "Aucun site n'a été ajouté."}
                </p>
                {outcome.createdCount > 0 && (
                  <p className="mt-1 text-ink-2">
                    {outcome.scanTriggered
                      ? "Le premier scan a démarré."
                      : "Le premier scan n'a pas pu démarrer tout de suite ; il reste en attente et se lancera dès que possible."}
                  </p>
                )}
                {outcome.skipped.length > 0 && (
                  <div className="mt-2.5 border-t border-line pt-2.5">
                    <p className="text-ink-2">
                      {outcome.skipped.length} ligne{outcome.skipped.length > 1 ? "s" : ""} ignorée
                      {outcome.skipped.length > 1 ? "s" : ""} :
                    </p>
                    <ul className="mt-1.5 max-h-40 space-y-1 overflow-y-auto font-mono text-[12px] leading-[1.6] text-ink-2">
                      {outcome.skipped.map((row, index) => (
                        <li key={`${row.line}-${index}`}>
                          <span className="text-ink">{row.line}</span> : {row.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Étape 3 · Choisir les alertes */}
        <div className="flex justify-center bg-surface-2 p-6 sm:p-12">
          <div className="w-full max-w-[460px]">
            <p className="mb-2.5 text-sm font-medium text-ink-2">Étape 3 · Choisir les alertes</p>
            <h2 className="font-display mb-2.5 text-[28px] leading-[1.1] font-semibold tracking-[-0.02em] text-ink sm:text-[32px]">
              Qui est prévenu quand un site passe au rouge
            </h2>
            <p className="mb-[22px] text-sm leading-6 text-ink-2">
              Une alerte part au changement de verdict, jamais à chaque scan, par e-mail.
            </p>

            <div className="overflow-hidden rounded-lg border border-line bg-surface">
              {alertChannels.map((channel, index) => (
                <div
                  key={channel.id}
                  className={
                    "flex flex-wrap items-center gap-3.5 p-4 sm:px-4.5 sm:py-4" +
                    (index < alertChannels.length - 1 ? " border-b border-line" : "") +
                    (channel.available ? "" : " opacity-60")
                  }
                >
                  <div className="min-w-[220px] flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink">{channel.label}</span>
                      {!channel.available && <Badge variant="outline">En préparation</Badge>}
                    </div>
                    <div className="type-caption text-ink-2">{channel.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Récapitulatif hebdomadaire */}
            <div className="mt-[22px]">
              <p className="mb-1.5 text-sm font-medium text-ink">Récapitulatif hebdomadaire</p>
              <div className="flex flex-wrap gap-2">
                {["Lundi matin", "Vendredi", "Aucun"].map((opt) => (
                  <Button
                    key={opt}
                    type="button"
                    size="lg"
                    variant={recapSchedule === opt ? "default" : "outline"}
                    onClick={() => setRecapSchedule(opt)}
                  >
                    {opt}
                  </Button>
                ))}
              </div>
            </div>

            {/* Seuil de coquille vide */}
            <div className="mt-[18px]">
              <p className="mb-1.5 text-sm font-medium text-ink">Seuil de coquille vide</p>
              <div className="flex flex-wrap gap-2">
                {["100 car.", "200 car.", "500 car."].map((opt) => (
                  <Button
                    key={opt}
                    type="button"
                    size="lg"
                    variant={threshold === opt ? "default" : "outline"}
                    onClick={() => setThreshold(opt)}
                  >
                    {opt}
                  </Button>
                ))}
              </div>
              <p className="mt-1.5 type-caption text-ink-2">
                En dessous de ce volume de texte utile, le verdict passe au rouge.
              </p>
            </div>

            <Link
              href="/dashboard"
              className={buttonVariants({ variant: "default", size: "lg", className: "mt-6 w-full" })}
            >
              Terminer et voir le tableau de bord
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
