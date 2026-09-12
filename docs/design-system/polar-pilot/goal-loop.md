# Execution loop

## Cycle 1 — Plan

2026-09-11: Read source note/article, global and repository instructions. Established canonical checkout and unrelated edits. Created unique worktree/branch at 70f0e3b6; clean initial state. Inspected Next/React/Tailwind, globals, theme provider, Support page, scripts and CI. Selected Support; recorded spec and acceptance mapping before implementation. Installed locked dependencies offline with pnpm minimumReleaseAge=1440 (579 reused, zero downloaded). Parent gathering baseline screenshots/typecheck/tests before handing the single implementation item to a fresh builder.

Next: Act (one builder), Test (builder regressions and independent parent browser/tooling checks), Review (inspect diff, probe bypasses, iterate as needed).

## Cycle 1 — Act

Parent handed one bounded implementation item to fresh `support_pilot_builder`. Builder owns specified source/config/test/adoption files; parent owns this loop, external reports, and browser evidence. Baseline tsc passed; Vitest 8 files/117 tests passed. Four before screenshots and baseline-browser.json prove both legacy theme settings rendered canvas rgb(9,9,11), and the route had no main landmark. Installed Next docs reviewed for CSS-module support. Next dev generated AGENTS.md/next-env changes were inspected and restored to HEAD after stopping our dev process. No shared-repository movement.

Invalid experiment: axe was attempted after stopping baseline server; Chromium had navigated to its offline error page. Those artifacts are explicitly prefixed INVALID and excluded from acceptance evidence. Final axe will run against the live local static export.

## Cycle 1 — Test → Review

Independent dev preview: 72/74 browser assertions passed. Dark/light geometry and typography match baseline within 1px, all copy/links/headings/list checks passed; scoped axe and keyboard skip/focus passed. Full-page light axe caught an introduced integration defect: legacy Footer inherited white Surface background but retained white text; translucent Nav /lab label had 3.63 contrast. Evidence preserved under output/playwright/polar-pilot/cycle-1-preview/. Review rejects this iteration despite valid scoped tokens.

## Cycle 2 — Plan → Act

Revise the shell boundary, not shared shell files: give legacy shell an explicit paired dark canvas, move changing canvas to Main, and alias legacy navigation glass to a paired token that is opaque dark in light mode. Preserve original dark values. This is a narrow compatibility exception needed to keep the full page readable, not a global light-theme repair. Builder owns implementation; parent will rerun browser/a11y against final static export and inspect token policy.

## Cycle 2 — Test

Builder handed source ownership back with required gate/69 tests/full tsc and focused ESLint passing (Node26). Parent independently ran required gate under Node22.16.0: 69/69 passed plus full tsc exit0. Existing Vitest: 8 files/117 tests passed. Parent real-worktree falsification probes: 15/15 expected outcomes, including unknown token, known raw spacing/color, inline style/class, literal spread, casts/suppression, recursive helper, adapter/CSS mutation and missing theme pair. Normal build rejected unknown token before Next; normal lint rejected inline style before ESLint. All four probed source files were restored byte-for-byte. Evidence: parent-gate-probes.json. Full static build and final browser verification are active.

## Cycle 2 — Review (accepted pilot; unrelated transport limitation retained)

Parent Node22 full build exit0: Next compiled and typechecked, 132 static routes; Critters 497 HTML scanned/494 inlined/0 failures; Pagefind indexed 460 pages. Existing Playwright smoke suite actually discovers 9 tests (the earlier source-text count included conditional branches), all 9 passed. Focused ESLint and git diff --check passed.

Static-export browser harness: 70/74 assertions passed. All four desktop/mobile x light/dark cases preserve copy, links, effective geometry/typography (within 1px), have no overflow, use the expected paired canvas, provide one main and correct headings/list, and pass keyboard skip/main/home/mail focus. Both desktop theme-toggle interactions persist. Axe 4.12.1 reports zero scoped and zero full-page violations and zero incomplete checks in all cases (11 scoped/42 full rule passes). Parent viewed all four final full-page screenshots. The introduced shell contrast issue is resolved.

The four failed strict assertions are exclusively two font-preload HTTP404s per page load. Diagnosis reproduced identical URLs on untouched /about/, confirmed shared layout/Critters/About sources equal HEAD, observed both actual fonts loaded successfully from /_next/static/media/, and found no JavaScript exceptions. Keep the failed harness result honest; do not suppress the errors or expand the pilot to repair the shared postbuild pipeline. Build also emits 71 missing-html-lang warnings for unrelated standalone pages. Evidence: final-browser.log, browser-acceptance.json, font-404-diagnosis.json, final-build.log.

Next-generated AGENTS.md/next-env.d.ts noise and a tracked standalone out/lab/pen-plotter-autoresearch/index.html changed by the existing build were inspected and restored byte-for-byte to HEAD. No standalone replacement is left in the diff. Temporary dev/static servers and the task browser were closed. Final changes are the 13 scoped implementation/spec/adoption/loop files. Trunk HEAD/status and all 9 pre-existing changed/untracked file hashes are unchanged. No commits, pushes, merges, publication, deployment, model/credential/config changes, paid calls, or recurring jobs.

Accepted A1–A10 with explicit limits: CI is wired but not run remotely; Chromium/Chrome was tested, not Safari/Firefox or a human screen reader; whole-repo legacy lint was not run, changed source/scripts were linted. Token checks enforce the encoded scope and cannot prove good design. The Kanban DONE-gate helper is not applicable: this task was supplied without a Kanban ID and no Kanban completion claim was made. Final review bundle/report: /Users/djm/.hermes/profiles/beau/reports/polar-pilot/codex-result.md. Parent can independently rerun using that report.

## Cycle 3 — Plan (finish authorization)

2026-09-11 PDT: authenticated Codex CLI reports “Logged in using ChatGPT”; no auth or model settings changed. Rediscovered both branches at 70f0e3b6, pilot changes and all nine unrelated canonical files. Fresh byte hashes/status saved as finish-baseline.json in the external report directory. Existing parent verify-browser.cjs located, with all 74 checks intact. Critters currently copies CSS-relative font URLs verbatim into document-relative preload hrefs; inspect/fix the actual shared postbuild boundary and prove it with a failing regression.

Dynamic workflow: parent establishes baseline and delegates one bounded builder; parent independently reviews existing contract and harness while builder owns source writes. Then parent runs regression/gate/unit/lint, full export, strict browser plus About control, visual review, scoped staging/security review, commit, safe local merge and merged-tree checks. Adapt and persist another cycle if evidence fails. No build processes may compete for .next. User finish authorization supersedes the old no-merge instruction in this task's initial spec.

## Cycle 3 — Act → focused Test → Review

Fresh builder preload_builder corrected CSS-relative font sources at Critters getCssAsset, before stylesheet context is lost. Only @font-face src URLs in origin-relative exported stylesheets are rebased; preloads stay enabled, inline CSS and absolute/data sources keep their existing contexts. No hardcoded build hashes, layout/global changes or dependency additions. Six regression tests invoke real Critters, including nested routes, separate CSS directories, absolute/data sources, escapes and unrelated CSS preservation. Required build and existing Frontend Tests now invoke test:postbuild.

Actual old-Critters replay fails 4/6 tests; fixed code passes 6/6. Builder focused ESLint/diff-check pass; parent read all changed lines and accepted source handback. Parent independently reproduced the unmodified 74-check harness at 70/74 before the fix (four font404 failures), and reran existing Vitest: 8 files/117 passed. Evidence: external finish-preload-regression-{red,green}.log, finish-browser-red.{json,log}, finish-vitest.log, finish-review-notes.md. Full static export and strict browser verification follow.

## Cycle 4 — Review → Plan → Act (lifecycle wiring)

Parent's first pnpm build passed Next/gates but did not run the final postbuild lifecycle. Review rejected it as a full-build acceptance result. Installed pnpm11.5.3 source confirms lifecycle hooks are skipped when the build command contains the substring postbuild. The newly named test:postbuild command accidentally triggered that guard. Rename the regression command to test:font-preloads in package/build/CI/docs; no test logic or preload behavior changed. Rerun the full build and require explicit Critters and Pagefind completion before browser acceptance. Evidence: first finish-build.log, installed pnpm dist/pnpm.mjs lines247023–247028.

## Cycle 4 — Test → Review (ready for local integration)

Complete pnpm build now runs all lifecycle stages: 69 design-system regressions, six font-preload regressions, full tsc and Next TypeScript, 132 routes; Critters 497 HTML scanned/494 inlined/zero failures; Pagefind 460 pages indexed. Parent changed-file ESLint passes. The unchanged strict harness (SHA-256 ca965c8e90593439e71fe188fc6bd8c3aa39c01cebb7f493eefc6b4ea809bab5) is 74/74 green, zero errors and zero blocked external requests. Support and untouched About both preload the actual /_next/static/media fonts with HTTP200; no resource or browser errors. Existing smoke9/9 and real source mutation probes15/15 pass, all four mutated files restored exactly.

Parent viewed all four final full-page screenshots (desktop1440x1000 and mobile390x844 viewports), with light images additionally inspected at original detail. Dark layout retains baseline hierarchy/spacing; light content uses readable dark text/green headings; legacy dark Nav/Footer remain readable; no clipping or horizontal overflow. Axe4.12.1 has zero scoped/full violations and zero incomplete checks in each case. Keyboard skip/main/home/mail focus and desktop theme persistence pass. This is Chrome153 verification, not Safari/Firefox or a human screen-reader audit.

Build retains exactly the prior 71 standalone missing-lang warnings and 6804 unsupported-selector diagnostic lines. These are documented inherited limitations, not hidden failures. Next-generated next-env.d.ts and the tracked standalone out/lab/pen-plotter-autoresearch/index.html were preserved as external generated snapshots, then restored from prebuild bytes. No generated output is included in the pilot patch.

Review accepts A1–A9 against these source, test and visual artifacts. Parent owns the final staged-diff/security check, scoped local commit, safe fast-forward merge and A10 ancestry/preservation verification, followed by checks on actual merged main. Their exact SHA/command/hash evidence is persisted outside the repository at /Users/djm/.hermes/profiles/beau/reports/polar-pilot/finish-verification.md and finish-commands.jsonl so the commit does not need to refer to its own hash. No publication authorized or attempted.
