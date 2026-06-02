# Performance Audit: edgelesslab.com
**Date**: 2026-06-02
**Tooling**: Browser-based Navigation + Resource Timing API
**Test environment**: Browserbase headless Chrome
**URL**: https://edgelesslab.com

---

## Summary

| Metric | Value | Target | Verdict |
|--------|-------|--------|---------|
| FCP | 1188ms | <1000ms | Needs work |
| DOM Content Loaded | 1049ms | <800ms | Needs work |
| Full Page Load | 1142ms | <1000ms | Close |
| Server Response | 569ms | <500ms | Good |
| HTML Size | 100KB (91KB decoded) | <50KB | Heavy |
| Total Transfer | 648KB | <300KB | Over budget |
| Total Resources | 68 | <30 | Too many |
| JS Bundle | 397KB (18 scripts) | <150KB | Heavy |
| RSC Fetches | 43 requests, 150KB | <10 | Excessive |

---

## Detailed Findings

### 1. JavaScript Bundle: 397KB across 18 scripts

The single largest contributor to load cost. Next.js chunk splitting produces many small files (good for caching) but the **total JavaScript payload is too heavy for a primarily static content site**.

Top chunks:
- 108KB — main app chunk
- 72KB — framework/vendor chunk
- 57KB — component chunk
- 39KB — chunk
- 13–10KB — 14 more chunks

**Impact**: Blocks FCP, delays interaction. Every script must be parsed, compiled, and executed.

### 2. RSC (React Server Components) Prefetching: 43 requests, 150KB

Next.js is aggressively prefetching RSC payloads for every linked route:
- `/blog/` RSC: 97KB
- `/products/` RSC: 6KB
- `/products/launch-toolkit/` RSC: 4KB
- `/projects/` RSC: 4KB
- `/lab/` RSC: 4KB
- etc.

**Impact**: Bandwidth wasted on routes the user may never visit. Increased data consumption on mobile.

### 3. Server Response Time: 569ms

Acceptable but could be improved. GitHub Pages static hosting limits server-side optimization options.

### 4. Canvas Animations: 2 canvases on homepage

Background particle grid + ASCII art canvas. These run immediately on page load, competing with critical content for main thread time. No lazy loading.

### 5. Font Loading: 2 woff2 files, ~60KB total

Geist Sans + Geist Mono. Self-hosted with preload — good practice. Could be `font-display: swap` optimized.

### 6. CSS: 17KB single bundle

Tailwind-generated CSS with PurgeCSS. This is already well-optimized — minimal overhead.

### 7. Images: No `<img>` tags on homepage

OG image (14KB) preloaded as image. Good — no extra image weight on homepage.

---

## Optimization Recommendations

### P0: Critical (Biggest Impact)

| # | Task | Est. Savings | Difficulty | File/Scope |
|---|------|-------------|------------|------------|
| 1 | **Reduce JS bundle size** — route-based code splitting, dynamic imports for heavy components (canvas, animations) | -200KB JS | Medium | `app/layout.tsx`, component files |
| 2 | **Disable aggressive RSC prefetching** — use `<Link prefetch={false}>` or `router.prefetch()` selectively | -150KB BW | Easy | `app/page.tsx`, nav components |
| 3 | **Lazy-load canvas animations** — IntersectionObserver-based init for hero background and ASCII art canvases | -100ms FCP | Medium | Canvas components |

### P1: High Impact

| # | Task | Est. Savings | Difficulty | File/Scope |
|---|------|-------------|------------|------------|
| 4 | **Implement font-display: swap** for both Geist fonts | -200ms FCP | Easy | CSS/font-face declarations |
| 5 | **Add resource hints** — `<link rel="preload">` for critical CSS, `<link rel="modulepreload">` for main app chunk | -100ms LCP | Easy | `app/layout.tsx` |
| 6 | **Reduce HTML size** — inline critical CSS, defer non-critical, minimize inline `<style>` blocks | -40KB HTML | Medium | `app/layout.tsx` |

### P2: Medium Term

| # | Task | Est. Savings | Difficulty | File/Scope |
|---|------|-------------|------------|------------|
| 7 | **Implement PWA / Service Worker** — cache static assets, RSC payloads, enable offline mode | Future-proof | Medium | New `sw.ts` |
| 8 | **Bundle analysis + tree shaking** — run `next/bundle-analyzer`, remove unused components | -50KB JS | Easy | Build config |
| 9 | **Lighthouse CI integration** — automated performance regression detection | Preventative | Medium | GitHub Actions |

### P3: Polish

| # | Task | Est. Savings | Difficulty | File/Scope |
|---|------|-------------|------------|------------|
| 10 | **Preload OG image** (already done) + add preload for hero-critical assets | Maintain | Already done | — |
| 11 | **Image optimization** — next/image for blog posts, auto-WebP, lazy loading | Variable | Medium | Blog components |

---

## Implementation Priority

1. **P0 items first** — biggest bang for buck
2. **P1 next** — easy wins with high impact
3. **P2** — takes more effort, good for next sprint
4. **P3** — incremental polish

Each optimization should be measured before/after with the same browser-based timing API to verify improvement.

---

## Resource Timeline (Current)

```
569ms  ─ Server response end
1049ms ─ DOM interactive / DOMContentLoaded
1142ms ─ Full page load
1188ms ─ First Contentful Paint
```

Target after P0+P1 optimizations:
```
<300ms  ─ Server response end (with CDN caching)
<600ms  ─ DOM interactive
<800ms  ─ Full page load
<800ms  ─ FCP
```
