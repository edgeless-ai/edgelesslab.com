export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  // Lazy-load PostHog so importing this module doesn't bloat the main JS bundle.
  void import("posthog-js").then(({ default: posthog }) => {
    posthog.capture(event, properties);
  });
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

export function trackPurchaseInitiated(product: string, priceCents: number, provider: string) {
  trackEvent("purchase_initiated", { product_name: product, price_cents: priceCents, provider });
}
