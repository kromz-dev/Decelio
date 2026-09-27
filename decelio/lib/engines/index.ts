import {
  type EngineConnector,
  type EngineGrounding,
  type EngineId,
  EngineError,
  groundingOf,
} from "./types";
import { geminiConnector } from "./gemini";
import { groqConnector } from "./groq";

/**
 * Registre des moteurs disponibles.
 * Pour en ajouter un : écrire le connecteur dans ce dossier et l'inscrire ici.
 * Aucun autre fichier du projet ne doit être modifié.
 */
export const ENGINES: Record<string, EngineConnector> = {
  GEMINI: geminiConnector,
  GROQ: groqConnector,
};

/**
 * Nature déclarée de chaque moteur, source de vérité du registre.
 *
 * GEMINI : ancré. Il interroge réellement Google Search au moment de l'appel et
 * rend les URLs consultées. C'est le seul instrument de mesure dont on dispose.
 *
 * GROQ : NON ANCRÉ. `openai/gpt-oss-120b` (voir DEFAULT_GROQ_MODEL) n'a aucun accès web. Son message
 * système lui demande de répondre « comme s'il » avait une base RAG temps réel
 * et de citer des URLs « réelles (ou très probables) » : les citations qu'il
 * produit sont reconstruites de mémoire. Les stocker et les présenter au client
 * comme des sources relevées, c'est fabriquer la donnée du produit. GROQ reste
 * utilisable comme juge (classification, sentiment) ou générateur (prompts).
 *
 * Cette table prime sur ce que déclare le connecteur : un connecteur ne doit
 * pas pouvoir s'auto-promouvoir « ancré » sans passer par cette revue.
 */
export const ENGINE_GROUNDING: Partial<Record<EngineId, EngineGrounding>> = {
  GEMINI: "GROUNDED",
  GROQ: "UNGROUNDED",
};

/**
 * Moteur de mesure par défaut. Toute campagne qui ne précise rien passe par lui.
 * Changer cette valeur pour un moteur non ancré casse la promesse du produit.
 */
export const DEFAULT_MEASUREMENT_ENGINE: EngineId = "GEMINI";

export function getEngine(id: EngineId | string): EngineConnector {
  const engine = ENGINES[id];
  if (!engine) {
    throw new Error(`Moteur inconnu : ${id}. Disponibles : ${Object.keys(ENGINES).join(", ")}`);
  }
  return engine;
}

/** Nature d'un moteur : la table du registre d'abord, la déclaration du connecteur ensuite. */
export function engineGrounding(id: EngineId | string): EngineGrounding {
  const declared = ENGINE_GROUNDING[id as EngineId];
  if (declared) return declared;
  return groundingOf(getEngine(id));
}

/** Moteurs utilisables comme instrument de mesure. */
export function groundedEngines(): EngineConnector[] {
  return Object.keys(ENGINES)
    .filter((id) => engineGrounding(id) === "GROUNDED")
    .map((id) => ENGINES[id]);
}

/**
 * Récupère un moteur pour un appel de MESURE (citations stockées puis montrées
 * au client). Refuse tout moteur non ancré : ses citations seraient inventées.
 *
 * Pour un usage de juge ou de générateur, passer par `getEngine`.
 */
export function getMeasurementEngine(
  id: EngineId | string = DEFAULT_MEASUREMENT_ENGINE,
): EngineConnector {
  const engine = getEngine(id);
  if (engineGrounding(id) !== "GROUNDED") {
    const alternatives = groundedEngines().map((e) => e.id).join(", ") || "aucun";
    throw new EngineError(
      `Moteur ${engine.id} (${engine.label}) non ancré : il n'a pas d'accès web et ` +
        `reconstruit ses URLs de mémoire. Ses citations ne mesurent rien et ne doivent ` +
        `ni être stockées ni être présentées comme des sources. ` +
        `Moteurs de mesure disponibles : ${alternatives}. ` +
        `Pour un usage de juge ou de génération, utiliser getEngine("${engine.id}").`,
      engine.id,
      false,
    );
  }
  return engine;
}

// `isGrounded`, `groundingOf` et les types sont réexportés par la ligne ci-dessous.
export * from "./types";
