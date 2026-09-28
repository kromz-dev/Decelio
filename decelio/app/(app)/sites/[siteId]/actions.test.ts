import { describe, it, expect, vi, beforeEach } from "vitest";
import { launchAuditCampaign } from "./actions";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    monitoredSite: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/inngest/client", () => ({
  inngest: {
    send: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { inngest } from "@/inngest/client";
import { revalidatePath } from "next/cache";
import type { Session } from "next-auth";

type SessionGetter = () => Promise<Session | null>;
const mockedAuth = vi.mocked(auth as unknown as SessionGetter);

function fakeSession(userId: string): Session {
  return {
    user: { id: userId },
    expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
}

describe("launchAuditCampaign (T089)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuse quand l'utilisateur n'est pas connecté", async () => {
    mockedAuth.mockResolvedValueOnce(null);

    await expect(launchAuditCampaign("site-1")).rejects.toThrow();
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("refuse quand le site n'appartient pas à l'utilisateur (ou n'est pas surveillé), sans envoyer d'événement", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession("user-1"));
    vi.mocked(db.monitoredSite.findFirst).mockResolvedValueOnce(null);

    await expect(launchAuditCampaign("site-autre-utilisateur")).rejects.toThrow();
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("envoie app/scan.site avec siteId pour un site surveillé valide, sans id de déduplication", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession("user-1"));
    vi.mocked(db.monitoredSite.findFirst).mockResolvedValueOnce({
      id: "site-1",
    } as unknown as Awaited<ReturnType<typeof db.monitoredSite.findFirst>>);
    vi.mocked(inngest.send).mockResolvedValueOnce(undefined as never);

    await launchAuditCampaign("site-1");

    expect(inngest.send).toHaveBeenCalledTimes(1);
    const sentEvent = vi.mocked(inngest.send).mock.calls[0][0];
    expect(sentEvent).toEqual({
      name: "app/scan.site",
      data: { siteId: "site-1" },
    });
    expect(sentEvent).not.toHaveProperty("id");
    expect(revalidatePath).toHaveBeenCalledWith("/sites/site-1");
  });

  it("laisse remonter l'erreur si inngest.send échoue", async () => {
    mockedAuth.mockResolvedValueOnce(fakeSession("user-1"));
    vi.mocked(db.monitoredSite.findFirst).mockResolvedValueOnce({
      id: "site-1",
    } as unknown as Awaited<ReturnType<typeof db.monitoredSite.findFirst>>);
    vi.mocked(inngest.send).mockRejectedValueOnce(new Error("INNGEST_SIGNING_KEY absente"));

    await expect(launchAuditCampaign("site-1")).rejects.toThrow("INNGEST_SIGNING_KEY absente");
  });
});
