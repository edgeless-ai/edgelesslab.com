"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { AnalyticsConsentPanel } from "@/components/analytics-consent-panel";
import { captureConsentedEvent, CONSENT_CHANGED_EVENT, CONSENT_STORAGE_KEY, hasAnalyticsConsent, reconcileAnalyticsConsent } from "@/lib/analytics-consent";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lastPageview = useRef<string | null>(null);

  useEffect(() => {
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    function sync() {
      if (reconcileAnalyticsConsent()) {
        window.location.reload();
        return;
      }
      if (!hasAnalyticsConsent()) {
        lastPageview.current = null;
        return;
      }
      const url = window.location.origin + (pathname || window.location.pathname);
      if (lastPageview.current !== url) {
        lastPageview.current = url;
        void captureConsentedEvent("$pageview", { $current_url: url, site: "main" });
      }
    }

    function onStorage(event: StorageEvent) {
      if (event.key === CONSENT_STORAGE_KEY || event.key === null) {
        sync();
      }
    }

    function onCookiePoll() {
      sync();
    }

    function onReveal() {
      sync();
    }

    sync();
    window.addEventListener(CONSENT_CHANGED_EVENT, sync);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onReveal);
    window.addEventListener("pageshow", onReveal);
    pollTimer = setInterval(onCookiePoll, 1000);
    return () => {
      window.removeEventListener(CONSENT_CHANGED_EVENT, sync);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onReveal);
      window.removeEventListener("pageshow", onReveal);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [pathname]);

  return <>{children}<AnalyticsConsentPanel /></>;
}