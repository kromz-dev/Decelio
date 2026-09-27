import { describe, expect, it } from "vitest";
import {
  analyzeJsDependency,
  classifyAccess,
  detectChallenge,
  indexingForBot,
  parseIndexingDirectives,
  parseXRobotsTag,
} from "./analyzer";
import type { CrawlResult } from "./crawler";

const crawl = (status: number, html = "", headers: Record<string, string> = {}): CrawlResult => ({
  url: "https://example.com/",
  finalUrl: "https://example.com/",
  userAgent: "DecelioBot/1.0",
  status,
  headers,
  html,
  redirects: [],
  durationMs: 12,
});

describe("detectChallenge", () => {
  it("detects the cf-mitigated: challenge header even on a 200", () => {
    const d = detectChallenge(crawl(200, "<html></html>", { "cf-mitigated": "challenge" }));
    expect(d).toEqual({ challenged: true, blocked: false, signals: ["header:cf-mitigated=challenge"] });
  });

  it("detects the Cloudflare interstitial markup on a 403 / 503", () => {
    const page = '<html><head><title>Just a moment...</title></head><body><script>window._cf_chl_opt={}</script></body></html>';
    const d = detectChallenge(crawl(503, page));
    expect(d.challenged).toBe(true);
    expect(d.signals).toEqual(["markup:just-a-moment", "markup:cf-challenge-platform", "status:503"]);
  });

  it("detects Turnstile widgets", () => {
    const page = '<div class="cf-turnstile" data-sitekey="x"></div><script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script>';
    const d = detectChallenge(crawl(200, page));
    expect(d.challenged).toBe(true);
    expect(d.signals).toContain("markup:turnstile");
  });

  it("classifies a bare 403 or 503 as blocked, not challenged", () => {
    expect(detectChallenge(crawl(403, "Forbidden"))).toEqual({ challenged: false, blocked: true, signals: ["status:403"] });
    expect(detectChallenge(crawl(503, "Maintenance")).blocked).toBe(true);
  });

  it("does not flag a normal page that mentions Cloudflare", () => {
    const d = detectChallenge(crawl(200, "<title>Our CDN</title><p>We use Cloudflare. Just a moment of your time.</p>"));
    expect(d).toEqual({ challenged: false, blocked: false, signals: [] });
  });

  it("flags the Akamai Bot Manager deny page (Access Denied + Reference #) as challenged", () => {
    const page =
      "<html><body><h1>Access Denied</h1><p>You don't have permission to access this resource.</p>" +
      "<p>Reference #18.7c1d5f68.1732000000.abcdef</p></body></html>";
    const d = detectChallenge(crawl(403, page, { server: "AkamaiGHost" }));
    expect(d.challenged).toBe(true);
    expect(d.signals).toContain("markup:akamai-access-denied");
  });

  it("does not flag a normal 200 response that merely carries Akamai's _abck/ak_bmsc cookies", () => {
    // _abck/ak_bmsc only prove Bot Manager is deployed, not that this request was blocked
    // (see cited sources on the Akamai signal in analyzer.ts). A 200 must stay unchallenged.
    const d = detectChallenge(
      crawl(200, "<html><body>Bienvenue</body></html>", {
        "set-cookie": "_abck=0~-1~abcdef; path=/; ak_bmsc=deadbeef; path=/",
      }),
    );
    expect(d).toEqual({ challenged: false, blocked: false, signals: [] });
  });
});

describe("classifyAccess", () => {
  it.each([
    [crawl(200, "<p>hi</p>"), "ok"],
    [crawl(403, "<title>Just a moment...</title>"), "challenged"],
    [crawl(429, ""), "blocked"],
    [crawl(404, "Not found"), "http_error"],
    [{ ...crawl(0), error: "fetch failed" }, "unreachable"],
  ] as const)("%#: %s", (result, risk) => {
    expect(classifyAccess(result).risk).toBe(risk);
  });
});

describe("meta robots and X-Robots-Tag", () => {
  it("parses generic and bot-scoped X-Robots-Tag values", () => {
    expect(parseXRobotsTag("noindex, nofollow")).toEqual([{ source: "header", target: "*", directives: ["noindex", "nofollow"] }]);
    expect(parseXRobotsTag("googlebot: noindex, max-snippet: 20, GPTBot: none")).toEqual([
      { source: "header", target: "googlebot", directives: ["noindex", "max-snippet: 20"] },
      { source: "header", target: "gptbot", directives: ["none"] },
    ]);
    expect(parseXRobotsTag("unavailable_after: 2030-01-01")).toEqual([
      { source: "header", target: "*", directives: ["unavailable_after: 2030-01-01"] },
    ]);
  });

  it("parses meta robots tags regardless of attribute order", () => {
    const html = `<html><head>
      <meta name="viewport" content="width=device-width">
      <meta data-name="robots" name="description" content="noindex is not a directive here">
      <meta content="NOINDEX" name="robots">
      <meta name='ClaudeBot' content='nofollow'>
    </head><body></body></html>`;
    expect(parseIndexingDirectives({ headers: {}, html }).sources).toEqual([
      { source: "meta", target: "*", directives: ["noindex"] },
      { source: "meta", target: "claudebot", directives: ["nofollow"] },
    ]);
  });

  it("applies only generic directives and those naming the bot", () => {
    const directives = parseIndexingDirectives({
      headers: { "x-robots-tag": "gptbot: noindex" },
      html: '<head><meta name="claudebot" content="none"></head>',
    });
    expect(indexingForBot(directives, "GPTBot")).toEqual({ bot: "GPTBot", noindex: true, nofollow: false });
    expect(indexingForBot(directives, "ClaudeBot")).toEqual({ bot: "ClaudeBot", noindex: true, nofollow: true });
    expect(indexingForBot(directives, "PerplexityBot")).toEqual({ bot: "PerplexityBot", noindex: false, nofollow: false });
  });
});

describe("analyzeJsDependency", () => {
  const words = (n: number) => `<html><body><p>${"mot ".repeat(n)}</p></body></html>`;

  it("uses the raw-HTML heuristic when no renderer is available", () => {
    expect(analyzeJsDependency('<div id="app"></div>', null)).toMatchObject({ verdict: "likely_js_dependent", hasAppRoot: true, renderedWordCount: null });
    expect(analyzeJsDependency(words(200), null).verdict).toBe("static");
  });

  it("compares raw and rendered text", () => {
    expect(analyzeJsDependency(words(10), words(300))).toMatchObject({ verdict: "js_dependent", rawWordCount: 10, renderedWordCount: 300 });
    expect(analyzeJsDependency(words(100), words(300)).verdict).toBe("partial");
    expect(analyzeJsDependency(words(290), words(300)).verdict).toBe("static");
  });
});
