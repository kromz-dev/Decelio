import { describe, it, expect, vi, beforeEach } from "vitest";

// `webhookSecret` est lu au chargement du module (comme dans route.ts) : les
// variables d'environnement doivent donc être posées avant l'import dynamique
// de la route, un import statique arriverait trop tard.
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
process.env.STRIPE_FOUNDER_COUPON = "FONDATEUR50";

vi.mock("@/lib/billing/stripe", () => ({
  getStripe: vi.fn(),
}));

vi.mock("@/lib/billing/plans", () => ({
  planForPriceId: vi.fn(() => "SOLO"),
}));

const txUserUpdate = vi.fn();
const txUserFindUnique = vi.fn();
const txProcessedWebhookCreate = vi.fn();
const captureServerEventMock = vi.fn(async () => undefined);

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: vi.fn(async (callback: (tx: unknown) => unknown) =>
      callback({
        processedWebhook: { create: txProcessedWebhookCreate },
        user: { update: txUserUpdate, findUnique: txUserFindUnique },
      }),
    ),
  },
}));

vi.mock("@/lib/posthog-server", () => ({
  captureServerEvent: captureServerEventMock,
}));

import { getStripe } from "@/lib/billing/stripe";
import { Prisma } from "@prisma/client";

const { POST } = await import("./route");

function fakeRequest() {
  return new Request("http://localhost:3000/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": "sig_test" },
    body: "{}",
  });
}

function fakeSubscription() {
  return {
    id: "sub_1",
    items: {
      data: [
        {
          price: { id: "price_solo" },
          current_period_end: 1_700_000_000,
        },
      ],
    },
  };
}

function fakeSession(discounts: Array<{ coupon: string | { id: string } | null }> | null) {
  return {
    client_reference_id: "user-1",
    customer: "cus_1",
    subscription: "sub_1",
    discounts,
  };
}

function mockStripe(session: ReturnType<typeof fakeSession>) {
  const event = {
    id: "evt_1",
    type: "checkout.session.completed",
    data: { object: session },
  };

  vi.mocked(getStripe).mockReturnValue({
    webhooks: { constructEvent: vi.fn(() => event) },
    subscriptions: { retrieve: vi.fn(async () => fakeSubscription()) },
  } as unknown as ReturnType<typeof getStripe>);
}

describe("POST /api/webhooks/stripe — checkout.session.completed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks the user as founder member when the founder coupon was applied", async () => {
    mockStripe(fakeSession([{ coupon: "FONDATEUR50" }]));

    const res = await POST(fakeRequest());

    expect(res.status).toBe(200);
    expect(txUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({
          isFounderMember: true,
          founderOfferAt: expect.any(Date),
        }),
      }),
    );
    expect(captureServerEventMock).toHaveBeenCalledWith("user-1", "subscription_activated", {
      plan: "SOLO",
    });
  });

  it("does not touch founder fields when no coupon was applied", async () => {
    mockStripe(fakeSession([]));

    const res = await POST(fakeRequest());

    expect(res.status).toBe(200);
    expect(txUserUpdate).toHaveBeenCalledTimes(1);
    const data = txUserUpdate.mock.calls[0][0].data;
    expect(data.isFounderMember).toBeUndefined();
    expect(data.founderOfferAt).toBeUndefined();
  });

  it("does not touch founder fields when a different coupon was applied", async () => {
    mockStripe(fakeSession([{ coupon: "AUTRE_COUPON" }]));

    const res = await POST(fakeRequest());

    expect(res.status).toBe(200);
    const data = txUserUpdate.mock.calls[0][0].data;
    expect(data.isFounderMember).toBeUndefined();
    expect(data.founderOfferAt).toBeUndefined();
  });

  it("n'émet aucun événement quand le webhook a déjà été traité (rejoué)", async () => {
    mockStripe(fakeSession([]));
    txProcessedWebhookCreate.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "5.22.0",
      }),
    );

    const res = await POST(fakeRequest());
    const body = await res.json();

    expect(body).toEqual({ received: true, duplicate: true });
    expect(txUserUpdate).not.toHaveBeenCalled();
    expect(captureServerEventMock).not.toHaveBeenCalled();
  });
});

function mockStripeSubscriptionDeleted(customerId: string) {
  const event = {
    id: "evt_deleted_1",
    type: "customer.subscription.deleted",
    data: { object: { customer: customerId } },
  };

  vi.mocked(getStripe).mockReturnValue({
    webhooks: { constructEvent: vi.fn(() => event) },
  } as unknown as ReturnType<typeof getStripe>);
}

describe("POST /api/webhooks/stripe — customer.subscription.deleted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("émet subscription_canceled avec le plan retiré et le plan précédent", async () => {
    mockStripeSubscriptionDeleted("cus_1");
    txUserFindUnique.mockResolvedValueOnce({ id: "user-1", plan: "PRO" });

    const res = await POST(fakeRequest());

    expect(res.status).toBe(200);
    expect(txUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({ plan: "FREE" }),
      }),
    );
    expect(captureServerEventMock).toHaveBeenCalledWith("user-1", "subscription_canceled", {
      plan: "FREE",
      previous_plan: "PRO",
    });
  });

  it("n'émet rien quand aucun utilisateur ne correspond au client Stripe", async () => {
    mockStripeSubscriptionDeleted("cus_inconnu");
    txUserFindUnique.mockResolvedValueOnce(null);

    const res = await POST(fakeRequest());

    expect(res.status).toBe(200);
    expect(txUserUpdate).not.toHaveBeenCalled();
    expect(captureServerEventMock).not.toHaveBeenCalled();
  });

  it("n'émet pas deux fois quand le même événement Stripe est rejoué", async () => {
    mockStripeSubscriptionDeleted("cus_1");
    txUserFindUnique.mockResolvedValue({ id: "user-1", plan: "PRO" });

    await POST(fakeRequest());
    expect(captureServerEventMock).toHaveBeenCalledTimes(1);

    // Rejeu du même événement Stripe : le marqueur d'idempotence existe déjà.
    txProcessedWebhookCreate.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "5.22.0",
      }),
    );
    const replay = await POST(fakeRequest());
    const replayBody = await replay.json();

    expect(replayBody).toEqual({ received: true, duplicate: true });
    expect(captureServerEventMock).toHaveBeenCalledTimes(1);
  });
});
