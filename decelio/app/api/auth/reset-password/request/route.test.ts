import { describe, expect, it, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";
import { POST } from "./route";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email/resend";

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: vi.fn() },
    verificationToken: { deleteMany: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/lib/email/resend", () => ({
  sendPasswordResetEmail: vi.fn(async () => ({ success: true, id: "email_1" })),
}));

// Même contrat que lib/rate-limit, adossé à un compteur local par clé.
const counters = new Map<string, number>();
vi.mock("@/lib/rate-limit", () => ({
  callerKey: (req: Request, prefix: string) =>
    `${prefix}:${req.headers.get("x-forwarded-for")?.split(",").map((p) => p.trim()).filter(Boolean).pop() || "inconnu"}`,
  rateLimit: vi.fn(async (key: string, limit: number, windowMs: number) => {
    const count = (counters.get(key) ?? 0) + 1;
    counters.set(key, count);
    return { allowed: count <= limit, remaining: Math.max(0, limit - count), resetAt: new Date(Date.now() + windowMs) };
  }),
}));

function createRequest(body: unknown, ip = "127.0.0.1") {
  return new Request("http://localhost:3000/api/auth/reset-password/request", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/reset-password/request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    counters.clear();
  });

  it("returns the same generic response whether or not the account exists", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValueOnce(null);
    const resAbsent = await POST(createRequest({ email: "ghost@example.com" }, "ip-absent"));

    vi.mocked(db.user.findUnique).mockResolvedValueOnce({ passwordHash: "scrypt:aa:bb" } as never);
    const resPresent = await POST(createRequest({ email: "user@example.com" }, "ip-present"));

    expect(resAbsent.status).toBe(200);
    expect(resPresent.status).toBe(200);
    expect(await resAbsent.json()).toEqual(await resPresent.json());
  });

  it("does not send an email for an account that does not exist", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValueOnce(null);
    await POST(createRequest({ email: "ghost@example.com" }, "ip-1"));
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("does not send an email for an account with no password (OAuth-only)", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({ passwordHash: null } as never);
    await POST(createRequest({ email: "oauth@example.com" }, "ip-2"));
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("stores only the SHA-256 hash of the token, never the raw token", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({ passwordHash: "scrypt:aa:bb" } as never);

    await POST(createRequest({ email: "user@example.com" }, "ip-3"));

    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    const [, rawToken] = vi.mocked(sendPasswordResetEmail).mock.calls[0];

    expect(db.verificationToken.create).toHaveBeenCalledTimes(1);
    const createCall = vi.mocked(db.verificationToken.create).mock.calls[0][0] as {
      data: { identifier: string; token: string; expires: Date };
    };

    expect(createCall.data.token).not.toBe(rawToken);
    expect(createCall.data.token).toBe(createHash("sha256").update(rawToken).digest("hex"));
    expect(createCall.data.identifier).toBe("password-reset:user@example.com");
    expect(createCall.data.expires.getTime()).toBeGreaterThan(Date.now());
  });

  it("deletes previous reset tokens for the same email on a new request", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({ passwordHash: "scrypt:aa:bb" } as never);
    await POST(createRequest({ email: "user@example.com" }, "ip-4"));

    expect(db.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { identifier: "password-reset:user@example.com" },
    });
  });

  it("rejects malformed email input", async () => {
    const res = await POST(createRequest({ email: "not-an-email" }, "ip-5"));
    expect(res.status).toBe(400);
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it("rate limits after the configured number of requests from the same IP", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({ passwordHash: "scrypt:aa:bb" } as never);
    const ip = "ip-rate-limit";
    const body = { email: "user@example.com" };

    for (let i = 0; i < 5; i++) {
      const res = await POST(createRequest(body, ip));
      expect(res.status).toBe(200);
    }

    const res = await POST(createRequest(body, ip));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toMatch(/^\d+$/);
  });
});
