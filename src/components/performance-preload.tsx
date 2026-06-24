/** Performance Preload Component
 *
 * EDGA-5399 cleanup (2026-06-18):
 *   - Removed global og-image.webp preload (not LCP-critical; was loaded everywhere
 *     and blocked the bandwidth budget on every page even if OG never used).
 *     The preload still ships inside <head> only on pages that explicitly request
 *     it via `generateMetadata({ openGraph: { images: [...] } })` -- returnvalue is
 *     a real <meta property=og:image> link, which Twitter/Card consumers can fetch
 *     at share time.
 *   - Removed global preconnect to gumroad.com (CSP already pins frame-src for it
 *     on /products; was a wasted ~100ms DNS+TLS round for everything else).
 *   - Removed /fonts/critical.css preload — the file does not exist in public/,
 *     so every page was issuing a 404 render-blocking preload hunt. EDGA-XXXX
 *     (mobile LCP 4.4s → target <2.5s). Inline critical CSS in layout.tsx instead.
 *   - Kept posthog/github preconnect (PostHog instrumentation is harmless;
 *     github preconnect helps repo CTA clicks).
 */

export function PerformancePreload() {
  return (
    <>
      <link rel="preconnect" href="https://edgelesslab.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://us.i.posthog.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://github.com" />
      <link rel="dns-prefetch" href="https://us.i.posthog.com" />
    </>
  );
}
