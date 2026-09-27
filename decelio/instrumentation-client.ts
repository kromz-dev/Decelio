import posthog from "posthog-js";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

// PostHog est optionnel (voir .env.example) : sans configuration, on
// prévient en développement au lieu de faire planter toute l'application.
// Ce fichier ne s'exécute que dans le navigateur (convention Next.js 16,
// avant l'hydratation) : pas de garde `typeof window` nécessaire ici.
if (process.env.NODE_ENV === "development" && (!projectToken || !host)) {
  console.warn(
    "PostHog désactivé : NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN et NEXT_PUBLIC_POSTHOG_HOST sont requis pour envoyer des événements.",
  );
}

if (projectToken && host) {
  posthog.init(projectToken, {
    // Proxy inverse sur notre propre domaine (`app/ingest/[...path]/
    // route.ts`) : le navigateur du visiteur n'appelle jamais
    // `eu.i.posthog.com` ni `eu-assets.i.posthog.com` directement, donc son
    // IP ne part vers aucun tiers (règle « pas d'appel tiers depuis une page
    // publique »). Le relais serveur retire lui-même `x-forwarded-for`,
    // `x-real-ip` et `cf-connecting-ip` avant de transmettre à PostHog.
    api_host: "/ingest",
    // `ui_host` sert uniquement les liens de la barre d'outils PostHog
    // (Toolbar) affichés dans le tableau de bord PostHog lui-même — jamais
    // chargé ni appelé depuis le navigateur d'un visiteur du site public.
    ui_host: "https://eu.posthog.com",
    defaults: "2026-01-30",
    // ADR-001 : aucun cookie ni localStorage, donc pas de traceur soumis à
    // consentement (règle « pas de cookie » de T006 sur les pages
    // marketing). L'identifiant ne vit que le temps de la page.
    persistence: "memory",
    // PostHog affiche un warning si on utilise 'memory' sans fournir d'ID.
    // On génère un ID unique par chargement de page pour le faire taire.
    bootstrap: {
      distinctID: typeof crypto !== "undefined" ? crypto.randomUUID() : "anonymous",
    },
    // Pas de profil de personne pour les visiteurs anonymes.
    person_profiles: "identified_only",
    capture_exceptions: true,
    capture_pageview: false,
    capture_pageleave: true,
    // Choix délibéré pour le palier gratuit PostHog Cloud UE (ADR-001,
    // docs/10-plan-technique.md §5) : 1 M d'événements analytiques et
    // 5 000 enregistrements de session par mois. L'autocapture de chaque
    // clic/saisie sur les pages marketing publiques épuiserait le quota
    // d'événements pour une valeur produit faible ; la mesure produit passe
    // uniquement par les `posthog.capture(...)` explicites déjà posés dans
    // le code (ex. "scan_completed", "onboarding_scan_started",
    // "lead_submitted", "user_logged_in", "audit_completed").
    autocapture: false,
    capture_dead_clicks: false,
    // L'enregistrement de session n'est jamais activé, quel que soit le
    // réglage du projet PostHog : à 5 000 sessions/mois, le palier gratuit
    // se viderait en quelques jours de trafic public, sans apporter
    // d'information que les événements explicites ne donnent déjà.
    disable_session_recording: true,
    debug: process.env.NODE_ENV === "development",
  });
}
