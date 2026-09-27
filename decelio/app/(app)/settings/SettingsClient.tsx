"use client";

import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { buildAlertChannels } from "./alerts-summary";

/**
 * Coquille interactive des paramètres : navigation par ancre autour des
 * sections Abonnement, Marque blanche et Données personnelles (Server
 * Components injectés en `children`, car elles ont besoin de la session et
 * de la base). Équipe et Accès API sont hors périmètre du MVP (EF-038) :
 * elles restent de simples indications « en préparation », sans donnée
 * inventée ni bouton actif.
 */
export function SettingsClient({
  subscriptionSection,
  personalDataSection,
  whiteLabelSection,
  userName,
  userEmail,
  trialEndsAt,
}: {
  subscriptionSection: ReactNode;
  personalDataSection: ReactNode;
  whiteLabelSection: ReactNode;
  userName: string | null;
  userEmail: string | null;
  /**
   * Fin de l'essai gratuit en cours, `null` sinon (T-essai-gratuit-14-jours).
   * Pas encore affichée : réservé à l'équipe Design, posée ici en attribut
   * de données pour rester lisible sans construire d'interface.
   */
  trialEndsAt?: Date | null;
}) {
  const [activeTab, setActiveTab] = useState("abonnement");

  const alertChannels = buildAlertChannels(userEmail);

  const navItems = [
    { id: "abonnement", label: "Abonnement" },
    { id: "alertes", label: "Alertes" },
    { id: "hors-perimetre", label: "Équipe & API" },
    { id: "marque-blanche", label: "Marque blanche" },
    { id: "donnees", label: "Données personnelles" },
  ];

  const scrollToSection = (id: string) => {
    setActiveTab(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="mx-auto max-w-6xl pb-16" data-trial-ends-at={trialEndsAt ? trialEndsAt.toISOString() : undefined}>
      <div className="border-b border-line pb-8">
        <h1 className="font-display text-[28px] leading-[34px] font-semibold tracking-[-0.02em] text-ink sm:text-[34px] sm:leading-[40px]">
          Paramètres
        </h1>
        <p className="mt-3 max-w-[60ch] text-sm leading-6 text-ink-2">
          {userName
            ? `Abonnement, alertes et données du compte de ${userName}.`
            : "Abonnement, alertes et données de votre compte."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 py-8 md:grid-cols-[200px_1fr]">
        <aside className="md:sticky md:top-8 md:self-start">
          <nav className="flex flex-row gap-1 overflow-x-auto md:flex-col md:overflow-visible">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  type="button"
                  aria-current={isActive ? "true" : undefined}
                  className={
                    "min-h-11 flex items-center rounded-sm px-3 text-left text-sm whitespace-nowrap transition-colors " +
                    (isActive ? "bg-surface-2 font-medium text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink")
                  }
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-col gap-8">
          {subscriptionSection}

          {/* Alertes */}
          <section id="alertes" className="scroll-mt-8 border-b border-line pb-8">
            <h2 className="text-xl font-semibold text-ink">Alertes</h2>
            <p className="mt-1.5 mb-4.5 text-sm text-ink-2">
              Envoyées uniquement au changement de verdict, par e-mail.
            </p>

            <div className="overflow-hidden rounded-lg border border-line">
              {alertChannels.map((channel, index) => (
                <div
                  key={channel.id}
                  className={
                    "flex flex-wrap items-center gap-3.5 p-3.5 sm:px-5" +
                    (index < alertChannels.length - 1 ? " border-b border-line" : "")
                  }
                >
                  <div className="min-w-[220px] flex-1">
                    <div className="text-sm font-semibold text-ink">{channel.label}</div>
                    <div className="type-caption text-ink-2">{channel.detail}</div>
                  </div>
                  {!channel.available && <Badge variant="outline">En préparation</Badge>}
                </div>
              ))}
            </div>
          </section>

          {/* Équipe & Accès API : hors périmètre MVP (EF-038) */}
          <section id="hors-perimetre" className="scroll-mt-8 border-b border-line pb-8">
            <div className="mb-1.5 flex items-center gap-2">
              <h2 className="text-xl font-semibold text-ink">Équipe & Accès API</h2>
              <Badge variant="outline">En préparation</Badge>
            </div>
            <p className="text-sm text-ink-2">
              Un seul compte par agence pour le moment. L&apos;invitation de membres et l&apos;accès API arrivent
              après le lancement.
            </p>
          </section>

          {whiteLabelSection}

          {personalDataSection}
        </div>
      </div>
    </div>
  );
}
