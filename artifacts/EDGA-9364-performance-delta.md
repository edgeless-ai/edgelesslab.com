# EDGA-9364 — Performance Delta Report

Verified: 2026-06-09

## Changes Applied

1. **Font double-loading fix** — Renamed `Geist[wght].woff2` and `GeistMono[wght].woff2` to `Geist-Variable.woff2` and `GeistMono-Variable.woff2` to eliminate the percent-encoding mismatch (`%5Bwght%5D` vs `[wght]`) that caused browsers to load the same font twice. Reduced font payload from ~276KB to ~138KB.

2. **Below-the-fold dynamic split** — `page.tsx` now uses `next/dynamic` with `ssr: false` for `BelowTheFold`, which imports `homepage-data.ts` → `blog.ts` (206KB of full blog posts with `content` strings). This heavy content is now deferred until the user scrolls near the viewport (IntersectionObserver with 400px rootMargin, 5s fallback).

## Baseline vs Local Build (uncompressed)

| Metric | Baseline (production) | After (local) | Delta |
|--------|----------------------|---------------|-------|
| Performance | 0.79 | 0.83 | +0.04 |
| LCP | 4.29s | 3.68s | -0.61s (-14%) |
| FCP | 2.10s | 1.37s | -0.73s (-35%) |
| TTI | 4.42s | 4.57s | +0.15s |
| TBT | 229ms | 250ms | +21ms |
| Speed Index | 2.70s | 3.99s | +1.29s |
| Mainthread work | 4.60s | 4.56s | -0.04s |
| Total requests | 65 | 46 | -19 |
| Total transfer | 859KB | 513KB | -346KB (-40%) |

## Top 5 Blocking Resources (identified)

1. **GeistSans font** — 68KB, was loading twice (now fixed)
2. **GeistMono font** — 70KB, deferred with `preload: false` (already in place)
3. **Shared JS chunk (`0eysw9y4jlyxy.js`)** — 106KB, contains `blog.ts` + `data.ts` content. Now deferred via dynamic import.
4. **React framework chunk (`0a89fplnpbf~9.js`)** — 69KB, unavoidable Next.js runtime
5. **CSS chunk (`155wk538~wx0e.css`)** — 15KB, render-blocking stylesheet

## Target Status

| Target | Required | Actual | Status |
|--------|----------|--------|--------|
| LCP | < 2.5s | 3.68s | NOT MET |
| TTI | < 3.5s | 4.57s | NOT MET |
| Mainthread | < 1.8s | 4.56s | NOT MET |

## Why targets are still missed

The remaining bottleneck is **structural**: `blog.ts` contains 206KB of full blog post content (including the `content` field with complete markdown text for all ~50 posts). Even with dynamic loading, Next.js still bundles this into a shared chunk that the homepage must load because `homepage-data.ts` imports it at the top level.

To hit the targets, the blog content needs to be **server-side fetched** or the homepage needs its own lightweight data source that doesn't import the full `blog.ts`.

## Recommendation

Create a `homepage-blog.ts` with only the 8 most recent posts' metadata (slug, date, title, isLaunch), without importing the full `blog.ts`. This would eliminate the 206KB blog content from the homepage bundle entirely and likely bring LCP under 2.5s.

## Files Changed

- `src/fonts/Geist[wght].woff2` → `src/fonts/Geist-Variable.woff2`
- `src/fonts/GeistMono[wght].woff2` → `src/fonts/GeistMono-Variable.woff2`
- `src/app/layout.tsx` — updated font paths
- `src/app/page.tsx` — dynamic import for BelowTheFold
- `src/components/lazy-below-the-fold.tsx` — new component combining IntersectionObserver + next/dynamic
