import { PostHog } from "posthog-node";

let posthogServerClient: PostHog | null | undefined;

function getPostHogServerClient(): PostHog | null {
  if (posthogServerClient !== undefined) return posthogServerClient;

  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  // PostHog est optionnel (ADR-001) : l'observabilité ne doit jamais faire
  // échouer une requête utilisateur. Sans configuration, on n'envoie rien.
  if (!token || !host) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "PostHog désactivé côté serveur : NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN et NEXT_PUBLIC_POSTHOG_HOST sont requis.",
      );
    }
    posthogServerClient = null;
    return posthogServerClient;
  }

  posthogServerClient = new PostHog(token, {
    host,
    flushAt: 1,
    flushInterval: 0,
  });
  return posthogServerClient;
}

/**
 * Étapes du tunnel de conversion mesurées côté serveur (fiables même quand
 * un bloqueur de publicité coupe le SDK client). Nommer un nouvel événement
 * ici et étendre `FunnelEventProperties` en même temps : c'est ce qui force
 * chaque événement à porter son propre type de propriétés plutôt qu'un
 * `Record<string, unknown>` libre.
 */
export type FunnelEvent =
  | "signup_completed"
  | "site_added"
  | "checkout_started"
  | "subscription_activated"
  | "subscription_canceled"
  | "trial_started"
  | "trial_converted";

/**
 * Propriétés autorisées pour chaque événement de tunnel.
 *
 * Aucune propriété ne doit jamais contenir de donnée personnelle (RGPD,
 * docs/08-constitution.md) : ni e-mail, ni domaine client, ni nom. Le
 * `distinctId` (l'identifiant interne `User.id`) suffit à recoller le
 * parcours d'un même utilisateur sans exposer qui il est dans les propriétés.
 */
export interface FunnelEventProperties {
  signup_completed: { method: "credentials" };
  site_added: { count: number; total_sites: number; is_first_site: boolean };
  checkout_started: { plan: string };
  subscription_activated: { plan: string };
  subscription_canceled: { plan: string; previous_plan: string };
  trial_started: { plan: string };
  trial_converted: { plan: string };
}

/**
 * Reports one funnel-conversion event to PostHog and never throws.
 *
 * `distinctId` must be the internal `User.id` — the same identifier passed
 * to `posthog.identify` on the client — so a user's server-side and
 * client-side events merge into one journey. Properties are typed per
 * event (see `FunnelEventProperties`) and must never carry personal data.
 *
 * Without `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`/`NEXT_PUBLIC_POSTHOG_HOST`
 * this is a no-op: a business action (signup, checkout, webhook…) must
 * never fail because analytics is unavailable.
 */
export async function captureServerEvent<E extends FunnelEvent>(
  distinctId: string,
  event: E,
  properties: FunnelEventProperties[E],
): Promise<void> {
  const client = getPostHogServerClient();
  if (!client) return;

  try {
    client.capture({ distinctId, event, properties });
    await client.flush();
  } catch (captureError) {
    if (process.env.NODE_ENV === "development") {
      console.error("PostHog event capture failed:", captureError);
    }
  }
}

/**
 * Reports a server-side exception to PostHog and never throws. Used by
 * `instrumentation.ts` (`onRequestError`) to capture unhandled errors from
 * Server Components, Route Handlers and Server Actions (ADR-001, ENF-009).
 *
 * Without `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`/`NEXT_PUBLIC_POSTHOG_HOST` this
 * is a no-op: the request that triggered the original error is never made
 * to fail a second time because of an observability problem.
 */
export async function captureServerException(
  error: unknown,
  distinctId?: string,
  additionalProperties?: Record<string, unknown>,
): Promise<void> {
  const client = getPostHogServerClient();
  if (!client) return;

  try {
    client.captureException(error, distinctId, additionalProperties);
    await client.flush();
  } catch (captureError) {
    if (process.env.NODE_ENV === "development") {
      console.error("PostHog exception capture failed:", captureError);
    }
  }
}
