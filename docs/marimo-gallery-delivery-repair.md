# Inherited marimo gallery delivery repair — t_3f435184

## Diagnosis (not a production health claim)

Canonical baseline: `9d09e6486c10a9fc38e6ade84c2506b767b2f779`.
Cloudflare Pages latest production at diagnosis:
`7739b35a-053d-4620-8456-9e211354b8bd`, read from the Pages API;
prior immutable control: `4b4be881.edgeless-marimo.pages.dev`.

Nine registry URLs pointed at slugs that the delivery catalog explicitly listed
as legacy SPA fallbacks, not installed notebook trees. The root fallback HTML has
SHA-256 `813c7d42b411ff7563fcc172bac93678dd8d1093ca9ad4eb0122bbcb4f5f4fbb`.
It contains relative asset references. Resolving those references under an absent
slug returns the same root HTML with HTTP 200 and `text/html`, rather than CSS or
JavaScript. Serial probes and isolated controls reproduce this without competing
notebook runtimes. Concurrency cannot repair missing delivery trees.

Separately, the unbounded gallery produces resource failures while scrolling.
The bounded-admission implementation belongs to PR #138 / task t_9c242f2a;
this patch does not duplicate or modify its component, notebook registry or sources.
Ready Cohorts is an unchanged approved notebook, not the source of the inherited
fallback MIME errors. Raw baseline RPC/resource errors remain evidence, not suppressed
or retroactively attributed to the restored notebook.

## Minimal migration

`marimo-gallery-restorations.json` records nine explicit, complete-tree hash pins
and the historical critic cards used as provenance. These are historical approval
locators, **not** a substitute for independent review of this restoration.
Six exports match recorded validation HTML hashes; three are recovered from immutable
`https://02e7b27a.edgeless-marimo.pages.dev` with per-file recovery manifests.
Do not export new HTML or edit scientific source to make the delivery test pass.
Any mismatch against approved bytes must return to the critic.

The packager's opt-in `--restore <json>` requires a currently declared fallback,
its exact old root hash, a distinct non-root notebook index, a unique source mount,
an explicit review locator, and an exact complete source inventory. Ordinary
packaging never silently replaces a fallback. The resulting catalog is the pinned
next catalog and can be packaged again without reapplying the migration.

The candidate preserves **all 25,949** old logical paths and their SHA-256 values;
adds 5,936 paths; contains 31,885 logical paths delivered by 2,633 physical files;
and keeps the unused first-party TASA legacy alias unchanged. No registered
notebook is removed. Only complete byte-identical asset trees share routing.
No generated `out/` files belong in the PR.

## Reproduction and regression checks

Use Node 22 (the host's `/usr/local/bin/node` may be an older incompatible Node).
For the complete production/test gate, disable sparse checkout in the isolated
worktree (`git sparse-checkout disable`): build inputs include `public`,
`pen-plotter`, `tartanism`, `total-serialism`, `workers`, `patches`, and
`content/blog`, not just `src`/`scripts`. Never change the shared trunk checkout.

```sh
npm run test:marimo-pages
npm run verify:publication

python3 scripts/package_marimo_pages.py \
  --outputs-root /Users/djm/claude-projects/output/marimo-public \
  --output /ABSOLUTE/DISJOINT/NEW/package \
  --receipt /ABSOLUTE/DISJOINT/NEW/package-receipt.json
```

Frontend CI runs the restoration/routing and actual-reference regression tests.
The reference auditor uses real HTTP and derives bounded HTML and JS import edges,
not guessed hash suffixes. It retains response headers and exact bodies and checks
MIME and approved manifest identity. Its static survey is not exhaustive runtime
coverage: supply browser receipts to include actually observed CSS/JS/WASM URLs.
External CDN responses are recorded separately and are not falsely claimed as
approved first-party bytes.

```sh
python3 scripts/audit_marimo_references.py \
  --origin http://127.0.0.1:8924 \
  --source-manifest /ABSOLUTE/DISJOINT/NEW/package-receipt.json \
  --browser-receipt /PATH/TO/isolated/receipt.json \
  --output /NEW/serial-evidence

python3 scripts/witness_marimo_gallery.py \
  --kind isolated --url http://127.0.0.1:8924/2606.04781-pass-semantics/ \
  --output /NEW/isolated-evidence

python3 scripts/witness_marimo_gallery.py \
  --kind gallery --url https://edgelesslab.com/lab/marimo/ \
  --output /NEW/live-gallery-evidence
```

The candidate was served by the real Cloudflare Pages local runtime so `_redirects`
were exercised. No browser route interception, synthetic network response, or
console/request-error filter is permitted. Witnesses retain raw errors, all resource
responses and screenshots for both 1440px and 390px viewports; gallery tests run
both instant and smooth scroll. Isolated probes wait for rendered controls, wait
for the measured initial state, then prove input and visible output both change.

## Evidence and remaining release gate

Task evidence is retained beside the original publication's verifier evidence:
`output/marimo-public/2608.12123-ready-cohort-packing/verifier-evidence/t_3f435184/`.
See the task handoff for current commit, PR, checks and evidence hashes.

Local candidate evidence: 858 serial actual-reference responses, zero MIME or
manifest-identity failures; isolated pass-semantics and unchanged Ready Cohorts
controls pass at both widths with zero raw errors. These are **local candidate**
results, not proof of merged, independently approved, deployed or healthy production.
The unbounded production gallery baseline retains its errors verbatim.

Before release: independent complete-source/hash review; exact-head frontend and
e2e CI; reviewed PR merge; candidate package upload only after approval and a fresh
canonical catalog/latest-deployment check. After delivery and PR #138 integration,
rerun the serial survey, isolated target controls and full gallery stress on LIVE
URLs with all raw errors retained. Return the parent t_7033b40c for independent
reverification. Do not close the repair or its parent on local tests alone.
