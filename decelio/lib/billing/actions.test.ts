import { describe, it, expect, vi, beforeEach } from "vitest";

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

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("./stripe", () => ({
  getStripe: vi.fn(),
}));

vi.mock("./plans", () => ({
  isPurchasablePlan: vi.fn((value: unknown) => value === "SOLO"),
  priceIdForPlan: vi.fn(() => "price_solo"),
  TRIAL_DAYS: 14,
}));

vi.mock("@/lib/posthog-server", () => ({
  captureServerEvent: vi.fn(async () => undefined),
}));

import { createCheckoutSession } from "./actions";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getStripe } from "./stripe";
import { captureServerEvent } from "@/lib/posthog-server";
import type { Session } from "next-auth";

type SessionGetter = () => Promise<Session | null>;
const mockedAuth = vi.mocked(auth as unknown as SessionGetter);

function fakeSession(userId: string): Session {
  return {
    user: { id: userId },
    expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
}

type MaybeUser = Awaited<ReturnType<typeof db.user.findUnique>>;

describe("createCheckoutSession", () => {
  const createStripeSessionMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_FOUNDER_COUPON = "FONDATEUR50";

    mockedAuth.mockResolvedValue(fakeSession("user-1"));
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      stripeCustomerId: null,
      trialUsedAt: null,
    } as unknown as MaybeUser);

    createStripeSessionMock.mockResolvedValue({ url: "https://checkout.stripe.com/session" });
    vi.mocked(getStripe).mockReturnValue({
      checkout: { sessions: { create: createStripeSessionMock } },
    } as unknown as ReturnType<typeof getStripe>);
  });

  it("passes the founder discount when the code matches, regardless of case or spacing", async () => {
    await createCheckoutSession("SOLO", "  fondateur50  ");

    expect(createStripeSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        discounts: [{ coupon: "FONDATEUR50" }],
      }),
    );
    expect(redirect).toHaveBeenCalledWith("https://checkout.stripe.com/session");
    expect(captureServerEvent).toHaveBeenCalledWith("user-1", "checkout_started", { plan: "SOLO" });
  });

  it("throws on an unknown promo code and never creates a session", async () => {
    await expect(createCheckoutSession("SOLO", "PASCODE")).rejects.toThrow(
      "Code promo inconnu.",
    );

    expect(createStripeSessionMock).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
    expect(captureServerEvent).not.toHaveBeenCalled();
  });

  it("throws when a code is supplied but no founder coupon is configured", async () => {
    delete process.env.STRIPE_FOUNDER_COUPON;

    await expect(createCheckoutSession("SOLO", "FONDATEUR50")).rejects.toThrow(
      "Code promo inconnu.",
    );

    expect(createStripeSessionMock).not.toHaveBeenCalled();
  });

  it("does not pass any discount when no code is supplied", async () => {
    await createCheckoutSession("SOLO");

    const call = createStripeSessionMock.mock.calls[0][0];
    expect(call.discounts).toBeUndefined();
  });

  it("does not pass any discount for an empty string code", async () => {
    await createCheckoutSession("SOLO", "   ");

    const call = createStripeSessionMock.mock.calls[0][0];
    expect(call.discounts).toBeUndefined();
  });

  it("accorde un essai de 14 jours au premier abonnement, carte demandée dès le départ", async () => {
    await createCheckoutSession("SOLO");

    const call = createStripeSessionMock.mock.calls[0][0];
    expect(call.subscription_data).toEqual({ trial_period_days: 14 });
    expect(call.payment_method_collection).toBe("always");
  });

  it("n'accorde aucun essai à un compte qui en a déjà eu un (ou a déjà été abonné)", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      stripeCustomerId: null,
      trialUsedAt: new Date("2026-01-01T00:00:00Z"),
    } as unknown as MaybeUser);

    await createCheckoutSession("SOLO");

    const call = createStripeSessionMock.mock.calls[0][0];
    expect(call.subscription_data).toBeUndefined();
    // La carte reste toujours demandée, essai ou pas.
    expect(call.payment_method_collection).toBe("always");
  });

  it("n'accorde aucun essai si l'utilisateur a un stripeSubscriptionId même sans trialUsedAt", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_456",
      trialUsedAt: null,
    } as unknown as MaybeUser);

    await createCheckoutSession("SOLO");

    const call = createStripeSessionMock.mock.calls[0][0];
    expect(call.subscription_data).toBeUndefined();
    expect(call.payment_method_collection).toBe("always");
  });
});
