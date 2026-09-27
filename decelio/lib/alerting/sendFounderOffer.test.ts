import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const sendMock = vi.hoisted(() => vi.fn());

vi.mock("resend", () => ({
  // Arrow functions can't be constructors — `new Resend()` needs a real function.
  Resend: vi.fn().mockImplementation(function MockResend() {
    return { emails: { send: sendMock } };
  }),
}));

import { sendFounderOffer } from "./sendFounderOffer";

const ORIGINAL_ENV = { ...process.env };

describe("sendFounderOffer", () => {
  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({ data: { id: "email_123" }, error: null });
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.STRIPE_FOUNDER_COUPON = "FOUNDER50";
    process.env.NEXT_PUBLIC_APP_URL = "https://decelio.fr";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("shows the deadline formatted in fr-FR in both the HTML and the text body", async () => {
    const deadline = new Date("2026-10-08T12:00:00.000Z");

    await sendFounderOffer({ email: "agence@example.com", name: "Jules", deadline });

    const call = sendMock.mock.calls[0][0];
    expect(call.html).toContain("8 octobre 2026");
    expect(call.text).toContain("8 octobre 2026");
  });

  it("includes the founder coupon code from STRIPE_FOUNDER_COUPON", async () => {
    const deadline = new Date("2026-10-08T12:00:00.000Z");

    await sendFounderOffer({ email: "agence@example.com", name: "Jules", deadline });

    const call = sendMock.mock.calls[0][0];
    expect(call.html).toContain("FOUNDER50");
    expect(call.text).toContain("FOUNDER50");
  });

  it("refuses to send when the deadline is already in the past", async () => {
    const pastDeadline = new Date(Date.now() - 1000 * 60 * 60);

    await expect(
      sendFounderOffer({ email: "agence@example.com", deadline: pastDeadline })
    ).rejects.toThrow();

    expect(sendMock).not.toHaveBeenCalled();
  });

  it("refuses to send when STRIPE_FOUNDER_COUPON is not set", async () => {
    delete process.env.STRIPE_FOUNDER_COUPON;
    const deadline = new Date("2026-10-08T12:00:00.000Z");

    await expect(
      sendFounderOffer({ email: "agence@example.com", deadline })
    ).rejects.toThrow();

    expect(sendMock).not.toHaveBeenCalled();
  });

  it("uses a plain 'Bonjour,' greeting when no name is provided", async () => {
    const deadline = new Date("2026-10-08T12:00:00.000Z");

    await sendFounderOffer({ email: "agence@example.com", deadline });

    const call = sendMock.mock.calls[0][0];
    expect(call.html).toContain("Bonjour,");
  });
});
