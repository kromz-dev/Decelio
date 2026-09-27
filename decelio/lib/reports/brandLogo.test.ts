import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/scanner/crawler", () => ({
  resolveSafeTarget: vi.fn(),
  // Par défaut, l'épinglage est désactivé dans ces tests (comme en
  // développement derrière un proxy sortant) : ils portent sur la logique
  // de `loadBrandLogo` (type MIME, taille, signature), pas sur le mécanisme
  // d'épinglage lui-même — couvert séparément par crawler.test.ts.
  isPinningUnavailable: vi.fn(() => true),
  createPinnedDispatcher: vi.fn(),
}));

import { createPinnedDispatcher, isPinningUnavailable, resolveSafeTarget } from "@/lib/scanner/crawler";
import { loadBrandLogo, MAX_LOGO_BYTES } from "./brandLogo";

const mockedResolveSafeTarget = vi.mocked(resolveSafeTarget);
const mockedIsPinningUnavailable = vi.mocked(isPinningUnavailable);
const mockedCreatePinnedDispatcher = vi.mocked(createPinnedDispatcher);

/** Résolution valide par défaut : URL inchangée, IP publique quelconque. */
const resolved = (url: string, ip = "93.184.216.34") => ({ url, ip });

const SIGNATURES: Record<string, number[]> = {
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  "image/jpeg": [0xff, 0xd8, 0xff],
};

// Corps de `byteLength` octets (au moins la signature), qui commence par la
// signature du type annoncé, sauf si `withSignature` est faux.
function fakeImageResponse(
  byteLength: number,
  contentType = "image/png",
  declareLength = true,
  withSignature = true,
) {
  const signature = withSignature ? (SIGNATURES[contentType] ?? []) : [];
  const bytes = new Uint8Array(Math.max(byteLength, signature.length));
  bytes.set(signature);
  const headerInit: Record<string, string> = { "content-type": contentType };
  if (declareLength) headerInit["content-length"] = String(bytes.byteLength);
  return new Response(bytes.buffer as ArrayBuffer, { status: 200, headers: new Headers(headerInit) });
}

describe("loadBrandLogo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null without fetching when no URL is provided", async () => {
    const result = await loadBrandLogo(undefined);

    expect(result).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a private/internal IP resolved via assertSafeUrl", async () => {
    mockedResolveSafeTarget.mockRejectedValueOnce(new Error("Forbidden IP resolved: 127.0.0.1"));

    const result = await loadBrandLogo("https://internal.example/logo.png");

    expect(result).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("loads a valid PNG logo as a data URI", async () => {
    mockedResolveSafeTarget.mockResolvedValueOnce(resolved("https://cdn.example.com/logo.png"));
    vi.mocked(fetch).mockResolvedValueOnce(fakeImageResponse(4, "image/png"));

    const result = await loadBrandLogo("https://cdn.example.com/logo.png");

    expect(result).not.toBeNull();
    expect(result?.contentType).toBe("image/png");
    expect(result?.dataUri.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("rejects a body whose bytes do not match the declared image type", async () => {
    mockedResolveSafeTarget.mockResolvedValueOnce(resolved("https://cdn.example.com/logo.png"));
    vi.mocked(fetch).mockResolvedValueOnce(fakeImageResponse(64, "image/png", true, false));

    const result = await loadBrandLogo("https://cdn.example.com/logo.png");

    expect(result).toBeNull();
  });

  it("loads a valid JPEG logo as a data URI", async () => {
    mockedResolveSafeTarget.mockResolvedValueOnce(resolved("https://cdn.example.com/logo.jpg"));
    vi.mocked(fetch).mockResolvedValueOnce(fakeImageResponse(3, "image/jpeg"));

    const result = await loadBrandLogo("https://cdn.example.com/logo.jpg");

    expect(result?.contentType).toBe("image/jpeg");
  });

  it("rejects a response with a disallowed MIME type", async () => {
    mockedResolveSafeTarget.mockResolvedValueOnce(resolved("https://cdn.example.com/logo.svg"));
    const headers = new Headers({ "content-type": "image/svg+xml" });
    vi.mocked(fetch).mockResolvedValueOnce(new Response("<svg></svg>", { status: 200, headers }));

    const result = await loadBrandLogo("https://cdn.example.com/logo.svg");

    expect(result).toBeNull();
  });

  it("rejects a response whose declared Content-Length exceeds the size cap", async () => {
    mockedResolveSafeTarget.mockResolvedValueOnce(resolved("https://cdn.example.com/logo.png"));
    const headers = new Headers({
      "content-type": "image/png",
      "content-length": String(MAX_LOGO_BYTES + 1),
    });
    vi.mocked(fetch).mockResolvedValueOnce(new Response("x", { status: 200, headers }));

    const result = await loadBrandLogo("https://cdn.example.com/logo.png");

    expect(result).toBeNull();
  });

  it("rejects a body that exceeds the size cap when no Content-Length is declared", async () => {
    mockedResolveSafeTarget.mockResolvedValueOnce(resolved("https://cdn.example.com/logo.png"));
    vi.mocked(fetch).mockResolvedValueOnce(fakeImageResponse(MAX_LOGO_BYTES + 10, "image/png", false));

    const result = await loadBrandLogo("https://cdn.example.com/logo.png");

    expect(result).toBeNull();
  });

  it("returns null on a network failure instead of throwing", async () => {
    mockedResolveSafeTarget.mockResolvedValueOnce(resolved("https://cdn.example.com/logo.png"));
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network down"));

    const result = await loadBrandLogo("https://cdn.example.com/logo.png");

    expect(result).toBeNull();
  });

  it("returns null on a non-2xx response", async () => {
    mockedResolveSafeTarget.mockResolvedValueOnce(resolved("https://cdn.example.com/logo.png"));
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 404 }));

    const result = await loadBrandLogo("https://cdn.example.com/logo.png");

    expect(result).toBeNull();
  });

  it("never follows redirects to an unrevalidated target", async () => {
    mockedResolveSafeTarget.mockResolvedValueOnce(resolved("https://cdn.example.com/logo.png"));
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "https://internal/secret" } }));

    const result = await loadBrandLogo("https://cdn.example.com/logo.png");

    expect(result).toBeNull();
    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect((options as RequestInit).redirect).toBe("manual");
  });

  it("pins the connection on the IP validated by resolveSafeTarget when pinning is available", async () => {
    mockedIsPinningUnavailable.mockReturnValueOnce(false);
    const fakeDispatcher = { pinned: true };
    mockedCreatePinnedDispatcher.mockReturnValueOnce(fakeDispatcher as never);
    mockedResolveSafeTarget.mockResolvedValueOnce(resolved("https://cdn.example.com/logo.png", "203.0.113.9"));
    vi.mocked(fetch).mockResolvedValueOnce(fakeImageResponse(4, "image/png"));

    const result = await loadBrandLogo("https://cdn.example.com/logo.png");

    expect(result).not.toBeNull();
    expect(mockedCreatePinnedDispatcher).toHaveBeenCalledWith("203.0.113.9");
    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect((options as { dispatcher?: unknown }).dispatcher).toBe(fakeDispatcher);
  });

  it("does not pin the connection when pinning is unavailable (dev behind a mandatory proxy)", async () => {
    mockedIsPinningUnavailable.mockReturnValueOnce(true);
    mockedResolveSafeTarget.mockResolvedValueOnce(resolved("https://cdn.example.com/logo.png"));
    vi.mocked(fetch).mockResolvedValueOnce(fakeImageResponse(4, "image/png"));

    await loadBrandLogo("https://cdn.example.com/logo.png");

    expect(mockedCreatePinnedDispatcher).not.toHaveBeenCalled();
    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect((options as { dispatcher?: unknown }).dispatcher).toBeUndefined();
  });
});
