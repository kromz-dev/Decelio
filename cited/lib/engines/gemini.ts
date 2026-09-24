/**
 * Connecteur Gemini 2.5 Flash avec ancrage Google Search.
 *
 * Pourquoi ce modèle : c'est le seul accès à un moteur de réponse IA avec
 * recherche web réellement gratuit au moment de l'écriture. Les modèles 3.x
 * n'ont PAS d'ancrage sur l'offre gratuite.
 *
 * C'est le moteur de MESURE du produit : il interroge réellement le web et rend
 * les URLs qu'il a consultées (`groundingMetadata`). Les citations produites ici
 * sont des observations, pas des URLs reconstruites de mémoire par un modèle.
 *
 * Aucune dépendance : appel REST direct via fetch.
 */

import { randomUUID } from "crypto";
import { captureAiGeneration } from "../posthog-ai";
import {
  type EngineConnector,
  type EngineQuery,
  type EngineResponse,
  type EngineCitation,
  type EngineUsage,
  EngineError,
  domainOf,
} from "./types";

const MODEL = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

/**
 * TARIF GEMINI — seul endroit du fichier où un prix apparaît.
 *
 * Source : https://ai.google.dev/gemini-api/docs/pricing (à revérifier, Google
 * change ces montants sans préavis ; c'est LA constante à mettre à jour).
 *
 * Deux lignes de facturation indépendantes s'additionnent :
 *  1. les tokens du modèle (input / output), au million de tokens ;
 *  2. l'ancrage Google Search, facturé à la REQUÊTE ancrée, pas au token.
 *
 * Les paliers gratuits :
 *  - offre gratuite (free tier) : les tokens sont à 0 $ et l'ancrage est
 *    plafonné à FREE_GROUNDED_REQUESTS_PER_DAY requêtes par jour et par projet.
 *    Au-delà, l'API répond 429 — elle ne facture pas, elle refuse.
 *  - offre payante (paid tier) : les tokens sont facturés dès le premier, et
 *    les PAID_TIER_FREE_GROUNDED_REQUESTS_PER_DAY premières requêtes ancrées du
 *    jour sont offertes ; ensuite chaque requête ancrée coûte
 *    `groundingUsdPerRequest`.
 *
 * `GEMINI_BILLING_TIER` dit dans quel régime on tourne. Tant qu'on est sur
 * "free", `costUsd` vaut 0 et c'est VRAI, pas un 0 codé en dur.
 */
export const GEMINI_PRICING = {
  /** Dollars par million de tokens d'entrée, offre payante. */
  inputUsdPerMTok: 0.3,
  /** Dollars par million de tokens de sortie, offre payante. */
  outputUsdPerMTok: 2.5,
  /** Dollars par requête ancrée Google Search, au-delà du palier gratuit. */
  groundingUsdPerRequest: 0.035,
  /** Palier gratuit de l'offre gratuite : au-delà, 429 (pas de facturation). */
  freeTierGroundedRequestsPerDay: 500,
  /** Requêtes ancrées offertes chaque jour sur l'offre payante. */
  paidTierFreeGroundedRequestsPerDay: 1_500,
} as const;

/**
 * Régime de facturation du projet Google Cloud utilisé.
 * "free" (défaut) : aucun moyen de paiement lié, rien n'est facturable.
 * "paid" : facturation active, le coût réel est calculé ci-dessous.
 */
export type GeminiBillingTier = "free" | "paid";

function billingTier(): GeminiBillingTier {
  return process.env.GEMINI_BILLING_TIER === "paid" ? "paid" : "free";
}

/** Volumes typiques d'un appel ancré, UNIQUEMENT pour l'estimation avant exécution. */
const TYPICAL_USAGE = { inputTokens: 600, outputTokens: 900 } as const;

/**
 * Compteur de session, pour surveiller la consommation du quota gratuit.
 *
 * ATTENTION : ce compteur vit dans le processus. Le quota, lui, est journalier
 * et compté par Google au niveau du projet, tous processus confondus. En
 * serverless (plusieurs instances Next/Inngest), ce compteur SOUS-ESTIME la
 * consommation réelle. Il sert à surveiller, pas à facturer.
 */
export const geminiUsage = { groundedCalls: 0, plainCalls: 0, errors: 0 };

interface GeminiCandidate {
  content?: { parts?: Array<{ text?: string }> };
  groundingMetadata?: {
    groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
    /**
     * Rattache chaque passage du texte rendu aux chunks qui le soutiennent.
     * C'est la seule information qui donne un ORDRE D'APPARITION fiable.
     */
    groundingSupports?: Array<{
      segment?: { startIndex?: number; endIndex?: number };
      groundingChunkIndices?: number[];
    }>;
    webSearchQueries?: string[];
  };
}

interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  /** Tokens de « raisonnement » sur les modèles 2.5, facturés comme de la sortie. */
  thoughtsTokenCount?: number;
  totalTokenCount?: number;
}

interface GeminiCall {
  candidate: GeminiCandidate;
  usageMetadata?: GeminiUsageMetadata;
}

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new EngineError(
      "GEMINI_API_KEY absente. Crée une clé gratuite sur https://aistudio.google.com/apikey " +
        "puis renseigne-la dans le fichier .env",
      "GEMINI",
      false,
    );
  }
  return key;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function callGemini(body: unknown, grounded: boolean, maxRetries = 3): Promise<GeminiCall> {
  // Résolu AVANT la boucle : une clé absente est une erreur de configuration,
  // définitive et non réessayable. La laisser lever à l'intérieur du try
  // réseau la déguiserait en « réseau injoignable », donc en erreur retryable.
  const key = apiKey();
  const traceId = randomUUID();
  const generationStartedAt = Date.now();

  let attempt = 0;

  while (attempt < maxRetries) {
    const started = Date.now();
    let res: Response;
    try {
      // La clé passe par un en-tête, JAMAIS en query string : l'URL complète
      // se retrouve dans les spans Inngest, les breadcrumbs Sentry et le
      // moindre console.error sur échec réseau. Un en-tête n'y est pas repris.
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(90_000),
      });
    } catch (err) {
      geminiUsage.errors++;
      if (attempt < maxRetries - 1) {
        attempt++;
        await sleep(Math.pow(2, attempt) * 1000);
        continue;
      }
      throw new EngineError(
        `Réseau injoignable après ${Date.now() - started} ms : ${(err as Error).message}`,
        "GEMINI",
        true,
      );
    }

    if (!res.ok) {
      geminiUsage.errors++;
      const detail = await res.text().catch(() => "");
      const retryable = res.status === 429 || res.status >= 500;

      if (retryable && attempt < maxRetries - 1) {
        attempt++;
        // Backoff: 2s, 4s, etc.
        await sleep(Math.pow(2, attempt) * 1000);
        continue;
      }

      const hint =
        res.status === 429
          ? ` — quota gratuit probablement épuisé pour aujourd'hui (${GEMINI_PRICING.freeTierGroundedRequestsPerDay} requêtes ancrées/jour).`
          : (res.status === 400 || res.status === 403) && detail.includes("API key")
            ? " — clé API invalide ou non autorisée."
            : "";
      throw new EngineError(
        `Gemini a répondu ${res.status}${hint} ${detail.slice(0, 300)}`,
        "GEMINI",
        retryable,
        res.status,
      );
    }

    if (grounded) geminiUsage.groundedCalls++;
    else geminiUsage.plainCalls++;

    const json = (await res.json()) as {
      candidates?: GeminiCandidate[];
      usageMetadata?: GeminiUsageMetadata;
    };
    const candidate = json.candidates?.[0];
    if (!candidate) {
      throw new EngineError("Réponse Gemini sans candidat exploitable.", "GEMINI", true);
    }

    await captureAiGeneration({
      traceId,
      provider: "google",
      model: MODEL,
      input: JSON.stringify(body),
      output: textOf(candidate),
      latencyMs: Date.now() - generationStartedAt,
      usage: usageOf(json.usageMetadata, grounded),
    });

    return { candidate, usageMetadata: json.usageMetadata };
  }

  throw new EngineError(
    `Échec Gemini après ${maxRetries} tentatives.`,
    "GEMINI",
    true,
  );
}

function textOf(candidate: GeminiCandidate): string {
  return (candidate.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();
}

/** Consommation normalisée. Les tokens de raisonnement sont facturés en sortie. */
function usageOf(meta: GeminiUsageMetadata | undefined, grounded: boolean): EngineUsage | undefined {
  if (!meta) return undefined;
  return {
    inputTokens: meta.promptTokenCount,
    outputTokens: (meta.candidatesTokenCount ?? 0) + (meta.thoughtsTokenCount ?? 0),
    groundedRequests: grounded ? 1 : 0,
  };
}

/**
 * Coût RÉEL de l'appel, calculé depuis la consommation rendue par Google.
 *
 * `groundedRequestIndex` est le rang de cette requête ancrée dans la journée.
 * On ne le connaît pas de façon fiable (compteur de processus, voir
 * `geminiUsage`) : tant que le compteur reste sous le palier offert, on rend un
 * coût d'ancrage de 0 et on marque la réponse comme estimation.
 */
function costUsdOf(
  usage: EngineUsage | undefined,
  grounded: boolean,
  groundedRequestIndex: number,
): { costUsd: number; isEstimate: boolean } {
  if (billingTier() === "free") {
    // Sur l'offre gratuite, rien n'est facturable : au-delà du quota l'API
    // renvoie 429 au lieu de facturer. Ce 0 est constaté, pas codé en dur.
    return { costUsd: 0, isEstimate: false };
  }

  const inputTokens = usage?.inputTokens ?? TYPICAL_USAGE.inputTokens;
  const outputTokens = usage?.outputTokens ?? TYPICAL_USAGE.outputTokens;
  const tokenCost =
    (inputTokens * GEMINI_PRICING.inputUsdPerMTok +
      outputTokens * GEMINI_PRICING.outputUsdPerMTok) /
    1_000_000;

  const beyondFreeGrounding =
    grounded && groundedRequestIndex > GEMINI_PRICING.paidTierFreeGroundedRequestsPerDay;
  const groundingCost = beyondFreeGrounding ? GEMINI_PRICING.groundingUsdPerRequest : 0;

  return {
    costUsd: tokenCost + groundingCost,
    // Estimation dès que la consommation manque, ou dès que le palier d'ancrage
    // dépend d'un compteur de processus qui ne voit pas les autres instances.
    isEstimate: !usage || grounded,
  };
}

/** Coût indicatif d'un appel ancré sur l'offre payante, hors palier offert. */
export const GEMINI_ESTIMATED_COST_PER_CALL_USD =
  (TYPICAL_USAGE.inputTokens * GEMINI_PRICING.inputUsdPerMTok +
    TYPICAL_USAGE.outputTokens * GEMINI_PRICING.outputUsdPerMTok) /
    1_000_000 +
  GEMINI_PRICING.groundingUsdPerRequest;

/**
 * Ordre d'apparition des chunks dans le texte rendu.
 *
 * `groundingChunks` est une liste de sources, PAS un classement : son ordre
 * est celui de la collecte interne, sans rapport avec le texte. `groundingSupports`
 * rattache chaque passage du texte à ses chunks ; en triant les supports par
 * `segment.startIndex`, on reconstruit l'ordre réel d'apparition.
 *
 * Renvoie l'index de première apparition de chaque chunk. Un chunk absent des
 * supports n'apparaît nulle part dans le texte : il n'a pas d'ordre d'apparition
 * connu (voir `citationsOf`).
 */
function firstAppearanceOrder(candidate: GeminiCandidate): Map<number, number> {
  const supports = candidate.groundingMetadata?.groundingSupports ?? [];
  const sorted = [...supports].sort(
    (a, b) => (a.segment?.startIndex ?? 0) - (b.segment?.startIndex ?? 0),
  );
  const order = new Map<number, number>();
  let rank = 0;
  for (const support of sorted) {
    for (const chunkIndex of support.groundingChunkIndices ?? []) {
      if (!order.has(chunkIndex)) order.set(chunkIndex, rank++);
    }
  }
  return order;
}

/**
 * Citations réellement consultées par le moteur.
 *
 * Déduplication sur l'URL, PAS sur le domaine : la recommandation vendue au
 * client est du type « obtenir une présence sur tel site », donc deux articles
 * distincts d'un même média sont deux observations distinctes et doivent être
 * conservées.
 *
 * `position` = ordre d'apparition dans le texte rendu, reconstruit depuis
 * `groundingSupports`. Les chunks que Google liste sans jamais les citer dans
 * le texte n'ont PAS d'ordre d'apparition : ils sont placés à la fin, dans
 * l'ordre brut de `groundingChunks`, qui est arbitraire. Ne pas lire leur
 * `position` comme un rang.
 */
function citationsOf(candidate: GeminiCandidate): EngineCitation[] {
  const chunks = candidate.groundingMetadata?.groundingChunks ?? [];
  const order = firstAppearanceOrder(candidate);

  const indexed = chunks
    .map((chunk, i) => ({ chunk, i }))
    .filter(({ chunk }) => Boolean(chunk.web?.uri))
    .sort((a, b) => {
      // Les chunks cités dans le texte d'abord, dans leur ordre d'apparition.
      // Les autres ensuite, dans l'ordre brut de l'API.
      const ra = order.get(a.i);
      const rb = order.get(b.i);
      if (ra !== undefined && rb !== undefined) return ra - rb;
      if (ra !== undefined) return -1;
      if (rb !== undefined) return 1;
      return a.i - b.i;
    });

  const seenUrls = new Set<string>();
  const out: EngineCitation[] = [];

  for (const { chunk } of indexed) {
    const uri = chunk.web!.uri!;
    if (seenUrls.has(uri)) continue;
    seenUrls.add(uri);

    // Gemini renvoie souvent une URL de redirection vertexaisearch : dans ce cas
    // le vrai domaine n'est lisible que dans le titre.
    const fromUrl = domainOf(uri);
    const isRedirect = fromUrl.includes("vertexaisearch") || fromUrl.includes("googleusercontent");
    const title = chunk.web!.title?.trim();
    const domain = isRedirect && title ? title.replace(/^www\./, "").toLowerCase() : fromUrl;
    if (!domain) continue;

    out.push({ url: uri, domain, title, position: out.length + 1 });
  }

  return out;
}

export const geminiConnector: EngineConnector = {
  id: "GEMINI",
  label: "Gemini (Google Search)",
  /** Accès web réel au moment de l'appel : utilisable comme instrument de mesure. */
  grounding: "GROUNDED",
  costPerCallUsd: GEMINI_ESTIMATED_COST_PER_CALL_USD,

  async query({ prompt, country, language }: EngineQuery): Promise<EngineResponse> {
    const started = Date.now();
    const { candidate, usageMetadata } = await callGemini(
      {
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.2 },
        systemInstruction: {
          parts: [
            {
              text:
                `Réponds comme un assistant de recherche grand public, en ${language}, ` +
                `pour un utilisateur situé en ${country}. Sois concret et cite des marques ` +
                `ou produits existants. Si la question appelle une liste, donne une liste numérotée.`,
            },
          ],
        },
      },
      true,
    );

    const usage = usageOf(usageMetadata, true);
    const { costUsd, isEstimate } = costUsdOf(usage, true, geminiUsage.groundedCalls);

    return {
      rawText: textOf(candidate),
      citations: citationsOf(candidate),
      costUsd,
      costIsEstimate: isEstimate,
      usage,
      latencyMs: Date.now() - started,
      modelVersion: MODEL,
    };
  },
};

/**
 * Appel utilitaire SANS ancrage, pour les tâches internes (génération de
 * requêtes, analyse de sentiment). Ne consomme pas le quota d'ancrage.
 *
 * Ne JAMAIS s'en servir pour mesurer : sans ancrage, Gemini répond de mémoire
 * et toute URL qu'il produirait serait inventée.
 */
export async function geminiPlainJson<T>(instruction: string, schemaHint: string): Promise<T> {
  const { candidate } = await callGemini(
    {
      contents: [{ parts: [{ text: `${instruction}\n\n${schemaHint}` }] }],
      generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
    },
    false,
  );
  const raw = textOf(candidate);
  try {
    return JSON.parse(raw) as T;
  } catch {
    const match = raw.match(/[[{][\s\S]*[\]}]/);
    if (match) return JSON.parse(match[0]) as T;
    throw new EngineError(`Réponse JSON illisible : ${raw.slice(0, 200)}`, "GEMINI", true);
  }
}
