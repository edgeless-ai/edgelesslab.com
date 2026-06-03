"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type posthog from "posthog-js";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

let initialized = false;
let initPromise: Promise<typeof posthog | null> | null = null;

function getCurrentUrl(pathname: string | null) {
  if (typeof window === "undefined") return undefined;
  return window.origin + (pathname || window.location.pathname);
}

async function ensurePostHog() {
  if (!POSTHOG_KEY) return null;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const { default: ph } = await import("posthog-js");
    if (!initialized) {
      const options: Parameters<typeof ph.init>[1] & { web_vitals?: boolean } = {
        api_host: POSTHOG_HOST,
        person_profiles: "identified_only",
        capture_pageview: false,
        capture_pageleave: true,
        autocapture: true,
        capture_performance: false,
        web_vitals: false,
      };
      ph.init(POSTHOG_KEY, options);
      initialized = true;
    }
    return ph;
  })();

  return initPromise;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Dynamically import posthog-js on first user interaction or after LCP
  useEffect(() => {
    async function capturePageview() {
      const ph = await ensurePostHog();
      if (!ph) return;
      ph.capture("$pageview", { $current_url: getCurrentUrl(pathname) });
    }

    if (initialized) {
      capturePageview();
      return;
    }

    // Defer until interaction (guarantees LCP isn't blocked)
    const onInteraction = () => {
      window.removeEventListener("pointerdown", onInteraction);
      window.removeEventListener("keydown", onInteraction);
      capturePageview();
    };
    window.addEventListener("pointerdown", onInteraction, { once: true });
    window.addEventListener("keydown", onInteraction, { once: true });

    // Fallback: init after 8 seconds even without interaction
    const fallback = setTimeout(() => {
      window.removeEventListener("pointerdown", onInteraction);
      window.removeEventListener("keydown", onInteraction);
      capturePageview();
    }, 8000);

    return () => clearTimeout(fallback);
  }, [pathname]);

  return children;
}
