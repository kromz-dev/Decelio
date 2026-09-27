import { describe, expect, it } from "vitest";
import { functions } from "./functions";

/**
 * Garde-fou de régression.
 *
 * `monthlyReportDispatcher` et `monthlyReportGenerator` existaient, étaient
 * testés, mais n'étaient pas inscrits dans `functions.ts` : le rapport mensuel
 * en marque blanche — la contrepartie des plans PRO et SCALE — n'a donc jamais
 * été envoyé. Rien ne le signalait, puisque la fonction n'échouait pas : elle
 * n'était simplement jamais appelée.
 *
 * Une fonction Inngest absente de ce tableau ne tourne pas. La liste ci-dessous
 * est donc volontairement exhaustive : en ajoutant une fonction, ce test
 * échoue tant qu'on ne l'a pas inscrite ET listée ici.
 */
const ATTENDUS = [
  "daily-scan-dispatcher",
  "discovery-email-send",
  "monthly-report-dispatcher",
  "monthly-report-generate",
  "prune-scan-logs",
  "purge-cancelled-accounts",
  "scan-single-site",
  "send-discovery-email",
];

describe("registre des fonctions Inngest", () => {
  const ids = functions.map((fn) => fn.id(""));

  it("inscrit exactement les fonctions attendues", () => {
    expect([...ids].sort()).toEqual([...ATTENDUS].sort());
  });

  it("n'inscrit jamais deux fois le même identifiant", () => {
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("inscrit le rapport mensuel, dont dépendent les plans PRO et SCALE", () => {
    expect(ids).toContain("monthly-report-dispatcher");
    expect(ids).toContain("monthly-report-generate");
  });
});
