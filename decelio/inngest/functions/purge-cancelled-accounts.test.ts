import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  purgeCancelledAccountsJob,
  purgeEligibleWhere,
  PURGE_BATCH_SIZE,
} from "./purge-cancelled-accounts";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/billing/stripe";
import Stripe from "stripe";

const txUserFindMany = vi.fn();
const txUserDeleteMany = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        user: { findMany: txUserFindMany, deleteMany: txUserDeleteMany },
      }),
    ),
  },
}));

vi.mock("@/lib/billing/stripe", () => ({
  getStripe: vi.fn(),
}));

// `inngest.createFunction()` renvoie un `InngestFunction` dont le handler est
// un champ de classe privé (cf. node_modules/inngest/components/InngestFunction.d.ts),
// inaccessible depuis la surface de type publique. On appelle donc directement
// le handler via cet accesseur étroit, à l'identique de prune-scan-logs.test.ts.
function invokeHandler<TContext>(
  inngestFunction: object,
  context: TContext,
): unknown {
  return (
    inngestFunction as unknown as { fn: (ctx: TContext) => unknown }
  ).fn(context);
}

interface PurgeStep {
  run: <T>(name: string, fn: () => Promise<T> | T) => Promise<T>;
}

describe("purgeEligibleWhere", () => {
  it("only matches accounts whose purgeAt is due", () => {
    const now = new Date("2026-09-27T05:00:00.000Z");

    const where = purgeEligibleWhere(now);

    expect(where.purgeAt).toEqual({ lte: now });
  });

  it("requires cancelledAt to be set (a purgeAt without a cancellation would be a data bug)", () => {
    const where = purgeEligibleWhere(new Date());

    expect(where.cancelledAt).toEqual({ not: null });
  });

  it("requires the plan to still be FREE, protecting an account that resubscribed", () => {
    const where = purgeEligibleWhere(new Date());

    expect(where.plan).toBe("FREE");
  });

  it("requires no active billing period, protecting a subscription reactivated without a new checkout", () => {
    // Le webhook Stripe (`customer.subscription.updated`) réactive une
    // souscription annulée-à-échéance sans repasser par
    // `checkout.session.completed`, donc sans remettre `cancelledAt`/`purgeAt`
    // à `null`. Il remet en revanche `stripeCurrentPeriodEnd` à une date
    // future : c'est ce champ qui protège ce compte de la purge.
    const where = purgeEligibleWhere(new Date());

    expect(where.stripeCurrentPeriodEnd).toBeNull();
  });
});

describe("purgeCancelledAccountsJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Comportement par défaut pour txUserFindMany et txUserDeleteMany
    txUserFindMany.mockImplementation(async () => []);
    txUserDeleteMany.mockResolvedValue({ count: 0 });
  });

  it("fetches at most PURGE_BATCH_SIZE candidate ids using the eligibility filter", async () => {
    vi.mocked(db.user.findMany).mockResolvedValue([]);

    const step: PurgeStep = {
      run: vi.fn().mockImplementation(async (_name, fn) => await fn()),
    };

    await invokeHandler<{ step: PurgeStep }>(purgeCancelledAccountsJob, { step });

    const call = vi.mocked(db.user.findMany).mock.calls[0][0]!;
    expect(call.take).toBe(PURGE_BATCH_SIZE);
    expect(call.select).toEqual({ id: true });
    expect(call.where!.plan).toBe("FREE");
  });

  it("does nothing and returns purged: 0 when there is no eligible account", async () => {
    vi.mocked(db.user.findMany).mockResolvedValue([]);

    const step: PurgeStep = {
      run: vi.fn().mockImplementation(async (_name, fn) => await fn()),
    };

    const result = await invokeHandler<{ step: PurgeStep }>(purgeCancelledAccountsJob, {
      step,
    });

    expect(db.user.deleteMany).not.toHaveBeenCalled();
    expect(result).toEqual({ purged: 0, stripeCustomersDeleted: 0 });
  });

  it("uses a transaction to read stripeCustomerIds and delete accounts atomically", async () => {
    vi.mocked(db.user.findMany).mockResolvedValue([
      { id: "user-1" },
      { id: "user-2" },
    ] as unknown as Awaited<ReturnType<typeof db.user.findMany>>);

    // Simulation : findMany retourne les candidats avec stripeCustomerId,
    // deleteMany supprime effectivement les 2, aucun ne survit.
    txUserFindMany.mockImplementation(async (args: unknown) => {
      const argsObj = args as unknown as { select?: Record<string, unknown> };
      if (argsObj.select?.stripeCustomerId) {
        // Appel interne : récupérer les stripeCustomerIds
        return [
          { id: "user-1", stripeCustomerId: "cus_123" },
          { id: "user-2", stripeCustomerId: null },
        ];
      }
      // Appel de vérification des survivors : aucun n'a survécu
      return [];
    });
    txUserDeleteMany.mockResolvedValue({ count: 2 });

    const mockStripe = {
      customers: {
        del: vi.fn().mockResolvedValue({ id: "cus_123", deleted: true }),
      },
    };
    vi.mocked(getStripe).mockReturnValue(mockStripe as unknown as Stripe);

    const step: PurgeStep = {
      run: vi.fn().mockImplementation(async (_name, fn) => await fn()),
    };

    const result = await invokeHandler<{ step: PurgeStep }>(purgeCancelledAccountsJob, {
      step,
    });

    expect(db.$transaction).toHaveBeenCalled();
    expect(txUserDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ["user-1", "user-2"] },
        }),
      }),
    );
    expect(result).toEqual({ purged: 2, stripeCustomersDeleted: 1 });
  });

  it("deletes the Stripe customer for each account that has stripeCustomerId", async () => {
    vi.mocked(db.user.findMany).mockResolvedValue([
      { id: "user-1" },
      { id: "user-2" },
    ] as unknown as Awaited<ReturnType<typeof db.user.findMany>>);

    // Simulation des appels : findMany retourne les stripeCustomerIds,
    // deleteMany supprime les 2, vérification montre qu'aucun ne survit.
    txUserFindMany.mockImplementation(async (args: unknown) => {
      const argsObj = args as unknown as { select?: Record<string, unknown> };
      if (argsObj.select?.stripeCustomerId) {
        return [
          { id: "user-1", stripeCustomerId: "cus_123" },
          { id: "user-2", stripeCustomerId: "cus_456" },
        ];
      }
      return [];
    });
    txUserDeleteMany.mockResolvedValue({ count: 2 });

    const mockStripe = {
      customers: {
        del: vi.fn().mockResolvedValue({ id: "cus_123", deleted: true }),
      },
    };
    vi.mocked(getStripe).mockReturnValue(mockStripe as unknown as Stripe);

    const step: PurgeStep = {
      run: vi.fn().mockImplementation(async (_name, fn) => await fn()),
    };

    await invokeHandler<{ step: PurgeStep }>(purgeCancelledAccountsJob, { step });

    expect(mockStripe.customers.del).toHaveBeenCalledWith("cus_123");
    expect(mockStripe.customers.del).toHaveBeenCalledWith("cus_456");
    expect(mockStripe.customers.del).toHaveBeenCalledTimes(2);
  });

  it("skips Stripe deletion when no stripeCustomerIds are returned", async () => {
    vi.mocked(db.user.findMany).mockResolvedValue([
      { id: "user-1" },
    ] as unknown as Awaited<ReturnType<typeof db.user.findMany>>);

    txUserFindMany.mockImplementation(async (args: unknown) => {
      const argsObj = args as unknown as { select?: Record<string, unknown> };
      if (argsObj.select?.stripeCustomerId) {
        return [{ id: "user-1", stripeCustomerId: null }];
      }
      return [];
    });
    txUserDeleteMany.mockResolvedValue({ count: 1 });

    const mockStripe = {
      customers: {
        del: vi.fn(),
      },
    };
    vi.mocked(getStripe).mockReturnValue(mockStripe as unknown as Stripe);

    const step: PurgeStep = {
      run: vi.fn().mockImplementation(async (_name, fn) => await fn()),
    };

    const result = await invokeHandler<{ step: PurgeStep }>(purgeCancelledAccountsJob, {
      step,
    });

    expect(mockStripe.customers.del).not.toHaveBeenCalled();
    expect(result).toEqual({ purged: 1, stripeCustomersDeleted: 0 });
  });

  it("treats a Stripe 404 resource_missing error as a successful deletion", async () => {
    vi.mocked(db.user.findMany).mockResolvedValue([
      { id: "user-1" },
    ] as unknown as Awaited<ReturnType<typeof db.user.findMany>>);

    txUserFindMany.mockImplementation(async (args: unknown) => {
      const argsObj = args as unknown as { select?: Record<string, unknown> };
      if (argsObj.select?.stripeCustomerId) {
        return [{ id: "user-1", stripeCustomerId: "cus_123" }];
      }
      return [];
    });
    txUserDeleteMany.mockResolvedValue({ count: 1 });

    const stripeError = new Stripe.errors.StripeError({
      code: "resource_missing",
      message: "No such customer",
      type: "invalid_request_error",
    });

    const mockStripe = {
      customers: {
        del: vi.fn().mockRejectedValue(stripeError),
      },
    };
    vi.mocked(getStripe).mockReturnValue(mockStripe as unknown as Stripe);

    const step: PurgeStep = {
      run: vi.fn().mockImplementation(async (_name, fn) => await fn()),
    };

    const result = await invokeHandler<{ step: PurgeStep }>(purgeCancelledAccountsJob, {
      step,
    });

    expect(result).toEqual({ purged: 1, stripeCustomersDeleted: 1 });
  });

  it("re-throws non-404 Stripe errors", async () => {
    vi.mocked(db.user.findMany).mockResolvedValue([
      { id: "user-1" },
    ] as unknown as Awaited<ReturnType<typeof db.user.findMany>>);

    txUserFindMany.mockImplementation(async (args: unknown) => {
      const argsObj = args as unknown as { select?: Record<string, unknown> };
      if (argsObj.select?.stripeCustomerId) {
        return [{ id: "user-1", stripeCustomerId: "cus_123" }];
      }
      return [];
    });
    txUserDeleteMany.mockResolvedValue({ count: 1 });

    const stripeError = new Stripe.errors.StripeError({
      code: "card_declined",
      message: "Card was declined",
      type: "card_error",
    });

    const mockStripe = {
      customers: {
        del: vi.fn().mockRejectedValue(stripeError),
      },
    };
    vi.mocked(getStripe).mockReturnValue(mockStripe as unknown as Stripe);

    const step: PurgeStep = {
      run: vi.fn().mockImplementation(async (_name, fn) => {
        try {
          return await fn();
        } catch (err) {
          throw err;
        }
      }),
    };

    await expect(
      invokeHandler<{ step: PurgeStep }>(purgeCancelledAccountsJob, { step }),
    ).rejects.toThrow(stripeError);
  });

  it("does not delete an account or its Stripe customer if it becomes ineligible between steps", async () => {
    vi.mocked(db.user.findMany).mockResolvedValue([
      { id: "user-1" },
    ] as unknown as Awaited<ReturnType<typeof db.user.findMany>>);

    // Simulation : le compte est trouvé avec un stripeCustomerId, mais entre
    // findMany et deleteMany il redevient inéligible (plan change, etc.), donc
    // deleteMany retourne 0 et la vérification des survivors montre qu'il existe
    // toujours.
    txUserFindMany.mockImplementation(async (args: unknown) => {
      const argsObj = args as unknown as { select?: Record<string, unknown> };
      if (argsObj.select?.stripeCustomerId) {
        return [{ id: "user-1", stripeCustomerId: "cus_123" }];
      }
      // Vérification des survivors : le compte a survécu (n'a pas été supprimé)
      return [{ id: "user-1" }];
    });
    txUserDeleteMany.mockResolvedValue({ count: 0 }); // Aucun supprimé

    const mockStripe = {
      customers: {
        del: vi.fn(),
      },
    };
    vi.mocked(getStripe).mockReturnValue(mockStripe as unknown as Stripe);

    const step: PurgeStep = {
      run: vi.fn().mockImplementation(async (_name, fn) => await fn()),
    };

    const result = await invokeHandler<{ step: PurgeStep }>(purgeCancelledAccountsJob, {
      step,
    });

    // Le compte a redevenu inéligible, donc : pas de suppression du compte en
    // base (count = 0), pas de suppression du client Stripe non plus.
    expect(mockStripe.customers.del).not.toHaveBeenCalled();
    expect(result).toEqual({ purged: 0, stripeCustomersDeleted: 0 });
  });
});
