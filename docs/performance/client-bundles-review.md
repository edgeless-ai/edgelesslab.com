# Client bundles and public-asset review — t_b04565d8

Source: canonical `edgeless-ai/edgelesslab.com`, base `28d93d2d126adc4bc62e875669d7e00b92facb22`.

## Implementation and scope

No public/source files deleted, no merge, no deploy. `@next/bundle-analyzer` matches Next 16.3.0. `pnpm run analyze` runs the complete existing build lifecycle with `--webpack`, produces `.next/analyze/{client,nodejs,edge}.html`, and does not open a browser. Normal builds retain Turbopack; only `ANALYZE=true` installs the analyzer webpack hook. Both package locks include the dependency.

The requested lazy boundaries already exist on canonical main:

- `src/app/lab/swarm-specimen/SwarmSpecimenEmbed.tsx`: client-only dynamic import of SwarmSpecimenCanvas with `ssr: false`. Editor and custom shapes remain behind this boundary.
- `src/components/hero-section.tsx`: shader background uses next/dynamic with `ssr: false`. No current source consumer mounts this old HeroSection; the shader library is absent from the analyzed build, not a newly measured saving.
- `src/components/posthog-provider.tsx`: useEffect invokes consent-gated functions in `src/lib/analytics-consent.ts`, which asynchronously import PostHog. No eager runtime SDK import exists.

These implementations were preserved rather than rewritten. Seven new regression cases exercise analyzer activation/defaults, lazy boundaries and CLI lock metadata, supplementing existing analytics/consent tests. This change adds measurement and protection, not a claimed customer-facing speed improvement.

## Execution evidence

Independent review invalidated the earlier frozen-install claim at `d95a0dcae50308da9069497a6c2eefb501e1795b`: its pnpm lock removed CLI binary metadata and `npm run analyze` failed with `next: command not found`. That head must not be integrated. The repair restores all 29 lost `hasBin` entries and adds the two new binary packages (`opener`, `webpack-bundle-analyzer`), without changing resolved versions or integrity hashes. The new regression case cross-checks the 24 binary packages shared by both locks; a separate installed-manifest check verifies all 33 installed binary-package records.

A read-only negative control redirects only the regression test's lock read to the exact reviewed broken lock: the new test fails on missing `@playwright/test` CLI metadata (exit 1, `lock-regression-red.log`), then passes against the repaired file (exit 0). No production source or installed modules are mutated by this control.

Final evidence is from a fresh tracked-source archive at workspace `verify-repaired/`, with only the repaired lock and regression test overlaid before installation. No pre-existing node_modules or ignored environment files were copied. Node 22.16.0, pnpm 11.5.3:

- `CI=true /opt/homebrew/bin/pnpm install --frozen-lockfile --ignore-scripts`: exit 0, 594 packages installed; executable project-local `next`, `tsc`, `vitest`, `eslint`, `playwright`, `pagefind` all present. Local `next --version`: Next.js v16.3.0.
- `./node_modules/.bin/vitest run`: 15 files, 174 tests passed (`repaired-evidence/unit.log`).
- `./node_modules/.bin/eslint next.config.ts src/lib/__tests__/client-bundles.test.ts`: exit 0 (`lint.log`).
- `./node_modules/.bin/tsc --noEmit --incremental false`: exit 0, also exercised by both build gates (`typecheck.log`).
- `npm run analyze`: complete webpack static export and postbuild exit 0; 140 Next routes generated; client/nodejs/edge analyzer reports saved (`analyze.log`, `analyze/`).
- `npm run build`: normal Turbopack static export and postbuild exit 0; 140 Next routes generated (`build.log`).
- `./node_modules/.bin/playwright test`: 14 Chromium smoke tests passed against each of the webpack and Turbopack static exports (`smoke-webpack.log`, `smoke-turbopack.log`), including home interactions/search, mobile layouts and public experiments. This suite is not an all-route/no-network-error audit.
- Both launch audits: 521 HTML files, 7 precisely allowlisted archive blockers, 0 new failures. This is not a claim that every archive asset is repaired.
- The earlier npm lock synchronization reported 59 dependency vulnerabilities. No new security audit was run; this card does not remediate them or claim a clean dependency audit.

All final npm builds and local tests ran with a restricted runtime PATH and a Node preload guard (`path-guard.cjs`): npm-added ancestor `node_modules/.bin` directories are removed for every child Node process, and execution of ancestor package tools is rejected. `path-guard.jsonl` records actual executable paths. The guard permits the selected runtime's npm and fixture-local tools, not Hermes ancestor packages. See `verify-repaired.py` and `source-verification.json` in the repair evidence archive.

### Bundle/network probe

The webpack analyzer reports the following bundle sizes (parsed bytes, not compressed network transfer):

| Dependency | Chunk | Parsed bytes |
| --- | --- | ---: |
| tldraw | `static/chunks/6291.83517bcf5b4a337b.js` | 1296180 |
| tldraw | `static/chunks/4ca7f0f0.4919c6ee18e29ea1.js` | 105621 |
| posthog-js | `static/chunks/6d06eda1.d743ebb5b1d5d19a.js` | 208202 |

Chromium visiting `/` fetched zero chunks from those tldraw/PostHog sets. Visiting `/lab/swarm-specimen/?seed=1` loaded both tldraw chunks, mounted controls and exercised Run/Pause/Reset.

The fresh post-repair stricter probe FAILS its no-page-errors assertion (exit 1): two `Failed to fetch` errors occur on Swarm Specimen; CSP blocks `https://cdn.tldraw.com/3.15.6/fonts/*` and blob URLs. No runtime source/CSP was changed in this candidate. The saved `repaired-evidence/browser-probe.json` records this route behavior. Existing CSP repair card `t_c622050b` is separate scope; do not suppress CSP or call this probe a clean pass.

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

Artifact correctness verdict: PASS for the bounded analyzer/configuration, clean frozen-install reproducibility, lazy-boundary regression protection and inspection-only inventory. The stricter Swarm Specimen runtime probe remains FAIL; no production integration verdict is supplied.

Claim correctness verdict: PASS for the evidence and limited claims in this revised report. The earlier final-install claim was incorrect and has been explicitly replaced rather than reused.

### claim_scope

- Assumptions: canonical tracked base `28d93d2d126adc4bc62e875669d7e00b92facb22`, Node 22.16.0, pnpm 11.5.3, frozen lock install with scripts disabled, macOS, Chromium against a local static server. Reports describe this isolated candidate, not current production or a later canonical head.
- Uncovered cases: fresh npm installation, other Node/pnpm/OS versions, required GitHub exact-head CI, publication/merge/deployment, production transfer/timing, every standalone notebook, deletion/reference-rewrite safety, and a clean all-route browser/network/CSP audit. The tested Swarm Specimen CSP errors are observed failures, not assumed fixed.
- Narrowest honest claim: opt-in analyzer/configuration and inspection inventory are reproducible locally after a fresh frozen pnpm install; both documented build lifecycles finish, regression tests and the existing smoke suite pass. No new lazy-loading speedup, realized pruning/byte saving, customer-facing performance gain, or production verification is established.

Per [[context-engineering-positive-definition-good-work]], good output here is an opt-in analyzer producing real reports, preserved normal static builds, exercised consent/lazy-boundary regression protection, source-derived file/byte counts and a reviewable proposal that preserves standalone apps. Those outputs are present. Production integration, deletion approval and a clean Swarm Specimen CSP verification are not claimed.

qmd: the original `qmd-node search "edgelesslab bundle analyzer vendored" -n 5` and repair-run `qmd-node search "edgelesslab client bundle analyzer lockfile" -n 5` returned nothing relevant. The default qmd launcher failed its native-module ABI check; the existing Node-22 wrapper worked. A package-security lookup timeout cleared on a bounded retry.

GitHub CLI has no authenticated host, so no PR publication is claimed. Publish only to canonical edgeless-ai, not the personal fork; human approval is required for integration/deployment. Keep generated out/ and next-env.d.ts build churn out of the source commit.

Lesson: stale audit file counts must be re-inventoried against canonical tracked source. Static library imports inside already-dynamic leaf modules are not proof of an eager app bundle. Lock synchronization must preserve CLI metadata: an install exit code and direct module tests do not establish that documented lifecycle commands can execute after a fresh install. No skill changes in this one-shot run.
