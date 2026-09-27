import { describe, it, expect, vi, beforeEach } from "vitest";

// Compteur local en mémoire pour ne pas dépendre d'une vraie base, même
// contrat que lib/rate-limit (voir app/api/beacon/route.test.ts).
const counters = new Map<string, number>();
vi.mock("@/lib/rate-limit", () => ({
  callerKeyFromHeaders: (headers: Headers, prefix: string) =>
    `${prefix}:${
      headers
        .get("x-forwarded-for")
        ?.split(",")
        .map((p) => p.trim())
        .filter(Boolean)
        .pop() || "inconnu"
    }`,
  rateLimit: vi.fn(async (key: string, limit: number, windowMs: number) => {
    const count = (counters.get(key) ?? 0) + 1;
    counters.set(key, count);
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt: new Date(Date.now() + windowMs),
    };
  }),
}));

let forwardedFor = "203.0.113.9";
vi.mock("next/headers", () => ({
  headers: async () => {
    const h = new Headers();
    h.set("x-forwarded-for", forwardedFor);
    return h;
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    auditLead: {
      upsert: vi.fn(),
    },
  },
}));

// Espion posé sur le module d'e-mail : si captureLead se remettait un jour à
// appeler Resend, cet espion serait sollicité et le test ci-dessous échouerait.
const sendAuditReportEmailSpy = vi.fn();
vi.mock("@/lib/email/resend", () => ({
  sendAuditReportEmail: sendAuditReportEmailSpy,
}));

// Chargé après les mocks : captureLead importe @/lib/rate-limit, @/lib/db et next/headers.
import { captureLead } from "./lead";
import { db } from "@/lib/db";

function formDataWithEmail(email: string): FormData {
  const fd = new FormData();
  fd.set("email", email);
  return fd;
}

const validAuditData = JSON.stringify({ domain: "example.com", score: 42, type: "v3-technical-scan" });

describe("captureLead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    counters.clear();
    forwardedFor = "203.0.113.9";
    vi.mocked(db.auditLead.upsert).mockResolvedValue({} as never);
  });

  it("enregistre la piste en base avec des données valides", async () => {
    const result = await captureLead(formDataWithEmail("agence@example.com"), validAuditData);

    expect(result.success).toBe(true);
    expect(db.auditLead.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email_domain: { email: "agence@example.com", domain: "example.com" } },
        create: expect.objectContaining({
          email: "agence@example.com",
          domain: "example.com",
          score: 42,
        }),
      })
    );
  });

  it("n'appelle jamais Resend ni aucun envoi d'e-mail", async () => {
    await captureLead(formDataWithEmail("agence@example.com"), validAuditData);

    expect(sendAuditReportEmailSpy).not.toHaveBeenCalled();
  });

  it("refuse un email invalide", async () => {
    const result = await captureLead(formDataWithEmail("pas-un-email"), validAuditData);

    expect(result.success).toBe(false);
    expect(db.auditLead.upsert).not.toHaveBeenCalled();
  });

  it("refuse un domaine invalide", async () => {
    const badData = JSON.stringify({ domain: "pas un domaine !!", score: 42, type: "v3-technical-scan" });
    const result = await captureLead(formDataWithEmail("agence@example.com"), badData);

    expect(result.success).toBe(false);
    expect(db.auditLead.upsert).not.toHaveBeenCalled();
  });

  it("refuse un score hors bornes", async () => {
    const badData = JSON.stringify({ domain: "example.com", score: 999, type: "v3-technical-scan" });
    const result = await captureLead(formDataWithEmail("agence@example.com"), badData);

    expect(result.success).toBe(false);
    expect(db.auditLead.upsert).not.toHaveBeenCalled();
  });

  it("refuse un JSON malformé pour auditDataStr", async () => {
    const result = await captureLead(formDataWithEmail("agence@example.com"), "{ ceci n'est pas du json");

    expect(result.success).toBe(false);
    expect(db.auditLead.upsert).not.toHaveBeenCalled();
  });

  it("refuse au-delà de la limite de débit (5 par heure et par IP)", async () => {
    for (let i = 0; i < 5; i++) {
      const ok = await captureLead(formDataWithEmail(`agence${i}@example.com`), validAuditData);
      expect(ok.success).toBe(true);
    }

    const sixth = await captureLead(formDataWithEmail("agence6@example.com"), validAuditData);

    expect(sixth.success).toBe(false);
    expect(db.auditLead.upsert).toHaveBeenCalledTimes(5);
  });

  it("compte séparément deux IP différentes", async () => {
    for (let i = 0; i < 5; i++) {
      await captureLead(formDataWithEmail(`agenceA${i}@example.com`), validAuditData);
    }
    forwardedFor = "198.51.100.4";

    const result = await captureLead(formDataWithEmail("agenceB@example.com"), validAuditData);

    expect(result.success).toBe(true);
  });
});
