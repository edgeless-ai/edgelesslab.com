# Notebook publication: test once, push the verified commit

The gallery's source of truth is one JSON file per notebook,
`src/lib/marimo-entries/<slug>.json`, collected by `src/lib/marimo-demos.ts`.
`published_url` is an explicit live-verification opt-in, not a URL inferred from
every draft slug. Keep the new notebook unpublished until its live controls and
console/network have been exercised and evidence recorded. HTML delivery alone
is not proof of Python execution or control correctness.

## Why one file per notebook

Every publish lane used to append an object literal to a single `marimoDemos`
array, so two lanes in flight conflicted in the same file. A hand conflict
resolution dropped two entries and merged red (PR #92), which took main and the
Pages deploy down until PR #95 restored them. Now each lane adds
`src/lib/marimo-entries/<slug>.json` — a path no other lane writes — so the
merge is conflict-free and no hand resolution can delete a neighbour.

- The filename IS the slug. `loadMarimoDemos` throws on a mismatch, so a renamed
  file cannot advertise a URL that no longer exists.
- Collection order is sorted filename order, so rendering does not depend on
  which branch merged first.
- Never recreate an inline array in `marimo-demos.ts`; that reintroduces the
  single shared write target.
- Unpublished records live in the same directory without a `published_url`.
  Adding a *second* published entry in one branch is fine: only one file changed.

On a scoped PR branch, commit the changes and run:

    npm run publish:checked

The checked-push command refuses dirty trees and main/master. It runs:

1. Full static export, including catalog validation, TypeScript and build gates.
2. All Vitest tests.
3. Actual Playwright smoke tests against that export, including gallery cards,
   titles, descriptions, tags, draft exclusion, category grouping and JSON-LD.
4. Analytics consent Playwright regression tests.
5. Publisher-only live checks for every new/changed opted-in notebook since the
   merge-base with `origin/main` (fetch main before publication): canonical URL, HTTP 200,
   notebook/code markers and a nonempty JavaScript entry bundle. Missing pages,
   soft-404 pages, broken bundles and redirects fail closed, without blind retries.

Only after every command succeeds and both HEAD/branch and the clean worktree are
unchanged does it push the exact tested SHA to the canonical organization repo.
It does not merge, deploy or replace independent review/exact-head GitHub checks.
Do not bypass failed local checks with repeated remote pushes or reruns.
`npm run verify:publication` runs the same gates without pushing (useful before
committing). Install Playwright Chromium first if it is not already available.

## Merge only after the checks pass

`main` has **no branch protection**, so nothing server-side stops a lane from
merging a PR whose checks are still running or red. PR #92 merged ~11s after its
checks started, while they were failing. The merge itself is therefore gated in
the repository:

    npm run publish:merge -- --pr <number>

It resolves the PR, refuses a closed/draft PR or one whose head is `main`, waits
for every check on the exact head commit (`gh pr checks --watch --fail-fast`),
refuses if any check is not `pass`/`skipping` or if `frontend-tests`/`e2e-tests`
never ran, re-reads the head, and only then runs
`gh pr merge --squash --match-head-commit <head>`. Use
`npm run publish:merge -- --pr <number> --dry-run` to assert the gate without
merging. A lane that merges by hand with `gh pr merge` bypasses all of it.

`publish:checked` already refuses dirty trees and `main`, and the repo's
`pre-push` hook refuses direct pushes to `main` (emergency override:
`EDGELESS_ALLOW_MAIN_PUSH=1`). Those two stop the push; `publish:merge` stops
the merge.

## Branch protection (not yet enabled)

Required status checks — `frontend-tests` and `e2e-tests` — are **not** enabled
on `main`: `GET /repos/edgeless-ai/edgelesslab.com/branches/main/protection`
returns 404, and the available token has no admin permission on that repository,
so it cannot be set from an agent session. A repository admin can enable it with:

    gh api -X PUT repos/edgeless-ai/edgelesslab.com/branches/main/protection \
      -F 'required_status_checks[strict]=false' \
      -F 'required_status_checks[contexts][]=frontend-tests' \
      -F 'required_status_checks[contexts][]=e2e-tests' \
      -F 'enforce_admins=false' -F 'required_pull_request_reviews=' \
      -F 'restrictions='

Rollback:

    gh api -X DELETE repos/edgeless-ai/edgelesslab.com/branches/main/protection

Keep `enforce_admins=false` while any lane still needs an audited direct push;
`true` will reject those pushes outright. Before enabling, confirm no lane pushes
directly to `main` (the `pre-push` hook plus `publish:checked` are the current
answer), otherwise the named lanes start failing instead of merging.

## Why no fixed notebook totals?

Never edit a second URL list, total, or category count in a smoke test when adding
a publication. The test validates the raw catalog independently of the UI's
filtered export, then compares the full rendered projection to that validated
catalog. Negative fixtures guard malformed/duplicate URLs and slugs, unverified
entries, malformed metadata and broken delivery. Adding a valid publication or
changing source order does not require test edits. Invalid data still fails.

Live delivery checks cover new/changed opted-in entries, not unrelated historical
failures. `npm run audit:publication-live` explicitly audits the whole catalog.
The first audit found pre-existing HTTP 404s for `borwein-falsifier`,
`2609.38201-speculative-tool-exec` and `2610.20838-srq-endpoint-weight`; those
need separate bundle restoration, not invented links or unrelated content edits.

Live delivery checks run explicitly before publishing, not inside every offline
PR CI run: a third-party/CDN outage must not create unrelated site-failure mail.
Frontend and E2E workflows keep all existing branch/event coverage with no path
skips, ignored failures or disabled tests. Workflow-and-PR/ref-scoped concurrency
cancels superseded runs only; unrelated PRs and main remain independently tested.
This reduces redundant in-flight runs; it does not mute mail or promise that
legitimate future failure notifications disappear.

## Publisher audit

The repeated PR69/PR74 failures were coupled to manual notebook totals, ordered
URL lists, JSON-LD counts and category badges. PR73 also needed syntax/await
repairs during those assertion updates. The checked-push gate builds and runs the
actual suites before pushing, catching these locally instead of emailing after
each attempted assertion patch. External publishing agents must call the checked
entry point from this repository; a direct `git push` cannot be intercepted by a
portable repository script. CI remains the mandatory backstop.
