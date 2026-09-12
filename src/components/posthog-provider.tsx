"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AnalyticsConsentPanel } from "@/components/analytics-consent-panel";
import { captureConsentedEvent, CONSENT_CHANGED_EVENT, CONSENT_STORAGE_KEY, reconcileAnalyticsConsent } from "@/lib/analytics-consent";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    function sync() {
      if (reconcileAnalyticsConsent()) {
        window.location.reload();
        return;
      }
      void captureConsentedEvent("$pageview", {
        $current_url: window.location.origin + (pathname || window.location.pathname),
      });
    }
    function onStorage(event: StorageEvent) {
      if (event.key === CONSENT_STORAGE_KEY || event.key === null) {
        // Use the event value so a rapid reject/reaccept in another tab still
        // invalidates work from the earlier consent session.
        reconcileAnalyticsConsent(event.newValue === "accepted" ? "accepted" : event.newValue === "rejected" ? "rejected" : null);
        sync();
      }
    }
    sync();
    window.addEventListener(CONSENT_CHANGED_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CONSENT_CHANGED_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, [pathname]);

  return <>{children}<AnalyticsConsentPanel /></>;
}
