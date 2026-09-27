import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const sendMock = vi.hoisted(() => vi.fn());

vi.mock("resend", () => ({
  // Les fonctions fléchées ne peuvent pas servir de constructeur — `new Resend()`
  // a besoin d'une vraie fonction (même pattern que lib/alerting/sendFounderOffer.test.ts).
  Resend: vi.fn().mockImplementation(function MockResend() {
    return { emails: { send: sendMock } };
  }),
}));

import { sendDiscoveryEmail, sendMonthlyReportReadyEmail } from "./resend";

const ORIGINAL_ENV = { ...process.env };
const MALICIOUS_NAME = `<script>alert('xss')</script>`;

describe("sendDiscoveryEmail", () => {
  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({ data: { id: "email_123" }, error: null });
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.NEXT_PUBLIC_APP_URL = "https://decelio.fr";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("échappe un nom malveillant dans le HTML envoyé", async () => {
    await sendDiscoveryEmail("agence@example.com", MALICIOUS_NAME);

    const call = sendMock.mock.calls[0][0];
    expect(call.html).not.toContain("<script>");
    expect(call.html).toContain("&lt;script&gt;");
  });
});

describe("sendMonthlyReportReadyEmail", () => {
  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({ data: { id: "email_456" }, error: null });
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.NEXT_PUBLIC_APP_URL = "https://decelio.fr";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("échappe un agencyName malveillant dans le HTML envoyé", async () => {
    await sendMonthlyReportReadyEmail({
      to: "agence@example.com",
      agencyName: MALICIOUS_NAME,
      period: "2026-09",
    });

    const call = sendMock.mock.calls[0][0];
    expect(call.html).not.toContain("<script>");
    expect(call.html).toContain("&lt;script&gt;");
  });

  it("échappe chaque clientName malveillant dans la liste HTML", async () => {
    await sendMonthlyReportReadyEmail({
      to: "agence@example.com",
      period: "2026-09",
      clientNames: ["Client normal", MALICIOUS_NAME],
    });

    const call = sendMock.mock.calls[0][0];
    expect(call.html).not.toContain("<script>");
    expect(call.html).toContain("&lt;script&gt;");
    expect(call.html).toContain("Client normal");
  });

  it("échappe un reportUrl malveillant interpolé dans l'attribut href", async () => {
    await sendMonthlyReportReadyEmail({
      to: "agence@example.com",
      period: "2026-09",
      reportUrl: `https://decelio.fr/reports"><script>alert(1)</script>`,
    });

    const call = sendMock.mock.calls[0][0];
    expect(call.html).not.toContain('"><script>');
    expect(call.html).toContain("&quot;&gt;&lt;script&gt;");
  });
});
