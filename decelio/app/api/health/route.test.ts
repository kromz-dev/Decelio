import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// La route de santé ne doit jamais toucher la base (sinon Neon ne se met
// jamais en veille, cf. docs/10-plan-technique.md §8). On mocke @/lib/db
// pour prouver qu'aucune de ses méthodes n'est jamais appelée par la route.
vi.mock("@/lib/db", () => ({
  db: {
    $queryRaw: vi.fn(),
    pageView: { create: vi.fn(), findMany: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}));

import { GET } from "./route";
import { db } from "@/lib/db";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("1. retourne 200 avec status 'ok' et l'état de PostHog", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    // La valeur dépend de l'environnement (voir tests 5 et 6 pour les deux cas) ;
    // ici on prouve seulement que le champ existe et a la bonne forme.
    expect(typeof body.posthogConfigured).toBe("boolean");
  });

  it("5. signale posthogConfigured=true quand le jeton et l'hôte sont présents", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", "phc_test_token_do_not_leak");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://eu.i.posthog.com");

    const response = await GET();
    const body = await response.json();

    expect(body.posthogConfigured).toBe(true);
  });

  it("6. signale posthogConfigured=false quand le jeton ou l'hôte manque", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", "");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://eu.i.posthog.com");

    const response = await GET();
    const body = await response.json();

    expect(body.posthogConfigured).toBe(false);
  });

  it("7. n'expose jamais le jeton, un fragment du jeton, ni sa longueur", async () => {
    const secretToken = "phc_super_secret_token_value_12345";
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", secretToken);
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://eu.i.posthog.com");

    const response = await GET();
    const rawBody = await response.text();
    const body = JSON.parse(rawBody) as Record<string, unknown>;

    expect(rawBody).not.toContain(secretToken);
    expect(rawBody).not.toContain(secretToken.slice(0, 6));
    expect(Object.keys(body).sort()).toEqual(["posthogConfigured", "status"]);
  });

  it("2. n'appelle jamais @/lib/db", async () => {
    await GET();

    expect(db.$queryRaw).not.toHaveBeenCalled();
    expect(db.pageView.create).not.toHaveBeenCalled();
    expect(db.pageView.findMany).not.toHaveBeenCalled();
    expect(db.user.findUnique).not.toHaveBeenCalled();
    expect(db.user.findMany).not.toHaveBeenCalled();
  });

  it("3. n'importe pas @/lib/db dans le code source de la route", () => {
    const routePath = fileURLToPath(new URL("./route.ts", import.meta.url));
    const source = readFileSync(routePath, "utf-8");

    // On vérifie l'absence d'un import (statique ou dynamique) réel, pas la
    // simple mention littérale dans un commentaire (ex. la note ci-dessus
    // rappelant explicitement de ne pas importer @/lib/db).
    expect(source).not.toMatch(/(?:from\s+|import\()["']@\/lib\/db["']/);
  });

  it("4. exporte dynamic = 'force-dynamic'", async () => {
    const mod = await import("./route");

    expect(mod.dynamic).toBe("force-dynamic");
  });
});
