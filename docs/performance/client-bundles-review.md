# Client bundles and public-asset review — t_b04565d8

Source: canonical `edgeless-ai/edgelesslab.com`, base `28d93d2d126adc4bc62e875669d7e00b92facb22`.

## Implementation and scope

No public/source files deleted, no merge, no deploy. `@next/bundle-analyzer` matches Next 16.3.0. `pnpm run analyze` runs the complete existing build lifecycle with `--webpack`, produces `.next/analyze/{client,nodejs,edge}.html`, and does not open a browser. Normal builds retain Turbopack; only `ANALYZE=true` installs the analyzer webpack hook. Both package locks include the dependency.

The requested lazy boundaries already exist on canonical main:

- `src/app/lab/swarm-specimen/SwarmSpecimenEmbed.tsx`: client-only dynamic import of SwarmSpecimenCanvas with `ssr: false`. Editor and custom shapes remain behind this boundary.
- `src/components/hero-section.tsx`: shader background uses next/dynamic with `ssr: false`. No current source consumer mounts this old HeroSection; the shader library is absent from the analyzed build, not a newly measured saving.
- `src/components/posthog-provider.tsx`: useEffect invokes consent-gated functions in `src/lib/analytics-consent.ts`, which asynchronously import PostHog. No eager runtime SDK import exists.

These implementations were preserved rather than rewritten. Six new regression cases exercise analyzer activation/defaults and lazy boundaries, supplementing existing analytics/consent tests. This change adds measurement and protection, not a claimed customer-facing speed improvement.

## Execution evidence

- `pnpm exec vitest run`: 15 files, 173 tests passed.
- `pnpm exec eslint next.config.ts src/lib/__tests__/client-bundles.test.ts`: passed.
- `pnpm exec tsc --noEmit --incremental false`: passed, also exercised by both build gates.
- `pnpm run analyze`: complete webpack static export and postbuild passed; 140 Next routes generated.
- `pnpm run build`: normal Turbopack static export and postbuild passed; 140 Next routes generated.
- `pnpm exec playwright test`: 14 Chromium static-export smoke tests passed, including home interactions/search, mobile layouts and public experiments.
- Both launch audits: 521 HTML files, 7 precisely allowlisted archive blockers, 0 new failures. This is not a claim that every archive asset is repaired.
- npm reported 59 dependency vulnerabilities during lock synchronization. This card does not remediate them or claim a clean dependency audit.

### Bundle/network probe

The webpack analyzer reports the following bundle sizes (parsed bytes, not compressed network transfer):

| Dependency | Chunk | Parsed bytes |
| --- | --- | ---: |
| tldraw | `static/chunks/6291.7e7327dee5e17c24.js` | 1296180 |
| tldraw | `static/chunks/4ca7f0f0.dd77d95722bd7a2b.js` | 105621 |
| posthog-js | `static/chunks/6d06eda1.d743ebb5b1d5d19a.js` | 208202 |

Chromium visiting `/` fetched zero chunks from those tldraw/PostHog sets. Visiting `/lab/swarm-specimen/?seed=1` loaded both tldraw chunks, mounted controls and exercised Run/Pause/Reset.

The stricter probe FAILS its no-page-errors assertion: two `Failed to fetch` errors occur on Swarm Specimen; CSP blocks `https://cdn.tldraw.com/3.15.6/fonts/*` and blob URLs. No runtime source/CSP was changed in this candidate. The saved `browser-probe.json` records this route behavior. CSP repair is separate scope; do not suppress CSP or call this probe a clean pass.

## Current public inventory

Tracked canonical files only. The older ~25k local-file figure is not reproduced. Browser transfer and build-time copying are separate costs.

| Public directory | Files | JS files | Bytes |
| --- | ---: | ---: | ---: |
| creative-demos | 520 | 10 | 97649065 |
| marimo-demos | 692 | 588 | 25953319 |
| marimo-excalidraw-demos | 708 | 594 | 26311070 |
| marimo-gaussian-demo | 1281 | 1174 | 46038578 |
| marimo-mlb-demos | 10 | 0 | 3624139 |
| marimo-reactive-slider | 1280 | 1174 | 45999836 |
| marimo-sports-demos | 6 | 0 | 368146 |
| pen-plotter | 25 | 0 | 1343006 |
| prompt-engine | 2 | 0 | 1760757 |
| scoop-scout | 41 | 8 | 1479505 |
| total-serialism | 588 | 86 | 12470749 |
| Total | 5153 | 3634 | 262998170 |

`public-prune-inventory.json` lists 137 exact inspection candidates (documentation, development metadata or test paths), with sizes. It also lists 1,057 SHA-256-identical marimo JS/CSS/WASM asset groups. Consolidating redundant copies could theoretically avoid 95,520,430 bytes. This is an upper bound requiring reference rewrites and tests, NOT a deletion manifest or realized saving.

## Proposal — approval required before deletion

1. Inspect the 137 candidate paths individually. Check runtime fetches, HTML links and deployment workflows. `.md` can be a customer download: the creative-loop acceptance card is exercised by smoke tests and must remain served.
2. Pilot a shared versioned asset root for one marimo notebook; rewrite HTML entry points, CSS URLs and JS dynamic-import/base references, then exercise each notebook before removing copies. Preserve each notebook entry point and notebook/Python data.
3. Keep linked standalone apps. `/studio/` links marimo demos and Scoop Scout; Home and `/field-notes/` link creative demos and Total Serialism; `/lab/prompt-engine/` fetches `public/prompt-engine/corpus.json`. Absence from Next imports is not proof of disuse.
4. Obtain an explicit approved deletion manifest, then measure clean export file-count/size deltas and verify affected routes in browsers. No bulk directory deletion is authorized by this card.

## Handoff and definition of correct

Per [[context-engineering-positive-definition-good-work]], good output here is an opt-in analyzer producing real reports, preserved normal static builds, exercised consent/lazy-boundary regression protection, source-derived file/byte counts and a reviewable proposal that preserves standalone apps. Those outputs are present. Production integration, deletion approval and a clean Swarm Specimen CSP verification are not claimed.

qmd: `qmd-node search "edgelesslab bundle analyzer vendored" -n 5` returned nothing relevant. The default qmd launcher failed its native-module ABI check; the existing Node-22 wrapper worked. A package-security lookup timeout cleared on a bounded retry.

GitHub CLI has no authenticated host, so no PR publication is claimed. Publish only to canonical edgeless-ai, not the personal fork; human approval is required for integration/deployment. Keep generated out/ and next-env.d.ts build churn out of the source commit.

Lesson: stale audit file counts must be re-inventoried against canonical tracked source. Static library imports inside already-dynamic leaf modules are not proof of an eager app bundle. No skill changes in this one-shot run.
