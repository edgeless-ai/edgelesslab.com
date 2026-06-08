import posthog from "posthog-js";

const INGEST_URL = process.env.NEXT_PUBLIC_INGEST_URL || "/ingest";

function ingestUrl(event: string) {
  return `${INGEST_URL}?e=${encodeURIComponent(event)}`;
}

function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window !== "undefined") {
    posthog.capture(event, properties);
  }
}

export function trackCTA(name: string, destination?: string) {
  trackEvent("cta_clicked", { cta_name: name, destination });
}

function trackProductView(product: string) {
  trackEvent("product_viewed", { product_name: product });
}

export function trackPurchase(product: string, price?: string) {
  const url = typeof window !== "undefined" ? window.location.href : undefined;
  // navigator.sendBeacon fires even during page/unload navigation
  const payload = JSON.stringify({ product_name: product, price, page_url: url });
  const beaconOk =
    typeof navigator !== "undefined" &&
    typeof navigator.sendBeacon === "function" &&
    navigator.sendBeacon(ingestUrl("purchase_initiated"), payload);
  if (!beaconOk) {
    trackEvent("purchase_initiated", { product_name: product, price, page_url: url });
  }
}

function trackOutboundLink(url: string, label?: string) {
  trackEvent("outbound_link_clicked", { url, label });
}
