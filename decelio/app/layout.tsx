import type { Metadata } from "next";
import Script from "next/script";
import { sans, mono } from "@/lib/fonts";
import "./globals.css";
import { cn } from "@/lib/utils";

// Applique la classe `.dark` avant le premier rendu visible, pour éviter le
// flash clair -> sombre au chargement direct d'une page de l'application
// (coque connectée). Les pages publiques et marketing ignorent ce script :
// elles restent toujours claires, quel que soit le réglage de thème de
// l'espace client (préférence stockée en `localStorage`, jamais un cookie).
// `strategy="beforeInteractive"` exige un root layout (voir doc Next.js),
// d'où sa présence ici plutôt que dans `app/(app)/layout.tsx`.
const APP_ROUTE_PREFIXES = ["/dashboard", "/alerts", "/reports", "/settings", "/onboarding", "/sources", "/sites"];
const NO_FLASH_SCRIPT = `(function(){try{var p=location.pathname;var isApp=${JSON.stringify(APP_ROUTE_PREFIXES)}.some(function(r){return p===r||p.indexOf(r+"/")===0;});if(!isApp){return;}var t=localStorage.getItem("decelio-theme");var sys=window.matchMedia("(prefers-color-scheme: dark)").matches;var dark=t==="dark"||(t!=="light"&&sys);var el=document.documentElement;el.classList.toggle("dark",dark);el.style.colorScheme=dark?"dark":"light";}catch(e){document.documentElement.classList.remove("dark");}})();`;

export const metadata: Metadata = {
  title: "Decelio | La lisibilité IA de tout votre portefeuille client",
  description: "Decelio vérifie chaque jour que les sites que vous maintenez restent lisibles par ChatGPT, Claude et Perplexity, et vous alerte avec la cause et le correctif dès qu'un site casse. Pour les agences de maintenance WordPress et les agences SEO/GEO.",
  keywords: ["lisibilité IA", "GEO", "AEO", "robots.txt", "GPTBot", "ChatGPT bot", "Claude bot", "Perplexity bot", "maintenance WordPress", "agence SEO"],
  openGraph: {
    title: "Decelio | La lisibilité IA de tout votre portefeuille client",
    description: "Un scan quotidien, une alerte avec la cause et le correctif, et un rapport mensuel à votre marque. Pour les agences de maintenance WordPress et SEO/GEO.",
  },
};

import { PostHogIdentify, PostHogPageview } from "./providers";
import { Suspense } from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={cn(sans.variable, mono.variable, "font-sans")} suppressHydrationWarning>
      <body className="antialiased min-h-screen">
        <Script id="theme-no-flash" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
        <Suspense fallback={null}>
          <PostHogPageview />
        </Suspense>
        <PostHogIdentify />
        {children}
      </body>
    </html>
  );
}
