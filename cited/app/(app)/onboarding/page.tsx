"use client";

import { useState, useTransition, ChangeEvent, useRef } from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialDomains = `client-vitrine.bubbleapps.io
atelier-boreal.fr
maison-verdier.com
studio-lami.fr
cabinet-nore.fr
librairie-pas.fr`;

  const [domainsText, setDomainsText] = useState(initialDomains);
  const [recapSchedule, setRecapSchedule] = useState("Lundi matin");
  const [threshold, setThreshold] = useState("200 car.");

  // Alert channels — only e-mail is wired up today
  const [emailActive, setEmailActive] = useState(true);

  const [isPending, startTransition] = useTransition();
  const [isScanning, setIsScanning] = useState(false);

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
          setDomainsText(lines.slice(0, 20).join("\n"));
        }
      }
    };
    reader.readAsText(file);
  };

  const handleStartScan = () => {
    posthog.capture("onboarding_scan_started", { domain_count: domainCount });
    setIsScanning(true);
    startTransition(async () => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      router.push("/dashboard");
    });
  };

  return (
    <div className="-m-6 flex min-h-screen flex-col bg-paper text-ink md:-m-10">
      <header className="bg-ink text-paper">
        <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between px-6 py-3.5">
          <Link href="/" className="mr-auto inline-flex items-center text-[19px] font-semibold tracking-tight">
            Cited<span className="text-cobalt">.</span>
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
            <h1 className="mb-2.5 text-[28px] leading-[1.1] font-semibold tracking-[-0.02em] text-ink sm:text-[32px]">
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
              />
              <p className="type-caption text-ink-2">Liste d&apos;exemple pré-remplie ; remplacez-la par vos domaines.</p>
            </div>

            <div className="mt-3.5 flex items-center justify-between border-t border-line pt-3.5 text-sm text-ink-2">
              <span>{domainCount} domaines sur 20 utilisés</span>
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
                disabled={isPending || isScanning}
                className="flex-[1_1_200px]"
              >
                {isPending || isScanning ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Scan en cours…
                  </>
                ) : (
                  "Lancer le premier scan"
                )}
              </Button>
              <Link href="/register" className="inline-flex min-h-12 items-center justify-center rounded-sm border border-line-strong px-6 text-sm font-medium text-ink transition-colors hover:bg-surface-2">
                Retour
              </Link>
            </div>
          </div>
        </div>

        {/* Étape 3 · Choisir les alertes */}
        <div className="flex justify-center bg-surface-2 p-6 sm:p-12">
          <div className="w-full max-w-[460px]">
            <p className="mb-2.5 text-sm font-medium text-ink-2">Étape 3 · Choisir les alertes</p>
            <h2 className="mb-2.5 text-[28px] leading-[1.1] font-semibold tracking-[-0.02em] text-ink sm:text-[32px]">
              Qui est prévenu quand un site passe au rouge
            </h2>
            <p className="mb-[22px] text-sm leading-6 text-ink-2">
              Une alerte part au changement de verdict, jamais à chaque scan. Les alertes partent par e-mail.
            </p>

            <div className="overflow-hidden rounded-lg border border-line bg-surface">
              <button
                type="button"
                onClick={() => setEmailActive(!emailActive)}
                className="flex w-full items-start gap-3 border-b border-line p-4 text-left transition-colors hover:bg-surface-2 sm:px-4.5 sm:py-4"
              >
                <span
                  className={
                    "mt-0.5 size-4 shrink-0 rounded-[5px] border-2 transition-colors " +
                    (emailActive ? "border-cobalt bg-cobalt" : "border-line-strong bg-transparent")
                  }
                  aria-hidden="true"
                />
                <span>
                  <span className="block text-sm font-semibold text-ink">E-mail</span>
                  <span className="block text-[13px] text-ink-2">laura@atelier-boreal.fr</span>
                </span>
              </button>

              <div className="flex items-start gap-3 border-b border-line p-4 opacity-60 sm:px-4.5 sm:py-4">
                <span className="mt-0.5 size-4 shrink-0 rounded-[5px] border-2 border-line-strong" aria-hidden="true" />
                <span className="flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink">Slack</span>
                    <Badge variant="outline">En préparation</Badge>
                  </span>
                  <span className="block text-[13px] text-ink-2">Pas encore proposé</span>
                </span>
              </div>

              <div className="flex items-start gap-3 p-4 opacity-60 sm:px-4.5 sm:py-4">
                <span className="mt-0.5 size-4 shrink-0 rounded-[5px] border-2 border-line-strong" aria-hidden="true" />
                <span className="flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink">Webhook</span>
                    <Badge variant="outline">En préparation</Badge>
                  </span>
                  <span className="block text-[13px] text-ink-2">Pas encore proposé</span>
                </span>
              </div>
            </div>

            {/* Récapitulatif hebdomadaire */}
            <div className="mt-[22px]">
              <p className="mb-1.5 text-sm font-medium text-ink">Récapitulatif hebdomadaire</p>
              <div className="flex flex-wrap gap-2">
                {["Lundi matin", "Vendredi", "Aucun"].map((opt) => (
                  <Button
                    key={opt}
                    type="button"
                    size="sm"
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
                    size="sm"
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
              className="mt-6 flex min-h-12 w-full items-center justify-center rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-ink/88"
            >
              Terminer et voir le tableau de bord
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
