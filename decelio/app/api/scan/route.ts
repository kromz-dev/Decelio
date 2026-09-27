import { NextResponse } from "next/server";
import { z } from "zod";
import { runCoreScan } from "@/lib/scanner/core";
import { assertSafeUrl } from "@/lib/scanner/crawler";
import { callerKey, rateLimit } from "@/lib/rate-limit";
import { DEFAULT_PROBE_BOTS } from "@/lib/scanner/agents";

// 3 scans par minute et par IP, compteur partagé en base (voir lib/rate-limit).
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 3;

// Budget documenté ENF-004 (docs/09-prd-mvp.md) : un scan d'une URL isolée
// répond en moins de 20 s. Rien dans lib/scanner/crawler.ts ne borne
// aujourd'hui la résolution DNS : un domaine dont l'attaquant contrôle le
// DNS peut donc faire tenir un scan ouvert indéfiniment sur ce processus
// Next.js persistant (voir docs/10-plan-technique.md §5.2 — pas de fonction
// serverless par route ici). On ne peut pas modifier crawler.ts, robots.ts,
// analyzer.ts ni agents.ts (autre ingénieur) : le correctif borne donc la
// réponse HTTP au niveau de la route elle-même, via Promise.race — le scan
// sous-jacent peut continuer en arrière-plan, mais la requête HTTP, elle,
// répond toujours dans les temps.
const SCAN_TIMEOUT_MS = 20 * 1000;
const SCAN_TIMEOUT_MESSAGE = "L'analyse a dépassé le délai maximal autorisé. Veuillez réessayer.";

class ScanTimeoutError extends Error {}

const INVALID_URL = "Veuillez fournir une URL valide, incluant http:// ou https://";

const requestSchema = z.object({
  url: z.string().url(INVALID_URL)
    .refine(val => val.startsWith('http://') || val.startsWith('https://'), { message: INVALID_URL }),
});

export async function POST(request: Request) {
  try {
    // 1. Rate Limiting based on IP
    const quota = await rateLimit(callerKey(request, "scan"), MAX_REQUESTS, RATE_LIMIT_WINDOW_MS);
    if (!quota.allowed) {
      return NextResponse.json(
        { error: "Trop de requêtes. Veuillez réessayer dans quelques instants." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.max(1, Math.ceil((quota.resetAt.getTime() - Date.now()) / 1000))) },
        }
      );
    }

    // 2. Parse and Validate Request
    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "URL invalide" },
        { status: 400 }
      );
    }

    const { url } = parsed.data;

    // 3. SSRF Protection (le crawler la refait sur chaque redirection)
    try {
      await assertSafeUrl(url);
    } catch {
      return NextResponse.json(
        { error: "Cette URL ne peut pas être scannée pour des raisons de sécurité." },
        { status: 403 }
      );
    }

    // 4. Execute Scan for multiple bots, borné par le budget ENF-004 (20 s).
    // On ne peut pas annuler le scan sous-jacent (il vit dans crawler.ts, non
    // modifiable ici) : Promise.race garantit seulement que la réponse HTTP,
    // elle, ne dépasse jamais ce budget.
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const scanPromise = runCoreScan(url, DEFAULT_PROBE_BOTS);
    // Si le scan échoue après coup (une fois le 504 déjà renvoyé), ce rejet
    // ne doit pas remonter comme rejet non géré : on l'observe et l'ignore.
    scanPromise.catch(() => {});
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new ScanTimeoutError()), SCAN_TIMEOUT_MS);
    });

    try {
      const { report, results } = await Promise.race([scanPromise, timeoutPromise]);
      return NextResponse.json({ results, report });
    } finally {
      clearTimeout(timeoutHandle);
    }
  } catch (error) {
    if (error instanceof ScanTimeoutError) {
      // 504 Gateway Timeout : la route a bien traité la requête mais l'analyse
      // en amont (dépendante d'un tiers, ex. DNS du domaine scanné) n'a pas
      // répondu dans le budget imparti. Message générique, aucun détail
      // interne (pas de nom de fichier, pas de cause technique précise).
      return NextResponse.json({ error: SCAN_TIMEOUT_MESSAGE }, { status: 504 });
    }

    console.error("Scan API Error:", error);
    return NextResponse.json(
      { error: "Une erreur interne est survenue lors de l'analyse." },
      { status: 500 }
    );
  }
}
