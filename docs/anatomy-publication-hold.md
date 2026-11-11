# Anatomy publication adapter — DRAFT / DO NOT MERGE

Publication task: `t_318afc8b`. Coordinator: `t_fa00a89e`.

**No figure is cleared for publication.** This branch preserves an integration
candidate, not a finished release. Do not mark the PR ready, merge it, or publish
its static export until the gates below pass. Removing a held slug only from the
registry is insufficient: filesystem discovery also exposes unregistered demos.

## Candidate and sources

The only candidate in this branch is `kanban-dispatcher`, with dark/light pages,
explicit Anatomy category, controls, source/licence credit, offline CSP,
data-URI favicon, preserved inline CSS, and source hashes in `provenance.json`.
The registry date is draft metadata, not evidence of production publication.

Canonical input: `claude-projects` main at
`3df638f0abbe49dd914b5240db9571145d474b6c`, under
`reports/anatomy-figures-2026-10/kanban-dispatcher/`. The two original HTML
SHA-256 values in provenance were independently matched to that Git object on
2026-11-09. Source integration review: `t_08a9ad3c` (`d151b96f2`).

The latest four individual **built-output** critics (1440/390, dark/light) all
HOLD, superseding earlier contact-sheet/source PASS verdicts. Issues: phone
mechanism legibility; missing on-art gate/carrier/tray mapping; tiny metadata;
unclear card-state totals versus worker occupancy; unclear tour/disabled controls.
Screenshot-estimated contrast or overflow is not a measured finding.

## Independent figure gates

| Figure | Current hold | Owner / card |
| --- | --- | --- |
| kanban-dispatcher | Four built-output critics HOLD | kilo + verifier, `t_1822c974` |
| bid-no-bid | Phone mechanism illegible | kilo + verifier, `t_7c708521` |
| mechanical-watch | Desktop selection obscures train; weak light outlines | kilo + verifier, `t_9ac2d358` |
| turbofan | Dark internals / phone geometry | kilo + verifier, `t_716ecd1c` |
| water-wheel | Dark internals; suspected footer overlap requires measurement | kilo + verifier, `t_d4acb06f` |
| windmill | Gearing / label contrast | kilo + verifier, `t_3360a3ac` |
| trebuchet | Explicit human arc/sling/take-apart pixel gate | David, `t_b0169ef3` |
| eval-bench | Named vendor comparative scores require approval | David, `t_d2710b01` |

Any independently passing nonsensitive figure may proceed; do not wait for all
other figures. Do not infer fresh audit or motion execution from this table:
source bundle records contain those results; rework must rerun them on its new head.

## Verification and known failure

Tests target the static `out/` export and assert actual model/control changes,
no horizontal overflow, no console errors or remote requests, gallery inclusion,
and exclusion of the other seven held slugs. Their PASS is not visual approval.

Fresh recovery execution on this draft (2026-11-09): `npx tsc --noEmit`,
`npm run check:design-system` (69 checks), `npm run lint:experiments`,
`npx vitest run --maxWorkers=1` (220 tests / 21 files), and complete
`npm run build` all exit 0. The complete build took 387.51 s and included
Next export plus postbuild; its receipt is `resume-build.json`.
`CI=1 SMOKE_PORT=18878 npx playwright test tests/anatomy-field-notes.spec.ts
--workers=1` passed all 7 scoped cases, including zero console errors and
remote requests. The built gallery contains the candidate title; all other
seven held slug directories and gallery links are absent from the export.
**These results do not clear the visual HOLD or the prior full-suite failures.**

The prior full `CI=1 npx playwright test --workers=1` run ended **20 passed,
2 failed**, after retries. Failures: `tests/smoke.spec.ts:209` and `:222`, both
prompt-engine generation tests missing `[data-prompt-card]`. Root cause is
unproven. Investigation: `t_8ed04606` (builder). Assertions remain unchanged.
This branch adds Anatomy to `playwright.config.ts` testMatch; investigate that
seam without assuming causality or waiving the full suite.

Retained evidence lives in the publisher workspace's `evidence/` directory:
`all-three-final-critic/` (current screenshots), `final-ci-failures/` (saved
failure traces), `browser-ci-mode.log` (full failure), and `resume-*` logs plus
JSON command/exit receipts. Original `publish.py` and held pages are outside the
site tree. The one-off generator predates manual adapter fixes, still lists
three slugs, and is **not replay-safe**: audit its allowlist, draft metadata and
CSS before regeneration; never replay it blindly into `public/`.

## Resume / release conditions

1. Consume the newly merged canonical source revision for a single passing slug;
   preserve latest motion/explosion ancestry and source hashes.
2. Port any publisher-owned metadata/style fixes only after measurement. Source
   rework cards must not modify the publisher worktree.
3. Rerun tsc, all 69 design checks, experiment lint, complete build, full unit and
   browser suites. Preserve complete command exit receipts; a truncated build log
   ending at a passing prebuild subtest does not establish export success.
4. Inspect fresh **built** dark/light screenshots individually at 1440 and 390;
   run controls at 375/390/1440, zero console errors. Require latest four critics
   PASS. Retain an explicit HOLD instead of rerunning until a favorable verdict.
5. Require exact-head CI and reviewed merge before live publication. Probe the
   custom domain, not a fork. At recovery time on 2026-11-09 the candidate URL
   returned HTTP 404 and the existing gallery HTTP 200; neither is release proof.

The task remains incomplete until an approved figure is merged and verified live.
