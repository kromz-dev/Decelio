import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { callerKey } from "./rate-limit";

// callerKey ne touche jamais la base : ces tests sont purs, aucun mock nécessaire.

const ORIGINAL_ENV = { ...process.env };

function requestWithForwardedFor(value: string | null): Request {
  const headers = new Headers();
  if (value !== null) headers.set("x-forwarded-for", value);
  return new Request("http://localhost:3000/api/scan", { headers });
}

describe("callerKey", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.TRUSTED_PROXY_HOPS;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("utilise l'unique IP quand x-forwarded-for n'en contient qu'une", () => {
    const req = requestWithForwardedFor("203.0.113.7");
    expect(callerKey(req, "scan")).toBe("scan:203.0.113.7");
  });

  it("prend la dernière IP de la liste, jamais la première fournie par le client", () => {
    const req = requestWithForwardedFor("1.2.3.4, 203.0.113.7");
    const key = callerKey(req, "scan");
    expect(key).toBe("scan:203.0.113.7");
    expect(key).not.toContain("1.2.3.4");
  });

  it("ignore les espaces et les éléments vides de la liste", () => {
    const req = requestWithForwardedFor(" 1.2.3.4 ,  , 203.0.113.7 , ");
    expect(callerKey(req, "scan")).toBe("scan:203.0.113.7");
  });

  it("retombe sur « inconnu » quand l'en-tête est absent", () => {
    const req = requestWithForwardedFor(null);
    expect(callerKey(req, "scan")).toBe("scan:inconnu");
  });

  it("respecte TRUSTED_PROXY_HOPS pour remonter de plusieurs sauts", () => {
    process.env.TRUSTED_PROXY_HOPS = "2";
    const req = requestWithForwardedFor("a, b, c");
    expect(callerKey(req, "scan")).toBe("scan:b");
  });

  it("prend le premier élément disponible si la liste est plus courte que le nombre de sauts", () => {
    process.env.TRUSTED_PROXY_HOPS = "5";
    const req = requestWithForwardedFor("a, b, c");
    expect(callerKey(req, "scan")).toBe("scan:a");
  });

  it("revient à 1 saut si TRUSTED_PROXY_HOPS n'est pas un entier valide", () => {
    process.env.TRUSTED_PROXY_HOPS = "abc";
    const req = requestWithForwardedFor("1.2.3.4, 203.0.113.7");
    expect(callerKey(req, "scan")).toBe("scan:203.0.113.7");
  });

  it("revient à 1 saut si TRUSTED_PROXY_HOPS vaut zéro ou un nombre négatif", () => {
    process.env.TRUSTED_PROXY_HOPS = "0";
    const req = requestWithForwardedFor("1.2.3.4, 203.0.113.7");
    expect(callerKey(req, "scan")).toBe("scan:203.0.113.7");
  });
});
