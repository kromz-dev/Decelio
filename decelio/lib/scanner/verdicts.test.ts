import { describe, expect, it } from "vitest";
import { accessSummary, jsSummary, robotsSummary, verdictForBot } from "./verdicts";
import type { ScanReport } from "./core";

/**
 * Rapport minimal mais complet : chaque test ne modifie que les champs
 * pertinents pour le verdict qu'il vérifie.
 */
function makeReport(overrides: {
  access?: Partial<ScanReport["access"]>;
  robots?: Partial<ScanReport["robots"]>;
  jsDependency?: Partial<ScanReport["jsDependency"]>;
} = {}): ScanReport {
  return {
    url: "https://example.com",
    finalUrl: "https://example.com/",
    scannedAt: "2026-09-24T10:00:00.000Z",
    robots: {
      url: "https://example.com/robots.txt",
      fetchStatus: "ok",
      httpStatus: 200,
      path: "/",
      sitemaps: [],
      policies: [
        { bot: "OAI-SearchBot", token: "OAI-SearchBot", purpose: "search", verdict: "allowed", group: "none", rule: null },
        { bot: "Claude-SearchBot", token: "Claude-SearchBot", purpose: "search", verdict: "allowed", group: "none", rule: null },
        { bot: "PerplexityBot", token: "PerplexityBot", purpose: "search", verdict: "allowed", group: "none", rule: null },
      ],
      ...overrides.robots,
    },
    access: {
      risk: "ok",
      httpStatus: 200,
      finalUrl: "https://example.com/",
      redirects: [],
      signals: [],
      durationMs: 120,
      userAgent: "DecelioBot/1.0",
      unverifiedProbes: [],
      ...overrides.access,
    },
    jsDependency: {
      verdict: "static",
      rawWordCount: 300,
      renderedWordCount: 300,
      rawToRenderedRatio: 1,
      hasAppRoot: false,
      renderer: "none",
      ...overrides.jsDependency,
    },
    indexing: { sources: [], perBot: [] },
  } as ScanReport;
}

describe("verdictForBot", () => {
  it("returns 'lu' when the site is reachable, allowed, and not JS-dependent", () => {
    const report = makeReport();
    expect(verdictForBot(report, "OAI-SearchBot").value).toBe("lu");
  });

  it("returns 'inconnu' when the site is unreachable", () => {
    const report = makeReport({ access: { risk: "unreachable", error: "timeout" } });
    const result = verdictForBot(report, "OAI-SearchBot");
    expect(result.value).toBe("inconnu");
    expect(result.cause).toContain("timeout");
  });

  it("returns 'refuse' when robots.txt disallows the bot's token", () => {
    const report = makeReport({
      robots: {
        policies: [
          { bot: "OAI-SearchBot", token: "OAI-SearchBot", purpose: "search", verdict: "disallowed", group: "none", rule: null },
        ],
      },
    });
    const result = verdictForBot(report, "OAI-SearchBot");
    expect(result.value).toBe("refuse");
    expect(result.fix).toBeDefined();
  });

  it("returns 'refuse' when access is blocked by a firewall challenge", () => {
    const report = makeReport({ access: { risk: "challenged", signals: ["markup:turnstile"] } });
    expect(verdictForBot(report, "OAI-SearchBot").value).toBe("refuse");
  });

  it("returns 'vide' when the raw HTML is JS-dependent", () => {
    const report = makeReport({ jsDependency: { verdict: "js_dependent", rawWordCount: 5 } });
    const result = verdictForBot(report, "OAI-SearchBot");
    expect(result.value).toBe("vide");
    expect(result.fix).toBeDefined();
  });
});

describe("robotsSummary", () => {
  it("returns 'lu' when robots.txt allows all three assistants", () => {
    expect(robotsSummary(makeReport()).value).toBe("lu");
  });

  it("returns 'refuse' and names the disallowed assistants", () => {
    const report = makeReport({
      robots: {
        policies: [
          { bot: "OAI-SearchBot", token: "OAI-SearchBot", purpose: "search", verdict: "disallowed", group: "none", rule: null },
        ],
      },
    });
    const result = robotsSummary(report);
    expect(result.value).toBe("refuse");
    expect(result.cause).toContain("ChatGPT");
  });

  it("returns 'lu' when robots.txt does not exist (404)", () => {
    expect(robotsSummary(makeReport({ robots: { fetchStatus: "unavailable" } })).value).toBe("lu");
  });

  it("returns 'inconnu', never 'lu', when robots.txt is refused by the server (403 without challenge)", () => {
    const result = robotsSummary(makeReport({ robots: { fetchStatus: "blocked" } }));
    expect(result.value).toBe("inconnu");
    expect(result.cause).toContain("À vérifier");
  });

  it("returns 'inconnu' when robots.txt is unreachable", () => {
    expect(robotsSummary(makeReport({ robots: { fetchStatus: "unreachable" } })).value).toBe("inconnu");
  });
});

describe("accessSummary", () => {
  it("returns 'lu' for a normal 2xx response", () => {
    expect(accessSummary(makeReport()).value).toBe("lu");
  });

  it("returns 'refuse' when blocked with an HTTP error status", () => {
    const result = accessSummary(makeReport({ access: { risk: "blocked", httpStatus: 403 } }));
    expect(result.value).toBe("refuse");
    expect(result.cause).toContain("403");
  });

  it("returns 'inconnu' when the site is unreachable", () => {
    expect(accessSummary(makeReport({ access: { risk: "unreachable" } })).value).toBe("inconnu");
  });
});

describe("jsSummary", () => {
  it("returns 'lu' when the raw HTML already contains the text", () => {
    expect(jsSummary(makeReport()).value).toBe("lu");
  });

  it("returns 'inconnu' when access failed, since JS dependency was not measured", () => {
    const result = jsSummary(makeReport({ access: { risk: "unreachable" } }));
    expect(result.value).toBe("inconnu");
  });

  it("returns 'vide' when the page is fully JS-dependent", () => {
    const result = jsSummary(makeReport({ jsDependency: { verdict: "js_dependent", rawWordCount: 3, renderedWordCount: 400 } }));
    expect(result.value).toBe("vide");
    expect(result.fix).toBeDefined();
  });

  it("returns 'vide' for a partially JS-dependent page", () => {
    const result = jsSummary(
      makeReport({ jsDependency: { verdict: "partial", rawWordCount: 50, renderedWordCount: 400 } })
    );
    expect(result.value).toBe("vide");
  });
});
