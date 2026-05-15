/**
 * Performance Preload Component
 * 
 * Critical resource hints to improve LCP and reduce blocking time:
 * - Preconnect to critical origins
 * - DNS prefetch for non-critical
 * - Preload critical fonts (Geist is loaded via next/font, no preload needed)
 * - Preload optimized WebP images for product pages
 * - Critical CSS inlining for above-fold content
 * - Fetch priority hints for LCP resources
 */

export function PerformancePreload() {
  return (
    <>
      {/* Preconnect to critical origins */}
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://edgelesslab.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://us.i.posthog.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://edgelessai.gumroad.com" crossOrigin="anonymous" />
      
      {/* DNS prefetch for additional origins */}
      <link rel="dns-prefetch" href="https://github.com" />
      <link rel="dns-prefetch" href="https://us.i.posthog.com" />
      
      {/* Preload critical WebP images with HIGH priority for LCP */}
      <link rel="preload" href="/og-image.webp" as="image" type="image/webp" fetchPriority="high" />
      
      {/* Preconnect to Google Fonts for faster font loading */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      
      {/* Critical CSS for above-fold content - inlined to eliminate render-blocking stylesheet */}
      <style dangerouslySetInnerHTML={{ __html: CRITICAL_CSS }} />
    </>
  );
}

/**
 * Critical CSS for above-the-fold content
 * This eliminates render-blocking by inlining essential styles
 */
const CRITICAL_CSS = `
/* CSS Reset & Base */
*,*::before,*::after{box-sizing:border-box}
html{color-scheme:dark only}
body{margin:0;min-height:100vh;font-family:var(--font-geist-sans),system-ui,sans-serif;background:#09090B;color:#FAFAFA;line-height:1.5;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}

/* CSS Variables */
:root{--bg-base:#09090B;--bg-surface:#111113;--bg-surface-hover:#1A1A1F;--bg-elevated:#1E1E23;--border-subtle:rgba(255,255,255,0.08);--border-focus:rgba(255,255,255,0.15);--text-primary:#FAFAFA;--text-secondary:rgba(255,255,255,0.72);--text-tertiary:rgba(255,255,255,0.55);--accent:#6367D8;--accent-hover:#8C95E8;--accent-muted:rgba(99,103,216,0.12);--green:#34D399;--green-muted:rgba(52,211,153,0.12);--ease-out:cubic-bezier(0.16,1,0.3,1)}

/* Critical Hero Styles - Above the fold */
.hero-section{position:relative;display:flex;min-height:92svh;align-items:center;padding:112px 24px 64px}
@media(min-width:768px){.hero-section{min-height:100vh;align-items:flex-end;padding:128px 24px 96px}}

/* Typography - Critical for LCP */
.text-primary{color:var(--text-primary)}.text-secondary{color:var(--text-secondary)}.text-tertiary{color:var(--text-tertiary)}
.font-mono{font-family:var(--font-geist-mono),ui-monospace,monospace}

/* Status Badge */
.status-badge{display:inline-flex;align-items:center;gap:10px;margin-bottom:32px;padding:6px 12px;border-radius:9999px;border:1px solid rgba(52,211,153,0.25);background:rgba(52,211,153,0.06)}
.status-dot{position:relative;display:flex;height:8px;width:8px}
.status-dot-inner{position:relative;display:inline-flex;height:100%;width:100%;border-radius:9999px;background:var(--green)}
.status-dot-ping{position:absolute;display:inline-flex;height:100%;width:100%;border-radius:9999px;background:var(--green);opacity:0.6;animation:ping 1s cubic-bezier(0,0,0.2,1) infinite}
@keyframes ping{75%,100%{transform:scale(2);opacity:0}}
.status-text{font-size:11px;font-family:var(--font-geist-mono),ui-monospace,monospace;text-transform:uppercase;letter-spacing:0.14em;color:var(--green)}

/* Headline */
.headline{font-size:clamp(2.5rem,5vw,4.5rem);font-weight:700;line-height:1.05;letter-spacing:-0.02em;margin:0 0 24px}

/* Subtitle */
.subtitle{font-size:clamp(1rem,1.5vw,1.125rem);line-height:1.6;color:var(--text-secondary);margin:0 0 32px;max-width:600px}

/* CTA Buttons */
.cta-group{display:flex;flex-wrap:wrap;gap:12px}
.cta-primary{display:inline-flex;align-items:center;gap:8px;height:44px;padding:0 24px;border-radius:9999px;font-size:14px;font-weight:500;color:white;background:var(--accent);text-decoration:none;transition:all 0.15s var(--ease-out)}
.cta-primary:hover{filter:brightness(1.1);transform:scale(1.02)}
.cta-secondary{display:inline-flex;align-items:center;gap:8px;height:44px;padding:0 24px;border-radius:9999px;font-size:14px;font-weight:500;color:var(--text-secondary);border:1px solid var(--border-subtle);text-decoration:none;transition:all 0.15s var(--ease-out)}
.cta-secondary:hover{color:white}

/* Animation keyframes for hero content */
@keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeInUpSimple{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.animate-fade-in{animation:fadeInUp 0.5s var(--ease-out) both}
.animate-fade-in-delay-1{animation:fadeInUp 0.5s var(--ease-out) 0.1s both}
.animate-fade-in-delay-2{animation:fadeInUp 0.5s var(--ease-out) 0.2s both}
.animate-fade-in-delay-3{animation:fadeInUpSimple 0.6s var(--ease-out) 0.3s both}

/* Navigation - Critical for layout stability */
.nav{position:fixed;top:0;left:0;right:0;z-index:50;padding:16px 24px;background:linear-gradient(to bottom,rgba(9,9,11,0.9),transparent);backdrop-filter:blur(8px)}
.nav-inner{display:flex;align-items:center;justify-content:space-between;max-width:1280px;margin:0 auto}
.nav-logo{font-size:1.125rem;font-weight:700;color:var(--text-primary);text-decoration:none}
.nav-links{display:flex;align-items:center;gap:24px}
.nav-link{font-size:14px;color:var(--text-secondary);text-decoration:none;transition:color 0.15s}
.nav-link:hover{color:var(--text-primary)}

/* Reduce motion preference respected */
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important}}

/* Content visibility for below-fold sections */
.content-section{content-visibility:auto;contain-intrinsic-size:0 500px}

/* Skip link */
.skip-link{position:absolute;left:-9999px;z-index:100;padding:8px 16px;border-radius:9999px;font-size:14px;font-weight:500;color:white;background:var(--accent)}
.skip-link:focus{position:absolute;left:16px;top:16px}
`;
