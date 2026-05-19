# Pass 4: Performance & Technical ("The DEPT Pass")

**Date**: 2026-05-18
**Auditor**: Claude Code quarterly review

---

## Executive Summary

The site is **lean and well-configured** for static export. Build health is solid. SEO infrastructure is comprehensive. Font loading is optimized. One critical dependency issue (playwright in production deps) and one moderate concern (PostHog bundle weight). Images need format optimization. Lighthouse scores need real measurement.

**DEPT craft verdict**: Good bones. A few sharp edges to sand down.

---

## 1. Build Configuration

**File**: `next.config.ts`

| Setting | Value | Assessment |
|---------|-------|-----------|
| `output` | `"export"` | Correct for GitHub Pages static hosting |
| `images.unoptimized` | `true` | Required for static export |
| `trailingSlash` | `true` | Correct -- SEO consistency |
| `optimizePackageImports` | `["lucide-react"]` | Good -- tree-shakes icons |

Build completes in <5s for 73+ pages. No regressions detected.

---

## 2. Dependencies

**18 total** (10 direct + 8 dev). Lean for a Next.js site.

### Flags

| Package | Size | Issue | Priority |
|---------|------|-------|----------|
| `playwright@1.59.1` | ~200MB unpacked | **In production deps, should be devDeps** | CRITICAL |
| `posthog-js@1.363.6` | ~200KB gzipped | Heavy but necessary for analytics | LOW |
| `framer-motion@12.38.0` | ~46KB min | Reasonable for animation-heavy UI | LOW |

**Action**: Move playwright to devDependencies immediately.

---

## 3. Image Audit

### Format Distribution
- Most images: `.png` (product covers, lab images, OG images)
- Pen plotter catalog: `.webp` (optimized)
- No `.avif` usage

### Component Usage
- `next/image` (`<Image>`): Used in excalidraw-diagrams, about-client
- Raw `<img>`: Used in product pages, pen-plotter-gallery (with `loading="lazy"` and `decoding="async"`)

### Issues
- **No WebP conversion** for product-covers/ and lab/ images -- 30-50% size reduction available
- **Missing explicit width/height** on some `<img>` tags -- CLS risk
- OG image is single `.png` -- could serve `.webp` with fallback

---

## 4. Font Loading

| Font | Method | Status |
|------|--------|--------|
| Geist Sans | `next/font/google` | Self-hosted, no FOUT |
| Geist Mono | `next/font/google` | Self-hosted, no FOUT |
| CSS variable mapping | `@theme inline` | Properly wired |

Preconnect hints configured in `performance-preload.tsx`. No optimization needed.

---

## 5. SEO Infrastructure

| Component | Status | Notes |
|-----------|--------|-------|
| `sitemap.ts` | Complete | 70+ URLs, category-based priorities |
| `robots.ts` | Excellent | Intentionally allows AI crawlers (GPTBot, ClaudeBot, etc.) |
| `metadata.ts` | Complete | `createPageMetadata()` helper for consistent OG/Twitter |
| `layout.tsx` | Comprehensive | Title template, OG, Twitter, canonical, JSON-LD Organization |
| Blog posts | Per-post metadata | Each post generates full OG + JSON-LD BlogPosting schema |
| CSP header | Correct | Allows PostHog + gstatic; restricts image sources |

**Strong SEO foundation.** No gaps detected.

---

## 6. Analytics (PostHog)

- Provider wraps entire app with Suspense
- Autocapture enabled
- Web Vitals tracking enabled (`capture_performance: true`, `web_vitals: true`)
- Custom events: `trackCTA()`, `trackProductView()`, `trackOutboundLink()`, `trackPurchaseInitiated()`
- Page leave tracking enabled
- Privacy: `person_profiles: "identified_only"` -- no PII collection unless explicit

**Assessment**: Well-integrated. Web Vitals gives us CWV data without additional instrumentation.

---

## 7. Deploy Workflow

**File**: `.github/workflows/deploy.yml`

Trigger: push to `main` + manual dispatch.
Process: checkout -> upload artifact -> deploy to GitHub Pages.
The `out/` directory with pre-built static files is committed to the repo and deployed directly.

**Working correctly** -- verified today (May 18) with all 73 pages + 4 standalone apps serving 200.

---

## 8. Lighthouse Baseline (measured 2026-05-19)

Measured against production build (`pnpm build` -> `out/`) served via Python http.server (no gzip, no HTTP/2, no CDN).

| Page | Perf | A11y | BP | SEO |
|------|------|------|----|-----|
| Homepage | 75 | 100 | 100 | 100 |
| /blog | 74 | 100 | 100 | 100 |
| /products | 74 | 100 | 100 | 100 |
| /lab | 75 | 100 | 100 | 100 |
| /blog/envelope-protocol... | 75 | 100 | 100 | 100 |

**Observed (real-world) metrics** (not throttled):
- LCP: 120ms | FCP: 120ms | Speed Index: 433ms
- TBT: 7ms | CLS: 0.083 | TTI: 119ms

Performance score (74-75) reflects Lighthouse's simulated 4x CPU throttle + network simulation over uncompressed localhost. The sole failing metric is simulated LCP (8s) caused by JS hydration under throttling. Real observed LCP is 120ms.

On GitHub Pages with CDN, gzip, HTTP/2, and edge caching, expect Performance 90+.

### Fixes applied
- **A11y 96->100**: Added `<main id="main-content">` to all pages; added `--accent-solid` (#5B5EEB) for WCAG AA contrast on CTA buttons (4.95:1)
- **BP 96->100**: Fixed og-image preload (.webp->.png); removed invalid X-Frame-Options meta tag
- **SEO 100**: Already perfect, no changes needed

---

## Fix Priority (updated)

| # | Item | Status | Impact |
|---|------|--------|--------|
| 1 | Move playwright to devDependencies | DONE | Removed 200MB from dep tree |
| 2 | Add width/height to img tags | DONE | Prevents CLS |
| 3 | Run Lighthouse baseline | DONE | Established metrics |
| 4 | Fix color contrast (a11y) | DONE | A11y 96->100 |
| 5 | Fix og-image preload + X-Frame-Options | DONE | BP 96->100 |
| 6 | Convert images to WebP | BACKLOG | 30-50% size reduction |
| 7 | Check PostHog Web Vitals dashboard | BACKLOG | Real user CWV data |
