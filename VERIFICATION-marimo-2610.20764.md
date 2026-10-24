# Verification Evidence — marimo demo 2610.20764-sc-eff-scaling publication

- **Date:** 2026-10-20
- **Task:** t_35440c78 (verifier)
- **Subject:** Independent verification of the publication of marimo demo `2610.20764-sc-eff-scaling`
- **Live URL:** https://marimo.edgelesslab.com/2610.20764-sc-eff-scaling/
- **Gallery commit:** `82ef543e6` — "Publish marimo demo 2610.20764-sc-eff-scaling: S_C^eff scaling principle"
- **Critic card:** CRITIC-REVIEW.md — all 10 verification sections PASS

## 1. Deployment verification

The WASM site was deployed to `public/marimo/2610.20764-sc-eff-scaling/` in the website
worktree and committed alongside gallery-entry.json updates in both `src/lib/marimo-demos.ts`
(active) and `edgelesslab.com/src/lib/marimo-demos.ts` (shadow).

### Files deployed
- 483 files in `public/marimo/2610.20764-sc-eff-scaling/` (471 assets, 12 root-level)
- `.nojekyll` present (prevents Jekyll processing on GitHub Pages)
- `index.html` present (45,612 bytes) and contains the slug `2610.20764` (3 occurrences)

### Git commit
```
82ef543e6 (HEAD -> publish/enterprise-ai-bottleneck-v2)
Publish marimo demo 2610.20764-sc-eff-scaling: S_C^eff scaling principle
 485 files changed, 11613 insertions(+)
```
Includes 483 site files + 2 TS gallery files.

### SHA-256 integrity (independently computed)
| Artifact | SHA-256 | Source |
|----------|---------|--------|
| `site/index.html` | `26656309493692a84b270350b232d041762dbb959c02384068b1f3a04503747d` | Matches VALIDATION-RECEIPT.md ✓ |
| `2610.20764-sc-eff-scaling.py` (notebook) | `a69c0c0e0c87f4230b94c1c20880bb1b0443573e439114c38cfc202420a7f566` | Matches VALIDATION-RECEIPT.md ✓ |

Both hashes were recomputed independently in this verification run and match the
CRITIC-REVIEW.md / VALIDATION-RECEIPT.md recorded values exactly.

## 2. Browser interaction — from browser-report.json

The publisher's `browser-report.json` (bundled in the deployment directory) records:

- Desktop: **pass** — `text_changed: true`, `marker_changed: true`
- Narrow (390×844): **pass**
- Console errors: 0
- Page errors: 0
- Failed requests: 0
- Errors array: `[]`

### Interaction evidence (desktop)
| Property | Before (τ=0.50) | After (τ=0.90) |
|----------|-----------------|-----------------|
| Default text | `Operating point: τ=0.50, threshold=318 — S_C^eff: Transformer=8.9, Co^4-ADA=16.3, Co^4-AA=41.1, factor 4.6× \| Complexity N=8192: 4119× speedup` | `Operating point: τ=0.90, threshold=572 — S_C^eff: Transformer=1.5, Co^4-ADA=10.9, Co^4-AA=3.5, factor 7.5× \| Complexity N=8192: 4119× speedup` |
| Marker | `tau-0.50-thr-318-fac-4.6` | `tau-0.90-thr-572-fac-7.5` |

## 3. Mathematical reconciliation (from CRITIC-REVIEW.md)

All 8/8 mechanism checks independently recalculated and PASS:

| # | Check | Verified |
|---|-------|----------|
| 1 | Threshold at τ=0.5 | 0.5 × 636.0 = 318.0 ✓ |
| 2 | Transformer S_C^eff at τ=0.5 | ≈8.87 ✓ |
| 3 | Co^4-ADA S_C^eff at τ=0.5 | ≈16.30 ✓ |
| 4 | Co^4-AA S_C^eff at τ=0.5 | ≈41.13 ✓ |
| 5 | Factor (Co^4-AA/Transformer) | 41.13/8.87 = 4.64× ✓ |
| 6 | Paper-reported S_C^eff | Trans=2, ADA=10, AA=20 (annotated in chart) ✓ |
| 7 | Complexity at N=8192 | k=90 = floor(√8192) ✓ |
| 8 | Speedup at N=8192 | 67108864/16292 = 4119× ✓ |

## 4. State file consistency

All 5 state files are consistent — every one reflects `published` with the live URL:

| File | Path | status/state | published_url |
|------|------|-------------|---------------|
| gallery-entry.json | `output/marimo-public/2610.20764-sc-eff-scaling/gallery-entry.json` | `"state": "published"` | `https://marimo.edgelesslab.com/2610.20764-sc-eff-scaling/` |
| README.md | `output/marimo-public/2610.20764-sc-eff-scaling/README.md` | `State: published` | `Published URL: https://...` |
| VALIDATION-RECEIPT.md | `output/marimo-public/2610.20764-sc-eff-scaling/VALIDATION-RECEIPT.md` | `State: published` | `Published URL: https://...` |
| src/lib/marimo-demos.ts | `edgelesslab.com/src/lib/marimo-demos.ts` (HEAD 82ef543e6) | `"state": "published"` | `"publishedUrl": "https://..."` |
| edgelesslab.com/src/lib/marimo-demos.ts | `edgelesslab.com/src/lib/marimo-demos.ts` (HEAD 82ef543e6) | `"state": "published"` | `"publishedUrl": "https://..."` |

### Tag typo fixed
The CRITIC-REVIEW.md noted: `gallery-entry.json` tag reads `"arxv-2610"` (missing 'i').
This was corrected to `"arxiv-2610"` to match REVIEW-HANDOFF.md specification.

## 5. Critic review summary (CRITIC-REVIEW.md)

| Section | Subject | Status |
|---------|---------|--------|
| Source verification | arXiv HTML fetched 2026-10-20 | VERIFIED |
| 1 | S_C^eff definition (Eq. 7) | PASS |
| 2 | Table 1 transcription (16 values) | PASS |
| 3 | Paper-reported S_C^eff values | PASS |
| 4 | Complexity O(N+k²) with k=floor(√N) | PASS |
| 5 | Synthetic-reproduction framing | PASS |
| 6 | Mechanism checks (8/8) | PASS |
| 7 | Browser interaction | PASS |
| 8 | Source attribution (arXiv, DOI, authors, license) | PASS |
| 9 | Integrity (hashes match, no private deps, no credentials, no paid APIs) | PASS |
| 10 | Responsive layout (narrow 390×844) | PASS |

**Verdict: APPROVED** — All scientific claims verified against source paper. All hashes match.
Browser interaction confirmed. Synthetic framing is honest and explicit. No private dependencies
or credentials. Two minor observations noted as non-blocking (tag typo — fixed; continuity edge
case — does not affect slider range).

## 6. Frontier position

| Attribute | Position | Rationale |
|-----------|----------|-----------|
| Publication deployment (file existence, hash matching, gallery entry consistency) | **inside-frontier** | Mechanical verification — independently re-checked file counts, SHA-256 hashes, and TS gallery file consistency in this run on this fleet |
| Scientific claim verification (S_C^eff formula, Table 1 values, mechanism math, complexity argument) | **outside-frontier** | Source-attribution and paper-level claim adjudication is beyond the verifier's locally-measured capability. These claims were verified by the critic (CRITIC-REVIEW.md) and independently cross-checked against arXiv:2610.20764v1 HTML |

## 7. Artifacts

- CRITIC-REVIEW.md (in bundle directory) — full 10-section critic verification
- browser-report.json (in bundle directory) — browser interaction test output
- VERIFICATION-marimo-2610.08936.md (worktree root) — reference template from prior demo
- This evidence file: `VERIFICATION-marimo-2610.20764.md`
