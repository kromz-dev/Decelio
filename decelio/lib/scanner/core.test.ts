import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]),
}));

import { mapStatusToSimple, runCoreScan, runScan } from "./core";
import { Renderer } from "./renderer";

type Handler = (url: string, userAgent: string) => Response | Promise<Response>;

function stubFetch(handler: Handler) {
  const fn = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const ua = (init?.headers as Record<string, string>)?.["User-Agent"] ?? "";
    return handler(String(input), ua);
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

const html = (body: string, head = "") => `<html><head>${head}</head><body>${body}</body></html>`;
const LONG_PAGE = html(`<p>Un texte très long pour que ça dépasse 50 mots. ${"mot ".repeat(60)}</p>`);

describe("mapStatusToSimple", () => {
  it("maps correctly", () => {
    expect(mapStatusToSimple("ACCESSIBLE")).toBe("OK");
    expect(mapStatusToSimple("BLOCKED_403")).toBe("BLOQUÉ");
    expect(mapStatusToSimple("BLOCKED_CAPTCHA")).toBe("BLOQUÉ");
    expect(mapStatusToSimple("EMPTY_JS_REQUIRED")).toBe("COQUILLE VIDE");
    expect(mapStatusToSimple("ERROR")).toBe("ERREUR");
  });
});

describe("runScan", () => {
  beforeEach(() => vi.unstubAllGlobals());
  afterEach(() => vi.unstubAllGlobals());

  it("sends an honest DecelioBot User-Agent by default", async () => {
    const fetchMock = stubFetch((url) =>
      url.endsWith("/robots.txt") ? new Response("", { status: 404 }) : new Response(LONG_PAGE),
    );
    const report = await runScan("https://example.com/");
    const uas = fetchMock.mock.calls.map(([, init]) => (init?.headers as Record<string, string>)["User-Agent"]);
    expect(uas.length).toBeGreaterThan(0);
    for (const ua of uas) expect(ua).toMatch(/^DecelioBot\/1\.0 \(\+https?:\/\/.+\)$/);
    expect(report.access.userAgent).toMatch(/^DecelioBot\/1\.0/);
    expect(report.access.unverifiedProbes).toEqual([]);
  });

  it("returns robots.txt policy, access risk and JS dependency as separate results", async () => {
    stubFetch((url) => {
      if (url.endsWith("/robots.txt")) {
        return new Response("User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nAllow: /\n");
      }
      return new Response(html('<div id="root"></div>'), { headers: { "x-robots-tag": "noindex" } });
    });
    const report = await runScan("https://example.com/");

    expect(report.robots.fetchStatus).toBe("ok");
    expect(report.robots.policies.find((p) => p.bot === "GPTBot")).toMatchObject({ verdict: "disallowed", group: "specific", purpose: "training" });
    expect(report.robots.policies.find((p) => p.bot === "OAI-SearchBot")).toMatchObject({ verdict: "allowed", group: "wildcard", purpose: "search" });

    expect(report.access.risk).toBe("ok");
    expect(report.jsDependency).toMatchObject({ verdict: "likely_js_dependent", hasAppRoot: true, renderedWordCount: null, renderer: "none" });
    expect(report.indexing.perBot.find((i) => i.bot === "ClaudeBot")?.noindex).toBe(true);
  });

  it("compares raw and rendered text when a renderer is provided", async () => {
    stubFetch((url) =>
      url.endsWith("/robots.txt") ? new Response("", { status: 404 }) : new Response(html('<div id="root"></div>')),
    );
    const renderer: Renderer = { name: "fake", render: async () => LONG_PAGE };
    const report = await runScan("https://example.com/", { renderer });
    expect(report.jsDependency).toMatchObject({ verdict: "js_dependent", rawWordCount: 0, renderer: "fake" });
    expect(report.jsDependency.renderedWordCount).toBeGreaterThan(50);
  });

  it("follows the redirect before reading robots.txt of the content origin", async () => {
    const fetchMock = stubFetch((url) => {
      if (url === "http://example.com/") return new Response(null, { status: 301, headers: { location: "https://www.example.com/" } });
      if (url === "https://www.example.com/robots.txt") return new Response("User-agent: *\nDisallow: /\n");
      return new Response(LONG_PAGE);
    });
    const report = await runScan("http://example.com/");
    expect(report.finalUrl).toBe("https://www.example.com/");
    expect(report.access.risk).toBe("ok");
    expect(report.access.redirects).toHaveLength(1);
    expect(report.robots.url).toBe("https://www.example.com/robots.txt");
    expect(fetchMock.mock.calls.map(([u]) => String(u))).toContain("https://www.example.com/robots.txt");
  });

  it("fills in the platform detection from the honest page's headers and HTML", async () => {
    stubFetch((url) =>
      url.endsWith("/robots.txt")
        ? new Response("", { status: 404 })
        : new Response(html(`<meta name="generator" content="WordPress 6.5" />`, "<p>bonjour</p>"), {
            headers: { "cf-ray": "abcd1234-CDG" },
          }),
    );
    const report = await runScan("https://example.com/");
    expect(report.platform?.cms).toBe("wordpress");
    expect(report.platform?.firewall).toBe("cloudflare");
  });

  it("omits the platform detection when the honest page could not be reached", async () => {
    stubFetch(() => {
      throw new Error("network down");
    });
    const report = await runScan("https://example.com/");
    expect(report.access.risk).toBe("unreachable");
    expect(report.platform).toBeUndefined();
  });
});

describe("runCoreScan", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("identifies OK, BLOQUÉ and COQUILLE VIDE", async () => {
    stubFetch((url) => {
      if (url.endsWith("/robots.txt")) return new Response("", { status: 404 });
      if (url.includes("challenge")) {
        return new Response(html("", "<title>Just a moment...</title>"), { status: 403, headers: { "cf-mitigated": "challenge" } });
      }
      if (url.includes("spa")) return new Response(html('<div id="root"></div>'));
      return new Response(LONG_PAGE);
    });

    const ok = await runCoreScan("https://example.com", ["PerplexityBot"]);
    expect(ok.results[0]).toMatchObject({ agent: "PerplexityBot", simpleStatus: "OK", httpStatus: 200 });

    // Blocage général (règle 1) : le challenge répond à toute UA sur ce domaine,
    // y compris la sonde GPTBot (même statut, même page) : aucune preuve ne
    // vise GPTBot en particulier, donc « À VÉRIFIER », jamais BLOQUÉ.
    const blocked = await runCoreScan("https://challenge.example.com", ["GPTBot"]);
    expect(blocked.results[0]).toMatchObject({ simpleStatus: "À VÉRIFIER", httpStatus: 403 });
    expect(blocked.report.access.risk).toBe("challenged");

    const empty = await runCoreScan("https://spa.example.com", ["ClaudeBot"]);
    expect(empty.results[0]).toMatchObject({ simpleStatus: "COQUILLE VIDE", httpStatus: 200 });
  });

  it("marks every bot À VÉRIFIER (never BLOQUÉ) when the honest request itself gets a general 403", async () => {
    // Reproduction du défaut réel (bug report) : un hôte qui répond 403 à
    // tout, y compris DecelioBot. Rien ne prouve que GPTBot, ClaudeBot ou
    // PerplexityBot soient visés en particulier.
    stubFetch(() => new Response("Forbidden", { status: 403 }));
    const { report, results } = await runCoreScan("https://example.com", [
      "GPTBot",
      "ClaudeBot",
      "PerplexityBot",
    ]);
    expect(report.access.risk).toBe("blocked");
    expect(report.access.httpStatus).toBe(403);
    for (const result of results) {
      expect(result.simpleStatus, `${result.agent} doit être À VÉRIFIER`).toBe("À VÉRIFIER");
    }
  });

  it("marks a bot BLOQUÉ when robots.txt disallows it even if the page loads", async () => {
    stubFetch((url) =>
      url.endsWith("/robots.txt")
        ? new Response("User-agent: ClaudeBot\nDisallow: /\n")
        : new Response(LONG_PAGE),
    );
    const { results } = await runCoreScan("https://example.com", ["ClaudeBot", "GPTBot"]);
    expect(results.find((r) => r.agent === "ClaudeBot")).toMatchObject({ simpleStatus: "BLOQUÉ", reasons: ["robots.txt disallows ClaudeBot"] });
    expect(results.find((r) => r.agent === "GPTBot")?.simpleStatus).toBe("OK");
  });

  it("marks BLOQUÉ (indice) when the honest request succeeds but a spoofed-UA probe is blocked", async () => {
    stubFetch((url, ua) => {
      if (url.endsWith("/robots.txt")) return new Response("", { status: 404 });
      if (ua.includes("GPTBot")) return new Response("Forbidden", { status: 403 });
      return new Response(LONG_PAGE);
    });
    const { report, results } = await runCoreScan("https://example.com", ["GPTBot"]);
    expect(report.access.unverifiedProbes).toEqual([
      {
        claimedBot: "GPTBot",
        label: "unverified requester claiming to be GPTBot",
        risk: "blocked",
        httpStatus: 403,
        differsFromBaseline: true,
      },
    ]);
    // La requête honnête passe (règle 3) : la sonde bloquée devient un indice
    // de valeur, présenté comme BLOQUÉ mais jamais comme une preuve certaine.
    expect(results[0]).toMatchObject({ simpleStatus: "BLOQUÉ", httpStatus: 200 });
    expect(results[0].reasons[0]).toContain("unverified probe blocked");
  });

  it("keeps OK when a spoofed-UA probe fails the same way the honest request does (no targeting evidence)", async () => {
    // Même échec pour l'UA honnête et pour la sonde : aucune différence, donc
    // aucun indice de ciblage. `differsFromBaseline` reste false.
    stubFetch(() => new Response(LONG_PAGE));
    const { report, results } = await runCoreScan("https://example.com", ["GPTBot"]);
    expect(report.access.unverifiedProbes[0]).toMatchObject({ differsFromBaseline: false });
    expect(results[0].simpleStatus).toBe("OK");
  });

  it("never sends a token-only bot as User-Agent", async () => {
    const fetchMock = stubFetch((url) =>
      url.endsWith("/robots.txt") ? new Response("", { status: 404 }) : new Response(LONG_PAGE),
    );
    const { report } = await runCoreScan("https://example.com", ["Google-Extended", "Applebot-Extended"]);
    expect(report.access.unverifiedProbes).toEqual([]);
    for (const [, init] of fetchMock.mock.calls) {
      expect((init?.headers as Record<string, string>)["User-Agent"]).not.toMatch(/Extended/);
    }
  });

  it("handles fetch timeouts (AbortError) properly", async () => {
    stubFetch(() => {
      throw new DOMException("The operation was aborted", "AbortError");
    });
    const { results } = await runCoreScan("https://slow-site.com", ["GPTBot"]);
    expect(results).toHaveLength(1);
    expect(results[0].simpleStatus).toBe("ERREUR");
    expect(results[0].httpStatus).toBe(0);
  });

  it("handles network errors like DNS resolution failure", async () => {
    stubFetch(() => {
      throw new TypeError("fetch failed");
    });
    const { results } = await runCoreScan("https://not-found-domain.com", ["ClaudeBot"]);
    expect(results[0].simpleStatus).toBe("ERREUR");
    expect(results[0].httpStatus).toBe(0);
  });

  it("handles the 50-word boundary", async () => {
    const words49 = "mot ".repeat(49).trim();
    const words50 = "mot ".repeat(50).trim();
    stubFetch((url) => {
      if (url.endsWith("/robots.txt")) return new Response("", { status: 404 });
      return new Response(html(`<p>${url.includes("49") ? words49 : words50}</p>`));
    });

    const short = await runCoreScan("https://w49.example.com", ["GPTBot"]);
    expect(short.results[0].simpleStatus, "49 mots doit marquer la page comme COQUILLE VIDE").toBe("COQUILLE VIDE");

    const enough = await runCoreScan("https://w50.example.com", ["GPTBot"]);
    expect(enough.results[0].simpleStatus, "50 mots doit suffire pour être OK").toBe("OK");
  });
});
