import { describe, expect, it } from "vitest";
import { TERMS_VERSION, TERMS_UPDATED_LABEL, formatTermsDate } from "./terms";

describe("TERMS_VERSION", () => {
  it("porte une date au format AAAA-MM-JJ, avec un suffixe optionnel pour deux versions le même jour", () => {
    expect(TERMS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}(-\d+)?$/);
  });

  it("est une date réelle du calendrier", () => {
    const [annee, mois, jour] = TERMS_VERSION.split("-").map(Number);
    const date = new Date(Date.UTC(annee, mois - 1, jour));

    expect(date.getUTCFullYear()).toBe(annee);
    expect(date.getUTCMonth()).toBe(mois - 1);
    expect(date.getUTCDate()).toBe(jour);
  });
});

describe("TERMS_UPDATED_LABEL", () => {
  it("vaut la date lisible en français correspondant à TERMS_VERSION", () => {
    expect(TERMS_UPDATED_LABEL).toBe("27 septembre 2026");
  });
});

describe("formatTermsDate", () => {
  it("ignore le suffixe de version (deux textes publiés le même jour partagent la même date affichée)", () => {
    expect(formatTermsDate("2026-09-27")).toBe(formatTermsDate("2026-09-27-2"));
    expect(formatTermsDate("2026-09-27-2")).toBe("27 septembre 2026");
  });

  it("formate un mois au nom court", () => {
    expect(formatTermsDate("2026-01-05")).toBe("5 janvier 2026");
  });

  it("formate une date de fin d'année", () => {
    expect(formatTermsDate("2025-12-31")).toBe("31 décembre 2025");
  });

  it("ne rembourre pas le jour d'un zéro", () => {
    expect(formatTermsDate("2026-03-01")).toBe("1 mars 2026");
  });
});
