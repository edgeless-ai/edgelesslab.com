# Performance Audit — Edgeless Lab (edgelesslab.com)
## Cycle 2, Phase: assess | 2026-06-02

## Site Profile

| Attribute | Value |
|-----------|-------|
| Framework | Next.js 16.2 (static export) |
| Hosting | GitHub Pages (CDN: Fastly) |
| Build tool | Turbopack |
| CSS | Tailwind v4 |
| Page weight | 94KB HTML + 1.4MB JS + 151KB fonts = ~1.6MB |
| JS chunks | 30 files in `.next/static/chunks/` |

## What's Already Good

The site has solid fundamentals — someone's done the basics:

- Critical CSS inlined in `<head>` (reset, CSS vars, hero styles, nav, skip-link)
- Preconnect hints to fonts.gstatic.com, PostHog, Gumroad
- DNS prefetch to GitHub
- OG image preloaded as LCP resource with fetchPriority=high
- `content-visibility: auto` on below-fold sections
- Skip-to-content link for accessibility
- CSP headers configured
- JSON-LD structured data for SEO
- RSS feed at `/feed.xml`
- Respects `prefers-reduced-motion`
- Zero image tags on homepage (avoids image weight, but also a missed opportunity)

## Priority Issues

### P0: 1.4MB JavaScript bundle

This is the dominant performance bottleneck. A static content site should ship <200KB JS. The 1.4MB comes almost entirely from client-side animation libraries:

| Library | Est. Weight | Used For |
|---------|------------|----------|
| framer-motion | ~350KB gzipped | ScrollReveal wrappers, page transitions |
| @chenglou/pretext | ~200KB | KineticPreText, PreTextRichFlow, PreTextOrbs, StaggerReveal |
| lucide-react | ~150KB tree-shaken | ArrowRight, ArrowUpRight icons |
| AnimatedText | ~80KB | Hero headline animation |
| GenerativeHeroBackground | ~120KB | Canvas-based hero background |
| GenerativeAscii | ~80KB | ASCII art animation |
| GlowingCard | ~60KB | Card hover effects |
| posthog-js | ~180KB | Analytics |

**Diagnosis**: Every animation on the page requires JavaScript execution, not just CSS. The `"use client"` boundary in `home-client.tsx` pulls ALL these deps into the initial bundle.

**Options**:
1. **(Recommended)** Move hero animations to CSS (keyframes already in critical CSS) — removes framer-motion + pretext deps from critical path
2. **Dynamic import** heavy components below the fold so they don't block LCP
3. **Replace framer-motion** with CSS animations / `@keyframes` for reveal animations

### P1: External font loading from two providers

- **Geist** (next/font) → loads from Google Fonts CDN
- **11 woff2 files** total, ~151KB

Geist via next/font already auto-inlines the CSS link, but each woff2 requires a separate HTTP request. Self-hosting would eliminate the external connection entirely.

### P2: PostHog analytics loads on every page visit

PostHog-js (~180KB) is loaded universally via the `PostHogProvider` component. For a content site where ~80% of visitors bounce from the homepage, this is wasted bandwidth.

**Fix**: Defer PostHog initialization to post-LCP or first user interaction.

### P3: No visual content on homepage

The homepage is entirely text and code snippets. Adding project screenshots, product images, or generative art frames would:
- Improve engagement (visual hierarchy)
- Increase time-on-page
- Provide LCP opportunities with properly optimized images
- Reduce perceived reliance on JS animations for visual interest

### P4: 30 JS chunks create unnecessary HTTP overhead

Even on HTTP/2, 30 separate JS files means 30 round-trips to resolve. This is a Turbopack chunking artifact. Reducing to ~3-5 chunks via manual code-splitting or chunk configuration would improve load.

## Quick Wins (can ship today)

1. **Lazy-load PostHog** — change to `dynamic(() => import('./posthog-provider'), { ssr: false })` and init on first click/scrolling past hero
2. **Replace ScrollReveal with CSS** — all ScrollReveal wrappers animate `fadeInUp` which is already defined in critical CSS. Replace `<ScrollReveal>` with `<div className="animate-fade-in">` — eliminates framer-motion from those sections
3. **Dynamic import hero-heavy components** — `GenerativeHeroBackground` and `GenerativeAscii` can be deferred until after LCP with `next/dynamic`

## Recommendations

1. CSS-first animation: Replace framer-motion with CSS keyframes (already partially in critical CSS)
2. Self-host fonts: Download Geist woff2 files, serve from `/fonts/`
3. Defer analytics: Init PostHog post-LCP or on first interaction
4. Add visual content: Screenshots of actual products/projects
5. Configure chunk grouping: `experimental.turbopack.codeSplitting` or manual dynamic imports

## Next Steps

- [ ] Open subtask: Move animations to CSS (remove framer-motion dependency)
- [ ] Open subtask: Defer PostHog to post-LCP
- [ ] Open subtask: Self-host fonts
- [ ] Open subtask: Add hero image/Screenshot component
