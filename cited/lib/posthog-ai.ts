import { PostHog } from "posthog-node";

import type { EngineUsage } from "./engines/types";

let posthogClient: PostHog | null | undefined;

function missingConfigError(variableName: string): Error {
  return new Error(
    `${variableName} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${variableName} is configured`,
  );
}

function getPostHogClient(): PostHog | null {
  if (posthogClient !== undefined) return posthogClient;

  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!token) {
    if (process.env.NODE_ENV === "development") {
      throw missingConfigError("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN");
    }
    posthogClient = null;
    return posthogClient;
  }

  if (!host) {
    if (process.env.NODE_ENV === "development") {
      throw missingConfigError("NEXT_PUBLIC_POSTHOG_HOST");
    }
    posthogClient = null;
    return posthogClient;
  }

  posthogClient = new PostHog(token, {
    host,
    flushAt: 1,
    flushInterval: 0,
    enableExceptionAutocapture: true,
    privacyMode: false,
  });
  return posthogClient;
}

interface AiGeneration {
  traceId: string;
  provider: "google" | "groq";
  model: string;
  input: unknown;
  output: string;
  latencyMs: number;
  usage?: EngineUsage;
}

/**
 * Records a completed direct REST model invocation and flushes it before a
 * Next.js route or Inngest step can terminate. There is no authenticated user
 * context at the connector boundary, so generations use a non-person service
 * distinct ID and do not create a PostHog person profile.
 */
export async function captureAiGeneration(generation: AiGeneration): Promise<void> {
  const client = getPostHogClient();
  if (!client) return;

  try {
    client.capture({
      distinctId: "cited-ai-service",
      event: "$ai_generation",
      properties: {
        $process_person_profile: false,
        $ai_trace_id: generation.traceId,
        $ai_provider: generation.provider,
        $ai_model: generation.model,
        $ai_input: generation.input,
        $ai_output_choices: [{ role: "assistant", content: generation.output }],
        $ai_latency: generation.latencyMs / 1000,
        $ai_input_tokens: generation.usage?.inputTokens,
        $ai_output_tokens: generation.usage?.outputTokens,
      },
    });
    await client.flush();
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("PostHog AI Observability capture failed:", error);
    }
  }
}
