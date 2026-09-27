import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

function makeRequest(
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: string } = {},
): NextRequest {
  return new NextRequest(new Request(url, init));
}

const params = (path: string[]) => ({ params: Promise.resolve({ path }) });

describe("GET/POST /ingest/[...path]", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("relaie un événement vers l'hôte d'ingestion PostHog EU sans transmettre l'IP du visiteur", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);

    const request = makeRequest("https://decelio.fr/ingest/e", {
      method: "POST",
      headers: {
        "x-forwarded-for": "203.0.113.42",
        "x-real-ip": "203.0.113.42",
        "cf-connecting-ip": "203.0.113.42",
        "content-type": "application/json",
      },
      body: JSON.stringify({ event: "test" }),
    });

    const response = await POST(request, params(["e"]));

    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [targetUrl, init] = fetchSpy.mock.calls[0] as [URL, RequestInit];
    expect(targetUrl.toString()).toBe("https://eu.i.posthog.com/e");

    const forwardedHeaders = init.headers as Headers;
    expect(forwardedHeaders.has("x-forwarded-for")).toBe(false);
    expect(forwardedHeaders.has("x-real-ip")).toBe(false);
    expect(forwardedHeaders.has("cf-connecting-ip")).toBe(false);
    expect(forwardedHeaders.has("host")).toBe(false);
  });

  it("route les chemins /static/* vers l'hôte d'assets PostHog EU", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response("", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);

    const request = makeRequest("https://decelio.fr/ingest/static/config.js", { method: "GET" });

    const response = await GET(request, params(["static", "config.js"]));

    expect(response.status).toBe(200);
    const [targetUrl] = fetchSpy.mock.calls[0] as [URL];
    expect(targetUrl.toString()).toBe("https://eu-assets.i.posthog.com/static/config.js");
  });

  it("préserve la chaîne de requête", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response("", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);

    const request = makeRequest("https://decelio.fr/ingest/decide?v=3&ip=1", { method: "GET" });

    await GET(request, params(["decide"]));

    const [targetUrl] = fetchSpy.mock.calls[0] as [URL];
    expect(targetUrl.toString()).toBe("https://eu.i.posthog.com/decide?v=3&ip=1");
  });

  it("ignore l'hôte réellement demandé par l'attaquant : la cible reste toujours un hôte PostHog fixe", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response("", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);

    const request = makeRequest("https://decelio.fr/ingest/e", {
      method: "POST",
      headers: { host: "attacker.example.com" },
      body: "{}",
    });

    await POST(request, params(["e"]));

    const [targetUrl] = fetchSpy.mock.calls[0] as [URL];
    expect(targetUrl.origin).toBe("https://eu.i.posthog.com");
  });

  it("renvoie 502 sans planter si PostHog est inaccessible", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("réseau indisponible")),
    );

    const request = makeRequest("https://decelio.fr/ingest/e", { method: "POST", body: "{}" });

    const response = await POST(request, params(["e"]));

    expect(response.status).toBe(502);
  });
});
