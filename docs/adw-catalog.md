# ADW Catalog v1 — the swarm's AI Developer Workflows

> Guided by IndyDevDan, *"Loop Engineering is Dead — Build AI Developer Workflows"* (youtu.be/VQy50fuxI34).
> **Three actors:** engineers · agents · **code**. Code is the reliable backbone (deterministic, zero-token, no hallucination). Engineers show up at **planning** and **review**; deterministic gates guard the middle. Don't over-leverage agents ("AI psychosis"). Build the system that builds the system.

An **ADW** = `ticket → (a named workflow of code + agents) → verified result`. This catalog names the repeatable workflows the swarm now has the *deterministic pieces* for, so work can be **routed** (by task label) instead of ad-hoc-assigned.

## The deterministic gates (the backbone — built 2026-07-15)

| Gate | What it does | Command | State |
|---|---|---|---|
| **pre-commit** | staged `.py` compile + `.sh` syntax + skill-frontmatter + secret scan | `scripts/hooks/pre-commit` (installed) | **LIVE** (blocks bad commits) |
| **done-gate** | a kanban task can't be `done` unless its claimed artifacts exist + claimed tests re-pass | `.claude/hooks/verify-completion.py --task <id>` | warn-only (`DONE_GATE_ENFORCE=1` to block) |
| **done-gate audit** | sweep recent `done` for hollow/fake completions | `scripts/cron/done-gate-audit.sh` | warn-only |
| **taxonomy check** | canonical-location drift | `scripts/cron/taxonomy-triage.py --check` | warn-only (24 open) |
| **smoke test** | compile + import + skill + shell suite | `scripts/preflight/smoke_test.py` | manual (needs full deps) |

*Observe-then-enforce:* gates run warn-only first so pre-existing debt doesn't block work; flip to enforce after triage.

## The workflows

Each ADW is **plan → build → test → review**. The engineer (David) shows up only at plan and review; the gates are the automated middle. `owner` = the swarm profile / actor that runs the build.

### 1. `feature` — new capability
- **trigger:** kanban label `feature`
- **plan:** scout reads the codebase + prior art → writes a mid-level plan (SOTA model). *Lesson: reuse existing infra — check before building ([[Anti-Pattern: Building in Isolation]]).*
- **build:** builder implements in an isolated worktree (workhorse model). *One workload at a time under OOM.*
- **test:** pre-commit gate + `smoke_test.py` on touched files; re-run any claimed tests.
- **review:** engineer (or a reviewer agent) checks the diff; **done-gate must pass** before `done`.
- **owners:** scout=edgeless-cc/cerebras-scout · build=builder/kilo · review=ombudsman + David

### 2. `hotfix` — production down / broken pipeline
- **trigger:** kanban label `hotfix` or a `#bot-backroom` alert
- **plan:** a specialized hotfix agent (prioritized for speed, not elegance) proposes the minimal fix. **human-in-the-loop approve/reject.**
- **build:** race N sandboxes toward the fix; first verified wins.
- **test:** the fix must reproduce green deterministically (not agent self-report).
- **review:** engineer validates → ship ASAP.
- *Lesson: verify the monitor before chasing the symptom — 3 of tonight's 5 "problems" were a lying health script, not real breakage ([[reference-swarm-health-phantom-alarms]]).*
- **owners:** hotfix=guardian/hive · review=David

### 3. `done-gate-audit` — trust maintenance (META)
- **trigger:** scheduled (nightly) + on any bulk-completion event
- **build/test:** `verify-completion.py --audit-recent N` → flags hollow/fake `done` (tonight: only 5 of 60 verified).
- **review:** surface fails to David; when clean, flip `DONE_GATE_ENFORCE=1` so the swarm can no longer self-certify.
- **owner:** guardian/ombudsman

### 4. `config-lint` — provider/config drift guard (PLANNED — needs repair)
- **intent:** reject configs pointing at unregistered/dead/single-tool providers (the drift that 0%-ed image-gen and hard-downed atlas/memer this session).
- **pieces:** `config-validator.py` exists but is **unwireable as-is** (stale allowlist, crashes on missing `yaml`, unwired). Repair = source the allowlist from the swarmctl registry + fix deps, then wire at gateway-startup + pre-commit.
- *Lesson: a lying/stale gate is worse than none — verify a gate gives correct answers before wiring it.*
- **owner:** guardian/edgeless-cc (David-gated)

### 5. `memory-curate` — knowledge hygiene
- **trigger:** scheduled + after research sessions
- **build:** backfill missing `wing/type` (37 files), normalize off-taxonomy wings, repair broken `[[links]]`, regen `INDEX.md`.
- **test:** `_schema/memory-query.py --wing X` resolves; index count stable/rising (tonight: parser fix recovered 36 files, 339→375).
- **owner:** curator / a subagent

## Factory router (next)
A thin router reads the kanban label and dispatches the matching ADW at the right cost/speed: `hotfix`/`feature` get SOTA planners + workhorse builders; `chore` gets a single lightweight agent. Don't deploy heavy workflows for a chore. *(Not yet built — the current dispatcher routes by profile assignment only.)*

## The unlock
None of these run reliably until the **272-blocked crash-loop** (workers exit before `kanban_complete` → dispatcher fake-flags a crash → `failure_limit` blocks permanently) is fixed. That's the pipeline unlock — held for David. Everything above is the **trust layer** that makes the factory safe once the pipeline flows.
