"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

let posthog: any = null;

let initialized = false;

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Dynamically import posthog-js on first user interaction or after LCP
  useEffect(() => {
    async function initPostHog() {
      if (initialized) return;
      initialized = true;

      // Wait for LCP window to pass
      await new Promise((r) => requestIdleCallback ? requestIdleCallback(r) : setTimeout(r, 2000));

      const { default: ph } = await import("posthog-js");
      posthog = ph;

      if (!POSTHOG_KEY) return;

      ph.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        person_profiles: "identified_only",
        capture_pageview: false,
        capture_pageleave: true,
        autocapture: true,
        capture_performance: false, // disable during init — costs main thread
        web_vitals: false,
      } as any); // @ts-error suppressed — PostHog v2 removed web_vitals type, runtime option still works

      // Capture initial pageview after lazy init
      let url = window.origin + (pathname || location.pathname);
      ph.capture("$pageview", { $current_url: url });
    }

    // Defer until interaction (guarantees LCP isn't blocked)
    const onInteraction = () => {
      window.removeEventListener("pointerdown", onInteraction);
      window.removeEventListener("keydown", onInteraction);
      initPostHog();
    };
    window.addEventListener("pointerdown", onInteraction, { once: true });
    window.addEventListener("keydown", onInteraction, { once: true });

    // Fallback: init after 8 seconds even without interaction
    const fallback = setTimeout(() => {
      window.removeEventListener("pointerdown", onInteraction);
      window.removeEventListener("keydown", onInteraction);
      initPostHog();
    }, 8000);

    return () => clearTimeout(fallback);
  }, [pathname]);

  return children;
}
