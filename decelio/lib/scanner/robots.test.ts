import { describe, expect, it } from "vitest";
import { buildRobotsReport, decide, isAllowed, parseRobotsTxt } from "./robots";

describe("parseRobotsTxt", () => {
  it("groups consecutive user-agent lines and ignores comments, orphan rules and empty disallow", () => {
    const parsed = parseRobotsTxt([
      "Disallow: /orphan # avant tout user-agent",
      "User-agent: GPTBot",
      "user-agent: ClaudeBot   # commentaire",
      "Disallow: /private",
      "Disallow:",
      "Sitemap: https://example.com/sitemap.xml",
      "Allow: /private/ok",
      "",
      "User-agent: *",
      "Disallow: /tmp",
    ].join("\r\n"));

    expect(parsed.groups).toEqual([
      {
        userAgents: ["GPTBot", "ClaudeBot"],
        rules: [
          { type: "disallow", pattern: "/private" },
          { type: "allow", pattern: "/private/ok" },
        ],
      },
      { userAgents: ["*"], rules: [{ type: "disallow", pattern: "/tmp" }] },
    ]);
    expect(parsed.sitemaps).toEqual(["https://example.com/sitemap.xml"]);
  });
});

describe("group selection (most specific user-agent wins)", () => {
  const robots = parseRobotsTxt(`
User-agent: *
Disallow: /

User-agent: gptbot
Allow: /

User-agent: Claude-SearchBot/1.0
Disallow: /search-only
`);

  it("prefers the group naming the product token, case-insensitively", () => {
    expect(isAllowed(robots, "GPTBot", "/page")).toMatchObject({ allowed: true, match: "specific" });
  });

  it("matches the token part of a versioned user-agent value", () => {
    expect(isAllowed(robots, "Claude-SearchBot", "/page")).toMatchObject({ allowed: true, match: "specific" });
    expect(isAllowed(robots, "Claude-SearchBot", "/search-only/x")).toMatchObject({ allowed: false, match: "specific" });
  });

  it("does not treat a token prefix as a match", () => {
    // « Claude-SearchBot » ne s'applique pas à ClaudeBot, qui retombe sur « * ».
    expect(isAllowed(robots, "ClaudeBot", "/page")).toMatchObject({ allowed: false, match: "wildcard" });
  });

  it("falls back to * and then to allow-all", () => {
    expect(isAllowed(robots, "PerplexityBot", "/")).toMatchObject({ allowed: false, match: "wildcard" });
    expect(isAllowed(parseRobotsTxt("User-agent: GPTBot\nDisallow: /\n"), "ClaudeBot", "/")).toMatchObject({ allowed: true, match: "none" });
  });

  it("merges every group that names the same token", () => {
    const merged = parseRobotsTxt("User-agent: GPTBot\nDisallow: /a\n\nUser-agent: *\nDisallow: /\n\nUser-agent: GPTBot\nDisallow: /b\n");
    expect(isAllowed(merged, "GPTBot", "/a")).toMatchObject({ allowed: false });
    expect(isAllowed(merged, "GPTBot", "/b")).toMatchObject({ allowed: false });
    // Le groupe * ne s'ajoute pas au groupe spécifique.
    expect(isAllowed(merged, "GPTBot", "/c")).toMatchObject({ allowed: true, match: "specific" });
  });
});

describe("rule precedence (longest match wins)", () => {
  it("uses the longest matching pattern regardless of order", () => {
    const rules = parseRobotsTxt("User-agent: *\nAllow: /docs/public\nDisallow: /docs\n").groups[0].rules;
    expect(decide(rules, "/docs/public/page").allowed).toBe(true);
    expect(decide(rules, "/docs/private").allowed).toBe(false);

    const reversed = parseRobotsTxt("User-agent: *\nDisallow: /docs/private\nAllow: /docs\n").groups[0].rules;
    expect(decide(reversed, "/docs/private/x").allowed).toBe(false);
    expect(decide(reversed, "/docs/other").allowed).toBe(true);
  });

  it("lets allow win a tie of equal length", () => {
    const rules = parseRobotsTxt("User-agent: *\nDisallow: /page\nAllow: /page\n").groups[0].rules;
    expect(decide(rules, "/page")).toEqual({ allowed: true, rule: { type: "allow", pattern: "/page" } });
  });

  it("supports * wildcards and $ end anchors", () => {
    const rules = parseRobotsTxt("User-agent: *\nDisallow: /*.pdf$\nDisallow: /*?session=\nAllow: /\n").groups[0].rules;
    expect(decide(rules, "/files/report.pdf").allowed).toBe(false);
    expect(decide(rules, "/files/report.pdf?dl=1").allowed).toBe(true);
    expect(decide(rules, "/cart?session=abc").allowed).toBe(false);
    expect(decide(rules, "/cart").allowed).toBe(true);
  });

  it("is case-sensitive on paths and normalises percent-encoding", () => {
    const rules = parseRobotsTxt("User-agent: *\nDisallow: /Private\nDisallow: /café\n").groups[0].rules;
    expect(decide(rules, "/private").allowed).toBe(true);
    expect(decide(rules, "/Private").allowed).toBe(false);
    expect(decide(rules, "/caf%c3%a9/menu").allowed).toBe(false);
  });

  it("always allows /robots.txt", () => {
    const rules = parseRobotsTxt("User-agent: *\nDisallow: /\n").groups[0].rules;
    expect(decide(rules, "/robots.txt").allowed).toBe(true);
  });
});

describe("buildRobotsReport", () => {
  const fetched = (status: number, html = "", headers: Record<string, string> = {}): Parameters<typeof buildRobotsReport>[0] => ({
    finalUrl: "https://example.com/robots.txt",
    status,
    headers,
    html,
  });
  const report = (f: Parameters<typeof buildRobotsReport>[0]) =>
    buildRobotsReport(f, "https://example.com/robots.txt", "/", ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "Google-Extended"]);

  it("reports a verdict and purpose per bot token", () => {
    const r = report(fetched(200, "User-agent: GPTBot\nUser-agent: Google-Extended\nDisallow: /\n"));
    expect(r.fetchStatus).toBe("ok");
    expect(r.policies.map((p) => [p.token, p.purpose, p.verdict])).toEqual([
      ["GPTBot", "training", "disallowed"],
      ["OAI-SearchBot", "search", "allowed"],
      ["ChatGPT-User", "user-triggered", "allowed"],
      ["Google-Extended", "training", "disallowed"],
    ]);
  });

  it("treats a real 4xx (no firewall signal) as allow-all, and 5xx or no response as full disallow (RFC 9309 §2.3.1)", () => {
    expect(report(fetched(404)).policies.every((p) => p.verdict === "allowed")).toBe(true);
    expect(report(fetched(410)).policies.every((p) => p.verdict === "allowed")).toBe(true);
    expect(report(fetched(503)).fetchStatus).toBe("unreachable");
    expect(report(fetched(503)).policies.every((p) => p.verdict === "disallowed")).toBe(true);
    expect(report(fetched(500)).policies.every((p) => p.verdict === "disallowed")).toBe(true);
    expect(report(fetched(0)).fetchStatus).toBe("unreachable");
    expect(report({ ...fetched(0), errorKind: "too_many_redirects" as const }).fetchStatus).toBe("unavailable");
  });

  it("reports unknown when a challenge answers instead of robots.txt", () => {
    const r = report(fetched(403, "<title>Just a moment...</title>", { "cf-mitigated": "challenge" }));
    expect(r.fetchStatus).toBe("challenged");
    expect(r.policies.every((p) => p.verdict === "unknown")).toBe(true);
  });

  it("reports unknown — not allow-all — for a bare 403/401/429 with no recognised challenge", () => {
    // RFC 9309 §2.3.1 treats a 4xx as « tout permis », but that rule targets a
    // genuine « fichier absent » (404, 410...). Un 403/401/429 nu signale le plus
    // souvent un pare-feu qui bloque la requête elle-même : on ne peut pas
    // conclure « autorisé », donc on rend « à vérifier ».
    for (const status of [403, 401, 429]) {
      const r = report(fetched(status, "Forbidden"));
      expect(r.fetchStatus).toBe("blocked");
      expect(r.policies.every((p) => p.verdict === "unknown")).toBe(true);
    }
  });
});
