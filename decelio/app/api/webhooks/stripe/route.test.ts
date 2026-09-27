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

const sendTrialEndingEmailMock = vi.fn(async () => ({ success: true }));

vi.mock("@/lib/email/resend", () => ({
  sendTrialEndingEmail: sendTrialEndingEmailMock,
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

// Test pour trialEndOf : vérifier qu'il retourne null quand status !== "trialing"
describe("trialEndOf helper", () => {
  it("retourne null quand status n'est pas 'trialing' même si trial_end est défini", async () => {
    const event = {
      id: "evt_test_trial_end",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_1",
          customer: "cus_1",
          status: "active",
          trial_end: 1_700_600_000,
          items: { data: [{ price: { id: "price_solo" }, current_period_end: 1_700_000_000 }] },
        },
      },
    };

    vi.mocked(getStripe).mockReturnValue({
      webhooks: { constructEvent: vi.fn(() => event) },
    } as unknown as ReturnType<typeof getStripe>);
    txUserFindUnique.mockResolvedValue({ id: "user-1", plan: "SOLO" });

    const res = await POST(fakeRequest());

    expect(res.status).toBe(200);
    // stripeTrialEnd doit être null car la subscription n'est pas en "trialing"
    expect(txUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ stripeTrialEnd: null }),
      }),
    );
  });
});

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

function mockStripeCheckoutTrialing() {
  const event = {
    id: "evt_trial_1",
    type: "checkout.session.completed",
    data: { object: fakeSession([]) },
  };

  vi.mocked(getStripe).mockReturnValue({
    webhooks: { constructEvent: vi.fn(() => event) },
    subscriptions: {
      retrieve: vi.fn(async () => ({
        ...fakeSubscription(),
        status: "trialing",
        trial_end: 1_700_600_000,
      })),
    },
  } as unknown as ReturnType<typeof getStripe>);
}

describe("POST /api/webhooks/stripe — essai gratuit (checkout.session.completed, trialing)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txUserFindUnique.mockResolvedValue({ trialUsedAt: null });
  });

  it("accorde le plan payant dès le début de l'essai et pose trialUsedAt/stripeTrialEnd", async () => {
    mockStripeCheckoutTrialing();

    const res = await POST(fakeRequest());

    expect(res.status).toBe(200);
    expect(txUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({
          plan: "SOLO",
          trialUsedAt: expect.any(Date),
          stripeTrialEnd: new Date(1_700_600_000 * 1000),
        }),
      }),
    );
    expect(captureServerEventMock).toHaveBeenCalledWith("user-1", "subscription_activated", {
      plan: "SOLO",
    });
    expect(captureServerEventMock).toHaveBeenCalledWith("user-1", "trial_started", {
      plan: "SOLO",
    });
  });

  it("ne repose pas trialUsedAt s'il existait déjà", async () => {
    const existing = new Date("2026-01-01T00:00:00Z");
    txUserFindUnique.mockResolvedValue({ trialUsedAt: existing });
    mockStripeCheckoutTrialing();

    await POST(fakeRequest());

    const data = txUserUpdate.mock.calls[0][0].data;
    expect(data.trialUsedAt).toEqual(existing);
  });
});

function mockStripeSubscriptionUpdated(status: string) {
  const event = {
    id: `evt_updated_${status}`,
    type: "customer.subscription.updated",
    data: {
      object: {
        id: "sub_1",
        customer: "cus_1",
        status,
        items: { data: [{ price: { id: "price_solo" }, current_period_end: 1_700_000_000 }] },
        trial_end: status === "trialing" ? 1_700_600_000 : null,
      },
    },
  };

  vi.mocked(getStripe).mockReturnValue({
    webhooks: { constructEvent: vi.fn(() => event) },
  } as unknown as ReturnType<typeof getStripe>);
}

describe("POST /api/webhooks/stripe — customer.subscription.updated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txUserFindUnique.mockResolvedValue({ id: "user-1", plan: "SOLO" });
  });

  it("traite trialing comme un plan actif", async () => {
    mockStripeSubscriptionUpdated("trialing");

    const res = await POST(fakeRequest());

    expect(res.status).toBe(200);
    expect(txUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ plan: "SOLO", stripeTrialEnd: new Date(1_700_600_000 * 1000) }),
      }),
    );
  });

  it("émet trial_converted lors de la transition trialing → active", async () => {
    const event = {
      id: "evt_trialing_to_active",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_1",
          customer: "cus_1",
          status: "active",
          items: { data: [{ price: { id: "price_solo" }, current_period_end: 1_700_000_000 }] },
          trial_end: null,
        },
        previous_attributes: {
          status: "trialing",
        },
      },
    };

    vi.mocked(getStripe).mockReturnValue({
      webhooks: { constructEvent: vi.fn(() => event) },
    } as unknown as ReturnType<typeof getStripe>);

    const res = await POST(fakeRequest());

    expect(res.status).toBe(200);
    expect(txUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ plan: "SOLO", stripeTrialEnd: null }),
      }),
    );
    expect(captureServerEventMock).toHaveBeenCalledWith("user-1", "trial_converted", {
      plan: "SOLO",
    });
  });

  it("n'émet pas trial_converted lors d'une transition active → active", async () => {
    const event = {
      id: "evt_active_to_active",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_1",
          customer: "cus_1",
          status: "active",
          items: { data: [{ price: { id: "price_solo" }, current_period_end: 1_700_000_000 }] },
          trial_end: null,
        },
        previous_attributes: {
          status: "active",
        },
      },
    };

    vi.mocked(getStripe).mockReturnValue({
      webhooks: { constructEvent: vi.fn(() => event) },
    } as unknown as ReturnType<typeof getStripe>);

    const res = await POST(fakeRequest());

    expect(res.status).toBe(200);
    expect(captureServerEventMock).not.toHaveBeenCalledWith(expect.anything(), "trial_converted", expect.anything());
  });

  it.each(["past_due", "canceled", "incomplete_expired"])(
    "repasse au plan FREE quand l'essai se termine sans paiement (%s)",
    async (status) => {
      mockStripeSubscriptionUpdated(status);

      const res = await POST(fakeRequest());

      expect(res.status).toBe(200);
      expect(txUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ plan: "FREE", stripeTrialEnd: null }),
        }),
      );
    },
  );
});

function mockStripeTrialWillEnd(cancelledOrCanceledAtPeriodEnd: boolean = false) {
  const event = {
    id: "evt_trial_will_end_1",
    type: "customer.subscription.trial_will_end",
    data: {
      object: {
        id: "sub_1",
        customer: "cus_1",
        status: "trialing",
        trial_end: 1_700_600_000,
        cancel_at_period_end: cancelledOrCanceledAtPeriodEnd,
        cancel_at: null,
        items: {
          data: [{ price: { id: "price_solo" } }],
        },
      },
    },
  };

  vi.mocked(getStripe).mockReturnValue({
    webhooks: { constructEvent: vi.fn(() => event) },
    billingPortal: {
      sessions: { create: vi.fn(async () => ({ url: "https://billing.stripe.com/session" })) },
    },
    invoices: {
      createPreview: vi.fn(async () => ({
        amount_due: 4900,
        currency: "eur",
      })),
    },
  } as unknown as ReturnType<typeof getStripe>);
}

describe("POST /api/webhooks/stripe — customer.subscription.trial_will_end", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("envoie un e-mail avec la date, le montant (via aperçu de facture) et le lien du portail", async () => {
    mockStripeTrialWillEnd();
    txUserFindUnique.mockResolvedValueOnce({
      id: "user-1",
      email: "agence@example.com",
      name: "Agence Test",
    });

    const res = await POST(fakeRequest());

    expect(res.status).toBe(200);
    expect(vi.mocked(getStripe).mock.results[0].value.invoices?.createPreview).toHaveBeenCalledWith({
      subscription: "sub_1",
    });
    expect(sendTrialEndingEmailMock).toHaveBeenCalledWith({
      to: "agence@example.com",
      recipientName: "Agence Test",
      trialEndDate: new Date(1_700_600_000 * 1000),
      amountCents: 4900,
      currency: "eur",
      portalUrl: "https://billing.stripe.com/session",
    });
  });

  it("n'envoie pas d'e-mail si l'abonnement a été résilié (cancel_at_period_end === true)", async () => {
    mockStripeTrialWillEnd(true);
    txUserFindUnique.mockResolvedValueOnce({
      id: "user-1",
      email: "agence@example.com",
      name: "Agence Test",
    });

    const res = await POST(fakeRequest());

    expect(res.status).toBe(200);
    expect(sendTrialEndingEmailMock).not.toHaveBeenCalled();
  });

  it("n'envoie pas deux fois le même e-mail quand l'événement est rejoué", async () => {
    mockStripeTrialWillEnd();
    txUserFindUnique.mockResolvedValue({
      id: "user-1",
      email: "agence@example.com",
      name: "Agence Test",
    });

    await POST(fakeRequest());
    expect(sendTrialEndingEmailMock).toHaveBeenCalledTimes(1);

    txProcessedWebhookCreate.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "5.22.0",
      }),
    );
    const replay = await POST(fakeRequest());
    const replayBody = await replay.json();

    expect(replayBody).toEqual({ received: true, duplicate: true });
    expect(sendTrialEndingEmailMock).toHaveBeenCalledTimes(1);
  });
});

