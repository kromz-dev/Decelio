import { beforeEach, describe, expect, it, vi } from "vitest";
import { REGISTER_LIMIT_PER_HOUR, REGISTER_WINDOW_MS } from "../../../../lib/auth-registration-policy";

describe("registration abuse guard", () => {
  it("uses a shared-database fixed-window limit", () => {
    expect(REGISTER_LIMIT_PER_HOUR).toBe(5);
    expect(REGISTER_WINDOW_MS).toBe(60 * 60 * 1000);
  });
});

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/password", () => ({
  hashPassword: vi.fn(async () => "hashed"),
}));

vi.mock("@/lib/rate-limit", () => ({
  callerKey: vi.fn(() => "caller-key"),
  rateLimit: vi.fn(async () => ({ allowed: true, remaining: 4, resetAt: new Date() })),
}));

vi.mock("@/lib/posthog-server", () => ({
  captureServerEvent: vi.fn(async () => undefined),
}));

import { TERMS_VERSION } from "@/lib/legal/terms";

import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { captureServerEvent } from "@/lib/posthog-server";
import { POST } from "./route";

function fakeRequest(body: unknown) {
  return new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register — événement signup_completed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimit).mockResolvedValue({ allowed: true, remaining: 4, resetAt: new Date() });
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
  });

  it("émet signup_completed avec method credentials après une inscription réussie", async () => {
    vi.mocked(db.user.create).mockResolvedValue({ id: "user-1" } as Awaited<
      ReturnType<typeof db.user.create>
    >);

    const res = await POST(
      fakeRequest({ email: "nouvel.utilisateur@example.com", name: "Nouvel utilisateur", password: "un-mot-de-passe-solide", acceptTerms: true }),
    );

    expect(res.status).toBe(201);
    expect(captureServerEvent).toHaveBeenCalledWith("user-1", "signup_completed", {
      method: "credentials",
    });
  });

  it("n'émet rien quand l'inscription échoue", async () => {
    vi.mocked(db.user.create).mockRejectedValue(new Error("échec base"));

    await expect(
      POST(
        fakeRequest({
          email: "echec@example.com",
          name: "Échec",
          password: "un-mot-de-passe-solide",
          acceptTerms: true,
        }),
      ),
    ).rejects.toThrow("échec base");

    expect(captureServerEvent).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/register — acceptation des CGV", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimit).mockResolvedValue({ allowed: true, remaining: 4, resetAt: new Date() });
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
  });

  it("rejette une inscription sans acceptTerms avec le message approprié", async () => {
    const res = await POST(
      fakeRequest({
        email: "sans-acceptation@example.com",
        name: "Test",
        password: "un-mot-de-passe-solide",
      }),
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Vous devez accepter les conditions générales de vente.");
  });

  it("rejette une inscription avec acceptTerms: false", async () => {
    const res = await POST(
      fakeRequest({
        email: "false-acceptation@example.com",
        name: "Test",
        password: "un-mot-de-passe-solide",
        acceptTerms: false,
      }),
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Vous devez accepter les conditions générales de vente.");
  });

  it("enregistre termsAcceptedAt et termsVersion lors d'une inscription réussie", async () => {
    vi.mocked(db.user.create).mockResolvedValue({ id: "user-with-terms" } as Awaited<
      ReturnType<typeof db.user.create>
    >);

    const res = await POST(
      fakeRequest({
        email: "avec-acceptation@example.com",
        name: "Test",
        password: "un-mot-de-passe-solide",
        acceptTerms: true,
      }),
    );

    expect(res.status).toBe(201);
    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "avec-acceptation@example.com",
          name: "Test",
          termsAcceptedAt: expect.any(Date),
          termsVersion: TERMS_VERSION,
        }),
      }),
    );
  });
});
