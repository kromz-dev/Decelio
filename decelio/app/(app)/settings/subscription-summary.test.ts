import { describe, expect, it } from "vitest";
import { buildSubscriptionSummary } from "./subscription-summary";

describe("buildSubscriptionSummary", () => {
  it("shows no plan, no quota and a pricing link for a FREE account", () => {
    const summary = buildSubscriptionSummary({
      plan: "FREE",
      siteCount: 0,
      maxSites: 0,
      stripeCustomerId: null,
      stripeCurrentPeriodEnd: null,
      cancelledAt: null,
    });

    expect(summary.planName).toBe("Aucun abonnement");
    expect(summary.quotaLabel).toBe("0 / 0 sites surveillés");
    expect(summary.billingLabel).toBeNull();
    expect(summary.showManageButton).toBe(false);
    expect(summary.showPricingLink).toBe(true);
  });

  it("shows the Freelance plan, real quota and next billing date for an active SOLO account", () => {
    const summary = buildSubscriptionSummary({
      plan: "SOLO",
      siteCount: 7,
      maxSites: 10,
      stripeCustomerId: "cus_123",
      stripeCurrentPeriodEnd: new Date(Date.UTC(2026, 9, 1)),
      cancelledAt: null,
    });

    expect(summary.planName).toBe("Freelance");
    expect(summary.quotaLabel).toBe("7 / 10 sites surveillés");
    expect(summary.billingLabel).toBe("Prochain prélèvement le 1 octobre 2026");
    expect(summary.showManageButton).toBe(true);
    expect(summary.showPricingLink).toBe(false);
  });

  it("shows a scheduled cancellation date instead of the next billing date when one is pending", () => {
    // Stripe garde l'abonnement actif jusqu'à la fin de la période payée
    // après une résiliation programmée depuis le portail : sans ce champ,
    // l'écran affichait "Prochain prélèvement..." comme un abonnement
    // normal, sans aucun moyen de vérifier que la résiliation avait bien
    // été prise en compte.
    const summary = buildSubscriptionSummary({
      plan: "PRO",
      siteCount: 5,
      maxSites: 30,
      stripeCustomerId: "cus_789",
      stripeCurrentPeriodEnd: new Date(Date.UTC(2026, 9, 12)),
      cancelledAt: null,
      scheduledCancelAt: new Date(Date.UTC(2026, 9, 12)),
    });

    expect(summary.billingLabel).toBe("Résiliation programmée pour le 12 octobre 2026");
  });

  it("shows the Studio plan as cancelled and still allows managing the customer portal", () => {
    const summary = buildSubscriptionSummary({
      plan: "SCALE",
      siteCount: 42,
      maxSites: 100,
      stripeCustomerId: "cus_456",
      stripeCurrentPeriodEnd: new Date(Date.UTC(2026, 9, 15)),
      cancelledAt: new Date(Date.UTC(2026, 8, 20)),
    });

    expect(summary.planName).toBe("Studio");
    expect(summary.quotaLabel).toBe("42 / 100 sites surveillés");
    expect(summary.billingLabel).toBe("Abonnement résilié");
    expect(summary.showManageButton).toBe(true);
    expect(summary.showPricingLink).toBe(false);
  });
});
