import { describe, expect, it } from "vitest";
import { collectUniqueCauses, matchReason, matchReasons, matchReasonsWithSource } from "./match";
import { REMEDIATION_CAUSES, UNKNOWN_CAUSE } from "./catalog";

/**
 * Ces chaînes sont recopiées telles que produites par
 * `summarizeForBot` dans lib/scanner/core.ts (fichier interdit de
 * modification pour cette mission) : si son format change un jour sans que
 * ce catalogue soit mis à jour, ces tests doivent le révéler en échouant.
 */
describe("matchReason", () => {
  it("reconnaît un blocage explicite par règle robots.txt", () => {
    expect(matchReason("robots.txt disallows GPTBot").id).toBe("robots-disallow-rule");
  });

  it("reconnaît un robots.txt injoignable (interdiction par précaution RFC)", () => {
    expect(matchReason("robots.txt unreachable (full disallow)").id).toBe("robots-unreachable");
  });

  it("reconnaît un défi de sécurité (pare-feu / anti-bot)", () => {
    expect(matchReason("access challenged (markup:turnstile)").id).toBe("access-challenged");
  });

  it("reconnaît un accès bloqué (401/403/429/503)", () => {
    expect(matchReason("access blocked (status:403)").id).toBe("access-blocked");
  });

  it("reconnaît une coquille vide confirmée par un rendu JS", () => {
    expect(matchReason("js_dependent: 12 words in raw HTML").id).toBe("js-dependent");
  });

  it("reconnaît une coquille vide probable, sans rendu JS disponible", () => {
    expect(matchReason("likely_js_dependent: 8 words in raw HTML").id).toBe("js-dependent");
  });

  it("reconnaît une directive noindex", () => {
    expect(matchReason("noindex").id).toBe("noindex");
  });

  it("reconnaît un site injoignable", () => {
    expect(matchReason("unreachable: fetch failed").id).toBe("site-unreachable");
  });

  it("reconnaît une erreur HTTP générique", () => {
    expect(matchReason("http 500").id).toBe("http-error");
  });

  it("ne confond pas un statut HTTP bloquant (403) avec une erreur HTTP générique", () => {
    // "http 403" ne doit jamais être émis par summarizeForBot (403 est classé "blocked"),
    // mais si jamais ce format apparaissait, il resterait reconnu comme une erreur HTTP
    // générique plutôt que de planter : le catalogue ne doit pas supposer que 403
    // n'apparaît jamais sous ce format.
    expect(matchReason("http 403").id).toBe("http-error");
  });

  it("retombe sur la cause de repli pour une chaîne technique inconnue", () => {
    const cause = matchReason("some_future_reason_code");
    expect(cause).toBe(UNKNOWN_CAUSE);
  });
});

describe("matchReasons", () => {
  it("conserve l'ordre et déduplique par identifiant de cause", () => {
    const causes = matchReasons(["robots.txt disallows GPTBot", "noindex"]);
    expect(causes.map((c) => c.id)).toEqual(["robots-disallow-rule", "noindex"]);
  });

  it("ne renvoie qu'une entrée quand deux raisons pointent vers la même cause", () => {
    const causes = matchReasons(["js_dependent: 2 words in raw HTML", "likely_js_dependent: 2 words in raw HTML"]);
    expect(causes).toHaveLength(1);
    expect(causes[0]?.id).toBe("js-dependent");
  });

  it("renvoie un tableau vide pour une liste de raisons vide", () => {
    expect(matchReasons([])).toEqual([]);
  });
});

describe("matchReasonsWithSource", () => {
  it("garde le texte technique brut associé à la cause retenue", () => {
    const [first] = matchReasonsWithSource(["http 500"]);
    expect(first?.reason).toBe("http 500");
    expect(first?.cause.id).toBe("http-error");
  });
});

describe("collectUniqueCauses", () => {
  it("déduplique les causes à travers plusieurs bots, dans l'ordre de première apparition", () => {
    const causes = collectUniqueCauses([
      ["robots.txt disallows GPTBot"],
      ["robots.txt disallows ClaudeBot", "noindex"],
    ]);
    expect(causes.map((c) => c.id)).toEqual(["robots-disallow-rule", "noindex"]);
  });

  it("renvoie un tableau vide quand aucun bot n'a de raison", () => {
    expect(collectUniqueCauses([[], []])).toEqual([]);
  });
});

describe("le catalogue ne produit jamais deux causes qui se recouvrent", () => {
  const samples = [
    "robots.txt disallows GPTBot",
    "robots.txt unreachable (full disallow)",
    "access challenged (markup:turnstile)",
    "access blocked (status:403)",
    "js_dependent: 2 words in raw HTML",
    "likely_js_dependent: 2 words in raw HTML",
    "noindex",
    "unreachable: fetch failed",
    "http 500",
  ];

  it("chaque exemple de reason ne correspond qu'à une seule cause du catalogue", () => {
    for (const reason of samples) {
      const matching = REMEDIATION_CAUSES.filter((cause) => cause.matches(reason));
      expect(matching, `« ${reason} » correspond à ${matching.length} causes`).toHaveLength(1);
    }
  });
});
