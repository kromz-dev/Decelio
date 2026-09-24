"use client";

import posthog from "posthog-js";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

if (typeof window !== "undefined") {
  const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (process.env.NODE_ENV === "development" && !projectToken) {
    throw new Error(
      "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured",
    );
  }
  if (process.env.NODE_ENV === "development" && !host) {
    throw new Error(
      "NEXT_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_HOST is configured",
    );
  }

  if (projectToken && host) {
    posthog.init(projectToken, {
      api_host: host,
      defaults: "2026-01-30",
      capture_exceptions: true,
      capture_pageview: false,
      capture_pageleave: true,
      debug: process.env.NODE_ENV === "development",
    });
  }
}

export function PostHogPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname && posthog.has_opted_out_capturing() === false) {
      let url = window.origin + pathname;
      if (searchParams && searchParams.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      posthog.capture("$pageview", {
        $current_url: url,
      });
    }
  }, [pathname, searchParams]);

  return null;
}

type AuthSession = {
  user?: {
    id?: string;
    email?: string | null;
    name?: string | null;
  };
};

export function PostHogIdentify() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("posthog_reset")) {
      posthog.reset();
      url.searchParams.delete("posthog_reset");
      window.history.replaceState(null, "", url);
    }

    void fetch("/api/auth/session")
      .then((response) => (response.ok ? response.json() : null))
      .then((session: AuthSession | null) => {
        const user = session?.user;
        if (!user?.id) return;

        posthog.identify(user.id, {
          ...(user.email ? { email: user.email } : {}),
          ...(user.name ? { name: user.name } : {}),
        });
      })
      .catch(() => undefined);
  }, []);

  return null;
}

