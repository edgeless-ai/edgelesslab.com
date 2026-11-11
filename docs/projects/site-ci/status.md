# Site CI session handoff

## 2026-11-10 — publish lanes can no longer land red on main (edgeless/t_9f85a4da)

Registry: one JSON file per notebook, `src/lib/marimo-entries/<slug>.json`, collected
by `loadMarimoDemos()`. The filename is the slug and collection order is sorted
filename order, so it is deterministic and independent of merge order. Two concurrent
publish lanes now change disjoint paths: a real `git merge-tree` of two concurrent
registry additions exits0 with both entries present, and each branch's diff vs main
touches exactly one file. The PR #92 failure mode (hand conflict resolution dropping
two entries in one shared array) has nothing left to collide.

Merge gate: `npm run publish:merge -- --pr <n>` (scripts/merge-publish-pr.mjs) refuses
a closed/draft/main-headed PR, watches checks on the exact head commit, refuses
anything not pass/skipping or missing frontend-tests/e2e-tests, re-reads the head,
then merges that commit with `--match-head-commit`. 13 negative cases cover it.
`publish:checked` already refuses dirty trees and main; the pre-push hook already
refuses direct pushes to main.

Branch protection (frontend-tests + e2e-tests as required checks) is NOT enabled and
cannot be from an agent session: `.../branches/main/protection` returns404 and the
available token reports `admin:false` on edgeless-ai/edgelesslab.com. Enable and
rollback commands are in ../../notebook-publication.md; current settings were
captured as "none" for rollback.

Evidence: migration fidelity 61/61 entries, 0 drift, 27 published on both sides;
`tsc --noEmit` exit0; 221 Vitest tests in20 files; 22 node --test publication cases;
PR #103 `frontend-tests` green on the real CI job; probe PR #104 (deliberately broken
entry) refused while its checks were red; probe PRs #105/#106 both MERGEABLE.

### Previous handoff (edgeless/t_0eccf265)

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
