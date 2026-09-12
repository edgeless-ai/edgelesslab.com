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

The original audit found **543 missing archive asset reference pairs**. The
September 12 recovery repaired 536 pairs using 293 original assets, leaving
**7 missing pairs** for two Excalidraw canvas images, a Cosmos video poster,
and a Neal.fun merchandise image. The exact remaining source/target pairs are
recorded in `scripts/launch-readiness-known-blockers.json`; recovered pairs are
removed from that list so missing them again fails the build. They remain
blocked pending restoration of the missing original capture assets. The
build reports `structural-checks-pass-with-unresolved-archive-blockers` when only
those known failures remain; every new missing reference fails the check. An
unsitemapped standalone route is reported for indexing review, not silently
treated as an intentional exclusion.

`scripts/launch-readiness-restored-assets.json` records restored asset hashes,
byte lengths, target routes and provenance. Original capture bytes are retained;
incorrect capture filename extensions are corrected to their actual formats.
Archive aliases share one verified file per original asset, saving 78,043,786
bytes in the static export instead of publishing duplicate image, video and font
files. All alias routes retain their artwork; only duplicates added during the
recovery were removed, after a byte comparison with the retained file.
For Neal.fun and Excalidraw fonts, the original URLs are verified using Ditto's
URL-derived filenames, but historical byte equality is unavailable: these are
current bytes from the original host. Offline tests reject zero bytes, altered
hashes, wrong served formats, and restored targets reintroduced as known misses.
Image alternatives were reviewed against actual recovered images. Four empty
alternatives remain unresolved because the two Excalidraw images are missing.

The exported development hubs use their existing 93-entry public algorithm
catalog. Their local HMR server is opt-in with `?hmr=1` on localhost; a failed
connection retains static preview behavior. The algorithm template resolves
its shared dependencies in its current location and documents paths to adjust
when copying it. These repairs address actual requests, not fixture exclusions.

The homepage field pauses drawing outside the viewport or in a hidden tab,
preserves trails on resume, and resets only when its size or motion preference
changes. Poster images load within 160px of the viewport, with a no-JavaScript
fallback; live previews and pointer interaction remain available. Controlled
browser transfer and animation checks are required in addition to Lighthouse.

Maison sends at most eight valid prior entries within a 24KiB UTF-8 request
body, retaining the full displayed transcript. A rejected or missing chat ID
does not start polling, and error paths clear the composing state. The separate
Maison Worker must enforce the matching bounds; frontend checks alone do not
establish backend validation.

The gallery uses 142 shared WebP thumbnails totaling 1,705,698 bytes. Its public
manifest records original and thumbnail hashes, dimensions, and URLs. Original
PNGs are preserved and accessible from previews. The truncated `crosspost.png`
was restored to its complete 4,037,517-byte original from Git revision
`8c34aeee157d92a8ba357e514097e03077c1e6e6`; its 14,612-byte preview now uses an
alternative written after viewing that original. The other masters remain
unchanged, and the restoration's revision/hash are recorded in the manifest.
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
