import { describe, expect, it } from "vitest";
import { calculateVisibilityScore, scoreWithConfidence } from "./visibility";

describe("visibility scoring", () => {
  it("sépare présence, rang et citations", () => {
    const report = calculateVisibilityScore([
      {
        engineId: "GEMINI",
        isMentioned: true,
        position: 1,
        family: "SOLUTION",
        citationCount: 2,
        hasBrandCitation: true,
      },
      {
        engineId: "GEMINI",
        isMentioned: true,
        position: null,
        family: "PROBLEM",
        citationCount: 0,
        hasBrandCitation: false,
      },
      {
        engineId: "GEMINI",
        isMentioned: false,
        position: null,
        family: "COMPARISON",
        citationCount: 1,
        hasBrandCitation: false,
      },
    ]);

    expect(report.visibilityRate).toBe(66.7);
    expect(report.rankScore).toBe(33.3);
    expect(report.globalScore).toBe(report.rankScore);
    expect(report.citationRate).toBe(66.7);
    expect(report.brandCitationRate).toBe(33.3);
    expect(report.problemScore).toBe(0);
    expect(report.solutionScore).toBe(100);
    expect(report.comparisonScore).toBe(0);
  });

  it("ne calcule pas de score de citation si la donnée manque", () => {
    const report = calculateVisibilityScore([
      { engineId: "GEMINI", isMentioned: false, position: null },
    ]);
    expect(report.citationRate).toBeNull();
    expect(report.brandCitationRate).toBeNull();
  });

  it("retourne une marge nulle pour un seul run", () => {
    expect(
      scoreWithConfidence([
        { engineId: "GEMINI", isMentioned: true, position: 1 },
      ]),
    ).toEqual({ score: 100, marginOfError: null });
  });
});

describe("marge d'erreur non estimable", () => {
  // Regression : une observation unique renvoyait `marginOfError: 0`, soit une
  // certitude parfaite affichee au client a partir d'une seule requete.
  it("rend null sous deux observations, jamais zero", () => {
    expect(scoreWithConfidence([{ engineId: "GEMINI", isMentioned: true, position: 1 }]).marginOfError).toBeNull();
    expect(scoreWithConfidence([]).marginOfError).toBeNull();
  });

  it("estime la marge des deux observations", () => {
    const r = scoreWithConfidence([
      { engineId: "GEMINI", isMentioned: true, position: 1 },
      { engineId: "GEMINI", isMentioned: false, position: null },
    ]);
    expect(r.marginOfError).not.toBeNull();
    expect(r.marginOfError).toBeGreaterThan(0);
  });
});
