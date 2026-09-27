import { describe, expect, it } from "vitest";
import { describePlatform } from "./platformLabel";

describe("describePlatform", () => {
  it("ne dit rien quand la plateforme est inconnue ou absente", () => {
    expect(describePlatform(undefined)).toBeNull();
    expect(describePlatform({ cms: "unknown", firewall: "cloudflare", signals: ["cf-ray"] })).toBeNull();
  });

  it("assemble CMS, extension SEO, pare-feu et hébergeur", () => {
    expect(
      describePlatform({ cms: "wordpress", seoPlugin: "yoast", firewall: "cloudflare", host: "ovh", signals: [] }),
    ).toBe("WordPress, Yoast SEO, derrière Cloudflare, hébergé chez OVHcloud");
  });

  it("n'expose jamais les signaux bruts", () => {
    const label = describePlatform({ cms: "shopify", signals: ["header x-shopify-stage: production"] });
    expect(label).toBe("Shopify");
    expect(label).not.toContain("x-shopify");
  });
});
