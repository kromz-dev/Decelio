import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async (host: string) => {
    if (host === "internal.example.com") return [{ address: "10.0.0.5", family: 4 }];
    if (host === "mixed.example.com") return [{ address: "93.184.216.34", family: 4 }, { address: "127.0.0.1", family: 4 }];
    if (host === "nxdomain.example.com") throw new Error("getaddrinfo ENOTFOUND");
    return [{ address: "93.184.216.34", family: 4 }];
  }),
}));

// Remplace l'Agent réel d'undici par un espion : les tests n'ouvrent jamais
// de vraie connexion (`fetch` est lui-même simulé), on vérifie seulement les
// options passées au constructeur — en particulier `connect.lookup`.
vi.mock("undici", () => ({
  Agent: vi.fn(function FakeAgent(this: { __pinnedOpts: unknown }, opts: unknown) {
    this.__pinnedOpts = opts;
  }),
}));

import { Agent } from "undici";
import { assertSafeUrl, createPinnedDispatcher, crawlUrl, isPinningUnavailable, MAX_REDIRECTS, resolveSafeTarget } from "./crawler";

type PinnedLookup = (
  hostname: string,
  options: unknown,
  callback: (err: Error | null, addresses: { address: string; family: number }[]) => void,
) => void;

function stubFetch(routes: Record<string, () => Response>) {
  const fn = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    void init;
    const route = routes[String(input)];
    if (!route) throw new TypeError(`unexpected fetch ${String(input)}`);
    return route();
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

const redirect = (location: string, status = 301) => () => new Response(null, { status, headers: { location } });

describe("assertSafeUrl", () => {
  it("accepts public http(s) URLs", async () => {
    await expect(assertSafeUrl("https://example.com/a")).resolves.toBe("https://example.com/a");
  });

  it.each([
    ["ftp://example.com/", /protocol/],
    ["https://user:pass@example.com/", /Credentials/],
    ["https://internal.example.com/", /Forbidden IP/],
    ["https://mixed.example.com/", /Forbidden IP/],
    ["https://nxdomain.example.com/", /DNS resolution failed/],
  ])("rejects %s", async (url, message) => {
    await expect(assertSafeUrl(url)).rejects.toThrow(message);
  });
});

describe("crawlUrl redirects", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("follows http→https and apex→www redirects", async () => {
    const fetchMock = stubFetch({
      "http://example.com/": redirect("https://example.com/"),
      "https://example.com/": redirect("https://www.example.com/", 308),
      "https://www.example.com/": () => new Response("<p>hello</p>", { headers: { "X-Robots-Tag": "noindex" } }),
    });

    const res = await crawlUrl("http://example.com/");
    expect(res.error).toBeUndefined();
    expect(res.status).toBe(200);
    expect(res.finalUrl).toBe("https://www.example.com/");
    expect(res.html).toBe("<p>hello</p>");
    expect(res.headers["x-robots-tag"]).toBe("noindex");
    expect(res.redirects).toEqual([
      { url: "http://example.com/", status: 301, location: "https://example.com/" },
      { url: "https://example.com/", status: 308, location: "https://www.example.com/" },
    ]);
    // fetch ne doit jamais suivre seul une redirection.
    for (const [, init] of fetchMock.mock.calls) expect(init?.redirect).toBe("manual");
  });

  it("resolves relative Location headers against the current URL", async () => {
    stubFetch({
      "https://example.com/old": redirect("/new?x=1", 302),
      "https://example.com/new?x=1": () => new Response("ok"),
    });
    const res = await crawlUrl("https://example.com/old");
    expect(res.status).toBe(200);
    expect(res.finalUrl).toBe("https://example.com/new?x=1");
  });

  it(`allows exactly ${MAX_REDIRECTS} redirects`, async () => {
    const routes: Record<string, () => Response> = {};
    for (let i = 0; i < MAX_REDIRECTS; i++) routes[`https://example.com/${i}`] = redirect(`https://example.com/${i + 1}`);
    routes[`https://example.com/${MAX_REDIRECTS}`] = () => new Response("done");
    stubFetch(routes);

    const res = await crawlUrl("https://example.com/0");
    expect(res.status).toBe(200);
    expect(res.redirects).toHaveLength(MAX_REDIRECTS);
  });

  it("fails after more than 5 redirects", async () => {
    const routes: Record<string, () => Response> = {};
    for (let i = 0; i <= MAX_REDIRECTS; i++) routes[`https://example.com/${i}`] = redirect(`https://example.com/${i + 1}`);
    const fetchMock = stubFetch(routes);

    const res = await crawlUrl("https://example.com/0");
    expect(res.status).toBe(0);
    expect(res.error).toMatch(/Too many redirects/);
    expect(fetchMock).toHaveBeenCalledTimes(MAX_REDIRECTS + 1);
  });

  it("re-runs the SSRF check on every Location and never fetches a private target", async () => {
    const fetchMock = stubFetch({
      "https://example.com/": redirect("https://www.example.com/"),
      "https://www.example.com/": redirect("http://internal.example.com/admin", 302),
    });
    const res = await crawlUrl("https://example.com/");
    expect(res.status).toBe(0);
    expect(res.error).toMatch(/Forbidden IP resolved: 10\.0\.0\.5/);
    expect(fetchMock.mock.calls.map(([u]) => String(u))).not.toContain("http://internal.example.com/admin");
  });

  it("refuses a redirect to a non-http scheme", async () => {
    stubFetch({ "https://example.com/": redirect("file:///etc/passwd") });
    const res = await crawlUrl("https://example.com/");
    expect(res.status).toBe(0);
    expect(res.error).toMatch(/protocol/);
  });

  it("returns a 3xx without Location as a final response", async () => {
    stubFetch({ "https://example.com/": () => new Response("not modified", { status: 300 }) });
    const res = await crawlUrl("https://example.com/");
    expect(res.status).toBe(300);
    expect(res.redirects).toEqual([]);
  });
});

describe("isPinningUnavailable (fix/ssrf-rebinding-dns)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("disables pinning when an outbound proxy is set outside production", () => {
    vi.stubEnv("HTTPS_PROXY", "http://127.0.0.1:1234");
    vi.stubEnv("NODE_ENV", "development");
    expect(isPinningUnavailable()).toBe(true);
  });

  it("never disables pinning in production, even behind a proxy", () => {
    vi.stubEnv("HTTPS_PROXY", "http://127.0.0.1:1234");
    vi.stubEnv("NODE_ENV", "production");
    expect(isPinningUnavailable()).toBe(false);
  });

  it("keeps pinning enabled when no outbound proxy is configured", () => {
    vi.stubEnv("HTTPS_PROXY", "");
    vi.stubEnv("https_proxy", "");
    vi.stubEnv("HTTP_PROXY", "");
    vi.stubEnv("http_proxy", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(isPinningUnavailable()).toBe(false);
  });
});

describe("épinglage de la connexion réelle (fix/ssrf-rebinding-dns)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.mocked(Agent).mockClear();
  });

  /** Force l'épinglage, quel que soit le proxy ambiant du bac à sable. */
  function forcePinningOn() {
    vi.stubEnv("HTTPS_PROXY", "");
    vi.stubEnv("https_proxy", "");
    vi.stubEnv("HTTP_PROXY", "");
    vi.stubEnv("http_proxy", "");
    vi.stubEnv("NODE_ENV", "production");
  }

  it("resolveSafeTarget renvoie l'IP déjà validée, à épingler", async () => {
    await expect(resolveSafeTarget("https://example.com/")).resolves.toEqual({
      url: "https://example.com/",
      ip: "93.184.216.34",
    });
  });

  it("the pinned lookup returns only the IP validated by resolveSafeTarget, whatever hostname the caller later resolves — closes the DNS-rebinding TOCTOU window", () => {
    createPinnedDispatcher("93.184.216.34");
    const opts = vi.mocked(Agent).mock.calls[0][0] as { connect: { lookup: PinnedLookup } };
    const calls: unknown[] = [];
    // Un attaquant qui contrôle le DNS d'un domaine à TTL court peut faire
    // pointer ce même nom vers une IP interne juste après la validation.
    // `lookup` ne doit renvoyer que l'adresse épinglée, jamais rerésoudre
    // le nom d'hôte demandé.
    opts.connect.lookup("attacker-controlled-host-now-pointing-at-10.0.0.5", { all: true }, (...args) => calls.push(args));
    expect(calls).toEqual([[null, [{ address: "93.184.216.34", family: 4 }]]]);
  });

  it("pins the outgoing fetch on the validated IP when pinning is available", async () => {
    forcePinningOn();
    const fetchMock = stubFetch({ "https://example.com/": () => new Response("<p>ok</p>") });

    await crawlUrl("https://example.com/");

    expect(Agent).toHaveBeenCalledTimes(1);
    const opts = vi.mocked(Agent).mock.calls[0][0] as { connect: { lookup: PinnedLookup } };
    const calls: unknown[] = [];
    opts.connect.lookup("example.com", { all: true }, (...args) => calls.push(args));
    expect(calls).toEqual([[null, [{ address: "93.184.216.34", family: 4 }]]]);

    const [, init] = fetchMock.mock.calls[0];
    expect((init as { dispatcher?: unknown }).dispatcher).toEqual({ __pinnedOpts: opts });
  });

  it("keeps the real hostname (never the pinned IP) as the fetch target, for SNI and the Host header", async () => {
    forcePinningOn();
    const fetchMock = stubFetch({ "https://example.com/page": () => new Response("<p>ok</p>") });

    await crawlUrl("https://example.com/page");

    const [target] = fetchMock.mock.calls[0];
    expect(String(target)).toBe("https://example.com/page");
    expect(String(target)).not.toContain("93.184.216.34");
  });

  it("does not pin the connection when an outbound proxy makes pinning unavailable (dev sandbox)", async () => {
    vi.stubEnv("HTTPS_PROXY", "http://127.0.0.1:32931");
    vi.stubEnv("NODE_ENV", "development");
    const fetchMock = stubFetch({ "https://example.com/": () => new Response("<p>ok</p>") });

    await crawlUrl("https://example.com/");

    expect(Agent).not.toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0];
    expect((init as { dispatcher?: unknown }).dispatcher).toBeUndefined();
  });
});
