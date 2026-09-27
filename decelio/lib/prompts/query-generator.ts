/**
 * Générateur de requêtes (prompts) intelligent via LLM.
 * Simule le parcours d'achat (Funnel) d'un client potentiel.
 */

import { groqPlainJson } from "../engines/groq";
import type { EngineConnector } from "../engines/types";
import { captureServerException } from "../posthog-server";
import { z } from "zod";

export type PromptFamily = "PROBLEM" | "SOLUTION" | "COMPARISON" | "DISCOVERY" | "BRAND";

export interface GeneratedPrompt {
  text: string;
  family: PromptFamily;
}

const PromptSchema = z.object({
  text: z.string().trim().min(8).max(300),
  family: z.enum(["PROBLEM", "SOLUTION", "COMPARISON"]),
});

const SmartPromptResponseSchema = z.object({
  industry: z.string().trim().min(1).max(120),
  competitors: z.array(z.string().trim().min(1).max(100)).max(5),
  prompts: z.array(PromptSchema).length(5),
});

function hasExpectedFamilies(prompts: GeneratedPrompt[]): boolean {
  return (
    prompts.filter((prompt) => prompt.family === "PROBLEM").length === 2 &&
    prompts.filter((prompt) => prompt.family === "SOLUTION").length === 2 &&
    prompts.filter((prompt) => prompt.family === "COMPARISON").length === 1
  );
}

export async function generateSmartPrompts(
  domain: string,
  brandName: string,
  engine?: EngineConnector,
): Promise<GeneratedPrompt[]> {
  void engine;
  const prompt = `
    Tu es un expert en référencement SEO et marketing.
    Analyse cette entreprise : Marque = "${brandName}", Site web = "${domain}".

    Détermine son secteur d'activité, puis mets-toi dans la peau de ses clients potentiels en France.
    Génère EXACTEMENT 5 requêtes naturelles réparties ainsi :
    - 2 requêtes "PROBLEM" : une douleur ou un besoin, sans chercher de logiciel.
    - 2 requêtes "SOLUTION" : une catégorie d'outil ou de service.
    - 1 requête "COMPARISON" : une alternative ou comparaison avec un concurrent.

    Ne cite pas directement la marque "${brandName}" sauf dans la requête COMPARISON.
    Réponds uniquement avec l'objet JSON demandé par le schéma.
  `;

  try {
    const parsed = await groqPlainJson(prompt, SmartPromptResponseSchema);
    if (hasExpectedFamilies(parsed.prompts)) return parsed.prompts;
    throw new Error("Répartition de familles invalide");
  } catch (error) {
    // Repli volontaire, mais rendu visible : le modele Groq code en dur
    // n'existait plus, donc ce chemin etait pris a CHAQUE appel et les prompts
    // "intelligents" n'ont jamais ete generes. Seule une ligne de console le
    // disait. PostHog est le canal d'erreurs du projet (ADR-001).
    console.error("Erreur lors de la génération intelligente des prompts:", error);
    await captureServerException(error, undefined, {
      source: "query-generator.generateSmartPrompts",
      degraded_to: "prompts-generiques",
    });
    return [
      { text: `Comment résoudre le problème principal lié à ${domain} ?`, family: "PROBLEM" },
      { text: `Quels sont les défis rencontrés par les clients de ${domain} ?`, family: "PROBLEM" },
      { text: `Quel est le meilleur outil dans le secteur de ${domain} ?`, family: "SOLUTION" },
      { text: `Quelle solution choisir pour les besoins couverts par ${domain} ?`, family: "SOLUTION" },
      { text: `Quelle alternative existe à ${brandName} ?`, family: "COMPARISON" },
    ];
  }
}

const GenerationSchema = z.object({
  industry: z.string(),
  competitors: z.array(z.object({ name: z.string(), domain: z.string() })).max(5),
  prompts: z.array(z.string()).max(25),
});

export type BrandGeneration = z.infer<typeof GenerationSchema>;

export async function detectBrandContext(
  domain: string,
  brandName: string,
): Promise<BrandGeneration> {
  const prompt = `
    Tu es un expert en référencement SEO et marketing IA.
    Analyse le domaine suivant: ${domain} pour la marque "${brandName}".
    Détermine le secteur, trouve 3 à 5 concurrents directs probables et génère
    entre 15 et 20 requêtes naturelles de clients potentiels.
  `;
  const schemaHint = `
    Retourne STRICTEMENT:
    {"industry":"string","competitors":[{"name":"string","domain":"string"}],"prompts":["string"]}
  `;

  try {
    const rawData = await groqPlainJson(prompt, schemaHint);
    return GenerationSchema.parse(rawData);
  } catch (error) {
    // Meme repli silencieux que ci-dessus, meme cause. Voir DEFAULT_GROQ_MODEL.
    console.error("Erreur détection marque:", error);
    await captureServerException(error, undefined, {
      source: "query-generator.detectBrandContext",
      degraded_to: "contexte-par-defaut",
    });
    return {
      industry: "Secteur inconnu",
      competitors: [],
      prompts: [`${brandName} avis`, `alternative à ${brandName}`, `meilleur outil dans ce secteur`],
    };
  }
}
