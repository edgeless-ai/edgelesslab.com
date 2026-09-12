# Launch readiness checks

Run `pnpm run test:launch` for offline metadata, link/catalog, gallery, and ingest
Worker regressions. The normal build and Frontend Tests CI run these checks.
All three deployment/check workflows install the frozen `pnpm-lock.yaml` with
pnpm 11, so their SDK version matches production. The legacy npm lockfile is not
the deployment dependency authority; use pnpm for local acceptance as well.
Worker tests mock the upstream service and do not send analytics or email.
Run `pnpm exec playwright test --config tests/consent.config.ts` after a build
with a PostHog public project key. These tests intercept analytics HTTP requests,
exercise the actual SDK, and cover rejection, legacy identifier cleanup,
acceptance, failed-request revocation, reacceptance, and mobile controls. Full
Chromium avoids the headless shell's bot identity; no SDK behavior is mocked.
Color-pair regressions cover the light Support shell, relay labels, blog tags,
gallery captions, and the live artifact header.
Both Tartanism app copies omit the unconditional placeholder Google Analytics
loader; the source regression scans standalone public HTML for its return.

`pnpm build` completes the static export and restores standalone artifacts, then
runs `repair:launch` and `check:launch` before Pagefind indexes the output.
`.next/launch-readiness-report.json` records every exported HTML route, metadata
changes, sitemap exclusions, failures, and unresolved archive references using
public routes and relative paths. It stays outside the published export. To recheck an existing export, run
`pnpm run check:launch`.

The repair only fills absent head metadata using existing titles, headings,
descriptions, or paragraphs. Authored metadata stays intact. Exact error and
development fixtures receive `noindex`; raw Google verification bytes and
existing noindex documents are preserved. This check covers declarative HTML,
CSS, and social-image references; it does not prove JavaScript-generated links,
external destinations, browser behavior, or content/legal approval.

The audited archive still has **543 missing asset reference pairs**. The exact
source/target pairs are recorded in `scripts/launch-readiness-known-blockers.json`.
They remain blocked pending restoration of the original capture assets. The
build reports `structural-checks-pass-with-unresolved-archive-blockers` when only
those known failures remain; every new missing reference fails the check. An
unsitemapped standalone route is reported for indexing review, not silently
treated as an intentional exclusion.

The gallery uses 141 shared WebP thumbnails totaling 1,691,086 bytes. Its public
manifest records original and thumbnail hashes, dimensions, and URLs. Original
PNGs are unchanged and accessible from previews. The truncated `crosspost.png`
master has an explicit unavailable preview and an incomplete-original link.
Six blog PNGs were compressed losslessly, saving 113,117 bytes without changing
their RGBA pixels.

The ingest Worker accepts only the service-CTA and purchase events, validates
origins, body size, identity, and allowed properties, and waits for an actual
PostHog acknowledgment. Newsletter collection returns 503 until a subscription
provider and delivery path are verified; the site offers RSS instead. Its
30-POST-per-minute abuse limit uses only Cloudflare's trusted client-IP header,
with at most 2,048 expiring in-memory entries. This is a **per-isolate limit**:
multiple isolates, restarts, and eviction can reset it, so it is not a global or
durable quota. The address is not forwarded, logged, persisted, or used as an
analytics identity. No Worker bindings, credentials, or DNS settings changed.

Worker source changes require a separate Worker deployment. A successful Pages
deployment alone does not activate the collector repairs. Production acceptance
also requires the full static export, focused browser checks, and the canonical
deployment procedure in [deployment-runbook.md](deployment-runbook.md).
