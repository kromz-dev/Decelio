import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  purgeCancelledAccountsJob,
  purgeEligibleWhere,
  PURGE_BATCH_SIZE,
} from "./purge-cancelled-accounts";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
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
    expect(result).toEqual({ purged: 0 });
  });

  it("deletes exactly the candidate ids, re-applying the eligibility filter as a race guard", async () => {
    vi.mocked(db.user.findMany).mockResolvedValue([
      { id: "user-1" },
      { id: "user-2" },
    ] as unknown as Awaited<ReturnType<typeof db.user.findMany>>);
    vi.mocked(db.user.deleteMany).mockResolvedValue({ count: 2 });

    const step: PurgeStep = {
      run: vi.fn().mockImplementation(async (_name, fn) => await fn()),
    };

    await invokeHandler<{ step: PurgeStep }>(purgeCancelledAccountsJob, { step });

    const call = vi.mocked(db.user.deleteMany).mock.calls[0][0]!;
    expect(call.where!.id).toEqual({ in: ["user-1", "user-2"] });
    expect(call.where!.plan).toBe("FREE");
    expect(call.where!.stripeCurrentPeriodEnd).toBeNull();
  });

  it("returns the number of purged accounts for Inngest logs", async () => {
    vi.mocked(db.user.findMany).mockResolvedValue([
      { id: "user-1" },
    ] as unknown as Awaited<ReturnType<typeof db.user.findMany>>);
    vi.mocked(db.user.deleteMany).mockResolvedValue({ count: 1 });

    const step: PurgeStep = {
      run: vi.fn().mockImplementation(async (_name, fn) => await fn()),
    };

    const result = await invokeHandler<{ step: PurgeStep }>(purgeCancelledAccountsJob, {
      step,
    });

    expect(result).toEqual({ purged: 1 });
  });

  it("calls findMany and deleteMany exactly once each, never looping account by account", async () => {
    vi.mocked(db.user.findMany).mockResolvedValue([
      { id: "user-1" },
      { id: "user-2" },
      { id: "user-3" },
    ] as unknown as Awaited<ReturnType<typeof db.user.findMany>>);
    vi.mocked(db.user.deleteMany).mockResolvedValue({ count: 3 });

    const step: PurgeStep = {
      run: vi.fn().mockImplementation(async (_name, fn) => await fn()),
    };

    await invokeHandler<{ step: PurgeStep }>(purgeCancelledAccountsJob, { step });

    expect(db.user.findMany).toHaveBeenCalledTimes(1);
    expect(db.user.deleteMany).toHaveBeenCalledTimes(1);
  });
});
