/** Performance Preload Component */

export function PerformancePreload() {
  return (
    <>
      <link
        rel="preload"
        href="/fonts/critical.css"
        as="style"
        crossOrigin="anonymous"
      />
      <link
        rel="preload"
        href="/og-image.webp"
        as="image"
        type="image/webp"
        fetchPriority="high"
      />
      <link rel="preconnect" href="https://edgelesslab.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://us.i.posthog.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://github.com" />
      <link rel="dns-prefetch" href="https://us.i.posthog.com" />
    </>
  );
}
