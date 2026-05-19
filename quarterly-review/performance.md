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

## 8. Lighthouse Scores -- NEEDS MEASUREMENT

No Lighthouse data collected yet this quarter. Need to run on:
- Homepage
- /products
- /blog
- /lab
- One blog post (e.g., /blog/envelope-protocol-multi-agent-coordination/)

**Target**: 95+ across Performance, Accessibility, Best Practices, SEO.

PostHog Web Vitals data may already have CWV baselines -- check dashboard.

---

## Fix Priority

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 1 | Move playwright to devDependencies | 2min | Removes 200MB from dep tree |
| 2 | Convert images to WebP | 30min | 30-50% size reduction |
| 3 | Add width/height to img tags | 15min | Prevents CLS |
| 4 | Run Lighthouse baseline | 15min | Establishes metrics |
| 5 | Check PostHog Web Vitals dashboard | 5min | Real user CWV data |
