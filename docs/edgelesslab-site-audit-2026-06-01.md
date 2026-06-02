# Edgelesslab.com Audit - 2026-06-01

## Executive Summary

The live site is visually strong and has real depth, but it currently reads less trustworthy than the underlying work because several claims drift across pages, the pen-plotter field notes depend on asset folders too large for GitHub Pages, and the blog/product narrative repeats numbers without a single visible source of truth.

Priority order:

1. Keep the pen-plotter field notes deployable by using thumbnails plus a small featured image set until R2 is configured.
2. Normalize headline numbers from source constants instead of hard-coded prose.
3. Convert existing project notes into field notes before writing net-new marketing pages.
4. Fix the build/lint baseline so deployment failures are obvious and not buried under unrelated errors.

## Fixed In This Pass

- Replaced `pen-plotter/index.html` hard-coded `assets/mediums-all/*` images with `assets/featured/*`.
- Changed pen-plotter and addendum lightboxes to use deployable thumbnail assets instead of missing medium folders.
- Added `pen-plotter/assets/featured/` with 18 selected editorial images.
- Updated `package.json` postbuild to remove `out/pen-plotter/assets/medium` and `out/pen-plotter/assets/mediums-all` after copying assets.
- Pinned `next.config.ts` Turbopack root to this repo so Next stops inferring `/Users/djm` as the workspace root.

Result: local trimmed `out/` is about `243M`; before trimming it was about `1.2G`.

## Claim Drift

These should be reconciled before more promotion:

- Pen plotter count drift:
  - `pen-plotter/assets/stats.js`: `41,572` pieces, `39,414` kept, `1,296` curated.
  - Fixed this pass: `pen-plotter/index.html` metadata and fallback counts now say `41,572`.
  - Fixed this pass: `pen-plotter/kandinsky-to-canvas.html` now says `41,572`.
  - `pen-plotter/README.md` says `21,700+`.
- Total Serialism count drift:
  - `src/lib/data.ts` says `98 interactive generators`.
  - `src/lib/blog.ts` has a post titled `96 Algorithms, One Constraint`.
- Product catalog drift:
  - Homepage/product copy says `18 products, all free`.
  - Older blog copy says prices from Free to `$39` and total catalog value `$423`.
- Operations claims needing receipts:
  - `0 incidents this week`.
  - `5 agents 24/7`.
  - `3+ months of production use`.
  - `4 services 24/7`.
  - `8,000+ tasks without a manual restart`.

Recommended rule: every number above the fold should either come from `src/lib/*-stats.ts` or be downgraded to softer language.

## Blog Gaps

The blog has strong posts, but it feels sparse because the best work is hidden in project/lab pages and standalone experiments.

Good field-note candidates from existing material:

- Pen plotter asset/deployment post: why GitHub Pages could serve thumbnails but not the medium corpus, and the R2 migration plan.
- Pen plotter judging post: what the scoring loop rewards incorrectly, using the `88.3 vs 1.8` VLM-judge anecdote.
- Total Serialism taxonomy post: reconcile 96/98 and publish the algorithm-family map.
- Tartanism field note: six weave structures, 48 colors, WIF export, and where tartan stops being plaid.
- Build-system field note: static export, standalone apps under Next, and why artifact budgets become product constraints.
- Claim-ledger post: how the site now treats numbers as product data, not copy.

## Build Health

Verification status:

- Asset reference check passed for source pen-plotter pages.
- Asset reference check passed for local trimmed `out/pen-plotter`.
- `npm run build` still stalls at `Generating static pages (18/72)`.
- `npm run lint` fails on pre-existing broad lint debt, including generated standalone assets and React lint errors in unrelated components/pages.

Next build-health task:

- Isolate the static-generation hang by running route-level builds or temporarily excluding standalone app output.
- Narrow ESLint scope or ignore generated standalone bundles (`tartanism/app/assets`, `.standalone-stash`, exported experiment bundles), then address real `src/` errors separately.
