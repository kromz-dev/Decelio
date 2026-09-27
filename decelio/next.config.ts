import type { NextConfig } from "next";
import { getSecurityHeaders } from "./lib/security-headers";

const nextConfig: NextConfig = {
  // Le SDK PostHog (`posthog-js`) appelle certains chemins avec une barre
  // oblique finale (ex. `/decide/`, `/flags/`) : sans ce réglage, Next.js
  // redirigerait ces requêtes avant qu'elles n'atteignent notre proxy
  // `/ingest/[...path]` (`app/ingest/[...path]/route.ts`), qui relaie vers
  // PostHog Cloud UE sans transmettre l'IP réelle du visiteur (voir sa
  // documentation). Recommandation officielle de PostHog pour son proxy
  // Next.js (https://posthog.com/docs/advanced/proxy/nextjs).
  skipTrailingSlashRedirect: true,
  async headers() {
    return [
      {
        // Toutes les routes : pages, assets, routes API.
        source: "/(.*)",
        headers: getSecurityHeaders(process.env.NODE_ENV === "production"),
      },
    ];
  },
};

export default nextConfig;
