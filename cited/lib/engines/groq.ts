/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from "crypto";
import { z } from "zod";
import { captureAiGeneration } from "../posthog-ai";
import { EngineConnector, EngineId, EngineQuery, EngineResponse, EngineError, EngineUsage } from "./types";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = "llama-3.1-70b-versatile";

/**
 * Tarif Groq, en dollars par million de tokens.
 *
 * Aujourd'hui Groq est gratuit (free tier), mais plafonné en requêtes par minute :
 * l'offre payante existe déjà et le basculement peut arriver sans préavis.
 * Ne pas coder "0" en dur ailleurs dans ce fichier : c'est LE seul endroit à modifier
 * le jour où le tarif change. Le coût réel remonte alors automatiquement dans
 * EngineResponse.costUsd, donc dans l'enregistrement ApiCall.
 */
const GROQ_PRICING_USD_PER_MTOK = {
  input: 0,
  output: 0,
} as const;

/** Volumes typiques d'un appel, uniquement pour l'estimation AVANT exécution. */
const GROQ_TYPICAL_USAGE = { promptTokens: 1_500, completionTokens: 1_024 } as const;

interface GroqUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
}

/** Coût réel d'un appel, calculé depuis la consommation rendue par l'API. */
function groqCostUsd(usage?: EngineUsage): number {
  const inputTokens = usage?.inputTokens ?? GROQ_TYPICAL_USAGE.promptTokens;
  const outputTokens = usage?.outputTokens ?? GROQ_TYPICAL_USAGE.completionTokens;
  return (
    (inputTokens * GROQ_PRICING_USD_PER_MTOK.input +
      outputTokens * GROQ_PRICING_USD_PER_MTOK.output) /
    1_000_000
  );
}

/** Traduit le bloc `usage` de l'API Groq (format OpenAI) vers EngineUsage. */
function toEngineUsage(raw: GroqUsage | undefined): EngineUsage | undefined {
  if (!raw || (raw.prompt_tokens === undefined && raw.completion_tokens === undefined)) {
    return undefined;
  }
  return { inputTokens: raw.prompt_tokens, outputTokens: raw.completion_tokens };
}

/** Coût indicatif par appel, pour l'estimation de budget avant exécution. */
export const GROQ_ESTIMATED_COST_PER_CALL_USD = groqCostUsd();

export const groqConnector: EngineConnector = {
  id: "GROQ" as EngineId,
  label: "Groq LLaMA",
  costPerCallUsd: GROQ_ESTIMATED_COST_PER_CALL_USD,
  /**
   * LLaMA sur Groq répond de mémoire : aucun accès web au moment de l'appel.
   * Les "citations" extraites ci-dessous sont des URLs reconstruites par le
   * modèle, pas des sources relevées. Ce moteur ne mesure donc rien.
   */
  grounding: "UNGROUNDED",

  async query(input: EngineQuery, maxRetries = 3): Promise<EngineResponse> {
    if (!GROQ_API_KEY) {
      throw new EngineError("GROQ_API_KEY manquante", "GROQ" as EngineId, false);
    }

    const traceId = randomUUID();
    const generationStartedAt = Date.now();
    let attempt = 0;
    while (attempt < maxRetries) {
      const startTime = Date.now();

      try {
        const messages = [
          {
            role: "system",
            content: `Vous êtes un Moteur de Réponse IA (comme Perplexity ou ChatGPT Search) opérant pour des utilisateurs en ${input.country}. 
Votre rôle est de fournir des réponses extrêmement denses, factuelles et impartiales, comme si vous aviez accès à une base de données RAG en temps réel.
RÈGLES STRICTES :
1. Utilisez des listes à puces pour énumérer les outils, logiciels ou solutions.
2. Soyez très spécifique sur les fonctionnalités et citez des noms de marques réelles.
3. Ne faites pas de phrases d'introduction ou de conclusion marketing inutiles. Allez droit au but (format dense 40-60 mots par concept).
4. Citez systématiquement vos sources via des URLs réelles (ou très probables) dans le texte.
5. Lorsque vous répondez à une question ou comparez des outils, basez-vous sur le consensus web (comme les avis G2, Capterra ou articles d'experts).`
          },
          {
            role: "user",
            content: input.prompt
          }
        ];
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages,
            temperature: 0.2,
            max_tokens: 1024,
          })
        });

        if (!response.ok) {
          const isRetryable = response.status === 429 || response.status >= 500;
          if (isRetryable && attempt < maxRetries - 1) {
            attempt++;
            await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
            continue;
          }
          throw new EngineError(`Groq API Erreur ${response.status}: ${await response.text()}`, "GROQ" as EngineId, isRetryable);
        }

        const data = await response.json();
        const rawText = data.choices[0]?.message?.content || "";
        const latencyMs = Date.now() - startTime;
        const usage = toEngineUsage(data.usage);

        await captureAiGeneration({
          traceId,
          provider: "groq",
          model: data.model || GROQ_MODEL,
          input: messages,
          output: rawText,
          latencyMs: Date.now() - generationStartedAt,
          usage,
        });

        // Extraire des pseudo-citations à partir des URLs retournées dans le texte
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = rawText.match(urlRegex) || [];
        const citations = Array.from(new Set<string>(urls as string[])).map((url: string, index: number) => {
          let domain = "";
          try {
            domain = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
          } catch {}
          return {
            url,
            domain,
            position: index + 1
          };
        }).filter(c => c.domain);

        return {
          rawText,
          citations,
          costUsd: groqCostUsd(usage),
          costIsEstimate: usage === undefined,
          usage,
          latencyMs,
          modelVersion: data.model || GROQ_MODEL
        };
      } catch (e: any) {
        if (e instanceof EngineError) throw e;
        
        if (attempt < maxRetries - 1) {
          attempt++;
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
          continue;
        }
        throw new EngineError(`Groq Request failed: ${e.message}`, "GROQ" as EngineId, true);
      }
    }
    
    throw new EngineError("Max retries exceeded", "GROQ" as EngineId, true);
  }
};

/** Message optionnel contenant des données NON fiables (réponse d'un LLM tiers, saisie utilisateur). */
export interface GroqJsonOptions {
  /** Envoyé en rôle "user", jamais en rôle "system", pour ne pas être lu comme une consigne. */
  untrustedData?: string;
}

/**
 * Dérive un rappel de format textuel depuis un schéma Zod.
 * Une seule source de vérité : le schéma. Plus de schemaHint recopié à la main.
 */
function schemaHintFromZod(schema: z.ZodType<unknown>): string {
  let jsonSchema: string;
  try {
    jsonSchema = JSON.stringify(z.toJSONSchema(schema as z.ZodType, { io: "output" }), null, 2);
  } catch {
    // Certains schémas (transform, refine exotique) ne sont pas représentables en JSON Schema.
    return "Réponds STRICTEMENT avec un objet JSON valide, sans texte ni balise Markdown autour.";
  }
  return `Réponds STRICTEMENT avec un objet JSON valide, sans texte ni balise Markdown autour.
Il doit respecter ce JSON Schema :
${jsonSchema}`;
}

function isZodSchema(value: unknown): value is z.ZodType<unknown> {
  return typeof value === "object" && value !== null && typeof (value as any).safeParse === "function";
}

/**
 * Génère du JSON structuré via Groq et le VALIDE avant de le rendre.
 *
 * Passer un schéma Zod : le type de retour est alors garanti à l'exécution.
 * La forme `schemaHint: string` est conservée uniquement pour les appelants
 * historiques ; elle ne valide rien et le `T` y reste déclaratif.
 */
export async function groqPlainJson<T>(instruction: string, schema: z.ZodType<T>, options?: GroqJsonOptions): Promise<T>;
export async function groqPlainJson<T>(instruction: string, schemaHint: string, options?: GroqJsonOptions): Promise<T>;
export async function groqPlainJson<T>(
  instruction: string,
  schemaOrHint: z.ZodType<T> | string,
  options?: GroqJsonOptions
): Promise<T> {
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY manquante");

  const schema = isZodSchema(schemaOrHint) ? (schemaOrHint as z.ZodType<T>) : null;
  const schemaHint = schema ? schemaHintFromZod(schema) : (schemaOrHint as string);

  const messages: Array<{ role: "system" | "user"; content: string }> = [
    { role: "system", content: `${instruction}\n${schemaHint}` },
  ];
  if (options?.untrustedData) {
    messages.push({ role: "user", content: options.untrustedData });
  }

  const traceId = randomUUID();
  const generationStartedAt = Date.now();
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      response_format: { type: "json_object" },
      temperature: 0.1,
    })
  });

  if (!response.ok) {
    throw new Error(`Groq JSON API Error: ${await response.text()}`);
  }

  const data = await response.json();
  const rawText = data.choices[0]?.message?.content || "{}";

  await captureAiGeneration({
    traceId,
    provider: "groq",
    model: data.model || GROQ_MODEL,
    input: messages,
    output: rawText,
    latencyMs: Date.now() - generationStartedAt,
    usage: toEngineUsage(data.usage),
  });

  // response_format: { type: "json_object" } garantit déjà un JSON nu :
  // pas de repli regex, qui ne faisait que masquer des réponses hors format.
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.error("Erreur de parsing JSON Groq:", rawText);
    throw new Error("Groq n'a pas retourné un JSON valide");
  }

  if (!schema) {
    // Appelant historique sans schéma : aucune garantie de type à l'exécution.
    return parsed as T;
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    console.error("JSON Groq non conforme au schéma:", result.error.issues);
    throw new Error("Groq a retourné un JSON non conforme au schéma attendu");
  }
  return result.data;
}
