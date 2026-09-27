import { NextResponse } from "next/server";
import { z } from "zod";
import { generateDiagnosticPdfBuffer } from "@/lib/reports/renderDiagnosticPdf";
import { callerKey, rateLimit } from "@/lib/rate-limit";
import type { ScanReport, ScanCoreResult } from "@/lib/scanner/core";

// Le rendu PDF (@react-pdf/renderer) est coûteux en CPU, et cette route est
// publique, sans compte. Sans limite, un script peut la boucler avec un corps
// fabriqué et saturer le processus Next.js persistant qui sert tout le site.
// Plus permissif que /api/scan (3/min) car un visiteur télécharge légitimement
// son diagnostic après chaque scan, mais borné.
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 5;

// `results` porte un élément par robot analysé : 11 robots sont déclarés dans
// `lib/scanner/agents.ts`, la marge couvre un ajout futur sans rouvrir ce
// fichier. Sans cette borne, `results.map(...)` dans le rendu était illimité.
const MAX_RESULTS = 20;
const MAX_REASONS = 20;

// `platform.signals` porte un signal par détection (ou contradiction) : voir
// `lib/scanner/platform.ts`, qui n'en produit qu'une poignée par site
// (au plus une dizaine avec les candidats CMS/SEO/pare-feu/hébergeur
// actuels). Sans borne, ce tableau — fourni par le client, comme tout le
// reste de `report` — était un vecteur d'abus au même titre que `results`.
const MAX_PLATFORM_SIGNALS = 30;
const MAX_PLATFORM_SIGNAL_LENGTH = 300;
// Les identifiants de plateforme (`PlatformId`, `SeoPluginId`, `FirewallId`,
// `HostId` dans `lib/scanner/platform.ts`) sont tous des mots courts : cette
// borne n'a pas besoin de dupliquer la liste exacte pour rester utile.
const MAX_PLATFORM_KEY_LENGTH = 50;

// `report.platform` est optionnelle (`ScanReport.platform?`) et alimente
// `remediationForPlatform` (lib/remediation/platformMatch.ts) : bornée en
// forme et en taille, mais pas en valeurs précises, pour ne pas dupliquer ici
// les unions de `lib/scanner/platform.ts`, qui évolueraient alors à deux
// endroits.
const platformSchema = z
  .object({
    cms: z.string().max(MAX_PLATFORM_KEY_LENGTH),
    seoPlugin: z.string().max(MAX_PLATFORM_KEY_LENGTH).optional(),
    firewall: z.string().max(MAX_PLATFORM_KEY_LENGTH).optional(),
    host: z.string().max(MAX_PLATFORM_KEY_LENGTH).optional(),
    signals: z.array(z.string().max(MAX_PLATFORM_SIGNAL_LENGTH)).max(MAX_PLATFORM_SIGNALS).optional(),
  })
  .passthrough();

// Validation volontairement limitée aux champs que le rendu consomme, en
// laissant passer le reste : le but est de borner l'abus, pas de dupliquer ici
// toute la forme de `ScanReport`, qui évoluerait alors à deux endroits.
const requestSchema = z.object({
  report: z
    .object({
      finalUrl: z.string().max(2048),
      platform: platformSchema.optional(),
    })
    .passthrough(),
  results: z
    .array(
      z
        .object({
          agent: z.string().max(100),
          simpleStatus: z.string().max(50),
          reasons: z.array(z.string().max(500)).max(MAX_REASONS).optional(),
        })
        .passthrough(),
    )
    .max(MAX_RESULTS),
});

export async function POST(req: Request) {
  try {
    const quota = await rateLimit(callerKey(req, "pdf-diagnostic"), MAX_REQUESTS, RATE_LIMIT_WINDOW_MS);
    if (!quota.allowed) {
      return NextResponse.json(
        { error: "Trop de téléchargements. Réessayez dans un instant." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.max(1, Math.ceil((quota.resetAt.getTime() - Date.now()) / 1000))),
          },
        },
      );
    }

    // `req.json()` lève sur un corps vide ou malformé. Sans ce filet, l'erreur
    // tombait dans le `catch` final et la route répondait 500 alors que la
    // requête du client était simplement invalide.
    const body = await req.json().catch(() => null);
    if (body === null) {
      return NextResponse.json({ error: "Corps de requête invalide : JSON attendu." }, { status: 400 });
    }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Requête invalide : un rapport et une liste de résultats sont attendus." },
        { status: 400 },
      );
    }

    const report = parsed.data.report as unknown as ScanReport;
    const results = parsed.data.results as unknown as ScanCoreResult[];

    const pdfBuffer = await generateDiagnosticPdfBuffer(report, results);

    let domain = "domaine";
    try {
      domain = new URL(report.finalUrl).hostname.replace(/^www\./, "");
    } catch {
      // Nom de fichier de repli : l'URL a déjà été validée en longueur, mais
      // elle peut ne pas être analysable. Ce n'est pas une raison d'échouer.
    }

    // `Buffer` n'est pas un `BodyInit` dans les types DOM : on passe le même
    // contenu sous forme de `Uint8Array` (une copie, négligeable pour un PDF).
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="diagnostic-${domain}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Erreur de génération du PDF de diagnostic :", error);
    return NextResponse.json({ error: "Une erreur interne est survenue." }, { status: 500 });
  }
}
