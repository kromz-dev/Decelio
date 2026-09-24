import type { Metadata } from "next";
import { sans, mono } from "@/lib/fonts";
import "./globals.css";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Cited | La lisibilité IA de tout votre portefeuille client",
  description: "Cited vérifie chaque jour que les sites que vous maintenez restent lisibles par ChatGPT, Claude et Perplexity, et vous alerte avec la cause et le correctif dès qu'un site casse. Pour les agences de maintenance WordPress et les agences SEO/GEO.",
  keywords: ["lisibilité IA", "GEO", "AEO", "robots.txt", "GPTBot", "ChatGPT bot", "Claude bot", "Perplexity bot", "maintenance WordPress", "agence SEO"],
  openGraph: {
    title: "Cited | La lisibilité IA de tout votre portefeuille client",
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
    <html lang="fr" className={cn(sans.variable, mono.variable, "font-sans")}>
      <body className="antialiased min-h-screen">
        <Suspense fallback={null}>
          <PostHogPageview />
        </Suspense>
        <PostHogIdentify />
        {children}
      </body>
    </html>
  );
}
