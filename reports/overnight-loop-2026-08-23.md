# Overnight goal loop — prompt-engine + site polish (2026-08-23 → morning)

Self-scheduling loop (ScheduleWakeup) continuing autonomous work while David is away.
Scope chosen by David: **whole prompt-engine + site polish**. Deploy autonomy:
David selected auto-push, but the loop **commits locally only** and stages a verified
batch for a single morning approval (see session note — production deploy needs
explicit in-request authorization + human runbook verification; a loop can't do the
clean-browser/console check the runbook mandates).

## Hard guardrails (every iteration)
- **NO production push** to `canonical` (edgeless-ai/edgelesslab.com). Commit to local `main` only.
- **NO external actions**: no email/DM/publish/forms, no `gh` writes, no network sends.
- **NO destructive ops**: no `rm -rf`, no `rsync --delete`, no history rewrites, no branch deletes.
- Stay inside `/Users/djm/claude-projects/edgelesslab.com`. Shared checkout → commit by explicit pathspec only; never `git add -A`. Leave other sessions' files (out/, next-env.d.ts, reports/ox-*) alone.
- Python `blender.py` is source of truth; never weaken golden fixtures — regenerate from Python if bank data changes.
- Writing voice: no em-dashes; plain prose.

## Per-iteration protocol
1. Pick ONE well-scoped improvement from the backlog below (or a better one you find).
2. Implement it (smallest change that works — Ponytail).
3. Verify: `pnpm exec vitest run src/lib/prompt-engine` → `pnpm exec tsc --noEmit` (no NEW errors) → `pnpm exec eslint <changed files>` → `pnpm build` → `pnpm exec playwright test`. All must pass.
4. On any risky logic (engine/RNG/parity), do an adversarial self-check before committing.
5. Commit locally by pathspec with a clear message. Append a one-line entry to the log below.
6. Schedule the next wakeup (ScheduleWakeup, ~600s). If out of sensible work or blocked twice on the same thing, STOP the loop (don't invent risky changes).

## Backlog (reassess each iteration; do the highest-value safe item)
- [ ] Preset taste packs that SHOWCASE weighting (e.g. "painterly-heavy", "type-forward") so the feature is discoverable, not just mechanical.
- [ ] Prompt-engine UI: a "reset weights" affordance + a count badge showing how many entries are weighted per axis.
- [ ] Lab page: tighten the prompt-engine card copy; ensure cross-links to related tools.
- [ ] Accessibility sweep on the Customize drawer (focus order, aria on steppers, keyboard).
- [ ] BYO-TASTE-SPEC.md: document the weighting feature + coverage caveat.
- [ ] Prompt-engine: surface the coverage/weights interaction inline where a covered theme is selected (so users aren't surprised weights are ignored).
- [ ] General site polish: meta/OG tags, dead-link check, small visual consistency fixes — one small, verified change at a time.

## Log
- 2026-08-23 22:3x — setup. Weighting feature committed `d3a3b2c61` (103 vitest, build + 7 playwright green). Adversarial review run; 4 findings fixed. Loop armed, local-commit-only.
