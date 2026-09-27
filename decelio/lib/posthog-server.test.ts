import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const captureExceptionMock = vi.hoisted(() => vi.fn());
const captureMock = vi.hoisted(() => vi.fn());
const flushMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const PostHogConstructorMock = vi.hoisted(() => vi.fn());

vi.mock("posthog-node", () => ({
  PostHog: vi.fn().mockImplementation(function MockPostHog(...args: unknown[]) {
    PostHogConstructorMock(...args);
    return { captureException: captureExceptionMock, capture: captureMock, flush: flushMock };
  }),
}));

const ORIGINAL_ENV = { ...process.env };

describe("captureServerException", () => {
  beforeEach(() => {
    vi.resetModules();
    captureExceptionMock.mockClear();
    captureMock.mockClear();
    flushMock.mockClear();
    PostHogConstructorMock.mockClear();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("n'envoie rien et ne lève jamais quand le token est absent", async () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;

    const { captureServerException } = await import("./posthog-server");

    await expect(captureServerException(new Error("boom"))).resolves.toBeUndefined();

    expect(PostHogConstructorMock).not.toHaveBeenCalled();
    expect(captureExceptionMock).not.toHaveBeenCalled();
    expect(flushMock).not.toHaveBeenCalled();
  });

  it("n'envoie rien et ne lève jamais quand seul le host est configuré", async () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://eu.i.posthog.com";

    const { captureServerException } = await import("./posthog-server");

    await expect(captureServerException(new Error("boom"))).resolves.toBeUndefined();

    expect(PostHogConstructorMock).not.toHaveBeenCalled();
  });

  it("transmet l'exception, l'identifiant et les propriétés au client PostHog quand la configuration est présente", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = "phc_test";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://eu.i.posthog.com";

    const { captureServerException } = await import("./posthog-server");
    const error = new Error("échec du scan");

    await captureServerException(error, "user-123", { path: "/api/scan" });

    expect(PostHogConstructorMock).toHaveBeenCalledWith(
      "phc_test",
      expect.objectContaining({ host: "https://eu.i.posthog.com" }),
    );
    expect(captureExceptionMock).toHaveBeenCalledWith(error, "user-123", { path: "/api/scan" });
    expect(flushMock).toHaveBeenCalledTimes(1);
  });

  it("ne lève jamais si le client PostHog échoue à l'envoi", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = "phc_test";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://eu.i.posthog.com";
    captureExceptionMock.mockImplementationOnce(() => {
      throw new Error("panne réseau PostHog");
    });

    const { captureServerException } = await import("./posthog-server");

    await expect(captureServerException(new Error("boom"))).resolves.toBeUndefined();
  });

  it("réutilise le même client PostHog entre deux appels (un seul construit)", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = "phc_test";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://eu.i.posthog.com";

    const { captureServerException } = await import("./posthog-server");

    await captureServerException(new Error("premier"));
    await captureServerException(new Error("second"));

    expect(PostHogConstructorMock).toHaveBeenCalledTimes(1);
  });
});

describe("captureServerEvent", () => {
  beforeEach(() => {
    vi.resetModules();
    captureMock.mockClear();
    flushMock.mockClear();
    PostHogConstructorMock.mockClear();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("n'envoie rien et ne lève jamais quand le token est absent", async () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;

    const { captureServerEvent } = await import("./posthog-server");

    await expect(
      captureServerEvent("user-123", "signup_completed", { method: "credentials" }),
    ).resolves.toBeUndefined();

    expect(PostHogConstructorMock).not.toHaveBeenCalled();
    expect(captureMock).not.toHaveBeenCalled();
    expect(flushMock).not.toHaveBeenCalled();
  });

  it("transmet le distinctId, l'événement et les propriétés au client PostHog quand la configuration est présente", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = "phc_test";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://eu.i.posthog.com";

    const { captureServerEvent } = await import("./posthog-server");

    await captureServerEvent("user-123", "checkout_started", { plan: "PRO" });

    expect(captureMock).toHaveBeenCalledWith({
      distinctId: "user-123",
      event: "checkout_started",
      properties: { plan: "PRO" },
    });
    expect(flushMock).toHaveBeenCalledTimes(1);
  });

  it("ne lève jamais si le client PostHog échoue à l'envoi", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = "phc_test";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://eu.i.posthog.com";
    captureMock.mockImplementationOnce(() => {
      throw new Error("panne réseau PostHog");
    });

    const { captureServerEvent } = await import("./posthog-server");

    await expect(
      captureServerEvent("user-123", "signup_completed", { method: "credentials" }),
    ).resolves.toBeUndefined();
  });

  it("ne lève jamais si flush échoue", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = "phc_test";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://eu.i.posthog.com";
    flushMock.mockImplementationOnce(() => Promise.reject(new Error("panne réseau PostHog")));

    const { captureServerEvent } = await import("./posthog-server");

    await expect(
      captureServerEvent("user-123", "signup_completed", { method: "credentials" }),
    ).resolves.toBeUndefined();
  });

  it("n'inclut aucune donnée personnelle : aucune propriété émise ne contient un e-mail", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = "phc_test";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://eu.i.posthog.com";

    const { captureServerEvent } = await import("./posthog-server");

    await captureServerEvent("user-123", "signup_completed", { method: "credentials" });
    await captureServerEvent("user-123", "site_added", {
      count: 1,
      total_sites: 1,
      is_first_site: true,
    });
    await captureServerEvent("user-123", "checkout_started", { plan: "PRO" });
    await captureServerEvent("user-123", "subscription_activated", { plan: "PRO" });
    await captureServerEvent("user-123", "subscription_canceled", {
      plan: "FREE",
      previous_plan: "PRO",
    });

    for (const call of captureMock.mock.calls) {
      const serialized = JSON.stringify(call[0]);
      expect(serialized).not.toContain("@");
    }
  });
});
