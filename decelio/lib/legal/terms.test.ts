import { describe, expect, it } from "vitest";
import { TERMS_VERSION } from "./terms";

describe("TERMS_VERSION", () => {
  it("exports a version string in AAAA-MM-JJ format", () => {
    expect(TERMS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("is defined as a constant", () => {
    expect(typeof TERMS_VERSION).toBe("string");
    expect(TERMS_VERSION.length).toBe(10);
  });
});
