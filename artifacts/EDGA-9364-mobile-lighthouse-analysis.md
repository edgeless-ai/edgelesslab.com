# EDGA-9364 — Mobile Lighthouse Baseline

Verified date: 2026-06-09

## Metric Baseline (mobile)
- Largest Contentful Paint: 4.1 s
- First Contentful Paint: 2.1 s
- Total Blocking Time: 110 ms
- Time to Interactive: 4.4 s
- Speed Index: 2.7 s

## Identified Blockers
- Font payload weight remains elevated (Geist variable woff2 via `next/font/local`, 100-900 axis).
- Early chunk JS cost needs package-import trimming beyond what `optimizePackageImports` covers.
- Above-fold paint is serialized on heavy client-side visual modules in the hero.

## Completed Patches
- Lazy-load `GenerativeHeroBackground` + `GenerativeAscii` with null loading states.
- Enable `optimizePackageImports: ["lucide-react"]` in `next.config.ts`.

## Next Actions
- Re-measure Lighthouse after applying font/og-image tightening.
- Measure bundle composition for early chunks.