import { describe, expect, it } from "vitest";
import { activeSiteWhere, withinPlanQuota } from "./active-sites";

describe("activeSiteWhere", () => {
  it("n'inclut que les plans payants", () => {
    const where = activeSiteWhere(new Date("2026-01-01T00:00:00Z"));

    expect(where.user).toMatchObject({ plan: { in: ["SOLO", "PRO", "SCALE"] } });
  });

  it("accepte un abonnement sans date de fin connue (pas encore synchronisé)", () => {
    const where = activeSiteWhere(new Date("2026-01-01T00:00:00Z"));

    expect(where.user?.OR).toEqual(
      expect.arrayContaining([{ stripeCurrentPeriodEnd: null }]),
    );
  });

  it("accepte un abonnement dont la fin de période est dans le futur", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const where = activeSiteWhere(now);

    expect(where.user?.OR).toEqual(
      expect.arrayContaining([{ stripeCurrentPeriodEnd: { gt: now } }]),
    );
  });
});

describe("withinPlanQuota", () => {
  it("garde tous les sites d'un compte SOLO sous son quota (10)", () => {
    const sites = [
      { id: "s1", userId: "u1", userPlan: "SOLO" },
      { id: "s2", userId: "u1", userPlan: "SOLO" },
    ];

    expect(withinPlanQuota(sites)).toEqual(sites);
  });

  it("écarte le surplus sans le supprimer, en gardant les sites les plus anciens", () => {
    // u1 est rétrogradé de PRO (30 sites) à SOLO (10 sites) et en possède 12.
    // Le tableau arrive déjà trié par createdAt croissant (comme la requête Prisma).
    const sites = Array.from({ length: 12 }, (_, i) => ({
      id: `s${i}`,
      userId: "u1",
      userPlan: "SOLO",
    }));

    const kept = withinPlanQuota(sites);

    expect(kept).toHaveLength(10);
    expect(kept.map((s) => s.id)).toEqual(sites.slice(0, 10).map((s) => s.id));
  });

  it("n'exclut aucun site d'un compte FREE (le filtre en amont l'a déjà écarté)", () => {
    // withinPlanQuota ne doit pas planter sur un plan inconnu : il vide simplement.
    const sites = [{ id: "s1", userId: "u1", userPlan: "FREE" }];

    expect(withinPlanQuota(sites)).toEqual([]);
  });

  it("applique le quota indépendamment pour chaque compte", () => {
    const sites = [
      { id: "a1", userId: "a", userPlan: "SOLO" },
      { id: "b1", userId: "b", userPlan: "PRO" },
      { id: "a2", userId: "a", userPlan: "SOLO" },
    ];

    const kept = withinPlanQuota(sites);

    expect(kept.map((s) => s.id).sort()).toEqual(["a1", "a2", "b1"]);
  });
});
