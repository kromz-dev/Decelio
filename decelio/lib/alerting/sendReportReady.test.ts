import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const sendMock = vi.hoisted(() => vi.fn());

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(function MockResend() {
    return { emails: { send: sendMock } };
  }),
}));

vi.mock("../db", () => ({
  db: {
    monthlyReport: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    client: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../rate-limit", () => ({
  rateLimit: vi.fn(),
}));

import { db } from "../db";
import { rateLimit } from "../rate-limit";
import { sendReportReady, sendReportReadyForAgency } from "./sendReportReady";
import { sendMonthlyReportReadyEmail } from "../email/resend";

const ORIGINAL_ENV = { ...process.env };

describe("T048: sendMonthlyReportReadyEmail (transport Resend)", () => {
  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({ data: { id: "resend_email_123" }, error: null });
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.NEXT_PUBLIC_APP_URL = "https://decelio.fr";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("sends an email saying 'votre rapport mensuel est disponible' for a single report", async () => {
    const res = await sendMonthlyReportReadyEmail({
      to: "agence@example.com",
      recipientName: "Alice",
      agencyName: "Studio Web",
      period: "2026-09",
      clientNames: ["Cabinet Vitrine"],
    });

    expect(res.success).toBe(true);
    expect(res.id).toBe("resend_email_123");
    expect(sendMock).toHaveBeenCalledTimes(1);

    const callArgs = sendMock.mock.calls[0][0];
    expect(callArgs.to).toBe("agence@example.com");
    expect(callArgs.subject).toContain("Votre rapport mensuel est disponible");
    expect(callArgs.subject).toContain("septembre 2026");
    expect(callArgs.html).toContain("Votre rapport mensuel est disponible pour la période de <strong>septembre 2026</strong>.");
    expect(callArgs.html).toContain("Cabinet Vitrine");
    expect(callArgs.html).toContain("https://decelio.fr/reports");
    expect(callArgs.text.toLowerCase()).toContain("votre rapport mensuel est disponible");
  });

  it("sends plural subject and lists multiple clients when agency has multiple reports", async () => {
    const res = await sendMonthlyReportReadyEmail({
      to: "agence@example.com",
      recipientName: "Alice",
      period: "2026-09",
      clientCount: 3,
      clientNames: ["Client A", "Client B", "Client C"],
    });

    expect(res.success).toBe(true);
    const callArgs = sendMock.mock.calls[0][0];
    expect(callArgs.subject).toContain("Vos rapports mensuels sont disponibles");
    expect(callArgs.html).toContain("Client A");
    expect(callArgs.html).toContain("Client B");
    expect(callArgs.html).toContain("Client C");
    // Explicit verification of "votre rapport mensuel est disponible" in body
    expect(callArgs.html.toLowerCase()).toContain("votre rapport mensuel est disponible");
  });
});

describe("T048: sendReportReady (alerte et logique de limitation agence)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendMock.mockResolvedValue({ data: { id: "resend_email_456" }, error: null });
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.NEXT_PUBLIC_APP_URL = "https://decelio.fr";

    // Default rateLimit: allowed = true
    vi.mocked(rateLimit).mockResolvedValue({
      allowed: true,
      remaining: 0,
      resetAt: new Date(Date.now() + 86400000),
    });
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("triggers email sending upon MonthlyReport generation", async () => {
    vi.mocked(db.monthlyReport.findUnique).mockResolvedValueOnce({
      id: "report-1",
      period: "2026-09",
      clientId: "client-1",
      client: {
        id: "client-1",
        name: "Cabinet Vitrine",
        userId: "user-agency-1",
        user: {
          id: "user-agency-1",
          email: "boss@agence.fr",
          name: "Jean Dupont",
          brandSettings: { agencyName: "Dupont Digital" },
        },
      },
    } as never);

    vi.mocked(db.monthlyReport.findMany).mockResolvedValueOnce([
      { client: { name: "Cabinet Vitrine" } },
    ] as never);

    const result = await sendReportReady("report-1");

    expect(result.success).toBe(true);
    expect(result.id).toBe("resend_email_456");
    expect(rateLimit).toHaveBeenCalledWith(
      "report_ready:user-agency-1:2026-09",
      1,
      24 * 60 * 60 * 1000
    );
    expect(sendMock).toHaveBeenCalledTimes(1);
    const sent = sendMock.mock.calls[0][0];
    expect(sent.to).toBe("boss@agence.fr");
    expect(sent.subject).toContain("Votre rapport mensuel est disponible");
  });

  it("enforces Resend free tier (100 emails/day) by skipping subsequent client reports for the same agency", async () => {
    // First report for Client 1: allowed = true
    vi.mocked(rateLimit).mockResolvedValueOnce({
      allowed: true,
      remaining: 0,
      resetAt: new Date(),
    });

    vi.mocked(db.monthlyReport.findUnique).mockResolvedValueOnce({
      id: "report-1",
      period: "2026-09",
      clientId: "client-1",
      client: {
        id: "client-1",
        name: "Client 1",
        userId: "agency-123",
        user: {
          id: "agency-123",
          email: "contact@agency.com",
          name: "CEO",
          brandSettings: null,
        },
      },
    } as never);

    vi.mocked(db.monthlyReport.findMany).mockResolvedValueOnce([
      { client: { name: "Client 1" } },
    ] as never);

    const firstResult = await sendReportReady("report-1");
    expect(firstResult.success).toBe(true);
    expect(firstResult.skipped).toBeUndefined();
    expect(sendMock).toHaveBeenCalledTimes(1);

    // Second report for Client 2 of the SAME agency: allowed = false (already sent today)
    vi.mocked(rateLimit).mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      resetAt: new Date(),
    });

    vi.mocked(db.monthlyReport.findUnique).mockResolvedValueOnce({
      id: "report-2",
      period: "2026-09",
      clientId: "client-2",
      client: {
        id: "client-2",
        name: "Client 2",
        userId: "agency-123",
        user: {
          id: "agency-123",
          email: "contact@agency.com",
          name: "CEO",
          brandSettings: null,
        },
      },
    } as never);

    const secondResult = await sendReportReady("report-2");
    expect(secondResult.success).toBe(true);
    expect(secondResult.skipped).toBe(true);
    expect(secondResult.reason).toBe("agency_already_notified_for_period");
    // Resend email mock was NOT called a second time!
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("allows bypassing rate limiting when force is set to true", async () => {
    vi.mocked(db.monthlyReport.findUnique).mockResolvedValueOnce({
      id: "report-forced",
      period: "2026-09",
      clientId: "client-1",
      client: {
        id: "client-1",
        name: "Client 1",
        userId: "agency-123",
        user: {
          id: "agency-123",
          email: "contact@agency.com",
          name: "CEO",
          brandSettings: null,
        },
      },
    } as never);

    vi.mocked(db.monthlyReport.findMany).mockResolvedValueOnce([
      { client: { name: "Client 1" } },
    ] as never);

    const result = await sendReportReady({ reportId: "report-forced", force: true });
    expect(result.success).toBe(true);
    expect(rateLimit).not.toHaveBeenCalled();
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("supports sendReportReadyForAgency with aggregated client list", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: "agency-user-1",
      email: "agency@domain.fr",
      name: "Martin",
      brandSettings: { agencyName: "Martin Agence" },
    } as never);

    vi.mocked(db.monthlyReport.findMany).mockResolvedValueOnce([
      { client: { name: "Client Alpha" } },
      { client: { name: "Client Beta" } },
    ] as never);

    const result = await sendReportReadyForAgency({
      userId: "agency-user-1",
      period: "2026-09",
    });

    expect(result.success).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);
    const sent = sendMock.mock.calls[0][0];
    expect(sent.to).toBe("agency@domain.fr");
    expect(sent.subject).toContain("Vos rapports mensuels sont disponibles");
    expect(sent.html).toContain("Client Alpha");
    expect(sent.html).toContain("Client Beta");
  });

  it("handles missing report gracefully", async () => {
    vi.mocked(db.monthlyReport.findUnique).mockResolvedValueOnce(null);

    const result = await sendReportReady("unknown-id");
    expect(result.success).toBe(false);
    expect(result.error).toContain("introuvable");
    expect(sendMock).not.toHaveBeenCalled();
  });
});
