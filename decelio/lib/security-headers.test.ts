import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, getSecurityHeaders } from "./security-headers";

function findHeader(headers: ReturnType<typeof getSecurityHeaders>, key: string) {
  return headers.find((header) => header.key === key)?.value;
}

describe("getSecurityHeaders", () => {
  it("pose le HSTS sans preload, la durée minimale attendue par l'audit", () => {
    const value = findHeader(getSecurityHeaders(true), "Strict-Transport-Security");
    expect(value).toBe("max-age=63072000; includeSubDomains");
    expect(value).not.toContain("preload");
  });

  it("bloque l'intégration en iframe (clickjacking)", () => {
    expect(findHeader(getSecurityHeaders(true), "X-Frame-Options")).toBe("DENY");
  });

  it("empêche le navigateur de deviner le type MIME des réponses", () => {
    expect(findHeader(getSecurityHeaders(true), "X-Content-Type-Options")).toBe("nosniff");
  });

  it("limite les informations envoyées aux origines externes via le referrer", () => {
    expect(findHeader(getSecurityHeaders(true), "Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
  });

  it("désactive les permissions sensibles, y compris payment (Stripe Checkout redirige, n'a pas besoin de la déléguer)", () => {
    expect(findHeader(getSecurityHeaders(true), "Permissions-Policy")).toBe(
      "camera=(), microphone=(), geolocation=(), payment=()",
    );
  });

  it("pose bien les six en-têtes attendus", () => {
    const headers = getSecurityHeaders(true);
    expect(headers.map((h) => h.key).sort()).toEqual(
      [
        "Content-Security-Policy",
        "Permissions-Policy",
        "Referrer-Policy",
        "Strict-Transport-Security",
        "X-Content-Type-Options",
        "X-Frame-Options",
      ].sort(),
    );
  });
});

describe("buildContentSecurityPolicy", () => {
  it("interdit tout par défaut et n'autorise que les hôtes propres à Decelio", () => {
    const csp = buildContentSecurityPolicy(true);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  it("interdit le chargement en iframe via frame-ancestors", () => {
    expect(buildContentSecurityPolicy(true)).toContain("frame-ancestors 'none'");
  });

  it("n'autorise aucun hôte tiers pour les scripts (dette 'unsafe-inline' documentée pour le bootstrap Next.js) : PostHog passe par /ingest, sur notre domaine", () => {
    const csp = buildContentSecurityPolicy(true);
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).not.toMatch(/script-src[^;]*https:\/\//);
  });

  it("autorise les styles inline (dette documentée) mais rien d'externe", () => {
    expect(buildContentSecurityPolicy(true)).toContain("style-src 'self' 'unsafe-inline'");
  });

  it("n'autorise aucun hôte tiers en connect-src : PostHog est relayé par /ingest, sur notre domaine (voir app/ingest/[...path]/route.ts)", () => {
    const csp = buildContentSecurityPolicy(true);
    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toMatch(/connect-src[^;]*https:\/\//);
  });

  it("autorise Stripe Checkout et le portail de facturation Stripe comme cible de form-action (Server Actions soumises via de vrais <form>)", () => {
    const csp = buildContentSecurityPolicy(true);
    expect(csp).toContain(
      "form-action 'self' https://checkout.stripe.com https://billing.stripe.com",
    );
  });

  it("force HTTPS uniquement en production", () => {
    expect(buildContentSecurityPolicy(true)).toContain("upgrade-insecure-requests");
    expect(buildContentSecurityPolicy(false)).not.toContain("upgrade-insecure-requests");
  });

  it("tolère 'unsafe-eval' et les websockets du serveur de dev en développement seulement", () => {
    const dev = buildContentSecurityPolicy(false);
    const prod = buildContentSecurityPolicy(true);
    expect(dev).toContain("'unsafe-eval'");
    expect(dev).toContain("ws: wss:");
    expect(prod).not.toContain("'unsafe-eval'");
    expect(prod).not.toContain("ws:");
  });
});
