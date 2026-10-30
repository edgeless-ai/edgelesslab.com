# Notebook publication: test once, push the verified commit

The gallery's source of truth is `src/lib/marimo-demos.ts`. `published_url` is an
explicit live-verification opt-in, not a URL inferred from every draft slug.
Keep the new notebook unpublished until its live controls and console/network
have been exercised and evidence recorded. HTML delivery alone is not proof of
Python execution or control correctness.

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
