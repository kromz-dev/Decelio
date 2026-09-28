import { describe, it, expect, vi, beforeEach } from "vitest";
import { importOnboardingDomains } from "./actions";

vi.mock("@/app/actions/sites", () => ({
  addMonitoredSitesBulk: vi.fn(),
}));

vi.mock("@/inngest/client", () => ({
  inngest: {
    send: vi.fn(),
  },
}));

import { addMonitoredSitesBulk } from "@/app/actions/sites";
import { inngest } from "@/inngest/client";

describe("importOnboardingDomains (T043)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retransmet l'erreur de addMonitoredSitesBulk sans jamais la convertir en succès", async () => {
    vi.mocked(addMonitoredSitesBulk).mockResolvedValueOnce({ error: "Unauthorized" });

    const res = await importOnboardingDomains("exemple.com");

    expect(res).toEqual({ error: "Unauthorized" });
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("appelle addMonitoredSitesBulk avec triggerScan: false, pour ne pas doubler le scan déjà envoyé ici (T091)", async () => {
    vi.mocked(addMonitoredSitesBulk).mockResolvedValueOnce({
      data: { created: [], skipped: [] },
    } as unknown as Awaited<ReturnType<typeof addMonitoredSitesBulk>>);

    await importOnboardingDomains("exemple.com");

    expect(addMonitoredSitesBulk).toHaveBeenCalledWith("exemple.com", { triggerScan: false });
  });

  it("envoie un événement app/scan.site par site créé et le rapporte comme déclenché", async () => {
    vi.mocked(addMonitoredSitesBulk).mockResolvedValueOnce({
      data: {
        created: [
          { id: "site-1", url: "https://a.example" },
          { id: "site-2", url: "https://b.example" },
        ],
        skipped: [{ line: "doublon.example", reason: "Doublon dans la liste." }],
      },
    } as unknown as Awaited<ReturnType<typeof addMonitoredSitesBulk>>);
    vi.mocked(inngest.send).mockResolvedValueOnce(undefined as never);

    const res = await importOnboardingDomains("a.example\nb.example\ndoublon.example");

    expect(inngest.send).toHaveBeenCalledTimes(1);
    expect(inngest.send).toHaveBeenCalledWith([
      { name: "app/scan.site", id: "onboarding-scan-site-1", data: { siteId: "site-1" } },
      { name: "app/scan.site", id: "onboarding-scan-site-2", data: { siteId: "site-2" } },
    ]);

    expect(res).toMatchObject({
      data: {
        skipped: [{ line: "doublon.example", reason: "Doublon dans la liste." }],
        scanTriggered: true,
      },
    });
    if (!("data" in res)) throw new Error("expected data");
    expect(res.data.created).toHaveLength(2);
  });

  it("ne perd pas les sites créés si l'envoi à Inngest échoue, et le dit honnêtement (principe II)", async () => {
    vi.mocked(addMonitoredSitesBulk).mockResolvedValueOnce({
      data: {
        created: [{ id: "site-1", url: "https://a.example" }],
        skipped: [],
      },
    } as unknown as Awaited<ReturnType<typeof addMonitoredSitesBulk>>);
    vi.mocked(inngest.send).mockRejectedValueOnce(new Error("INNGEST_SIGNING_KEY absente"));

    const res = await importOnboardingDomains("a.example");

    if (!("data" in res)) throw new Error("expected data");
    expect(res.data.created).toHaveLength(1);
    expect(res.data.scanTriggered).toBe(false);
  });

  it("ne contacte pas Inngest quand aucun site n'a été créé", async () => {
    vi.mocked(addMonitoredSitesBulk).mockResolvedValueOnce({
      data: {
        created: [],
        skipped: [{ line: "10.0.0.1", reason: "URL refusée" }],
      },
    } as unknown as Awaited<ReturnType<typeof addMonitoredSitesBulk>>);

    const res = await importOnboardingDomains("10.0.0.1");

    expect(inngest.send).not.toHaveBeenCalled();
    if (!("data" in res)) throw new Error("expected data");
    expect(res.data.scanTriggered).toBe(false);
    expect(res.data.skipped).toEqual([{ line: "10.0.0.1", reason: "URL refusée" }]);
  });
});
