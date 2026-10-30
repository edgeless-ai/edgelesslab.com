# Site CI session handoff

Implemented source fix: remove hand-maintained notebook URL/count/category
expectations, independently validate the raw publication catalog and compare
rendered cards/metadata/draft exclusion/categories/ordered JSON-LD. Negative
fixtures reject malformed/duplicate/unsafe URLs and broken notebook delivery.

Publisher checked-push builds and runs actual tests before pushing the exact clean,
unchanged SHA. AST-based selection probes new/changed opted-in notebooks; explicit
all-catalog live audit stays separate from deterministic offline CI. Frontend/E2E
concurrency cancels superseded runs on the same workflow and PR/ref, without
changing triggers, jobs, steps or legitimate regression coverage.

Execution evidence (durable attachment8425 on edgeless/t_0eccf265):
- Reproduced actual Chromium expected15/received16 failure against the static build.
- Full build,213 Vitest tests across20 files,14 smoke and3 consent tests passed
  using existing PUBLIC GitHub build variables only in subprocess environment.
- Growth experiment: temporary local17th opted-in notebook/Research8 passed the
  unchanged Chromium assertion and real notebook+JS delivery check; source restored.
- Eight checked-push/AST negative tests and28 catalog/delivery unit cases passed.
- Independent code review requested via t_5f4e9840; remote publication/check proofs
  are recorded on the primary task/PR after this pre-push handoff snapshot.

Separate historical defect: three opted-in URLs returned real HTTP404; triage card
 t_5ff3b476 owns follow-up. No unrelated source/content edits were made to hide it.

Recovery notes: task bootstrap had partial files and a dangling gitdir. The native
workspace resolver recovered the same task path/branch after the entire orphaned
folder was preserved as .worktrees/t_0eccf265-bootstrap-recovery. Do not create a
second worktree/worker for this task. No credentials/gateway/runtime/model files,
notification settings or disabled tests are part of this change.
