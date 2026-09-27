import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "./route";
import * as scannerCore from "@/lib/scanner/core";
import * as crawler from "@/lib/scanner/crawler";
import * as rateLimiter from "@/lib/rate-limit";

vi.mock("@/lib/scanner/core", () => ({
  runCoreScan: vi.fn(),
}));

vi.mock("@/lib/scanner/crawler", () => ({
  assertSafeUrl: vi.fn(async (url: string) => url),
}));

vi.mock("@/lib/scanner/agents", () => ({
  DEFAULT_PROBE_BOTS: ["OAI-SearchBot", "Claude-SearchBot", "PerplexityBot"],
}));

// Remplace la table RateLimit par un compteur local, même contrat que lib/rate-limit.
const counters = new Map<string, number>();
vi.mock("@/lib/rate-limit", () => ({
  callerKey: (req: Request, prefix: string) =>
    `${prefix}:${req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "inconnu"}`,
  rateLimit: vi.fn(async (key: string, limit: number, windowMs: number) => {
    const count = (counters.get(key) ?? 0) + 1;
    counters.set(key, count);
    return { allowed: count <= limit, remaining: Math.max(0, limit - count), resetAt: new Date(Date.now() + windowMs) };
  }),
}));

type CoreScanOutput = Awaited<ReturnType<typeof scannerCore.runCoreScan>>;
const scanOutput = (summaries: Record<string, unknown>[]) =>
  ({ report: { finalUrl: "https://example.com/" }, results: summaries }) as unknown as CoreScanOutput;

describe("POST /api/scan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    counters.clear();
  });

  const createRequest = (body: Record<string, unknown>, ip: string = "127.0.0.1") => {
    return new Request("http://localhost:3000/api/scan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": ip,
      },
      body: JSON.stringify(body),
    });
  };

  it("should return 400 if URL is invalid", async () => {
    const req = createRequest({ url: "not-a-url" }, "ip-invalid-url");
    const res = await POST(req);
    
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Veuillez fournir une URL valide, incluant http:// ou https://");
  });

  it("should return 400 if body is missing URL", async () => {
    const req = createRequest({}, "ip-missing-url");
    const res = await POST(req);
    
    expect(res.status).toBe(400);
  });

  it("should return 200 and scan results for a valid URL", async () => {
    vi.mocked(scannerCore.runCoreScan).mockResolvedValueOnce(
      scanOutput([
        { agent: "OAI-SearchBot", simpleStatus: "OK", httpStatus: 200, durationMs: 150, wordCount: 500 },
        { agent: "Claude-SearchBot", simpleStatus: "OK", httpStatus: 200, durationMs: 150, wordCount: 500 },
        { agent: "PerplexityBot", simpleStatus: "OK", httpStatus: 200, durationMs: 150, wordCount: 500 }
      ])
    );

    const req = createRequest({ url: "https://example.com" }, "ip-valid-url");
    const res = await POST(req);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.results[0].agent).toBe("OAI-SearchBot");
    expect(data.results[0].simpleStatus).toBe("OK");
    expect(data.report.finalUrl).toBe("https://example.com/");
    expect(scannerCore.runCoreScan).toHaveBeenCalledWith("https://example.com", ["OAI-SearchBot", "Claude-SearchBot", "PerplexityBot"]);
  });

  it("should rate limit after 3 requests from the same IP", async () => {
    const ip = "ip-rate-limit";
    const body = { url: "https://example.com" };
    
    vi.mocked(scannerCore.runCoreScan).mockResolvedValue(
      scanOutput([{ agent: "OAI-SearchBot", simpleStatus: "OK", httpStatus: 200, durationMs: 100, wordCount: 100 }])
    );

    const res1 = await POST(createRequest(body, ip));
    expect(res1.status).toBe(200);

    const res2 = await POST(createRequest(body, ip));
    expect(res2.status).toBe(200);

    const res3 = await POST(createRequest(body, ip));
    expect(res3.status).toBe(200);

    const res4 = await POST(createRequest(body, ip));
    expect(res4.status).toBe(429);
    const data = await res4.json();
    expect(data.error).toBe("Trop de requêtes. Veuillez réessayer dans quelques instants.");
    expect(res4.headers.get("Retry-After")).toMatch(/^\d+$/);
    expect(rateLimiter.rateLimit).toHaveBeenCalledWith("scan:ip-rate-limit", 3, 60_000);
  });

  it("should return 403 if the URL fails the SSRF check", async () => {
    vi.mocked(crawler.assertSafeUrl).mockRejectedValueOnce(new Error("Forbidden IP resolved: 10.0.0.1"));

    const res = await POST(createRequest({ url: "http://internal.example.com" }, "ip-ssrf"));

    expect(res.status).toBe(403);
    expect(scannerCore.runCoreScan).not.toHaveBeenCalled();
  });

  it("should return 504 when the scan exceeds the global ENF-004 budget (e.g. a stalled DNS lookup)", async () => {
    vi.useFakeTimers();
    try {
      // Simule une résolution DNS/scan qui ne se termine jamais côté crawler
      // (hors de portée : lib/scanner/crawler.ts ne peut pas être modifié ici).
      vi.mocked(scannerCore.runCoreScan).mockReturnValue(new Promise(() => {}));

      const pending = POST(createRequest({ url: "https://example.com" }, "ip-timeout"));
      await vi.advanceTimersByTimeAsync(20_000);
      const res = await pending;

      expect(res.status).toBe(504);
      const data = await res.json();
      expect(typeof data.error).toBe("string");
      expect(data.error.length).toBeGreaterThan(0);
      // Le message ne doit exposer aucun détail interne (DNS, timeout technique, nom de fichier...).
      expect(data.error.toLowerCase()).not.toMatch(/dns|etimedout|crawler|stack|enotfound/);
    } finally {
      vi.useRealTimers();
    }
  });

  it("should return 500 if scan throws an error", async () => {
    vi.mocked(scannerCore.runCoreScan).mockRejectedValueOnce(new Error("Scanner failed"));

    const req = createRequest({ url: "https://example.com" }, "ip-error");
    const res = await POST(req);
    
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Une erreur interne est survenue lors de l'analyse.");
  });
});
