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

// `req.json()` lit tout le corps en mémoire avant la moindre borne : un corps
// énorme (Content-Length mensonger ou absent) était lu en entier avant que
// `requestSchema` ne le rejette. 256 Kio couvre largement un rapport de scan
// réel (11 robots déclarés, quelques dizaines de signaux de plateforme) avec
// une marge confortable.
const MAX_BODY_BYTES = 256 * 1024;

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

type BodyReadResult = { kind: "ok"; text: string } | { kind: "too_large" } | { kind: "read_error" };

/**
 * Lit `req.body` en flux, borné à `maxBytes`, sans jamais construire une
 * chaîne plus grande que la limite en mémoire. Couvre le cas où
 * `Content-Length` est absent ou faux (l'en-tête est déclaratif, jamais
 * vérifié par le protocole) : c'est cette lecture bornée, pas l'en-tête, qui
 * protège réellement contre un corps énorme.
 */
async function readBodyWithLimit(req: Request, maxBytes: number): Promise<BodyReadResult> {
  if (!req.body) {
    try {
      return { kind: "ok", text: await req.text() };
    } catch {
      return { kind: "read_error" };
    }
  }

  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel().catch(() => {});
        return { kind: "too_large" };
      }
      text += decoder.decode(value, { stream: true });
    }
  } catch {
    return { kind: "read_error" };
  }
  return { kind: "ok", text: text + decoder.decode() };
}

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

    // `Content-Length` est déclaratif (jamais vérifié par le protocole) :
    // un refus rapide sur cet en-tête évite d'ouvrir la lecture du corps pour
    // une requête déjà annoncée trop grosse, mais ne remplace pas la lecture
    // bornée ci-dessous (en-tête absent ou faux).
    const declaredLength = Number(req.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Corps de requête trop volumineux." }, { status: 413 });
    }

    const bodyRead = await readBodyWithLimit(req, MAX_BODY_BYTES);
    if (bodyRead.kind === "too_large") {
      return NextResponse.json({ error: "Corps de requête trop volumineux." }, { status: 413 });
    }

    // `JSON.parse` lève sur un corps vide ou malformé. Sans ce filet, l'erreur
    // tombait dans le `catch` final et la route répondait 500 alors que la
    // requête du client était simplement invalide.
    let body: unknown = null;
    if (bodyRead.kind === "ok") {
      try {
        body = JSON.parse(bodyRead.text);
      } catch {
        body = null;
      }
    }
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
