import { describe, it, expect, vi } from "vitest";

vi.mock("./stripe", () => ({
  getStripe: vi.fn(),
}));

import { getStripe } from "./stripe";
import { getScheduledCancellation } from "./subscriptionStatus";

describe("getScheduledCancellation", () => {
  it("renvoie la date de fin quand cancel_at_period_end est vrai", async () => {
    vi.mocked(getStripe).mockReturnValue({
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          status: "active",
          cancel_at_period_end: true,
          cancel_at: 1_760_000_000, // seconds
        }),
      },
    } as unknown as ReturnType<typeof getStripe>);

    const result = await getScheduledCancellation("sub_123");

    expect(result).toEqual(new Date(1_760_000_000 * 1000));
  });

  it("renvoie null quand rien n'est programmé", async () => {
    vi.mocked(getStripe).mockReturnValue({
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          status: "active",
          cancel_at_period_end: false,
          cancel_at: null,
        }),
      },
    } as unknown as ReturnType<typeof getStripe>);

    const result = await getScheduledCancellation("sub_123");

    expect(result).toBeNull();
  });

  it("renvoie null si l'abonnement est déjà résilié (le webhook s'en charge)", async () => {
    vi.mocked(getStripe).mockReturnValue({
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          status: "canceled",
          cancel_at_period_end: false,
          cancel_at: null,
        }),
      },
    } as unknown as ReturnType<typeof getStripe>);

    const result = await getScheduledCancellation("sub_123");

    expect(result).toBeNull();
  });

  it("ne lève jamais : une panne Stripe renvoie null plutôt que de casser la page", async () => {
    vi.mocked(getStripe).mockReturnValue({
      subscriptions: {
        retrieve: vi.fn().mockRejectedValue(new Error("Stripe indisponible")),
      },
    } as unknown as ReturnType<typeof getStripe>);

    await expect(getScheduledCancellation("sub_123")).resolves.toBeNull();
  });
});
