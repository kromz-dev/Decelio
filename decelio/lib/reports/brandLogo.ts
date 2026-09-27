import { createPinnedDispatcher, isPinningUnavailable, resolveSafeTarget } from "@/lib/scanner/crawler";
import type { Dispatcher } from "undici";

/**
 * Node ne déclare pas encore `dispatcher` sur `RequestInit` (extension
 * d'undici) : voir la même interface dans `lib/scanner/crawler.ts`.
 */
interface FetchInitWithDispatcher extends RequestInit {
  dispatcher?: Dispatcher;
}

/** Types MIME acceptés pour un logo de marque blanche. */
const ALLOWED_LOGO_CONTENT_TYPES = new Set(["image/png", "image/jpeg"]);
/** Plafond de taille : un logo n'a aucune raison de dépasser 512 Ko. */
export const MAX_LOGO_BYTES = 512 * 1024;
const LOGO_FETCH_TIMEOUT_MS = 5_000;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

/** Vrai si les premiers octets correspondent au type annoncé. */
export function hasImageSignature(buffer: Buffer, contentType: "image/png" | "image/jpeg"): boolean {
  const signature = contentType === "image/png" ? PNG_SIGNATURE : JPEG_SIGNATURE;
  return buffer.length >= signature.length && signature.every((byte, i) => buffer[i] === byte);
}

export interface LoadedBrandLogo {
  /** Contenu du logo encodé en data URI, directement consommable par `<Image src>` de @react-pdf. */
  dataUri: string;
  contentType: "image/png" | "image/jpeg";
}

/**
 * Charge un logo de marque blanche pour l'inclure dans le PDF du rapport
 * mensuel, généré côté serveur.
 *
 * `renderMonthlyReportPdf` ne doit JAMAIS recevoir une URL brute fournie par
 * l'utilisateur : un `<Image src={url}>` de @react-pdf y ferait une requête
 * serveur -> URL arbitraire (SSRF). Ce chargeur revalide donc l'URL via
 * `assertSafeUrl` (résolution DNS, adresses privées/réservées refusées —
 * même garde que `lib/scanner/crawler.ts`), refuse toute redirection (une
 * cible de redirection n'est jamais revalidée ici), n'accepte que les types
 * MIME `image/png`/`image/jpeg` déclarés, plafonne la taille lue à
 * `MAX_LOGO_BYTES` et impose un délai d'expiration.
 *
 * Toute défaillance — DNS/IP interdite, réseau, type MIME, taille, délai —
 * renvoie `null`. Le rapport mensuel doit toujours pouvoir sortir : un logo
 * manquant n'est jamais une erreur bloquante pour la génération du PDF.
 *
 * La connexion réelle est épinglée sur l'IP validée par `resolveSafeTarget`
 * (même garde que `lib/scanner/crawler.ts` — voir `createPinnedDispatcher`) :
 * sans ça, `fetch` referait sa propre résolution DNS après la validation, ce
 * qui laisserait la même fenêtre TOCTOU (rebinding DNS).
 */
export async function loadBrandLogo(url: string | null | undefined): Promise<LoadedBrandLogo | null> {
  if (!url || !url.trim()) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LOGO_FETCH_TIMEOUT_MS);

  try {
    const target = await resolveSafeTarget(url);

    const fetchInit: FetchInitWithDispatcher = {
      signal: controller.signal,
      // Jamais suivie : une redirection pointerait vers une cible non
      // revalidée par `resolveSafeTarget` (même risque que dans crawler.ts).
      redirect: "manual",
    };
    if (!isPinningUnavailable()) {
      fetchInit.dispatcher = createPinnedDispatcher(target.ip);
    }

    const response = await fetch(target.url, fetchInit);

    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      return null;
    }

    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    if (!contentType || !ALLOWED_LOGO_CONTENT_TYPES.has(contentType)) {
      await response.body?.cancel().catch(() => {});
      return null;
    }

    const declaredLength = response.headers.get("content-length");
    if (declaredLength && Number(declaredLength) > MAX_LOGO_BYTES) {
      await response.body?.cancel().catch(() => {});
      return null;
    }

    if (!response.body) return null;

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_LOGO_BYTES) {
        await reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }

    const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
    const typedContentType = contentType as "image/png" | "image/jpeg";

    // L'en-tête Content-Type est déclaratif : on vérifie la signature du
    // fichier, sinon une fausse image ferait échouer le rendu du PDF.
    if (!hasImageSignature(buffer, typedContentType)) return null;
    return {
      dataUri: `data:${typedContentType};base64,${buffer.toString("base64")}`,
      contentType: typedContentType,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
