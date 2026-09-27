import type { PlatformDetection } from "@/lib/scanner/platform";
import { PLATFORM_CAVEAT, describePlatform } from "./platformLabel";

/**
 * « Plateforme détectée : WordPress, Yoast SEO, derrière Cloudflare (d'après
 * les indices de la page) ». N'affiche rien si la plateforme est inconnue ou
 * absente. Utilisé par le résultat du scan public et, une fois la prop
 * branchée par l'Ingénierie, par la fiche d'un site (/sites/[siteId]).
 */
export function PlatformLine({ platform, className = "type-caption text-ink-2" }: { platform?: PlatformDetection; className?: string }) {
  const label = describePlatform(platform);
  if (!label) return null;
  return (
    <p className={className}>
      <span className="font-medium text-ink">Plateforme d&eacute;tect&eacute;e&nbsp;: </span>
      {label} ({PLATFORM_CAVEAT})
    </p>
  );
}
