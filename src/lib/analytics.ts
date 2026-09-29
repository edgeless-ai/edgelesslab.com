import { captureConsentedEvent, getConsentedAnonymousId, hasAnalyticsConsent } from "./analytics-consent";

const INGEST_URL = process.env.NEXT_PUBLIC_INGEST_URL || "/ingest";

export function trackCTA(name: string, destination?: string) {
  void captureConsentedEvent("cta_clicked", { cta_name: name, destination });
}

function trackIntent(event: string, properties: Record<string, unknown>) {
  if (typeof window === "undefined" || !hasAnalyticsConsent()) return;
  const payload = { ...properties, anonymous_id: getConsentedAnonymousId(), page_url: window.location.origin + window.location.pathname };
  const sent = typeof navigator.sendBeacon === "function" &&
    navigator.sendBeacon(`${INGEST_URL}?e=${encodeURIComponent(event)}`, JSON.stringify(payload));
  if (!sent) void captureConsentedEvent(event, payload);
}

export function trackPurchase(product: string, price?: string) {
  trackIntent("purchase_initiated", { product_name: product, price });
}

export function trackServiceCTA(name: string, destination: string) {
  trackIntent("service_cta_clicked", { cta_name: name, destination });
  trackCTA(name, destination);
}
