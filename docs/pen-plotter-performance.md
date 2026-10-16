# Pen-plotter performance recovery

Task: t_594e869e. Base: cc7efbf85326cb8736a4cce55a1c3f0258cd4e59.

## Evidence-supported changes

- Local, nonblocking `fonts.css`, with preload and a no-JavaScript stylesheet fallback: removes the two render-blocking provider stylesheet hops.
- Same-origin font delivery: the original licensed JetBrains Mono subsets are bundled; original Boska files are fetched and SHA-256-verified during prebuild (not redistributed in git). This removes runtime provider variability without changing font families, styles, supported weights or glyph coverage. See `public/pen-plotter/fonts/README.md`.
- Defer `assets/stats.js`: retains DOMContentLoaded statistics behavior while removing parser blocking.
- Intrinsic dimensions on 21 static images and lazy/async decoding on 20 below-fold images; lead artwork stays eager. Explicit `height:auto` on full-bleed plates preserves their original responsive sizing.
- Opt the standalone page out of Critters pruning using its existing `data-preserve-inline-styles` mechanism: preserves CSS for the dynamically constructed catalog and open lightbox states.

No image pixels, catalog algorithm, shared CSS processor, analytics configuration or audit threshold changed. The parent audit did not establish a recent culprit commit, so this is a targeted correction rather than an unsupported revert.

## Preview audit (2026-10-10)

Full `pnpm build` static export, served with gzip text compression at http://127.0.0.1:8766/pen-plotter/. No browser resource interception in Lighthouse. Three consecutive final runs before PR publication:

| Run | Performance | Accessibility | Best practices | SEO | FCP ms | LCP ms | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 94 | 94 | 100 | 100 | 1661.39 | 3007.59 | 0 |
| 2 | 92 | 94 | 100 | 100 | 1978.84 | 3094.23 | 0 |
| 3 | 92 | 94 | 100 | 100 | 1979.13 | 3169.42 | 0 |

Median Performance: **92**, meeting the required >=90. These are local preview results, not a deployed or field measurement. Parent production audit: 87/87/91 median 87; historical cron rolling median 77. Different hosts/transport mean these are not a controlled production delta or causal claim. Earlier intermediate batches varied, including an 87 median while Boska remained remote; the final same-origin font batch above is the accepted evidence.

Command (same flags as `/Users/djm/claude-projects/scripts/cron/growth-lighthouse-pages.py:39-50`):

```
lighthouse http://127.0.0.1:8766/pen-plotter/ --output=json --output-path=lh-accepted-N.json '--chrome-flags=--headless --no-sandbox --disable-gpu' --disable-full-page-screenshot --only-categories=performance,accessibility,best-practices,seo --quiet
```

No preset override: default mobile/simulated throttling. All final reports have no runtime error or run warnings. Full raw reports, server, browser runner, logs and screenshots are provided in the task evidence archive.

## Verification and visual fidelity

- Full static build passes; all 167 Vitest tests pass; four additional `node --test scripts/pen-plotter-performance.test.mjs` checks pass and are wired into the build.
- Cold Boska downloader probe retrieves the missing file; byte-for-byte comparison with the official cached file passes.
- Playwright Chromium at 412x823 and 1440x823 compares original source against the fixed export. Provider styles/JetBrains bytes are served deterministically for the baseline comparison only, not for Lighthouse. All 21 static image widths/heights match exactly at both viewports after decode, as do measured heading/header/catalog geometry and font families.
- Both versions construct 1296 catalog entries, with zero page JS exceptions. Click, ArrowRight, Escape, and keyboard Enter interactions pass. Mobile/desktop hero screenshots checked visually.
- Existing limitation: catalog thumbnail/lightbox art is missing in unchanged export and production. The first manifest thumb `assets/thumbs/moire-0005.webp` and medium `assets/medium/moire-0005.webp` both return 404 in production. Catalog screenshots show this pre-existing defect, not a new performance change. Actual gallery artwork decode is therefore not claimed. Follow-up t_981929d6 owns asset recovery; do not fabricate replacement artwork.

Correctness per [[context-engineering-positive-definition-good-work]]: reproducible cron-matched mobile median >=90, preserved fonts/static art/layout, executable build/regression checks, inspectable raw measurements, and explicit limits with a separate asset-repair handoff. Downstream t_548e8bb1 owns review/deploy/production audits; do not close the original regression solely on these preview results.

qmd: recovered the prior pen-plotter remediation card t_35b51e47 and historical audit cards; reused their preserve-functionality/comparable-measurement bar and current parent reports.
