import posthog from "posthog-js";

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window !== "undefined") {
    posthog.capture(event, properties);
  }
}

export function trackCTA(name: string, destination?: string) {
  trackEvent("cta_clicked", { cta_name: name, destination });
}

export function trackProductView(product: string) {
  trackEvent("product_viewed", { product_name: product });
}

export function trackOutboundLink(url: string, label?: string) {
  trackEvent("outbound_link_clicked", { url, label });
}
