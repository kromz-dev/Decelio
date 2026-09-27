import { describe, it, expect, vi, beforeEach } from "vitest";

// Même contrat que lib/rate-limit, mais compteur local en mémoire pour ne
// pas dépendre d'une vraie base dans ce test unitaire.
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

// Mock de la base de données
vi.mock("@/lib/db", () => ({
  db: {
    pageView: {
      create: vi.fn(),
    },
  },
}));

import { POST } from "./route";
import { db } from "@/lib/db";
import * as rateLimiter from "@/lib/rate-limit";

describe("POST /api/beacon", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    counters.clear();
    vi.mocked(db.pageView.create).mockResolvedValue({} as never);
  });

  it("1. retourne 204 et crée une entrée avec un payload valide", async () => {
    const payload = { path: "/about", referrer: "https://google.com" };
    const request = new Request("http://localhost/api/beacon", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const response = await POST(request);

    expect(response.status).toBe(204);
    expect(db.pageView.create).toHaveBeenCalledWith({
      data: {
        path: "/about",
        referrer: "https://google.com",
      },
    });
  });

  it("2. retourne 204 et utilise les valeurs par défaut avec un payload malformé", async () => {
    const request = new Request("http://localhost/api/beacon", {
      method: "POST",
      body: "ceci-nest-pas-du-json",
    });

    const response = await POST(request);

    expect(response.status).toBe(204);
    expect(db.pageView.create).toHaveBeenCalledWith({
      data: {
        path: "/",
        referrer: null,
      },
    });
  });

  it("3. retourne 500 en cas d'erreur serveur (ex: erreur DB)", async () => {
    const request = new Request("http://localhost/api/beacon", {
      method: "POST",
      body: JSON.stringify({ path: "/home" }),
    });

    // Simulation d'une erreur de la base de données
    vi.mocked(db.pageView.create).mockRejectedValueOnce(new Error("Database connexion perdue"));

    const response = await POST(request);

    expect(response.status).toBe(500);
  });

  // --- Correctif : limitation de débit par IP (voir lib/rate-limit.ts) ---
  // Endpoint public non authentifié, dont le seul filtre (regex User-Agent
  // ci-dessus) est trivialement contournable : sans limite, une boucle de
  // script peut faire grossir PageView sans borne et épuiser le quota Neon
  // gratuit (0,5 Go / 100 CU-h par mois).

  const createRequest = (ip: string, body: Record<string, unknown> = { path: "/", referrer: null }) =>
    new Request("http://localhost:3000/api/beacon", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip, "user-agent": "Mozilla/5.0" },
      body: JSON.stringify(body),
    });

  it("4. limite le débit par IP au-delà du seuil et n'insère plus en base", async () => {
    const ip = "ip-flood";

    // On sature le quota pour cette IP.
    for (let i = 0; i < 60; i++) {
      const res = await POST(createRequest(ip));
      expect(res.status).toBe(204);
    }

    // La 61e requête de la même minute doit être rejetée sans toucher la base.
    const overLimit = await POST(createRequest(ip));

    expect(overLimit.status).toBe(429);
    expect(overLimit.headers.get("Retry-After")).toMatch(/^\d+$/);
    expect(db.pageView.create).toHaveBeenCalledTimes(60);
    expect(rateLimiter.rateLimit).toHaveBeenCalledWith("beacon:ip-flood", 60, 60_000);
  });

  it("5. ne casse pas la réponse quand le quota est dépassé (le client ignore la réponse via .catch())", async () => {
    const ip = "ip-flood-2";
    for (let i = 0; i < 60; i++) {
      await POST(createRequest(ip));
    }

    const overLimit = await POST(createRequest(ip));

    // Le client (app/(marketing)/beacon.tsx) envoie en fire-and-forget et ne
    // lit jamais le corps : il ne faut surtout pas que ce chemin lève une
    // exception non gérée qui remonterait ailleurs.
    await expect(overLimit.text()).resolves.toBeDefined();
  });

  it("6. une IP différente n'est pas affectée par le quota d'une autre IP", async () => {
    const floodedIp = "ip-flood-3";
    for (let i = 0; i < 60; i++) {
      await POST(createRequest(floodedIp));
    }
    await POST(createRequest(floodedIp)); // dépasse le quota de floodedIp

    const res = await POST(createRequest("ip-tranquille"));

    expect(res.status).toBe(204);
  });
});
