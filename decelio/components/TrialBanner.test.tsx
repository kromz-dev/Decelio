import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TrialBanner, trialDaysLeft } from "./TrialBanner";

const NOW = new Date("2026-09-27T10:00:00Z");

describe("TrialBanner", () => {
  it("n'affiche rien hors essai", () => {
    expect(renderToStaticMarkup(<TrialBanner trialEndsAt={null} now={NOW} />)).toBe("");
  });

  it("compte les jours restants, arrondis au jour supérieur", () => {
    expect(trialDaysLeft(new Date("2026-10-11T09:00:00Z"), NOW)).toBe(14);
    expect(trialDaysLeft(new Date("2026-09-27T12:00:00Z"), NOW)).toBe(1);
  });

  it("annonce le nombre de jours et la date du premier prélèvement", () => {
    const html = renderToStaticMarkup(<TrialBanner trialEndsAt={new Date("2026-10-04T10:00:00Z")} now={NOW} />);
    expect(html).toContain("7 jours restants");
    expect(html).toContain("Premier prélèvement le 4 octobre");
  });

  it("dit « dernier jour » le dernier jour", () => {
    const html = renderToStaticMarkup(<TrialBanner trialEndsAt={new Date("2026-09-27T20:00:00Z")} now={NOW} />);
    expect(html).toContain("dernier jour");
  });
});
