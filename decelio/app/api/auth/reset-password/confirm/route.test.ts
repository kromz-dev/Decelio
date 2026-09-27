import { describe, expect, it, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";
import { POST } from "./route";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    verificationToken: { findUnique: vi.fn(), delete: vi.fn(async () => ({})) },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

vi.mock("@/lib/email/resend", () => ({
  sendPasswordResetEmail: vi.fn(),
}));

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

const RAW_TOKEN = "a-very-random-raw-token-value-1234567890";
const TOKEN_HASH = createHash("sha256").update(RAW_TOKEN).digest("hex");
const STRONG_PASSWORD = "une-nouvelle-phrase-de-passe";

function createRequest(body: unknown, ip = "127.0.0.1") {
  return new Request("http://localhost:3000/api/auth/reset-password/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

function validToken(overrides: Partial<{ identifier: string; token: string; expires: Date }> = {}) {
  return {
    identifier: "password-reset:user@example.com",
    token: TOKEN_HASH,
    expires: new Date(Date.now() + 60 * 60 * 1000),
    ...overrides,
  };
}

describe("POST /api/auth/reset-password/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    counters.clear();
  });

  it("changes the password and deletes the token for a valid, unexpired token", async () => {
    vi.mocked(db.verificationToken.findUnique).mockResolvedValueOnce(validToken() as never);
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({ id: "user_1" } as never);

    const res = await POST(createRequest({ token: RAW_TOKEN, password: STRONG_PASSWORD }, "ip-1"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { passwordHash: expect.any(String) },
    });
    const newHash = vi.mocked(db.user.update).mock.calls[0][0].data.passwordHash as string;
    expect(newHash).not.toContain(STRONG_PASSWORD);

    expect(db.verificationToken.delete).toHaveBeenCalledWith({ where: { token: TOKEN_HASH } });
  });

  it("looks up the token only by its hash, never by the raw value", async () => {
    vi.mocked(db.verificationToken.findUnique).mockResolvedValueOnce(validToken() as never);
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({ id: "user_1" } as never);

    await POST(createRequest({ token: RAW_TOKEN, password: STRONG_PASSWORD }, "ip-2"));

    expect(db.verificationToken.findUnique).toHaveBeenCalledWith({ where: { token: TOKEN_HASH } });
  });

  it("rejects replaying the same token a second time", async () => {
    vi.mocked(db.verificationToken.findUnique).mockResolvedValueOnce(validToken() as never);
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({ id: "user_1" } as never);
    const first = await POST(createRequest({ token: RAW_TOKEN, password: STRONG_PASSWORD }, "ip-3"));
    expect(first.status).toBe(200);

    // The token was deleted in the transaction above; a second lookup finds nothing.
    vi.mocked(db.verificationToken.findUnique).mockResolvedValueOnce(null);
    const second = await POST(createRequest({ token: RAW_TOKEN, password: STRONG_PASSWORD }, "ip-3"));

    expect(second.status).toBe(400);
    expect(db.user.update).toHaveBeenCalledTimes(1);
  });

  it("rejects an expired token", async () => {
    vi.mocked(db.verificationToken.findUnique).mockResolvedValueOnce(
      validToken({ expires: new Date(Date.now() - 1000) }) as never,
    );

    const res = await POST(createRequest({ token: RAW_TOKEN, password: STRONG_PASSWORD }, "ip-4"));

    expect(res.status).toBe(400);
    expect(db.user.update).not.toHaveBeenCalled();
    expect(db.verificationToken.delete).toHaveBeenCalledWith({ where: { token: TOKEN_HASH } });
  });

  it("rejects a token that does not exist", async () => {
    vi.mocked(db.verificationToken.findUnique).mockResolvedValueOnce(null);

    const res = await POST(createRequest({ token: "unknown-token", password: STRONG_PASSWORD }, "ip-5"));

    expect(res.status).toBe(400);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("rejects a weak password without touching the database", async () => {
    const res = await POST(createRequest({ token: RAW_TOKEN, password: "short" }, "ip-6"));

    expect(res.status).toBe(400);
    expect(db.verificationToken.findUnique).not.toHaveBeenCalled();
  });
});
