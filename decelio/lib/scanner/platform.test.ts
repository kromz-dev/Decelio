import { describe, expect, it } from "vitest";
import { detectPlatform } from "./platform";

const html = (head: string, body = "") => `<html><head>${head}</head><body>${body}</body></html>`;

describe("detectPlatform", () => {
  it("returns unknown with no signals for a generic static site", () => {
    const result = detectPlatform({ headers: {}, html: html("<title>Salut</title>", "<p>Bonjour</p>") });
    expect(result.cms).toBe("unknown");
    expect(result.seoPlugin).toBeUndefined();
    expect(result.firewall).toBeUndefined();
    expect(result.host).toBeUndefined();
    expect(result.signals).toEqual([]);
  });

  // ---------------------------------------------------------------------
  // CMS / constructeurs de site
  // ---------------------------------------------------------------------

  it("detects a bare WordPress site via meta generator and wp-content paths", () => {
    const result = detectPlatform({
      headers: {},
      html: html(
        `<meta name="generator" content="WordPress 6.5" />`,
        `<link rel="stylesheet" href="/wp-content/themes/twentytwentyfour/style.css">`,
      ),
    });
    expect(result.cms).toBe("wordpress");
    expect(result.signals).toContain("meta generator: WordPress 6.5");
    expect(result.signals.some((s) => s.includes("/wp-content/"))).toBe(true);
    expect(result.seoPlugin).toBeUndefined();
  });

  it("detects WordPress via /wp-content/ path alone, without a generator meta tag", () => {
    const result = detectPlatform({
      headers: {},
      html: html("", `<img src="/wp-content/uploads/2024/logo.png">`),
    });
    expect(result.cms).toBe("wordpress");
  });

  it("detects Yoast SEO on top of WordPress", () => {
    const result = detectPlatform({
      headers: {},
      html: html(
        `<meta name="generator" content="WordPress 6.5" />
         <!-- This site is optimized with the Yoast SEO plugin v22.1 - https://yoast.com/wordpress/plugins/seo/ -->`,
        `<link rel="stylesheet" href="/wp-content/themes/x/style.css">`,
      ),
    });
    expect(result.cms).toBe("wordpress");
    expect(result.seoPlugin).toBe("yoast");
    expect(result.signals.some((s) => s.includes("Yoast"))).toBe(true);
  });

  it("detects Rank Math on top of WordPress", () => {
    const result = detectPlatform({
      headers: {},
      html: html(
        "",
        `<link rel="stylesheet" href="/wp-content/plugins/seo-by-rank-math/x.css">
         <!-- This site uses the Rank Math WordPress SEO plugin v1.0 -->`,
      ),
    });
    expect(result.cms).toBe("wordpress");
    expect(result.seoPlugin).toBe("rankMath");
  });

  it("detects SEOPress on top of WordPress", () => {
    const result = detectPlatform({
      headers: {},
      html: html("", `<div>Powered by SEOPress - https://www.seopress.org/</div><a href="/wp-content/uploads/x">a</a>`),
    });
    expect(result.cms).toBe("wordpress");
    expect(result.seoPlugin).toBe("seopress");
  });

  it("detects Shopify via the x-shopify-stage header", () => {
    const result = detectPlatform({
      headers: { "x-shopify-stage": "production" },
      html: html("", "<p>boutique</p>"),
    });
    expect(result.cms).toBe("shopify");
    expect(result.signals).toContain("header x-shopify-stage: production");
  });

  it("detects Shopify via cdn.shopify.com references without the header", () => {
    const result = detectPlatform({
      headers: {},
      html: html("", `<link rel="stylesheet" href="https://cdn.shopify.com/s/files/1/theme.css">`),
    });
    expect(result.cms).toBe("shopify");
  });

  it("detects Wix via the x-wix-request-id header", () => {
    const result = detectPlatform({
      headers: { "x-wix-request-id": "abc123" },
      html: html("", "<p>site</p>"),
    });
    expect(result.cms).toBe("wix");
  });

  it("detects Squarespace via static1.squarespace.com references", () => {
    const result = detectPlatform({
      headers: {},
      html: html("", `<img src="https://static1.squarespace.com/static/abc/logo.png">`),
    });
    expect(result.cms).toBe("squarespace");
  });

  it("detects Webflow via the generator meta tag", () => {
    const result = detectPlatform({
      headers: {},
      html: html(`<meta name="generator" content="Webflow" />`, "<p>site</p>"),
    });
    expect(result.cms).toBe("webflow");
  });

  it("detects Drupal via the X-Generator header", () => {
    const result = detectPlatform({
      headers: { "x-generator": "Drupal 10 (https://www.drupal.org)" },
      html: html("", "<p>site</p>"),
    });
    expect(result.cms).toBe("drupal");
  });

  it("detects PrestaShop via distinctive script globals", () => {
    const result = detectPlatform({
      headers: {},
      html: html("", `<script>var prestashop = { urls: {} };</script>`),
    });
    expect(result.cms).toBe("prestashop");
  });

  it("detects a custom Next.js/Nuxt site via the x-powered-by header", () => {
    const result = detectPlatform({
      headers: { "x-powered-by": "Next.js" },
      html: html("", `<div id="__next"><p>contenu</p></div>`),
    });
    expect(result.cms).toBe("customNextNuxt");
  });

  it("detects a custom Next.js site via __NEXT_DATA__ without the header", () => {
    const result = detectPlatform({
      headers: {},
      html: html("", `<script id="__next-data__" type="application/json">{}</script><div id="__NEXT_DATA__"></div>`),
    });
    expect(result.cms).toBe("customNextNuxt");
  });

  it("detects a custom Nuxt site via the __NUXT__ global", () => {
    const result = detectPlatform({
      headers: {},
      html: html("", `<div id="__nuxt"></div><script>window.__NUXT__={}</script>`),
    });
    expect(result.cms).toBe("customNextNuxt");
  });

  it("detects a generic React/Vue SPA shell without a Next/Nuxt signal", () => {
    const result = detectPlatform({
      headers: {},
      html: html("", `<div id="root"></div><script src="/static/js/bundle.js"></script>`),
    });
    expect(result.cms).toBe("customReactVue");
  });

  it("returns unknown when CMS signals contradict each other", () => {
    const result = detectPlatform({
      headers: { "x-shopify-stage": "production" },
      html: html(`<meta name="generator" content="WordPress 6.5" />`, ""),
    });
    expect(result.cms).toBe("unknown");
    expect(result.signals.length).toBeGreaterThan(1);
  });

  // ---------------------------------------------------------------------
  // Pare-feu / CDN
  // ---------------------------------------------------------------------

  it("detects Cloudflare via the cf-ray header", () => {
    const result = detectPlatform({ headers: { "cf-ray": "abcd1234-CDG" }, html: html("", "") });
    expect(result.firewall).toBe("cloudflare");
  });

  it("detects Cloudflare via the server header", () => {
    const result = detectPlatform({ headers: { server: "cloudflare" }, html: html("", "") });
    expect(result.firewall).toBe("cloudflare");
  });

  it("detects Sucuri via the x-sucuri-id header", () => {
    const result = detectPlatform({ headers: { "x-sucuri-id": "12345" }, html: html("", "") });
    expect(result.firewall).toBe("sucuri");
  });

  it("detects Imperva via the x-iinfo header", () => {
    const result = detectPlatform({ headers: { "x-iinfo": "1-1234-1234" }, html: html("", "") });
    expect(result.firewall).toBe("imperva");
  });

  it("detects Wordfence via its block page footer text", () => {
    const result = detectPlatform({
      headers: {},
      html: html("", "<p>Generated by Wordfence at Fri, 27 Sep 2026</p>"),
    });
    expect(result.firewall).toBe("wordfence");
  });

  it("returns no firewall when signals are contradictory", () => {
    const result = detectPlatform({
      headers: { "cf-ray": "abcd1234-CDG", "x-sucuri-id": "12345" },
      html: html("", ""),
    });
    expect(result.firewall).toBeUndefined();
    expect(result.signals.some((s) => s.includes("cf-ray"))).toBe(true);
    expect(result.signals.some((s) => s.includes("x-sucuri-id"))).toBe(true);
  });

  it("returns no host when no header or html reveals the hosting provider", () => {
    const result = detectPlatform({ headers: { server: "nginx" }, html: html("", "<p>site</p>") });
    expect(result.host).toBeUndefined();
  });

  it("detects OVH when a header literally names it", () => {
    const result = detectPlatform({ headers: { "x-hebergeur": "OVH" }, html: html("", "") });
    expect(result.host).toBe("ovh");
  });

  // ---------------------------------------------------------------------
  // Robustesse
  // ---------------------------------------------------------------------

  it("does not throw on empty input", () => {
    const result = detectPlatform({ headers: {}, html: "" });
    expect(result.cms).toBe("unknown");
    expect(result.signals).toEqual([]);
  });

  it("bounds analysis to a reasonable prefix of very large HTML", () => {
    const huge = "<html><body>" + "x".repeat(5_000_000) + `<meta name="generator" content="WordPress" />` + "</body></html>";
    const start = Date.now();
    const result = detectPlatform({ headers: {}, html: huge });
    expect(Date.now() - start).toBeLessThan(500);
    // Le signal est hors de la fenêtre analysée : pas de faux positif tardif.
    expect(result.cms).toBe("unknown");
  });
});
