import { describe, expect, it, vi, beforeEach } from "vitest";
import { getTrialEndsAt } from "./trial";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  db: { user: { findUnique: vi.fn() } },
}));

type MaybeUser = Awaited<ReturnType<typeof db.user.findUnique>>;

describe("getTrialEndsAt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renvoie la fin de l'essai en cours", async () => {
    const end = new Date("2026-10-11T00:00:00Z");
    vi.mocked(db.user.findUnique).mockResolvedValue({ stripeTrialEnd: end } as unknown as MaybeUser);

    await expect(getTrialEndsAt("user-1")).resolves.toEqual(end);
  });

  it("renvoie null hors essai", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({ stripeTrialEnd: null } as unknown as MaybeUser);

    await expect(getTrialEndsAt("user-1")).resolves.toBeNull();
  });

  it("renvoie null sans utilisateur, sans interroger la base", async () => {
    await expect(getTrialEndsAt(undefined)).resolves.toBeNull();
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });
});
