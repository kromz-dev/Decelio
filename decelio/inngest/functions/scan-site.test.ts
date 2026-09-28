import { describe, expect, it, vi, beforeEach } from "vitest";
import { causeForBot, scanSiteJob } from "./scan-site";
import { db } from "@/lib/db";
import { runCoreScan } from "@/lib/scanner/core";
import { sendRegressionAlert } from "@/lib/alerting/sendAlert";

vi.mock("@/lib/db", () => ({
  db: {
    monitoredSite: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    scanLog: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/scanner/core", () => ({
  runCoreScan: vi.fn(),
}));

vi.mock("@/lib/alerting/sendAlert", () => ({
  sendRegressionAlert: vi.fn(),
}));

type CoreScanOutput = Awaited<ReturnType<typeof runCoreScan>>;
type MonitoredSiteWithUser = Awaited<ReturnType<typeof db.monitoredSite.findUnique>>;
type ScanLogRows = Awaited<ReturnType<typeof db.scanLog.findMany>>;

function invokeHandler<TContext>(inngestFunction: object, context: TContext): unknown {
  return (inngestFunction as unknown as { fn: (ctx: TContext) => unknown }).fn(context);
}

interface ScanSiteStep {
  run: <T>(name: string, fn: () => Promise<T> | T) => Promise<T>;
  sleep: (name: string, duration: string) => Promise<void>;
}

function createdRows() {
  return vi.mocked(db.scanLog.create).mock.calls.map((call) => call[0].data);
}

// L'attente durable n'a rien à faire dans les tests : elle se résout tout de
// suite, comme le fait `@inngest/test` en mémoire.
function stepThatRuns(): ScanSiteStep {
  return {
    run: vi.fn().mockImplementation(async (_name: string, fn: () => unknown) => await fn()),
    sleep: vi.fn().mockResolvedValue(undefined),
  };
}

const reportBots = [
  { agent: "GPTBot", simpleStatus: "OK", reasons: [], httpStatus: 200, durationMs: 10, wordCount: 80 },
  { agent: "ClaudeBot", simpleStatus: "BLOQUÉ", reasons: ["robots.txt disallows ClaudeBot"], httpStatus: 200, durationMs: 10, wordCount: 80 },
  { agent: "PerplexityBot", simpleStatus: "COQUILLE VIDE", reasons: ["js_dependent: 12 words in raw HTML"], httpStatus: 200, durationMs: 10, wordCount: 12 },
] as const;

describe("causeForBot", () => {
  it("translates a general block (à vérifier) reason into French", () => {
    expect(causeForBot("GPTBot", ["general block (status:403) — no bot-specific evidence"])).toBe(
      "GPTBot : le site bloque tout (HTTP 403), sans rien qui vise spécifiquement ce robot : à vérifier",
    );
  });

  it("translates an unverified-probe (indice) reason into French", () => {
    expect(causeForBot("GPTBot", ["unverified probe blocked (status:403) while honest request ok"])).toBe(
      "GPTBot : une requête non vérifiée se présentant comme ce robot a été bloquée (HTTP 403) alors que notre visite passe : un indice, pas une preuve",
    );
  });
});

describe("scanSiteJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.scanLog.findMany).mockResolvedValue([] as unknown as ScanLogRows);
  });

  it("journalise simpleStatus et cause pour chaque bot du rapport", async () => {
    vi.mocked(db.monitoredSite.findUnique).mockResolvedValue({
      id: "site-1",
      url: "https://exemple.fr",
      status: "OK",
      user: { email: "agence@exemple.fr" },
    } as unknown as MonitoredSiteWithUser);
    vi.mocked(runCoreScan).mockResolvedValue({
      report: { robots: {}, access: {}, jsDependency: {} },
      results: reportBots,
    } as unknown as CoreScanOutput);

    await invokeHandler(scanSiteJob, {
      event: { data: { siteIds: ["site-1"] } },
      step: stepThatRuns(),
    });

    expect(runCoreScan).toHaveBeenCalledWith("https://exemple.fr", [
      "OAI-SearchBot",
      "Claude-SearchBot",
      "PerplexityBot",
    ]);
    const rows = createdRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      siteId: "site-1",
      simpleStatus: "BLOQUÉ",
      cause: "ClaudeBot : robots.txt interdit ClaudeBot",
    });
    const payload = JSON.parse(String(rows[0]?.payload)) as {
      results: { agent: string; simpleStatus: string; cause: string }[];
    };
    expect(payload.results.map((result) => result.simpleStatus)).toEqual([
      "OK",
      "BLOQUÉ",
      "COQUILLE VIDE",
    ]);
    expect(payload.results.map((result) => result.agent)).toEqual([
      "GPTBot",
      "ClaudeBot",
      "PerplexityBot",
    ]);
  });

  it("laisse payload vide quand le verdict du bot n'a pas changé", async () => {
    vi.mocked(db.monitoredSite.findUnique).mockResolvedValue({
      id: "site-1",
      url: "https://exemple.fr",
      status: "BLOQUÉ",
      user: { email: "agence@exemple.fr" },
    } as unknown as MonitoredSiteWithUser);
    vi.mocked(db.scanLog.findMany).mockResolvedValue([
      { simpleStatus: "BLOQUÉ", cause: "ClaudeBot : robots.txt interdit ClaudeBot" },
    ] as unknown as ScanLogRows);
    vi.mocked(runCoreScan).mockResolvedValue({
      report: {},
      results: reportBots,
    } as unknown as CoreScanOutput);

    await invokeHandler(scanSiteJob, {
      event: { data: { siteId: "site-1" } },
      step: stepThatRuns(),
    });

    const rows = createdRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      simpleStatus: "BLOQUÉ",
      cause: "ClaudeBot : robots.txt interdit ClaudeBot",
      payload: null,
    });
    expect(db.monitoredSite.update).not.toHaveBeenCalled();
  });

  it("écrit le payload seulement pour le bot dont le verdict change", async () => {
    // status déjà à BLOQUÉ (comme le verdict attendu) : ce test porte sur le
    // contenu du payload, pas sur la confirmation de régression (testée à
    // part), donc oldStatus === newStatus pour rester hors de ce chemin.
    vi.mocked(db.monitoredSite.findUnique).mockResolvedValue({
      id: "site-1",
      url: "https://exemple.fr",
      status: "BLOQUÉ",
      user: { email: "agence@exemple.fr" },
    } as unknown as MonitoredSiteWithUser);
    vi.mocked(db.scanLog.findMany).mockResolvedValue([
      { simpleStatus: "OK", cause: "GPTBot : aucune restriction détectée" },
    ] as unknown as ScanLogRows);
    vi.mocked(runCoreScan).mockResolvedValue({
      report: { marque: "complet" },
      results: [reportBots[0], reportBots[1]],
    } as unknown as CoreScanOutput);

    await invokeHandler(scanSiteJob, {
      event: { data: { siteIds: ["site-1"] } },
      step: stepThatRuns(),
    });

    const rows = createdRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.simpleStatus).toBe("BLOQUÉ");
    expect(JSON.parse(String(rows[0]?.payload))).toMatchObject({
      results: [
        { agent: "GPTBot", simpleStatus: "OK" },
        { agent: "ClaudeBot", simpleStatus: "BLOQUÉ" },
      ],
    });
  });

  it("utilise un seul step.run par site du lot", async () => {
    vi.mocked(db.monitoredSite.findUnique).mockImplementation((async (args: { where: { id: string } }) => ({
      id: args.where.id,
      url: `https://${args.where.id}.exemple.fr`,
      status: "OK",
      user: { email: "agence@exemple.fr" },
    })) as unknown as typeof db.monitoredSite.findUnique);
    vi.mocked(runCoreScan).mockResolvedValue({
      report: {},
      results: [reportBots[0]],
    } as unknown as CoreScanOutput);
    const step = stepThatRuns();

    await invokeHandler(scanSiteJob, {
      event: { data: { siteIds: ["site-a", "site-b"] } },
      step,
    });

    expect(step.run).toHaveBeenCalledTimes(2);
    expect(vi.mocked(step.run).mock.calls.map((call) => call[0])).toEqual([
      "scan-site-a",
      "scan-site-b",
    ]);
  });

  it("n'alerte jamais au premier scan d'un site sans historique, même si le statut enregistré était OK/ACTIVE", async () => {
    // db.scanLog.findMany renvoie [] (beforeEach) : aucun ScanLog antérieur,
    // donc aucune preuve que ce site ait jamais été lisible. Un site qu'on
    // n'a jamais su lisible ne doit pas déclencher une alerte de
    // "régression" à son premier scan (constitution principe I : zéro faux
    // positif). Le statut met bien à jour immédiatement (pas de confirmation
    // à attendre sans historique), mais sans jamais alerter.
    vi.mocked(db.monitoredSite.findUnique).mockResolvedValue({
      id: "site-1",
      url: "https://exemple.fr",
      status: "OK",
      user: { email: "agence@exemple.fr" },
    } as unknown as MonitoredSiteWithUser);
    vi.mocked(runCoreScan).mockResolvedValue({
      report: {},
      results: reportBots,
    } as unknown as CoreScanOutput);

    const step = stepThatRuns();
    await invokeHandler(scanSiteJob, {
      event: { data: { siteIds: ["site-1"] } },
      step,
    });

    expect(db.monitoredSite.update).toHaveBeenCalledWith({
      where: { id: "site-1" },
      data: { status: "BLOQUÉ" },
    });
    expect(sendRegressionAlert).not.toHaveBeenCalled();
    expect(step.sleep).not.toHaveBeenCalled();
  });

  it("confirme une régression après un second scan identique et envoie une seule alerte", async () => {
    // Site avec historique (au moins un ScanLog) : la dégradation doit être
    // confirmée par un second scan avant toute alerte (constitution
    // principe I, zéro faux positif).
    const blocked = [
      { agent: "GPTBot", simpleStatus: "BLOQUÉ", reasons: ["robots.txt disallows GPTBot"], httpStatus: 200, durationMs: 10, wordCount: 80 },
    ] as const;

    vi.mocked(db.monitoredSite.findUnique).mockResolvedValue({
      id: "site-1",
      url: "https://exemple.fr",
      status: "OK",
      user: { email: "agence@exemple.fr" },
    } as unknown as MonitoredSiteWithUser);
    vi.mocked(db.scanLog.findMany).mockResolvedValue([
      { simpleStatus: "OK", cause: "GPTBot : aucune restriction détectée" },
    ] as unknown as ScanLogRows);
    vi.mocked(runCoreScan).mockResolvedValue({
      report: {},
      results: blocked,
    } as unknown as CoreScanOutput);

    const step = stepThatRuns();
    await invokeHandler(scanSiteJob, {
      event: { data: { siteId: "site-1" } },
      step,
    });

    expect(step.sleep).toHaveBeenCalledTimes(1);
    expect(step.sleep).toHaveBeenCalledWith("wait-regression-confirmation-site-1", "10m");
    expect(step.run).toHaveBeenCalledTimes(2);
    expect(db.monitoredSite.update).toHaveBeenCalledTimes(1);
    expect(db.monitoredSite.update).toHaveBeenCalledWith({
      where: { id: "site-1" },
      data: { status: "BLOQUÉ" },
    });
    expect(sendRegressionAlert).toHaveBeenCalledTimes(1);
    // Les robots simulés ici ne sont pas des robots de recherche : pas de nom d'assistant.
    expect(sendRegressionAlert).toHaveBeenCalledWith("agence@exemple.fr", "https://exemple.fr", "OK", "BLOQUÉ", undefined);
  });

  it("n'alerte pas si le second scan ne confirme pas la dégradation (raté transitoire)", async () => {
    vi.mocked(db.monitoredSite.findUnique).mockResolvedValue({
      id: "site-1",
      url: "https://exemple.fr",
      status: "OK",
      user: { email: "agence@exemple.fr" },
    } as unknown as MonitoredSiteWithUser);
    vi.mocked(db.scanLog.findMany).mockResolvedValue([
      { simpleStatus: "OK", cause: "GPTBot : aucune restriction détectée" },
    ] as unknown as ScanLogRows);
    vi.mocked(runCoreScan)
      .mockResolvedValueOnce({
        report: {},
        results: [{ agent: "GPTBot", simpleStatus: "BLOQUÉ", reasons: ["robots.txt disallows GPTBot"], httpStatus: 200, durationMs: 10, wordCount: 80 }],
      } as unknown as CoreScanOutput)
      .mockResolvedValueOnce({
        report: {},
        results: [{ agent: "GPTBot", simpleStatus: "OK", reasons: [], httpStatus: 200, durationMs: 10, wordCount: 80 }],
      } as unknown as CoreScanOutput);

    const step = stepThatRuns();
    await invokeHandler(scanSiteJob, {
      event: { data: { siteId: "site-1" } },
      step,
    });

    expect(step.sleep).toHaveBeenCalledTimes(1);
    expect(step.run).toHaveBeenCalledTimes(2);
    expect(db.monitoredSite.update).not.toHaveBeenCalled();
    expect(sendRegressionAlert).not.toHaveBeenCalled();
  });

  it("confirme avec le statut le plus grave quand le second scan est pire que le premier", async () => {
    vi.mocked(db.monitoredSite.findUnique).mockResolvedValue({
      id: "site-1",
      url: "https://exemple.fr",
      status: "OK",
      user: { email: "agence@exemple.fr" },
    } as unknown as MonitoredSiteWithUser);
    vi.mocked(db.scanLog.findMany).mockResolvedValue([
      { simpleStatus: "OK", cause: "GPTBot : aucune restriction détectée" },
    ] as unknown as ScanLogRows);
    vi.mocked(runCoreScan)
      .mockResolvedValueOnce({
        report: {},
        results: [{ agent: "GPTBot", simpleStatus: "COQUILLE VIDE", reasons: ["js_dependent: 12 words in raw HTML"], httpStatus: 200, durationMs: 10, wordCount: 12 }],
      } as unknown as CoreScanOutput)
      .mockResolvedValueOnce({
        report: {},
        results: [{ agent: "GPTBot", simpleStatus: "BLOQUÉ", reasons: ["robots.txt disallows GPTBot"], httpStatus: 200, durationMs: 10, wordCount: 80 }],
      } as unknown as CoreScanOutput);

    const step = stepThatRuns();
    await invokeHandler(scanSiteJob, {
      event: { data: { siteId: "site-1" } },
      step,
    });

    expect(db.monitoredSite.update).toHaveBeenCalledTimes(1);
    expect(db.monitoredSite.update).toHaveBeenCalledWith({
      where: { id: "site-1" },
      data: { status: "BLOQUÉ" },
    });
    expect(sendRegressionAlert).toHaveBeenCalledTimes(1);
    // Les robots simulés ici ne sont pas des robots de recherche : pas de nom d'assistant.
    expect(sendRegressionAlert).toHaveBeenCalledWith("agence@exemple.fr", "https://exemple.fr", "OK", "BLOQUÉ", undefined);
  });

  it("une amélioration (retour à OK) ne demande pas de confirmation ni de second scan", async () => {
    vi.mocked(db.monitoredSite.findUnique).mockResolvedValue({
      id: "site-1",
      url: "https://exemple.fr",
      status: "BLOQUÉ",
      user: { email: "agence@exemple.fr" },
    } as unknown as MonitoredSiteWithUser);
    vi.mocked(db.scanLog.findMany).mockResolvedValue([
      { simpleStatus: "BLOQUÉ", cause: "GPTBot : robots.txt interdit GPTBot" },
    ] as unknown as ScanLogRows);
    vi.mocked(runCoreScan).mockResolvedValue({
      report: {},
      results: [{ agent: "GPTBot", simpleStatus: "OK", reasons: [], httpStatus: 200, durationMs: 10, wordCount: 80 }],
    } as unknown as CoreScanOutput);

    const step = stepThatRuns();
    await invokeHandler(scanSiteJob, {
      event: { data: { siteId: "site-1" } },
      step,
    });

    expect(step.sleep).not.toHaveBeenCalled();
    expect(step.run).toHaveBeenCalledTimes(1);
    expect(db.monitoredSite.update).toHaveBeenCalledWith({
      where: { id: "site-1" },
      data: { status: "OK" },
    });
    expect(sendRegressionAlert).not.toHaveBeenCalled();
  });

  it("nomme dans l'alerte le robot de recherche qui a fait régresser le site", async () => {
    // Un historique (au moins un ScanLog "OK" antérieur) est nécessaire pour
    // qu'une alerte parte : sans lui, la dégradation n'est jamais confirmée
    // ni alertée (voir "n'alerte jamais au premier scan...").
    vi.mocked(db.monitoredSite.findUnique).mockResolvedValue({
      id: "site-1",
      url: "https://exemple.fr",
      status: "OK",
      user: { email: "agence@exemple.fr" },
    } as unknown as MonitoredSiteWithUser);
    vi.mocked(db.scanLog.findMany).mockResolvedValue([
      { simpleStatus: "OK", cause: "GPTBot : aucune restriction détectée" },
    ] as unknown as ScanLogRows);
    vi.mocked(runCoreScan).mockResolvedValue({
      report: {},
      results: [
        { agent: "OAI-SearchBot", simpleStatus: "OK", reasons: [], httpStatus: 200, durationMs: 10, wordCount: 80 },
        { agent: "Claude-SearchBot", simpleStatus: "BLOQUÉ", reasons: ["robots.txt disallows Claude-SearchBot"], httpStatus: 200, durationMs: 10, wordCount: 80 },
        { agent: "PerplexityBot", simpleStatus: "OK", reasons: [], httpStatus: 200, durationMs: 10, wordCount: 80 },
      ],
    } as unknown as CoreScanOutput);

    await invokeHandler(scanSiteJob, {
      event: { data: { siteIds: ["site-1"] } },
      step: stepThatRuns(),
    });

    expect(sendRegressionAlert).toHaveBeenCalledWith(
      "agence@exemple.fr",
      "https://exemple.fr",
      "OK",
      "BLOQUÉ",
      "Claude-SearchBot",
    );
  });

  it("parcours P2 complet : ajout, scan, changement de statut, jamais d'alerte sans historique confirmé", async () => {
    const blockedResults = [
      {
        agent: "GPTBot",
        simpleStatus: "BLOQUÉ",
        reasons: ["robots.txt disallows GPTBot"],
        httpStatus: 200,
        durationMs: 10,
        wordCount: 80,
      },
    ] as const;

    // Site ajouté, encore au statut OK : premier scan, verdict qui régresse.
    // Aucun ScanLog antérieur (beforeEach) : aucune preuve que ce site ait
    // jamais été lisible, donc aucune alerte de "régression" ne doit partir
    // (constitution principe I), même si le statut enregistré était OK.
    vi.mocked(db.monitoredSite.findUnique).mockResolvedValueOnce({
      id: "site-1",
      url: "https://exemple.fr",
      status: "OK",
      user: { email: "agence@exemple.fr" },
    } as unknown as MonitoredSiteWithUser);
    vi.mocked(runCoreScan).mockResolvedValueOnce({
      report: {},
      results: blockedResults,
    } as unknown as CoreScanOutput);

    await invokeHandler(scanSiteJob, {
      event: { data: { siteId: "site-1" } },
      step: stepThatRuns(),
    });

    expect(db.monitoredSite.update).toHaveBeenCalledWith({
      where: { id: "site-1" },
      data: { status: "BLOQUÉ" },
    });
    expect(sendRegressionAlert).not.toHaveBeenCalled();

    // Second scan, identique : le site est désormais persisté BLOQUÉ (T023),
    // donc oldStatus === newStatus et aucune nouvelle alerte ne doit partir.
    vi.mocked(db.monitoredSite.findUnique).mockResolvedValueOnce({
      id: "site-1",
      url: "https://exemple.fr",
      status: "BLOQUÉ",
      user: { email: "agence@exemple.fr" },
    } as unknown as MonitoredSiteWithUser);
    vi.mocked(runCoreScan).mockResolvedValueOnce({
      report: {},
      results: blockedResults,
    } as unknown as CoreScanOutput);

    await invokeHandler(scanSiteJob, {
      event: { data: { siteId: "site-1" } },
      step: stepThatRuns(),
    });

    expect(db.monitoredSite.update).toHaveBeenCalledTimes(1);
    expect(sendRegressionAlert).not.toHaveBeenCalled();
  });

  it("enregistre À VÉRIFIER sans jamais envoyer d'alerte de régression (blocage général sans preuve)", async () => {
    vi.mocked(db.monitoredSite.findUnique).mockResolvedValue({
      id: "site-1",
      url: "https://exemple.fr",
      status: "OK",
      user: { email: "agence@exemple.fr" },
    } as unknown as MonitoredSiteWithUser);
    vi.mocked(runCoreScan).mockResolvedValue({
      report: {},
      results: [
        {
          agent: "GPTBot",
          simpleStatus: "À VÉRIFIER",
          reasons: ["general block (status:403) — no bot-specific evidence"],
          httpStatus: 403,
          durationMs: 10,
          wordCount: 0,
        },
      ],
    } as unknown as CoreScanOutput);

    await invokeHandler(scanSiteJob, { event: { data: { siteId: "site-1" } }, step: stepThatRuns() });

    expect(db.monitoredSite.update).toHaveBeenCalledWith({
      where: { id: "site-1" },
      data: { status: "À VÉRIFIER" },
    });
    expect(sendRegressionAlert).not.toHaveBeenCalled();
  });

  it("un site avec historique qui passe à À VÉRIFIER n'attend pas de confirmation et n'alerte jamais", async () => {
    // À VÉRIFIER est un statut d'incertitude (indice, pas preuve) : il ne
    // doit jamais, à lui seul, déclencher le circuit de confirmation ni une
    // alerte de régression, même quand le site a déjà un historique.
    vi.mocked(db.monitoredSite.findUnique).mockResolvedValue({
      id: "site-1",
      url: "https://exemple.fr",
      status: "OK",
      user: { email: "agence@exemple.fr" },
    } as unknown as MonitoredSiteWithUser);
    vi.mocked(db.scanLog.findMany).mockResolvedValue([
      { simpleStatus: "OK", cause: "GPTBot : aucune restriction détectée" },
    ] as unknown as ScanLogRows);
    vi.mocked(runCoreScan).mockResolvedValue({
      report: {},
      results: [
        {
          agent: "GPTBot",
          simpleStatus: "À VÉRIFIER",
          reasons: ["general block (status:403) — no bot-specific evidence"],
          httpStatus: 403,
          durationMs: 10,
          wordCount: 0,
        },
      ],
    } as unknown as CoreScanOutput);

    const step = stepThatRuns();
    await invokeHandler(scanSiteJob, { event: { data: { siteId: "site-1" } }, step });

    expect(step.sleep).not.toHaveBeenCalled();
    expect(step.run).toHaveBeenCalledTimes(1);
    expect(db.monitoredSite.update).toHaveBeenCalledWith({
      where: { id: "site-1" },
      data: { status: "À VÉRIFIER" },
    });
    expect(sendRegressionAlert).not.toHaveBeenCalled();
  });

  it("un second scan qui retombe à À VÉRIFIER ne confirme pas une régression BLOQUÉ en attente", async () => {
    // Le second scan doit être « même statut, ou pire » pour confirmer :
    // À VÉRIFIER (rang 1) est moins grave que BLOQUÉ (rang 3), donc il ne
    // confirme rien, même si un blocage général demeure suspect.
    vi.mocked(db.monitoredSite.findUnique).mockResolvedValue({
      id: "site-1",
      url: "https://exemple.fr",
      status: "OK",
      user: { email: "agence@exemple.fr" },
    } as unknown as MonitoredSiteWithUser);
    vi.mocked(db.scanLog.findMany).mockResolvedValue([
      { simpleStatus: "OK", cause: "GPTBot : aucune restriction détectée" },
    ] as unknown as ScanLogRows);
    vi.mocked(runCoreScan)
      .mockResolvedValueOnce({
        report: {},
        results: [{ agent: "GPTBot", simpleStatus: "BLOQUÉ", reasons: ["robots.txt disallows GPTBot"], httpStatus: 200, durationMs: 10, wordCount: 80 }],
      } as unknown as CoreScanOutput)
      .mockResolvedValueOnce({
        report: {},
        results: [
          {
            agent: "GPTBot",
            simpleStatus: "À VÉRIFIER",
            reasons: ["general block (status:403) — no bot-specific evidence"],
            httpStatus: 403,
            durationMs: 10,
            wordCount: 0,
          },
        ],
      } as unknown as CoreScanOutput);

    const step = stepThatRuns();
    await invokeHandler(scanSiteJob, { event: { data: { siteId: "site-1" } }, step });

    expect(step.sleep).toHaveBeenCalledTimes(1);
    expect(db.monitoredSite.update).not.toHaveBeenCalled();
    expect(sendRegressionAlert).not.toHaveBeenCalled();
  });

  it("enregistre ERREUR pour un site injoignable et BLOQUÉ pour un robots.txt", async () => {
    vi.mocked(db.monitoredSite.findUnique).mockResolvedValue({
      id: "site-1",
      url: "https://exemple.fr",
      status: "OK",
      user: { email: "agence@exemple.fr" },
    } as unknown as MonitoredSiteWithUser);

    vi.mocked(runCoreScan).mockResolvedValueOnce({
      report: {},
      results: [{ agent: "GPTBot", simpleStatus: "ERREUR", reasons: ["unreachable: timeout"], httpStatus: 0, durationMs: 1, wordCount: 0 }],
    } as unknown as CoreScanOutput);
    await invokeHandler(scanSiteJob, { event: { data: { siteId: "site-1" } }, step: stepThatRuns() });
    expect(db.monitoredSite.update).toHaveBeenCalledWith({
      where: { id: "site-1" },
      data: { status: "ERREUR" },
    });

    vi.mocked(db.monitoredSite.update).mockClear();
    vi.mocked(runCoreScan).mockResolvedValueOnce({
      report: {},
      results: [{ agent: "GPTBot", simpleStatus: "BLOQUÉ", reasons: ["robots.txt disallows GPTBot"], httpStatus: 200, durationMs: 1, wordCount: 20 }],
    } as unknown as CoreScanOutput);
    await invokeHandler(scanSiteJob, { event: { data: { siteId: "site-1" } }, step: stepThatRuns() });
    expect(db.monitoredSite.update).toHaveBeenCalledWith({
      where: { id: "site-1" },
      data: { status: "BLOQUÉ" },
    });
  });
});
