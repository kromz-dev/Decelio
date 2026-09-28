import { describe, it, expect, vi } from "vitest";

/**
 * Seule route de l'espace connecté sans `metadata` (dashboard, alerts,
 * reports, sources, sites/[siteId] en ont toutes une) : l'onglet du
 * navigateur affichait le titre de la page d'accueil marketing au lieu de
 * "Paramètres | Decelio".
 */

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe("SettingsPage metadata", () => {
  it("expose un titre d'onglet, comme les autres pages de l'espace connecté", async () => {
    const { metadata } = await import("./page");
    expect(metadata?.title).toBe("Paramètres | Decelio");
  });
});
