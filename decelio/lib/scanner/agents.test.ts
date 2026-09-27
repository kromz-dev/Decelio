import { describe, expect, it } from "vitest";
import { BOTS, DEFAULT_PROBE_BOTS, TRAINING_BOTS } from "./agents";

describe("DEFAULT_PROBE_BOTS", () => {
  it("ne contient que les robots de recherche (statut surveillé et alertes)", () => {
    expect(DEFAULT_PROBE_BOTS).toEqual(["OAI-SearchBot", "Claude-SearchBot", "PerplexityBot"]);
  });

  it("ne contient aucun robot d'entraînement", () => {
    for (const bot of DEFAULT_PROBE_BOTS) {
      expect(BOTS[bot].purpose).toBe("search");
    }
  });
});

describe("scénario : robots.txt bloque GPTBot mais autorise OAI-SearchBot", () => {
  it("aucune sonde par défaut n'est bloquée, donc aucune alerte ne serait déclenchée", () => {
    const disallowedTokens = ["GPTBot"];
    const probedTokensBlocked = DEFAULT_PROBE_BOTS.filter((bot) =>
      disallowedTokens.includes(BOTS[bot].robotsToken),
    );
    expect(probedTokensBlocked).toEqual([]);
  });
});

describe("TRAINING_BOTS", () => {
  it("liste les robots d'entraînement, à titre informatif seulement (pas de sonde par défaut)", () => {
    expect(TRAINING_BOTS).toEqual(
      expect.arrayContaining(["GPTBot", "ClaudeBot", "Google-Extended", "Applebot-Extended", "Omgilibot"]),
    );
    for (const bot of TRAINING_BOTS) {
      expect(BOTS[bot].purpose).toBe("training");
    }
    for (const bot of DEFAULT_PROBE_BOTS) {
      expect(TRAINING_BOTS).not.toContain(bot);
    }
  });
});
