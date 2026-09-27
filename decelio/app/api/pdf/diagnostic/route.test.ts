import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const genererPdf = vi.hoisted(() => vi.fn(async () => Buffer.from("%PDF-1.3 faux")));
const limiter = vi.hoisted(() => vi.fn());

vi.mock("@/lib/reports/renderDiagnosticPdf", () => ({
  generateDiagnosticPdfBuffer: genererPdf,
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: limiter,
  callerKey: (req: Request, prefix: string) =>
    `${prefix}:${req.headers.get("x-forwarded-for") ?? "inconnu"}`,
}));

function requete(corps: string, ip = "203.0.113.1", enTetes: Record<string, string> = {}): Request {
  return new Request("https://decelio.fr/api/pdf/diagnostic", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip, ...enTetes },
    body: corps,
  });
}

const CORPS_VALIDE = JSON.stringify({
  report: { finalUrl: "https://exemple.fr/", scannedAt: new Date().toISOString() },
  results: [{ agent: "GPTBot", simpleStatus: "OK", reasons: [], httpStatus: 200, durationMs: 12, wordCount: 500 }],
});

beforeEach(() => {
  vi.resetModules();
  genererPdf.mockClear();
  limiter.mockReset();
  limiter.mockResolvedValue({ allowed: true, resetAt: new Date(Date.now() + 60_000) });
});

afterEach(() => vi.restoreAllMocks());

async function poster(corps: string, ip?: string) {
  const { POST } = await import("./route");
  return POST(requete(corps, ip));
}

async function posterAvecEnTetes(corps: string, enTetes: Record<string, string>) {
  const { POST } = await import("./route");
  return POST(requete(corps, undefined, enTetes));
}

describe("POST /api/pdf/diagnostic", () => {
  it("rend un PDF sur un corps valide", async () => {
    const res = await poster(CORPS_VALIDE);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toContain("diagnostic-exemple.fr.pdf");
    expect(genererPdf).toHaveBeenCalledOnce();
  });

  // Régression : `req.json()` lève sur un corps malformé, l'erreur tombait
  // dans le catch final et la route répondait 500 pour une requête client
  // simplement invalide.
  it("répond 400 et non 500 sur un corps malformé", async () => {
    const res = await poster("{ ceci n'est pas du json");
    expect(res.status).toBe(400);
    expect(genererPdf).not.toHaveBeenCalled();
  });

  it("répond 400 sur un corps vide", async () => {
    const res = await poster("");
    expect(res.status).toBe(400);
  });

  // Régression : `req.json()` lisait tout le corps en mémoire avant toute
  // borne. `Content-Length` est déclaratif : un refus précoce sur cet
  // en-tête évite d'ouvrir la lecture pour un corps déjà annoncé énorme.
  it("répond 413 quand Content-Length dépasse la limite, sans lire le corps ni générer le PDF", async () => {
    const res = await posterAvecEnTetes(CORPS_VALIDE, { "content-length": String(300 * 1024) });
    expect(res.status).toBe(413);
    expect(genererPdf).not.toHaveBeenCalled();
  });

  // Un `Content-Length` absent ou faux ne doit pas permettre de contourner
  // la borne : c'est la lecture en flux, pas l'en-tête, qui protège
  // réellement contre un corps énorme.
  it("répond 413 sur un corps trop grand même sans Content-Length déclaré", async () => {
    const enorme = JSON.stringify({
      report: { finalUrl: "https://exemple.fr/" },
      results: [{ agent: "GPTBot", simpleStatus: "OK", reasons: ["x".repeat(300 * 1024)] }],
    });
    const res = await poster(enorme);
    expect(res.status).toBe(413);
    expect(genererPdf).not.toHaveBeenCalled();
  });

  it("reste en 200 pour un corps valide bien sous la limite, Content-Length absent (cas nominal)", async () => {
    const res = await poster(CORPS_VALIDE);
    expect(res.status).toBe(200);
    expect(genererPdf).toHaveBeenCalledOnce();
  });

  it("répond 400 quand report ou results manquent", async () => {
    expect((await poster(JSON.stringify({ results: [] }))).status).toBe(400);
    expect((await poster(JSON.stringify({ report: { finalUrl: "https://x.fr" } }))).status).toBe(400);
  });

  // Le rendu PDF est coûteux en CPU : un tableau non borné était un vecteur
  // d'epuisement sur une route publique et non authentifiée.
  it("refuse une liste de résultats non bornée", async () => {
    const enorme = JSON.stringify({
      report: { finalUrl: "https://exemple.fr/" },
      results: Array.from({ length: 5000 }, () => ({ agent: "GPTBot", simpleStatus: "OK" })),
    });
    const res = await poster(enorme);
    expect(res.status).toBe(400);
    expect(genererPdf).not.toHaveBeenCalled();
  });

  it("applique la limitation de débit avec un Retry-After", async () => {
    limiter.mockResolvedValue({ allowed: false, resetAt: new Date(Date.now() + 30_000) });
    const res = await poster(CORPS_VALIDE);
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(genererPdf).not.toHaveBeenCalled();
  });

  it("n'expose aucun détail interne quand le rendu échoue", async () => {
    genererPdf.mockRejectedValueOnce(new Error("chemin/interne/secret.tsx a explosé"));
    const res = await poster(CORPS_VALIDE);
    expect(res.status).toBe(500);
    const corps = await res.text();
    expect(corps).not.toContain("secret.tsx");
    expect(corps).not.toContain("chemin/interne");
  });

  describe("report.platform", () => {
    it("laisse passer un report.platform valide (utilisé par l'annexe de correctifs)", async () => {
      const corps = JSON.stringify({
        report: {
          finalUrl: "https://exemple.fr/",
          platform: { cms: "wordpress", seoPlugin: "yoast", firewall: "cloudflare", signals: ["indice 1"] },
        },
        results: [{ agent: "GPTBot", simpleStatus: "OK", reasons: [] }],
      });
      const res = await poster(corps);
      expect(res.status).toBe(200);
      expect(genererPdf).toHaveBeenCalledOnce();
    });

    // Comme `results`, `report` est fourni par le client : un tableau
    // `signals` non borné serait un vecteur d'abus au même titre.
    it("refuse un report.platform.signals non borné", async () => {
      const corps = JSON.stringify({
        report: {
          finalUrl: "https://exemple.fr/",
          platform: { cms: "wordpress", signals: Array.from({ length: 5000 }, () => "x") },
        },
        results: [{ agent: "GPTBot", simpleStatus: "OK", reasons: [] }],
      });
      const res = await poster(corps);
      expect(res.status).toBe(400);
      expect(genererPdf).not.toHaveBeenCalled();
    });

    it("refuse un signal individuel démesurément long", async () => {
      const corps = JSON.stringify({
        report: {
          finalUrl: "https://exemple.fr/",
          platform: { cms: "wordpress", signals: ["x".repeat(10_000)] },
        },
        results: [{ agent: "GPTBot", simpleStatus: "OK", reasons: [] }],
      });
      const res = await poster(corps);
      expect(res.status).toBe(400);
      expect(genererPdf).not.toHaveBeenCalled();
    });

    it("répond 200 quand report.platform est absent (champ optionnel)", async () => {
      const res = await poster(CORPS_VALIDE);
      expect(res.status).toBe(200);
    });
  });
});
