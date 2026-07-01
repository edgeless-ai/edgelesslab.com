---
name: harden-audit-rubric
description: Vet a generic audit/instruction rubric against a REAL repo and rewrite it into a project-safe, read-only instruction set before handing it to an autonomous agent (Fable 5 or any model). Use when someone wants to run a code-audit rubric (e.g. a Perplexity/deep-research report) autonomously on a live repo.
metadata:
  tags:
  - audit
  - autonomous-agent
  - safety
  - read-only
  - rubric
  tier: task-specific
  domain: tooling
when_to_apply: Before an autonomous agent executes any audit rubric or instruction set on a real codebase — especially money-moving, deploy-capable, or mid-release repos.
---
# Harden Audit Rubric

Turn a generic audit rubric into a **project-safe, read-only instruction set** an autonomous agent can run without breaking anything. Nothing existing covers this — `code-review`/`quality`/`security-review` review code; this hardens the *instructions you hand another agent*.

**Why it matters:** autonomous agents follow rubric directives literally, and innocuous steps have real blast radius — "verify each dependency has no CVEs" → registry hits + `npm audit`/`snyk` installs; "inspect git history" → git writes (catastrophic in a monorepo subdir); "trace execution paths" → misread as *run the app* (live Stripe/email/credits, or `fastlane release` on a mid-review app → queue reset / cert revocation). See memory `feedback-autonomous-agent-audit-rubric-hardening` and the taxonomy `reference-ai-code-audit-taxonomy`.

## Usage
```
/harden-audit-rubric <target-repo-path> [source-rubric-file-or-paste]
```
If no source rubric is given, build one from the 6-pass taxonomy in `reference-ai-code-audit-taxonomy`.

## Procedure (vet → sanitize → pre-seed → bound → single-write)

1. **Vet against the REAL repo.** Scan the target: stack, entry points, secret surfaces, destructive scripts, deploy/submit tooling, and whether it's a standalone git repo or a **monorepo subdir** (decides how dangerous git is). Grep for money/live-API/exec/network markers.
2. **Prune N/A passes.** Generic rubrics assume a stack the repo may not have. Drop passes that don't apply (no DB → no SQLi; offline app → no CORS/JWT/SSRF/dependency-hallucination) and **retarget the freed budget to the real crown jewels** (payments: gate fail-closed, idempotency, spend cap; iOS: mic/camera data exfiltration, permission handling, crash surfaces).
3. **Write the §0 safety wrapper**, keyed to *this* repo's hazards — not generic boilerplate:
   - Read-only default. No writes/moves/deletes.
   - **No mutating git** (list subcommands). Allow read-only `git log/blame/show/diff` only if a pass needs history.
   - **No executing app code/scripts/tests**, no deploy/submit tooling (`fastlane release/deliver`, ASC API, `xcodebuild`, `uvicorn`, `docker`), no running the app.
   - **No network, no installs.**
   - **Never read secret files** (`.env`, `*.p8`, `*.mobileprovision`, credentials) — report var names, never values.
   - Pin "trace execution paths" = **read statically**.
   - **List the neutralized directives** from the source rubric so they aren't resurrected.
4. **Pre-seed the architecture map** into the rubric (service table, crown-jewel files, sensitive endpoints) so the agent doesn't burn its usage window rediscovering it. Add a hard tool-call budget and "emit report once."
5. **One sanctioned write:** allow exactly one output file, `AUDIT_FABLE_RESULT.md` at the target repo root, written incrementally so partial results survive a window cut-off.
6. **Tier-2 non-breaking fixes: OFF by default.** If explicitly enabled, allow only comments/docstrings/docs/mocked tests, and require STOP-and-list-every-diff. Never logic, secrets, git, or running anything.

## Output
Write the hardened rubric to `<target-repo>/AUDIT_RUBRIC_FABLE.md`, plus a short kickoff prompt the user pastes into the agent session. Report to the user: which source directives were neutralized and why, and which passes were pruned as N/A.

## Worked examples (templates)
- `hackathon-autoreason/AUDIT_RUBRIC_FABLE.md` — Python/FastAPI live-money agent swarm.
- `products/the-clapper/AUDIT_RUBRIC_FABLE.md` — offline SwiftUI/AVFoundation iOS app, mid-App-Store-review.

## Related
- Memory `reference-ai-code-audit-taxonomy` (the 6-pass method + failure-mode checklist).
- Memory `feedback-autonomous-agent-audit-rubric-hardening` (the why + how).
- Skills `code-review`, `security-review`; agent `quality` (for running review directly, not via an autonomous handoff).
