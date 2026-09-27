import { describe, expect, it, vi, beforeEach } from "vitest";
import { authorizeCredentials } from "./auth";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

/**
 * Compteurs en mémoire simulant la table `RateLimit` : une ligne par
 * (clé, fenêtre), incrémentée atomiquement par un upsert — exactement ce que
 * fait `lib/rate-limit.ts` en base réelle.
 */
const counters = new Map<string, number>();

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
    rateLimit: {
      upsert: vi.fn(async ({ where }: { where: { key_window: { key: string; window: Date } } }) => {
        const mapKey = `${where.key_window.key}|${where.key_window.window.getTime()}`;
        const count = (counters.get(mapKey) ?? 0) + 1;
        counters.set(mapKey, count);
        return { count };
      }),
    },
  },
}));

vi.mock("@/lib/password", () => ({
  verifyPassword: vi.fn(),
  getDummyPasswordHash: vi.fn().mockResolvedValue("scrypt:dummysalt:dummykey"),
}));

const VALID_USER = {
  id: "user_1",
  email: "reused@example.com",
  name: "Utilisateur",
  image: null,
  passwordHash: "scrypt:realsalt:realkey",
};
const VALID_PASSWORD = "correct-password-123!";

function requestFromIp(ip: string): Request {
  return new Request("https://decelio.example/api/auth/callback/credentials", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
  });
}

describe("limitation de débit sur la connexion par identifiants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    counters.clear();
    vi.mocked(db.user.findUnique).mockResolvedValue(VALID_USER as never);
    vi.mocked(verifyPassword).mockResolvedValue(true);
  });

  it("refuse la 11e tentative de connexion en 15 minutes depuis la même IP", async () => {
    const ip = "203.0.113.10";
    const results: Array<Awaited<ReturnType<typeof authorizeCredentials>>> = [];

    for (let i = 0; i < 11; i += 1) {
      // Un e-mail différent à chaque essai : on isole la limite par IP de
      // celle par e-mail (5 tentatives), qui ne doit pas se déclencher ici.
      results.push(
        await authorizeCredentials(
          { email: `victime-${i}@example.com`, password: VALID_PASSWORD },
          requestFromIp(ip),
        ),
      );
    }

    expect(results.slice(0, 10).every((result) => result !== null)).toBe(true);
    expect(results[10]).toBeNull();
  });

  it("refuse la 6e tentative sur le même e-mail, même depuis des IP différentes", async () => {
    const email = "cible@example.com";
    const results: Array<Awaited<ReturnType<typeof authorizeCredentials>>> = [];

    for (let i = 0; i < 6; i += 1) {
      // Une IP différente à chaque essai : on isole la limite par e-mail de
      // celle par IP (10 tentatives), qui ne doit pas se déclencher ici.
      results.push(
        await authorizeCredentials(
          { email, password: VALID_PASSWORD },
          requestFromIp(`198.51.100.${i}`),
        ),
      );
    }

    expect(results.slice(0, 5).every((result) => result !== null)).toBe(true);
    expect(results[5]).toBeNull();
  });

  it("échoue avec un résultat null identique à un mot de passe erroné, sans distinction de cause", async () => {
    vi.mocked(verifyPassword).mockResolvedValue(false);
    const ip = "203.0.113.20";

    const wrongPasswordResult = await authorizeCredentials(
      { email: "autre@example.com", password: VALID_PASSWORD },
      requestFromIp(ip),
    );

    for (let i = 0; i < 10; i += 1) {
      await authorizeCredentials(
        { email: `saturation-${i}@example.com`, password: VALID_PASSWORD },
        requestFromIp(ip),
      );
    }
    const rateLimitedResult = await authorizeCredentials(
      { email: "saturation-finale@example.com", password: VALID_PASSWORD },
      requestFromIp(ip),
    );

    expect(wrongPasswordResult).toBeNull();
    expect(rateLimitedResult).toBeNull();
  });
});
