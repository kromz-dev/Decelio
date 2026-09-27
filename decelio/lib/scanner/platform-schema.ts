import { z } from "zod";

// `PlatformId`, `SeoPluginId`, `FirewallId`, `HostId` (`lib/scanner/platform.ts`)
// sont tous des mots courts : cette borne n'a pas besoin de dupliquer la liste
// exacte pour rester utile.
const MAX_PLATFORM_KEY_LENGTH = 50;

// `platform.signals` porte un signal par détection (ou contradiction) : voir
// `lib/scanner/platform.ts`, qui n'en produit qu'une poignée par site
// (au plus une dizaine avec les candidats CMS/SEO/pare-feu/hébergeur
// actuels).
const MAX_PLATFORM_SIGNALS = 30;
const MAX_PLATFORM_SIGNAL_LENGTH = 300;

// Validation volontairement limitée aux champs consommés en aval, en laissant
// passer le reste (`passthrough`) : le but est de borner l'abus / les
// journaux corrompus, pas de dupliquer ici toute la forme de `PlatformDetection`
// (`lib/scanner/platform.ts`), qui évoluerait alors à deux endroits. Partagé
// entre `app/api/pdf/diagnostic/route.ts` (entrée client, non fiable) et
// `lib/sites/latest-platform.ts` (relecture d'un `ScanLog.payload` déjà écrit
// par notre propre scanner).
export const platformSchema = z
  .object({
    cms: z.string().max(MAX_PLATFORM_KEY_LENGTH),
    seoPlugin: z.string().max(MAX_PLATFORM_KEY_LENGTH).optional(),
    firewall: z.string().max(MAX_PLATFORM_KEY_LENGTH).optional(),
    host: z.string().max(MAX_PLATFORM_KEY_LENGTH).optional(),
    signals: z.array(z.string().max(MAX_PLATFORM_SIGNAL_LENGTH)).max(MAX_PLATFORM_SIGNALS).optional(),
  })
  .passthrough();
