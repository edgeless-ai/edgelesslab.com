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

## Immutable standalone exports

`public/marimo/<slug>/` is an approved byte boundary, not a Next.js page.
Critters excludes that subtree from HTML processing and empty-CSS cleanup.
Launch-readiness preserves authored notebook metadata while still auditing its
internal references; it must not inject canonical, OpenGraph or Twitter tags.
Postbuild restores the complete authoritative public tree after generic source-map
removal, then `verify-immutable-marimo.mjs` checks every relative path and SHA256
again after repairs and Pagefind. Missing, changed or extra exported files fail.
Do not edit approved HTML to add a CSS opt-out attribute.

The Pages workflow calls `scripts/archive-pages.mjs <archive.tar>`. Ordinary
output retains the existing hidden-file exclusion and `.well-known` exception.
The entire verified marimo subtree is appended once without dotfile exclusions,
and extracted archive bytes are checked against public source. `.nojekyll` is
retained for identity even though workflow-based Pages deploys do not run Jekyll
(and therefore do not need that marker to disable it). Source maps, nested HTML,
empty assets and approved hidden assets are part of the same immutable payload.

`public/marimo/` remains ignored to avoid accidentally adding generated exports.
Only explicitly reviewed payloads should be force-added by scoped path. Never
place `.DS_Store`, Git metadata, credentials or unreviewed generated files there:
this boundary intentionally ships **all** approved source bytes, not an extension
allowlist. The tooling PR must not include or publish a new notebook fixture.

Run `npm run test:font-preloads` for real-Critters, restore, manifest-tamper and
actual-tar extraction regressions. For a new approved bundle, independently retain
source, Git-blob, final-export and extracted-archive manifests, then exercise the
actual notebook controls in a browser. Generic gallery smoke tests cannot prove
notebook runtime or immutable artifact identity. Review/merge and production
HTTP/control verification remain separate gates.

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

`publish:checked` refuses dirty trees and `main`, so a lane that uses the
documented entry point cannot push to `main` even from a fresh clone. On this
machine the shared git dir also carries a local `pre-push` hook (installed
out-of-band by Hive; **not version-controlled**) that refuses direct pushes to
`main` unless `EDGELESS_ALLOW_MAIN_PUSH=1`; every worktree of this checkout
shares it, but a fresh clone does not inherit it. Those guards stop the push and
`publish:merge` stops the merge — but only required status checks on `main` make
either one mandatory for a lane that ignores them.

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

## Cloudflare marimo direct uploads: package the entire pinned catalog

`marimo.edgelesslab.com` is the **edgeless-marimo Cloudflare Pages project**,
not this site's GitHub Pages export. A direct upload replaces the whole project;
never upload only the new notebook or `out/`. Never re-export, optimize, edit
approved HTML, remove old notebooks, or upgrade the paid plan to clear capacity.
Packaging and a live release are separate authorization/verification scopes.

The stdlib-only Python 3.10+ packager is `scripts/package_marimo_pages.py`:

```bash
npm run test:marimo-pages
npm run package:marimo-pages -- \
  --outputs-root /Users/djm/claude-projects/output/marimo-public \
  --output "$TMPDIR/marimo-upload-unique" \
  --receipt "$TMPDIR/marimo-upload-receipt.json"
```

Use a fresh output path **outside the repository and all source roots**. The
receipt must be outside the upload directory too. No network, export or upload
is performed. Exit 2 means do not upload. A capacity failure retains a JSON
receipt and creates **no upload directory**. Only `status: pass` means the
post-copy and source rehash checks completed. `preflight-pass` is not a package.

### Pinned sources, not candidate discovery

`scripts/marimo-pages-catalog.json` pins the exact full-file SHA256 manifest
of each existing mount, the root fallback bundle, the original asset rewrite,
and the known legacy fallback slugs. Its provenance names the immutable parent
deployment and durable evidence archive. It reconstructs that publication from
this repo's `public/marimo/<slug>` plus explicitly named approved `site/` trees
under the outputs root. Sources are read-only; a missing/changed source is a
blocker, never permission to use another candidate. In particular, several local
output candidates differ from the actually published repo copies. Do not copy
all outputs into the upload or infer approval from `gallery-entry.json`.

Preserve original approved site archives outside scratch as well as the JSON
lock; a digest cannot recover missing bytes. A fresh clone needs those archives
for the sources marked `root: outputs`. Repository sources can be recovered
from the catalog's pinned website commit with `git archive` into an isolated
checkout, not by overwriting a shared checkout. Every source manifest is checked
before and after packaging. The tool refuses symlinks, unsafe paths, source
routing files, overlapping mounts and output/input collisions.

For one explicitly critic-approved addition at `OUTPUTS_ROOT/<slug>/site`,
compute the approved manifest (this measures identity; it does **not** grant
approval), record it with the critic receipt, then pass it explicitly:

```bash
python3 -c 'import sys; from pathlib import Path; sys.path.insert(0,"scripts"); from package_marimo_pages import inventory,manifest_digest; print(manifest_digest(inventory(Path(sys.argv[1]))[0]))' /path/to/approved/site
npm run package:marimo-pages -- \
  --outputs-root /path/to/outputs --add '<slug>=<approved-manifest-sha256>' \
  --output "$TMPDIR/marimo-next-unique" --receipt "$TMPDIR/marimo-next.json"
```

The manifest encoding is sorted compact ASCII JSON of relative POSIX file paths
to lowercase SHA256 hex, UTF-8 encoded without a trailing newline. Unknown output
folders are ignored. Existing bundles/fallback slugs cannot be replaced through
`--add`; intentional migrations need separately reviewed source/routing changes.

### File count, manifests and durable rewrites

- Count **every** packaged file, conservatively including `_redirects`, before
  upload: maximum 20,000. `--file-limit` can lower but never raise this guard.
  The receipt reports logical/physical totals, headroom and both manifests.
  Also refuse files over 25 MiB and excess Pages rewrite rules (100 dynamic).
- Deduplicate only nonempty **complete assets trees** whose relative-path/file
  SHA manifests are identical. Subsets, supersets, same-named/different bytes and
  disjoint trees remain separate. Other files, especially HTML, stay byte-exact.
- Deliver removed files via same-origin Pages **200 rewrites**, not redirects,
  CDN substitutions or HTML edits. Preserve historical `_redirects` bytes as a
  prefix, verify retained source/target manifests, keep destinations physical,
  reject chains/cycles and conservatively reject overlapping rules. A new broad
  fallback rule must not hide an old asset rewrite.
- The receipt includes complete per-tree manifests, every logical delivery hash,
  the physical package manifest, HTML hashes, retained/generated rules and
  `next_catalog`. Archive it **outside** the upload. For a reviewed release,
  extract `next_catalog` to `scripts/marimo-pages-catalog.json`, review that diff
  via PR, and repackage using the committed catalog. Keep this update durable
  across every full-project upload; do not reconstruct `_redirects` from only
  the newest notebook. The original rewrite is pinned even on the first run.
- Preserve the root SPA fallback: unchanged root HTML, no top-level `404.html`,
  and no materialized unapproved bundle at a pinned fallback slug. Existing
  fallback behavior is not evidence that the missing notebook itself works.

### Scoped release gate and rollback

Packaging equivalence is **offline file-delivery evidence**, not Python runtime
or production evidence. Before a separately authorized upload, compare all
current published index/fallback hashes and existing rewrite delivery against
the immutable last-good release; stop on drift. Archive the original full
package, `_redirects`, source archives, catalog and manifests. Do not deploy this
capacity refactor merely because unit tests or a local emulator pass.

After an authorized full-project upload, retain its immutable deployment URL;
fetch every logical file URL and compare response bytes with the approved
manifest (including removed assets served through rewrites). Reject soft-404
HTML for JS/CSS/WASM; HTTP 200 alone proves nothing. Verify all historical
indexes/fallbacks, the gallery iframe, and real notebook controls/reactive output
at desktop/mobile widths with console/network evidence. Only then change any
`published_url`. Website PRs still require independent code review and exact-head
Frontend/E2E checks; never commit `out/` or a generated upload directory.

Rollback means restore the **entire** retained last-good Pages deployment (or
re-upload its exact archived package including `_redirects`), not just an HTML
file or a fresh export. Repeat hash and runtime gates on the rollback URL and
production domain. If release verification fails, do not promote its catalog;
retain both candidate and last-good receipts and route remediation explicitly.
The baseline last-good immutable deployment is
`https://ccc0ae16.edgeless-marimo.pages.dev`; refresh this reference and source
provenance only with verified release evidence.

## Publisher audit

The repeated PR69/PR74 failures were coupled to manual notebook totals, ordered
URL lists, JSON-LD counts and category badges. PR73 also needed syntax/await
repairs during those assertion updates. The checked-push gate builds and runs the
actual suites before pushing, catching these locally instead of emailing after
each attempted assertion patch. External publishing agents must call the checked
entry point from this repository; a direct `git push` cannot be intercepted by a
portable repository script. CI remains the mandatory backstop.
