import { describe, expect, it } from "vitest";
import { REMEDIATION_CAUSES } from "./catalog";
import { remediationForPlatform } from "./platformMatch";
import type { PlatformDetection } from "../scanner/platform";

const robotsDisallow = REMEDIATION_CAUSES.find((c) => c.id === "robots-disallow-rule");
const accessChallenged = REMEDIATION_CAUSES.find((c) => c.id === "access-challenged");

if (!robotsDisallow || !accessChallenged) {
  throw new Error("Causes de test introuvables dans le catalogue : le catalogue a changé.");
}

describe("remediationForPlatform", () => {
  it("met en tête les étapes WordPress/Yoast et Cloudflare quand les deux sont détectés", () => {
    const platform: PlatformDetection = {
      cms: "wordpress",
      seoPlugin: "yoast",
      firewall: "cloudflare",
      signals: ["indice quelconque"],
    };

    const result = remediationForPlatform(accessChallenged, platform);

    expect(result.usedGeneralSteps).toBe(false);
    expect(result.cmsLabel).toBe("WordPress — Yoast SEO");
    // `access-challenged` ne porte pas de marche à suivre par CMS (le
    // blocage est réseau, pas applicatif) : seul le pare-feu s'applique ici.
    expect(result.cms).toBeUndefined();
    expect(result.firewalls).toHaveLength(1);
    expect(result.firewalls[0].key).toBe("cloudflare");
    expect(result.firewalls[0].guidance.steps.length).toBeGreaterThan(0);
  });

  it("met en tête les étapes propres à WordPress/Yoast pour une cause qui en porte", () => {
    const platform: PlatformDetection = {
      cms: "wordpress",
      seoPlugin: "yoast",
      signals: ["indice quelconque"],
    };

    const result = remediationForPlatform(robotsDisallow, platform);

    expect(result.usedGeneralSteps).toBe(false);
    expect(result.cms?.key).toBe("wordpressYoast");
    expect(result.cms?.guidance.steps.length).toBeGreaterThan(0);
  });

  it("met en tête les étapes Shopify quand la plateforme détectée est Shopify", () => {
    const platform: PlatformDetection = {
      cms: "shopify",
      signals: ["indice quelconque"],
    };

    const result = remediationForPlatform(robotsDisallow, platform);

    expect(result.usedGeneralSteps).toBe(false);
    expect(result.cmsLabel).toBe("Shopify");
    expect(result.cms?.key).toBe("shopify");
    expect(result.firewalls).toHaveLength(0);
  });

  it("retombe sur les étapes génériques quand le cms détecté est unknown", () => {
    const platform: PlatformDetection = {
      cms: "unknown",
      signals: [],
    };

    const result = remediationForPlatform(robotsDisallow, platform);

    expect(result.usedGeneralSteps).toBe(true);
    expect(result.cmsLabel).toBeUndefined();
    expect(result.cms).toBeUndefined();
    expect(result.firewalls).toHaveLength(0);
  });

  it("retombe sur les étapes génériques quand platform est absent", () => {
    const result = remediationForPlatform(robotsDisallow, undefined);

    expect(result.usedGeneralSteps).toBe(true);
    expect(result.cmsLabel).toBeUndefined();
  });

  it("retombe sur les étapes génériques quand l'entrée du catalogue est supported: false", () => {
    // Squarespace n'a pas d'entrée dédiée dans `AI_BOT_FIREWALL_GUIDANCE` /
    // `cms` pour `access-challenged` : aucune correspondance supportée, donc
    // repli générique attendu.
    const platform: PlatformDetection = {
      cms: "squarespace",
      signals: ["indice quelconque"],
    };

    const result = remediationForPlatform(accessChallenged, platform);

    expect(result.usedGeneralSteps).toBe(true);
    expect(result.cms).toBeUndefined();
    expect(result.firewalls).toHaveLength(0);
    // Le libellé de plateforme détectée reste renseigné : l'honnêteté porte
    // sur la certitude affichée, pas sur la disponibilité d'un correctif.
    expect(result.cmsLabel).toBe("Squarespace");
  });

  it("garde la mention unverified visible quand l'entrée du catalogue en porte une", () => {
    const platform: PlatformDetection = {
      cms: "squarespace",
      signals: ["indice quelconque"],
    };

    const result = remediationForPlatform(robotsDisallow, platform);

    expect(result.cms?.guidance.unverified).toBe(true);
  });

  it("retient à la fois le pare-feu et l'hébergeur quand les deux sont détectés", () => {
    const platform: PlatformDetection = {
      cms: "unknown",
      firewall: "cloudflare",
      host: "o2switch",
      signals: [],
    };

    // Ici cms === "unknown" : par construction, on retombe sur les étapes
    // génériques même si un pare-feu et un hébergeur ont été détectés — voir
    // la documentation de `remediationForPlatform`.
    const result = remediationForPlatform(accessChallenged, platform);
    expect(result.usedGeneralSteps).toBe(true);
  });

  it("retient le pare-feu et l'hébergeur ensemble quand le cms est aussi connu", () => {
    const platform: PlatformDetection = {
      cms: "wordpress",
      firewall: "cloudflare",
      host: "o2switch",
      signals: [],
    };

    const result = remediationForPlatform(accessChallenged, platform);
    expect(result.usedGeneralSteps).toBe(false);
    const keys = result.firewalls.map((f) => f.key);
    expect(keys).toContain("cloudflare");
  });
});
