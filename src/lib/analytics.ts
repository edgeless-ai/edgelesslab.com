export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  import("posthog-js").then(({ default: posthog }) => {
    posthog.capture(event, properties);
  });
}

export function trackCTA(name: string, destination?: string) {
  trackEvent("cta_clicked", { cta_name: name, destination });
}

export function trackProductView(product: string) {
  trackEvent("product_viewed", { product_name: product });
}

export function trackPurchaseInitiated(product: string, priceCents: number, provider: string) {
  trackEvent("purchase_initiated", { product_name: product, price_cents: priceCents, provider });
}
