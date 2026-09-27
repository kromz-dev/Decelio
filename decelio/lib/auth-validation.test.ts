import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "./auth-validation";

describe("credentials validation", () => {
  it("normalizes email and enforces a strong minimum password length", () => {
    expect(registerSchema.parse({ name: "Ada", email: " ADA@EXAMPLE.COM ", password: "123456789012", acceptTerms: true })).toMatchObject({ email: "ada@example.com" });
    expect(registerSchema.safeParse({ name: "Ada", email: "ada@example.com", password: "short", acceptTerms: true }).success).toBe(false);
  });

  it("rejects malformed login credentials", () => {
    expect(loginSchema.safeParse({ email: "not-an-email", password: "123456789012" }).success).toBe(false);
  });
});

describe("registration terms acceptance", () => {
  it("requires acceptTerms to be true", () => {
    const validData = { name: "Ada", email: "ada@example.com", password: "123456789012", acceptTerms: true };
    expect(registerSchema.safeParse(validData).success).toBe(true);
  });

  it("rejects missing acceptTerms field", () => {
    const invalidData = { name: "Ada", email: "ada@example.com", password: "123456789012" };
    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("rejects acceptTerms: false", () => {
    const invalidData = { name: "Ada", email: "ada@example.com", password: "123456789012", acceptTerms: false };
    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Vous devez accepter les conditions générales de vente.");
    }
  });

  it("includes the correct error message for terms rejection", () => {
    const result = registerSchema.safeParse({ name: "Ada", email: "ada@example.com", password: "123456789012" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const termsError = result.error.issues.find((issue) => issue.path[0] === "acceptTerms");
      expect(termsError?.message).toBe("Vous devez accepter les conditions générales de vente.");
    }
  });
});
