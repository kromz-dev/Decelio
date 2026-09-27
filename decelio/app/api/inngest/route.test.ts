import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const innerHandler = vi.hoisted(() =>
  vi.fn(async () => new Response("servi par inngest", { status: 200 })),
);

const serveMock = vi.hoisted(() =>
  vi.fn(() => ({
    GET: innerHandler,
    POST: innerHandler,
    PUT: innerHandler,
  })),
);

vi.mock("inngest/next", () => ({ serve: serveMock }));
vi.mock("@/inngest/client", () => ({ inngest: { id: "decelio" } }));
vi.mock("@/inngest/functions", () => ({ functions: [] }));

const ORIGINAL_ENV = { ...process.env };

// NODE_ENV est declare en lecture seule : on remplace l'objet entier plutot
// que d'affecter la propriete, comme le fait instrumentation.test.ts.
function setEnv(overrides: { NODE_ENV: string; INNGEST_SIGNING_KEY?: string }) {
  const next = { ...ORIGINAL_ENV, ...overrides };
  if (overrides.INNGEST_SIGNING_KEY === undefined) {
    delete next.INNGEST_SIGNING_KEY;
  }
  process.env = next as unknown as typeof process.env;
}

function request(): NextRequest {
  return new Request("https://decelio.fr/api/inngest", { method: "POST" }) as unknown as NextRequest;
}

async function loadRoute() {
  return import("./route");
}

beforeEach(() => {
  vi.resetModules();
  innerHandler.mockClear();
  serveMock.mockClear();
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("chargement du module", () => {
  // Régression : un `throw` au niveau module faisait échouer `npm run build`,
  // car `next build` évalue les routes avec NODE_ENV=production pour collecter
  // leurs données — donc sans les secrets d'exécution.
  it("n'échoue pas en production quand INNGEST_SIGNING_KEY est absente", async () => {
    setEnv({ NODE_ENV: "production" });

    await expect(loadRoute()).resolves.toBeDefined();
  });
});

describe("garde sur la clé de signature", () => {
  it("refuse la requête en 503 en production sans clé, sans appeler inngest", async () => {
    setEnv({ NODE_ENV: "production" });

    const { POST } = await loadRoute();
    const response = await POST(request(), undefined);

    expect(response.status).toBe(503);
    expect(innerHandler).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("INNGEST_SIGNING_KEY"),
    });
  });

  it("applique la même garde sur GET et PUT", async () => {
    setEnv({ NODE_ENV: "production" });

    const { GET, PUT } = await loadRoute();

    expect((await GET(request(), undefined)).status).toBe(503);
    expect((await PUT(request(), undefined)).status).toBe(503);
    expect(innerHandler).not.toHaveBeenCalled();
  });

  it("délègue à inngest en production quand la clé est présente", async () => {
    setEnv({ NODE_ENV: "production", INNGEST_SIGNING_KEY: "signkey-prod-test" });

    const { POST } = await loadRoute();
    const response = await POST(request(), undefined);

    expect(response.status).toBe(200);
    expect(innerHandler).toHaveBeenCalledOnce();
  });

  it("laisse passer hors production sans clé, pour que le dev reste utilisable", async () => {
    setEnv({ NODE_ENV: "development" });

    const { POST } = await loadRoute();
    const response = await POST(request(), undefined);

    expect(response.status).toBe(200);
    expect(innerHandler).toHaveBeenCalledOnce();
  });
});
