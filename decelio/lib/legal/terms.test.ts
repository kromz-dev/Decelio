import { describe, expect, it } from "vitest";
import { TERMS_VERSION } from "./terms";

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
