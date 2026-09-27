import { NextResponse } from "next/server";

// Route de santé pour le pinger Render (T003) et le health check du service.
//
// Elle ne doit JAMAIS toucher la base ni appeler un service externe : sinon
// Neon ne se met jamais en veille (§8 de docs/10-plan-technique.md — un ping
// toutes les 10-14 min qui interrogerait la base consommerait 720 h x 0,25 CU
// = 180 CU-h/mois, au-delà des 100 CU-h gratuites de Neon). Ne pas importer
// `@/lib/db` dans ce fichier.
export const dynamic = "force-dynamic";

export async function GET() {
  // PostHog remplace Sentry (ADR-001) : c'est notre seul canal de remontée
  // d'erreurs en production (voir lib/posthog-server.ts). Sans jeton ni hôte
  // valides, ce client se désactive silencieusement et ne prévient qu'en
  // développement — en production, plus aucune erreur ne remonte, sans le
  // moindre signal. On expose donc ici un simple booléen de présence des
  // deux variables d'environnement requises, jamais le jeton lui-même, un
  // fragment ou sa longueur : seule sa présence importe pour la supervision.
  const posthogConfigured = Boolean(
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST,
  );

  return NextResponse.json({ status: "ok", posthogConfigured }, { status: 200 });
}
