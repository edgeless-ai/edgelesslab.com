# Overnight Swarm-Factory Goal Loop — 2026-07-15

**Goal:** make the swarm "leaps and bounds better," structured as IndyDevDan's software-factory model (youtu.be/VQy50fuxI34 — full transcript pulled).
**Mode:** degraded/in-session (no reboot — swap at ~25GB OOM-killed heavy Codex runs), jojo READ-ONLY, gated (safe builds unsupervised, risky held).

---

## TL;DR
The swarm's disease was the video's exact anti-pattern: **deterministic code existed but was unplugged, so the swarm trusted agent self-report.** Proof: the **done-gate** (built tonight) found that of the last 60 tasks marked `done`, **only 5 genuinely verify** — 29 outright FAIL (hollow / missing artifacts), 26 give no evidence. The old Atlas pulse was reporting that 573-task fiction pile as "🟢 Shipped."

Tonight installed the **deterministic trust layer** the factory model was missing. It runs warn-only (observe-then-enforce). **The one thing that unlocks real throughput is yours: the 272-blocked crash-loop fix.**

---

## Built + committed (branch `feat/done-gate-deterministic-backbone`, NOT merged/pushed)

| Commit | What | Verification evidence |
|---|---|---|
| `6efbd84d` | **Done-gate** — `.claude/hooks/verify-completion.py` (CLAUDE.md declared it MANDATORY; it didn't exist). Re-verifies a task's claims: artifacts must exist, tests must re-pass, hollow `result_len=0` flagged. Warn-only (`DONE_GATE_ENFORCE=1` to block). | `--task t_1e3e98da` → FAIL (KB file absent, confirmed). `--audit-recent 60` → 5 verified / 29 FAIL / 26 unverifiable. |
| `ac67e32c` | **Pre-commit gate** — `scripts/hooks/pre-commit` (was 39-line secret-scan only, not version-controlled). Adds staged-file compile/shell/skill checks. NOT the full smoke_test (which exits 1 on missing deps → would block all commits). | Blocks a Python `SyntaxError`; passes clean; **ran live** on 3 of tonight's own commits. |
| `5a139287` | **Taxonomy monitor** — `scripts/cron/taxonomy-check.sh` (warn-only; enforcing would block on 24 pre-existing violations). | Runs `taxonomy-triage.py --check` → 24 violations logged. |
| `052b5497` | **ADW catalog v1** (`docs/adw-catalog.md`) + **CI gate** (`.github/workflows/ci.yml`, server-side mirror). | CI YAML-valid; compile+skill checks pass on current tree. Activates on push (David-gated). |

## Fixed (Hermes-side, `~/.hermes`, backed up, not a git repo)
- **image-dispatcher fallback** — a drifted `image_gen.provider` now falls through to the active provider (`ContentCannonProvider`) instead of hard-erroring and 0%-ing the swarm (the original incident's exact mechanism). Verified: `get_provider('bogus')→None`, `get_active_provider()→ContentCannonProvider`.
- **Atlas + memer restored** — were hard-down (`deepseek-v4-pro` exhausted on freellmapi). Moved onto the verified `cerebras` free-blend (`model.default=free-blend`). Atlas responds again (digest-ready).
- **Memory retrieval** — `parse_frontmatter` in `memory-query.py` + `regen-memory-index.py` now reads keys nested under `metadata:`; **36 previously-invisible files recovered** (index 339→375).
- **Flow** — 5 stalled `ready` tasks had typo'd assignees (`edgeless cc`→`edgeless-cc`, `devops`→`builder`); reassigned, now dispatchable.

## Verify-first catches (prevented harm — the point of the whole exercise)
1. **config-validator wiring** — the audit said "wire the dead orphan." Reality: it's unwired AND has a stale allowlist (`Free through 2026-05-27`) AND crashes on missing `yaml`. Wiring it would've created a broken, crashing gate. **Not wired.**
2. **edgelesslab/ mass-deletion** — 365 site files got deleted from the working tree by the swarm's branch churn. Verified safe in git, **restored from HEAD, no data loss.**
3. **Wing backfill** — classify.py's rules are stale; it would've dumped all 39 wing-less files into the `user` wing (mis-classifying your KB, worse than leaving them). **Deferred.**
4. **Audit "config-validator has 0 refs"** — actually 80 (noise: caches/logs). Caught before acting.

---

## 🔴 David's move (prioritized)
1. **Fix the 272-blocked crash-loop (THE unlock).** Root cause (audit): workers exit in 10-14s without `kanban_complete` → dispatcher fake-flags a crash ~300s later via lock expiry → `failure_limit=2` blocks permanently. Fix the exit/complete contract; distinguish clean-incomplete from crash. **Do NOT bulk-unblock first** (re-triggers the storm). *Until this is fixed, the swarm can't reliably execute — everything built tonight is the trust layer that makes it safe once it flows.*
2. **Flip `DONE_GATE_ENFORCE=1`** once you've seen the audit — then the swarm can no longer self-certify.
3. **MoA heal decision** — `set_moa_blend.py --all` would fix the 6 degraded profiles but concentrates every aggregator on the one cerebras key (single point of failure). Your call. Global aggregator swap also held.
4. **config-validator repair** — source its allowlist from the swarmctl registry + fix the `yaml` dep, then wire it (`config-lint` ADW).
5. **Memer** needs `DISCORD_BOT_TOKEN_MEMER` to bring its gateway online.
6. **Merge `feat/done-gate-deterministic-backbone`** when you've reviewed (nothing pushed).

## Cost / discipline
FREE-only throughout (no paid spend). jojo untouched. Honest-kill held (nothing faked). Backbone runs warn-only — observe before enforce. Codex OOM-died repeatedly in degraded mode, so builds were done directly + verified rather than delegated — a reboot would restore heavy-agent reliability.
