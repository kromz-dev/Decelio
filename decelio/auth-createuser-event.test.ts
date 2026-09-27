import { describe, expect, it, vi } from "vitest";
import { handleUserCreated } from "./auth";

/**
 * Le cas Google ne passe plus par un callback `signIn` — retiré volontairement,
 * car il s'exécutait à chaque connexion et pas seulement à la création du
 * compte. L'enregistrement de l'acceptation des CGV repose donc entièrement sur
 * une seule ligne de configuration, `events.createUser`, qu'aucun test
 * n'observait : la supprimer laissait tous les tests au vert alors que plus
 * aucun compte Google n'enregistrait son acceptation.
 *
 * `@auth/core` déclenche `events.createUser` juste après que l'adaptateur a créé
 * l'utilisateur (`lib/actions/callback/handle-login.ts`), donc une seule fois
 * par compte. Sans adaptateur, aucun utilisateur n'est créé en base et
 * l'événement ne part jamais : les deux conditions sont vérifiées ici.
 */

const capture = vi.hoisted(() => ({ config: undefined as unknown }));

vi.mock("next-auth", () => ({
  default: (config: unknown) => {
    capture.config = config;
    return { handlers: {}, signIn: vi.fn(), signOut: vi.fn(), auth: vi.fn() };
  },
}));

vi.mock("@/lib/db", () => ({
  db: { user: { findUnique: vi.fn(), update: vi.fn(async () => ({})) } },
}));

vi.mock("@/lib/posthog-server", () => ({
  captureServerEvent: vi.fn(async () => undefined),
}));

type ConfigNextAuth = {
  adapter?: unknown;
  events?: { createUser?: unknown };
};

describe("configuration NextAuth : première connexion Google", () => {
  it("branche handleUserCreated sur events.createUser", () => {
    const config = capture.config as ConfigNextAuth;

    expect(config.events?.createUser).toBe(handleUserCreated);
  });

  it("conserve un adaptateur de base de données", () => {
    const config = capture.config as ConfigNextAuth;

    expect(config.adapter).toBeDefined();
  });
});
