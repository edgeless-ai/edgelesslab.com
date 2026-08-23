# Overnight goal loop — prompt-engine + site polish (2026-08-23 → morning)

Self-scheduling loop (ScheduleWakeup) continuing autonomous work while David is away.
Scope: **whole prompt-engine + site polish**. Deploy: David explicitly authorized
production deploy + re-arming the loop; the loop now runs in a DEDICATED WORKTREE and
**auto-deploys verified increments** to `canonical/main` (fast-forward only), then
verifies live. This removes the shared-checkout dependency that stopped the first run.

## Where the loop runs (IMPORTANT)
- **cwd (dedicated worktree):** `/private/tmp/claude-501/-Users-djm-claude-projects/3431bf36-e9f4-4b7a-ac3d-4c11b87c23c6/scratchpad/el-deploy`
- **Branch:** `site/prompt-engine-weighting` (a lane == canonical/main + loop commits). node_modules already installed here.
- **NEVER touch** the shared checkout at `/Users/djm/claude-projects/edgelesslab.com` (other sessions use it) or the `el-reconcile` worktree.
- Canonical production repo: `edgeless-ai/edgelesslab.com` (Pages cname edgelesslab.com). Push with the inline gh credential helper: `git -c credential.helper='!/opt/homebrew/bin/gh auth git-credential' push canonical HEAD:main` (the plain push fails "could not read Username" in this env; sandbox off + inline helper works).

## Hard guardrails (every iteration)
- **Deploy = fast-forward only.** Before pushing, `git fetch canonical main`; if not a FF (someone advanced main), `git rebase canonical/main` and RE-VERIFY the full gate before pushing. NEVER force-push.
- **NO external actions** except the authorized `git push canonical HEAD:main`. No email/DM/publish/other gh writes.
- **NO destructive ops**: no rm -rf, rsync --delete, history rewrites, branch deletes.
- Python `blender.py` is source of truth; never weaken golden fixtures — regenerate from Python if bank data changes.
- Writing voice: no em-dashes; plain prose.
- Prefer high-confidence changes (prompt-engine features/fixes, tests, a11y, docs). For subjective visual/content site changes, keep them MINIMAL and reversible.

## Per-iteration protocol
1. `git fetch canonical main`; if behind, rebase onto canonical/main first.
2. Pick ONE well-scoped improvement from the backlog (or a better one found).
3. Implement it (smallest change that works — Ponytail).
4. Verify ALL: `pnpm exec vitest run src/lib/prompt-engine` → `pnpm exec tsc --noEmit` (zero errors) → `pnpm exec eslint <changed files>` → `pnpm build` → `pnpm exec playwright test`. All must pass.
5. Adversarial self-check on any engine/RNG/parity change before committing.
6. Commit locally by pathspec (never `git add -A`).
7. If FF-able and gate green: push to canonical/main; then `gh run watch` the Deploy run to success and curl-verify the live route + a marker for the change. If CI fails or live-verify fails: STOP the loop (leave it for morning), do not keep deploying on a broken base.
8. Append a one-line entry to the log below. Schedule the next wakeup (~600s). If out of sensible safe work, or blocked twice on the same thing, STOP the loop.

## Backlog (reassess each iteration; do the highest-value safe item)
- [ ] Preset taste packs showcasing weighting (e.g. "painterly-heavy", "type-forward") so the feature is discoverable.
- [ ] Prompt-engine UI: per-axis "N weighted" badge + a dedicated "clear weights" affordance.
- [ ] BYO-TASTE-SPEC.md: document the weighting feature + coverage caveat.
- [ ] Accessibility sweep on the Customize drawer (focus order, aria on steppers, keyboard).
- [ ] Prompt-engine: surface the coverage/weights interaction inline where a covered theme is selected.
- [ ] Lab page: tighten prompt-engine card copy; cross-links to related tools.
- [ ] General site polish: meta/OG tags, dead-link check, small consistency fixes — one small verified change at a time.

## Log
- 2026-08-23 22:3x — weighting feature built + adversarial-reviewed (4 fixes). Loop v1 STOPPED on shared-checkout branch entanglement.
- 2026-08-23 22:5x — RESOLVED: cherry-picked/rebased weighting onto canonical/main (after ox-audit PR #18 merged), DEPLOYED to production (main eb430dba3), CI green, live-verified (weighting marker served from prod). Loop RE-ARMED in dedicated worktree with auto-deploy.
- 2026-08-23 23:1x — iter2: per-axis 'N weighted' badge + dedicated 'clear weights' control (519638177). Gate green, CI green, live-verified.
- 2026-08-23 23:2x — iter3: theme-aware coverage/weights note in Customize drawer + em-dash fix (30b4cc6f8). Gate green, CI green, live-verified.
- 2026-08-24 00:0x — iter4: documented weighting v2 in BYO-TASTE-SPEC (schema+semantics). Docs-only; committed to lane (no standalone deploy; rides next code push). Tree green.
- 2026-08-24 00:2x — iter5: a11y — weight-stepper value announced to screen readers (aria-live) (0ba72032b). Carried the 3 staged docs commits. Gate green, CI green, live-verified.
