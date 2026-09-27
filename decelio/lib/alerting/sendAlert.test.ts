import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const sendMock = vi.hoisted(() => vi.fn());

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(function MockResend() {
    return { emails: { send: sendMock } };
  }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    alertEvent: { createMany: vi.fn(), findMany: vi.fn() },
    monitoredSite: { findFirst: vi.fn() },
  },
}));

import { db } from "@/lib/db";
import { renderAlertEmail, searchBotAlertSentence, sendRegressionAlert, suggestFix } from "./sendAlert";

const ORIGINAL_ENV = { ...process.env };

describe("renderAlertEmail", () => {
  it("utilise un objet et un ton de régression, et cite la cause et le correctif", () => {
    const cause = "robots.txt interdit GPTBot";
    const email = renderAlertEmail({
      kind: "REGRESSION",
      domains: [{ domain: "exemple.fr", cause, fix: suggestFix(cause) }],
    });

    expect(email.subject).toBe("Decelio : un domaine n'est plus lisible");
    expect(email.text).toContain("n'est plus lisible");
    expect(email.text).toContain("exemple.fr");
    expect(email.text).toContain(cause);
    expect(email.text).toContain("Retirez la règle qui interdit cet assistant dans robots.txt");
    expect(email.text).not.toContain("est de nouveau lisible");
  });

  it("utilise un objet et un ton de retour au vert", () => {
    const email = renderAlertEmail({
      kind: "RESOLUTION",
      domains: [{ domain: "exemple.fr", cause: "le site répond de nouveau", fix: "Rien à changer." }],
    });

    expect(email.subject).toBe("Decelio : un domaine est de nouveau lisible");
    expect(email.text).toContain("est de nouveau lisible");
    expect(email.text).toContain("exemple.fr");
    expect(email.text).toContain("le site répond de nouveau");
    expect(email.text).not.toContain("n'est plus lisible");
  });

  it("regroupe plusieurs domaines dans un seul message", () => {
    const email = renderAlertEmail({
      kind: "REGRESSION",
      domains: [
        { domain: "a.fr", cause: "robots.txt interdit GPTBot", fix: suggestFix("robots.txt interdit GPTBot") },
        { domain: "b.fr", cause: "site injoignable", fix: suggestFix("site injoignable") },
      ],
    });

    expect(email.subject).toBe("Decelio : 2 domaines ne sont plus lisibles");
    expect(email.text).toContain("a.fr");
    expect(email.text).toContain("b.fr");
  });

  it("nomme l'assistant et précise qu'il s'agit du robot de recherche quand le bot décisif est connu", () => {
    const email = renderAlertEmail({
      kind: "REGRESSION",
      domains: [
        {
          domain: "exemple.fr",
          cause: "robots.txt interdit OAI-SearchBot.",
          fix: suggestFix("robots.txt interdit OAI-SearchBot."),
          bot: "OAI-SearchBot",
        },
      ],
    });

    expect(email.text).toContain("Le robot de recherche de ChatGPT (OAI-SearchBot) ne peut plus lire le site.");
    expect(email.html).toContain("Le robot de recherche de ChatGPT (OAI-SearchBot) ne peut plus lire le site.");
    // Honnêteté de la mesure (docs/08-constitution.md) : jamais de promesse
    // de citation, Decelio ne mesure pas les citations.
    expect(email.text).not.toMatch(/citation|cité|invisible dans les réponses/i);
  });

  it("ne casse pas les appelants qui n'indiquent aucun bot (rétrocompatibilité)", () => {
    const email = renderAlertEmail({
      kind: "REGRESSION",
      domains: [{ domain: "exemple.fr", cause: "BLOQUÉ", fix: suggestFix("BLOQUÉ") }],
    });

    expect(email.text).toContain("Cause : BLOQUÉ");
    expect(email.text).not.toContain("robot de recherche");
  });

  it("affiche le verdict Refusé (forme et mot) pour un statut BLOQUÉ", () => {
    const email = renderAlertEmail({
      kind: "REGRESSION",
      domains: [{ domain: "exemple.fr", cause: "BLOQUÉ", fix: suggestFix("BLOQUÉ"), status: "BLOQUÉ" }],
    });

    expect(email.html).toContain("■");
    expect(email.html).toContain("Refusé");
  });

  it("affiche le verdict Vide (forme et mot) pour un statut COQUILLE VIDE", () => {
    const email = renderAlertEmail({
      kind: "REGRESSION",
      domains: [
        { domain: "exemple.fr", cause: "COQUILLE VIDE", fix: suggestFix("coquille"), status: "COQUILLE VIDE" },
      ],
    });

    expect(email.html).toContain("▲");
    expect(email.html).toContain("Vide");
  });

  it("affiche le verdict Lu (forme et mot) pour un statut OK en résolution", () => {
    const email = renderAlertEmail({
      kind: "RESOLUTION",
      domains: [{ domain: "exemple.fr", cause: "le site répond de nouveau", fix: "Rien à changer.", status: "OK" }],
    });

    expect(email.html).toContain("●");
    expect(email.html).toContain("● Lu");
  });

  it("affiche le verdict inconnu avec le mot « à vérifier » pour un statut À VÉRIFIER", () => {
    const email = renderAlertEmail({
      kind: "REGRESSION",
      domains: [
        { domain: "exemple.fr", cause: "signal ambigu", fix: suggestFix("signal ambigu"), status: "À VÉRIFIER" },
      ],
    });

    expect(email.html).toContain("○");
    expect(email.html).toContain("à vérifier");
  });

  it("n'utilise aucun tiret cadratin dans l'e-mail", () => {
    const email = renderAlertEmail({
      kind: "REGRESSION",
      domains: [{ domain: "exemple.fr", cause: "BLOQUÉ", fix: suggestFix("BLOQUÉ"), status: "BLOQUÉ" }],
    });

    expect(email.subject).not.toContain("—");
    expect(email.html).not.toContain("—");
    expect(email.text).not.toContain("—");
  });

  it("garde l'identité Decelio (logo et pied de page) : les alertes ne sont jamais en marque blanche", () => {
    const email = renderAlertEmail({
      kind: "REGRESSION",
      domains: [{ domain: "exemple.fr", cause: "BLOQUÉ", fix: suggestFix("BLOQUÉ"), status: "BLOQUÉ" }],
    });

    expect(email.html).toContain("logo-decelio.png");
    expect(email.html).toContain("mailto:contact@decelio.fr");
  });
});

describe("searchBotAlertSentence", () => {
  it("nomme ChatGPT pour OAI-SearchBot, en régression", () => {
    expect(searchBotAlertSentence("OAI-SearchBot", "REGRESSION")).toBe(
      "Le robot de recherche de ChatGPT (OAI-SearchBot) ne peut plus lire le site.",
    );
  });

  it("nomme Claude pour Claude-SearchBot, en résolution", () => {
    expect(searchBotAlertSentence("Claude-SearchBot", "RESOLUTION")).toBe(
      "Le robot de recherche de Claude (Claude-SearchBot) peut de nouveau lire le site.",
    );
  });

  it("nomme Perplexity pour PerplexityBot", () => {
    expect(searchBotAlertSentence("PerplexityBot", "REGRESSION")).toBe(
      "Le robot de recherche de Perplexity (PerplexityBot) ne peut plus lire le site.",
    );
  });

  it("refuse un robot d'entraînement : GPTBot n'a rien à faire dans une alerte client", () => {
    expect(() => searchBotAlertSentence("GPTBot", "REGRESSION")).toThrow();
  });
});

describe("T026: sendRegressionAlert journalise l'alerte réellement envoyée", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendMock.mockResolvedValue({ data: { id: "resend_email_789" }, error: null });
    process.env.RESEND_API_KEY = "re_test_key";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("envoie un seul e-mail et écrit une ligne AlertEvent pour le site concerné", async () => {
    vi.mocked(db.monitoredSite.findFirst).mockResolvedValueOnce({ id: "site-1" } as never);

    const result = await sendRegressionAlert(
      "agence@example.com",
      "exemple.fr",
      "OK",
      "BLOQUÉ",
    );

    expect(result.success).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(db.monitoredSite.findFirst).toHaveBeenCalledWith({
      where: { url: "exemple.fr", user: { email: "agence@example.com" } },
      select: { id: true },
    });
    expect(db.alertEvent.createMany).toHaveBeenCalledTimes(1);
    expect(db.alertEvent.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          siteId: "site-1",
          type: "REGRESSION",
          channel: "EMAIL",
        }),
      ],
    });
  });

  it("n'écrit aucune ligne AlertEvent si le site n'a pas pu être retrouvé", async () => {
    vi.mocked(db.monitoredSite.findFirst).mockResolvedValueOnce(null);

    const result = await sendRegressionAlert(
      "agence@example.com",
      "exemple.fr",
      "OK",
      "BLOQUÉ",
    );

    expect(result.success).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(db.alertEvent.createMany).not.toHaveBeenCalled();
  });

  it("nomme l'assistant dans l'e-mail envoyé quand le bot décisif est fourni", async () => {
    vi.mocked(db.monitoredSite.findFirst).mockResolvedValueOnce({ id: "site-1" } as never);

    await sendRegressionAlert("agence@example.com", "exemple.fr", "OK", "BLOQUÉ", "Claude-SearchBot");

    expect(sendMock).toHaveBeenCalledTimes(1);
    const sentEmail = vi.mocked(sendMock).mock.calls[0][0] as { text: string };
    expect(sentEmail.text).toContain("Le robot de recherche de Claude (Claude-SearchBot) ne peut plus lire le site.");
  });
});
