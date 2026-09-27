import { describe, expect, it, vi, beforeEach } from "vitest";
import { dailyScanJob } from "./daily-scan";
import { scanSiteJob } from "./scan-site";
import { db } from "@/lib/db";
import { runCoreScan } from "@/lib/scanner/core";


vi.mock("@/lib/db", () => ({
  db: {
    monitoredSite: {
      count: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      // T026 : sendRegressionAlert (déclenché sur régression) retrouve le
      // site par domaine/e-mail pour journaliser l'AlertEvent envoyé.
      findFirst: vi.fn(),
    },
    scanLog: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    alertEvent: {
      createMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/scanner/core", () => ({
  runCoreScan: vi.fn(),
}));

type CoreScanOutput = Awaited<ReturnType<typeof runCoreScan>>;
type MonitoredSiteRows = Awaited<ReturnType<typeof db.monitoredSite.findMany>>;
type MonitoredSiteWithUser = Awaited<ReturnType<typeof db.monitoredSite.findUnique>>;



/**
 * `inngest.createFunction()` returns an `InngestFunction` whose handler is a
 * private class field (see node_modules/inngest/components/InngestFunction.d.ts),
 * so it isn't reachable from the public type surface. These tests call the
 * handler directly to unit test its logic without Inngest's step-orchestration
 * runtime. Rather than suppressing the compiler with @ts-ignore/@ts-expect-error
 * at each call site, we go through one narrow, explicitly typed accessor that
 * describes exactly the context shape each handler destructures.
 */
function invokeHandler<TContext>(
  inngestFunction: object,
  context: TContext,
): unknown {
  return (
    inngestFunction as unknown as { fn: (ctx: TContext) => unknown }
  ).fn(context);
}

interface DailyScanStep {
  run: <T>(name: string, fn: () => Promise<T> | T) => Promise<T>;
  sendEvent: (
    name: string,
    payloads: Array<{ name: string; data: { siteIds: string[] } }>,
  ) => unknown;
}

interface ScanSiteStep {
  run: <T>(name: string, fn: () => Promise<T> | T) => Promise<T>;
}

describe("Fan-Out Inngest Scans", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("dailyScanJob (Dispatcher)", () => {
    it("should fetch sites in batches and send events", async () => {
      vi.mocked(db.monitoredSite.count).mockResolvedValue(2);
      vi.mocked(db.monitoredSite.findMany).mockResolvedValue([
        { id: "site-1", userId: "user-1", user: { plan: "SOLO" } },
        { id: "site-2", userId: "user-1", user: { plan: "SOLO" } },
      ] as unknown as MonitoredSiteRows);

      const step: DailyScanStep = {
        run: vi.fn().mockImplementation(async (name, fn) => await fn()),
        sendEvent: vi.fn(),
      };

      await invokeHandler<{ step: DailyScanStep }>(dailyScanJob, { step });

      expect(step.sendEvent).toHaveBeenCalledWith(
        "dispatch-scan-batches",
        [
          { name: "app/scan.site", data: { siteIds: ["site-1", "site-2"] } },
        ]
      );
    });

    it("ne demande à Prisma que les sites d'un compte payant et à jour", async () => {
      vi.mocked(db.monitoredSite.findMany).mockResolvedValue([] as unknown as MonitoredSiteRows);

      const step: DailyScanStep = {
        run: vi.fn().mockImplementation(async (name, fn) => await fn()),
        sendEvent: vi.fn(),
      };

      await invokeHandler<{ step: DailyScanStep }>(dailyScanJob, { step });

      const call = vi.mocked(db.monitoredSite.findMany).mock.calls[0]?.[0];
      expect(call?.where).toMatchObject({
        user: { plan: { in: ["SOLO", "PRO", "SCALE"] } },
      });
    });

    it("plafonne un compte rétrogradé à son quota actuel sans rien supprimer", async () => {
      // Compte passé de PRO (30 sites) à SOLO (10 sites) : 12 sites en base.
      const sites = Array.from({ length: 12 }, (_, i) => ({
        id: `site-${i}`,
        userId: "user-1",
        user: { plan: "SOLO" },
      }));
      vi.mocked(db.monitoredSite.findMany).mockResolvedValue(
        sites as unknown as MonitoredSiteRows,
      );

      const step: DailyScanStep = {
        run: vi.fn().mockImplementation(async (name, fn) => await fn()),
        sendEvent: vi.fn(),
      };

      const result = (await invokeHandler<{ step: DailyScanStep }>(dailyScanJob, {
        step,
      })) as { totalSites: number };

      expect(result.totalSites).toBe(10);
      const dispatched = vi.mocked(step.sendEvent).mock.calls[0]?.[1] as Array<{
        data: { siteIds: string[] };
      }>;
      const dispatchedIds = dispatched.flatMap((batch) => batch.data.siteIds);
      expect(dispatchedIds).toEqual(sites.slice(0, 10).map((s) => s.id));
    });
  });

  describe("scanSiteJob (Worker)", () => {
    const step: ScanSiteStep = {
      run: vi.fn().mockImplementation(async (_name: string, fn: () => unknown) => await fn()),
    };

    it("should process a site and trigger alert on regression", async () => {
      vi.mocked(db.monitoredSite.findUnique).mockResolvedValue({
        id: "site-4",
        url: "https://example4.com",
        status: "ACTIVE",
        user: { email: "user@example.com" },
      } as unknown as MonitoredSiteWithUser);

      vi.mocked(runCoreScan).mockResolvedValue({
        report: { robots: {}, access: {}, jsDependency: {} },
        results: [
          {
            agent: "GPTBot",
            simpleStatus: "COQUILLE VIDE",
            httpStatus: 200,
            durationMs: 100,
            wordCount: 10,
          },
        ],
      } as unknown as CoreScanOutput);

      await invokeHandler<{ event: { data: { siteId: string } }; step: ScanSiteStep }>(
        scanSiteJob,
        { event: { data: { siteId: "site-4" } }, step },
      );

      const logged = vi.mocked(db.scanLog.create).mock.calls[0]?.[0]?.data;
      if (!logged) throw new Error("create devait écrire un journal");
      expect(logged).toMatchObject({
        simpleStatus: "COQUILLE VIDE",
        cause: "GPTBot : aucune restriction détectée",
      });
      expect(JSON.parse(String(logged.payload))).toMatchObject({
        results: [{ agent: "GPTBot", simpleStatus: "COQUILLE VIDE" }],
      });

      expect(db.monitoredSite.update).toHaveBeenCalledWith({
        where: { id: "site-4" },
        data: { status: "COQUILLE VIDE" },
      });
    });
  });
});
