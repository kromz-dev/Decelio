import { describe, expect, it } from "vitest";
import { verdictForSiteStatus } from "./site-status";

describe("verdictForSiteStatus", () => {
  it("distingue un blocage d'une erreur technique", () => {
    expect(verdictForSiteStatus("BLOQUÉ")).toBe("refuse");
    expect(verdictForSiteStatus("ERREUR")).toBe("inconnu");
    expect(verdictForSiteStatus("BLOQUÉ")).not.toBe(verdictForSiteStatus("ERREUR"));
  });

  it("retourne 'inconnu' pour un statut à vérifier", () => {
    expect(verdictForSiteStatus("À VÉRIFIER")).toBe("inconnu");
  });
});
