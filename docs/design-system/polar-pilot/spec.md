# Polar pilot: Support page

Status: User authorized finishing, local commit and safe local merge on 2026-09-11. No publication authorized.

## Goal and repository truth

Make off-system styling fail a mandatory local/CI check for the real `/support/` route while preserving its content, dark appearance, layout, and links. Exercise the contract with positive and adversarial examples; separately verify visual quality and accessibility. Green token checks do not guarantee good design, usability, or accessibility.

- Canonical repository: `/Users/djm/claude-projects/edgelesslab.com`
- Baseline: `main`, `70f0e3b6b21ba0480c208fcf47fe310e3156560c`
- Isolated worktree: `/Users/djm/.hermes/profiles/beau/experiments/polar-support-pilot-20260911`
- Branch: `site/polar-support-pilot-20260911`
- Trunk has unrelated product-content edits and untracked content/audit artifacts. Their baseline status and SHA-256 hashes are saved in `/Users/djm/.hermes/profiles/beau/reports/polar-pilot/baseline-git.json`. Preserve those files exactly; only integrate the verified pilot on local main under the finish authorization.
- Source: vault note `03-Knowledge/instagram-reels/DdEmxqPuTip-polar-llm-safe-design-system.md` and `captures/instagram/DdEmxqPuTip/polar-source.txt` in the canonical workspace.

## Existing stack and design decisions

Next 16.3 static export, React 19.2, TypeScript strict, Tailwind 4, global CSS variables, Geist local fonts. Existing Vitest and Playwright infrastructure. No pre-existing token enforcement was found in source, scripts, or workflows. Reuse this stack; no StyleX and no dependency/model/API changes unless strictly necessary and within authorized scope.

Select Support because it is a real, low-risk static route with headings, paragraphs, a list, home navigation, and a mailto link. Do not migrate privacy/terms, navigation/footer, or interactive product surfaces.

Preserve effective styles, including unlayered `.prose-custom` overrides: 24px page gutters, 128px top/80px bottom padding, 1280px outer width, 640px reading measure, 32px bold page title, 22px/600 section headings, 15px/1.8 prose, 14px subtitle, 13px back link, 6px list-item spacing, 24px list indent. Preserve actual computed margins rather than blindly copying overridden Tailwind utilities. Elevation is none on this page; do not add cards or shadows.

Existing palette: dark canvas #09090B, primary #FAFAFA, secondary white/70%, muted white/55%, accent #C6F24E. Intended light values from globals: canvas #FAFAFA, primary #111111, secondary black/65%, muted black/58%, accent #4D7C0F. The existing `[data-theme="light"] :root` selector appears ineffective; baseline browser evidence will establish this. Implement paired pilot tokens tied to existing theme selection without a global theme repair. Shared shell remains a documented legacy boundary.

## Contract and boundaries

1. Introduce a small semantic token catalog for paired colors, spacing roles, typography, reading widths and no elevation; types derive from catalog keys.
2. Typed primitives preserve real `main`, `section`, `h1`, `h2`, `p`, `ul`, `li`, `strong`, and anchors. Use closed semantic element/variant sets. Add `main#main-content` so the existing skip link works.
3. Consumer scope is the entire Support route directory, recursively, including new helper files. No raw HTML layout/style tags, arbitrary styles/classes, JSX prop spreads, style injection, unchecked imports, dynamic element construction, type-suppression escape paths, or unknown tokens. AST enforcement, not a regex approximation. Reject raw colors/spacing through any consumer styling prop and validate the token adapter boundary too. Do not advertise this as a JavaScript security sandbox.
4. Raw values belong only in the reviewed token catalog. The primitive adapter may materialize tokens as CSS/DOM; document and narrowly enforce that exception. Existing Nav/Footer and metadata helper are explicit imports only; consumer props may not restyle them. No wildcard lint disables or open-ended component-import exemption.
5. Expose a mandatory `check:design-system` command and wire it into normal local build/lint and an existing CI workflow. Include dedicated regression tests in the required check. Existing typecheck must actually run; do not set ignoreBuildErrors.
6. No push, publishing/deploying, recurring work, paid calls, credentials, or global config changes. The finish authorization permits scoped local commits and a safe local merge after snapshotting unrelated main changes.

## Acceptance-to-test mapping (written before implementation)

| ID | Acceptance | Evidence/check |
|---|---|---|
| A1 | Real Support page content and links preserved, meaningful HTML | Before/after local browser DOM/text; heading order, main, 4 list items, mailto and home target |
| A2 | Known tokens and semantic variants pass | Positive AST fixtures, TypeScript compile fixtures, page build |
| A3 | Unknown token, raw color and spacing fail mandatory check | Negative fixtures plus actual CLI exit-code mutation probes |
| A4 | Styling escape hatches fail | Negative cases: style/className/css, prop spread, raw HTML, unapproved helper import, element factories, type casts/suppressions; verify recursively scoped files |
| A5 | Primitive adapter cannot smuggle arbitrary values | Adapter/catalog structure checks and negative regression cases; explicit narrow exceptions |
| A6 | Paired light/dark tokens and visual preservation | Baseline and final 1440x1000 + 390x844 screenshots; computed token values, dark geometry comparison, no overflow |
| A7 | Accessible semantics and interactions | Axe or equivalent automated audit, keyboard skip and focus, headings/list/landmark assertions, contrast in both themes; report legacy shell violations separately |
| A8 | Real tooling and integration work | Actual full tsc, build/static export, existing Vitest, focused enforcement tests, relevant browser checks, report unrelated failures |
| A9 | Adoption and rollback are reviewable | Document exact scope/exception policy, add-one-route procedure, rollback paths and commands; inspect diff |
| A10 | Isolation and durable loop | Persist Plan→Act→Test→Review with evidence and adaptive followups; verify baseline trunk hashes and HEAD at end |

## Work item / writer ownership

One fresh builder owns implementation: `src/app/support/**`, new `src/components/design-system/**`, `scripts/design-system/**`, new design-system-specific test/config files, `package.json`, existing `.github/workflows/frontend-tests.yml`, and pilot adoption docs. Lockfiles only if justified. No edits to globals, shared shell, other routes, unrelated configs/content, or this spec without review. Parent owns external reports and browser artifacts and independently reviews the final diff and runs acceptance checks. Build/dev processes must not compete for `.next` writes.

Stop affected work on branch/HEAD movement, shared writer collision, security defects, or need for prohibited external effects. Report baseline failures and pursue all independent feasible acceptance checks. Builder leaves a concrete diff for parent review. Parent owns scoped commits and safe local integration under the finish authorization.

## Goal loop

Persist transitions and evidence in `goal-loop.md`. At Review, accept only evidence-backed criteria; if a check exposes a gap, record the revised Plan and repeat Act→Test→Review. This is an execution record, not a second task backlog.

## Evidence-driven amendment: shell contrast (Cycle 2)

Initial light Surface made the legacy Footer white-on-white and lowered Nav contrast. The acceptance mapping remains unchanged. Permit a narrowly scoped compatibility mapping in the adapter: legacy shell canvas remains dark in both themes; Main receives the paired content canvas; legacy --bg-glass is paired with original translucent dark and opaque dark in light. No shared shell/global source edits. Verify full-page axe in both themes in addition to the scoped audit.

## Finish amendment — Cycle 3

The user explicitly authorized repairing the actual shared font-preload/postbuild root cause, regression coverage, full build and strict browser verification, scoped commits, and a safe local merge. Permit only the shared preload/postbuild files and focused test/command wiring required by that defect; no unrelated feature changes. Parent owns snapshot evidence, review, final docs and integration. Acceptance requires genuinely green strict browser checks; the prior 70/74 result is historical, not completion.
