import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isProtectedPath, safeCallbackUrl } from "./auth-route-policy";

describe("auth route policy", () => {
  it("protects every application surface", () => {
    expect(isProtectedPath("/dashboard")).toBe(true);
    expect(isProtectedPath("/sites/new")).toBe(true);
    expect(isProtectedPath("/sources")).toBe(true);
    expect(isProtectedPath("/settings/profile")).toBe(true);
  });

  it("covers every route folder under app/(app)/, without needing this list kept in sync by hand", () => {
    const appGroupDir = path.join(__dirname, "..", "app", "(app)");
    const routeFolders = readdirSync(appGroupDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    // Garde contre une liste vide qui rendrait le test vide de sens (par
    // exemple si le chemin ci-dessus devenait incorrect).
    expect(routeFolders.length).toBeGreaterThan(0);

    for (const folder of routeFolders) {
      expect(isProtectedPath(`/${folder}`)).toBe(true);
    }
  });

  it("leaves marketing and authentication routes public", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/pricing")).toBe(false);
    expect(isProtectedPath("/api/audit")).toBe(false);
  });

  it("keeps internal callback queries and rejects external or backslash URLs", () => {
    expect(safeCallbackUrl("/settings?tab=billing")).toBe("/settings?tab=billing");
    expect(safeCallbackUrl("https://evil.example")).toBe("/dashboard");
    expect(safeCallbackUrl("//evil.example/path")).toBe("/dashboard");
    expect(safeCallbackUrl("/dashboard\\evil")).toBe("/dashboard");
  });
});
