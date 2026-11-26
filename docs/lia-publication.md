# LIA publication and optional subdomain redirect

## Site implementation

- Canonical landing page: `https://edgelesslab.com/lia/`.
- Methodology Field Note: `https://edgelesslab.com/lia/building-an-instrument-that-can-say-no/`.
- The three cleared public Markdown sources live in `content/lia/`. No private evidence manifests, review receipts, hashes, or decision identifiers are shipped to the public pages.
- `python3 scripts/build-lia.py` renders standalone Field Sheets into `public/lia/`. This intentionally follows the existing Total Serialism and Tartanism long-form notes, not the interactive creative-demo inventory. Generated HTML is checked in and byte-drift tested by `npm run test:lia` during the normal build. Python 3 (stdlib only) is needed for this test.
- `src/lib/research-field-notes.ts` feeds archive DOM, archive JSON-LD count and positions, sitemap, and llms.txt. Interactive studies retain their separate count.
- `node scripts/build-lia-og.mjs` regenerates the 1200 × 630 OG PNG (Playwright Chromium required).
- `node scripts/verify-lia.mjs http://127.0.0.1:8877 evidence/lia` checks index routes, citation requests, archive DOM/schema, privacy, viewport overflow, and screenshots. External citation failures remain failures, not automatically waived.
- `node scripts/lighthouse-lia.mjs` audits both pages. Optional first argument is the base URL for the live rerun; `CHROME_PATH` overrides the installed Chrome executable. Use installed Chrome on this Mac: Playwright Chromium produced Lighthouse NO_FCP although it rendered correctly in Playwright.
- `npx playwright test` includes `tests/lia.spec.ts`: deterministic route, source citation equality, TOC, viewport, registry, sitemap, agent-index, and real footer navigation checks. External requests are intentionally in the publication probe, not CI smoke.

## Gates / current evidence

Implementation is not a live-publication claim. A critic must inspect the 375px and 1440px PNGs and diff, then a verifier merges the exact reviewed SHA after Frontend Tests, E2E Tests, and Deploy to GitHub Pages checks are green. On PRs the deploy workflow may build only; require its actual deployment success on main after merge. Re-run the probe and Lighthouse against the custom domain, not a personal fork. Pages may cache for 600 seconds. See `docs/deployment-runbook.md`.

The initial local citation probe saw source-site bot walls at SOAS, Southampton PDF, and Oxford Academic. Browser recovery confirms the 403s are security interstitials, not verified missing documents. The UVA source returns 202 but renders the cited Kable article. Do not claim all citation URLs passed. Do not silently replace the approved citation URLs or alter the cleared prose; resolve access checks in the verifier lane or report an explicit remaining limitation.

## Definition correction — 2026-11-25

LIA studies the intersections between fields: useful, defensible connections
across bodies of knowledge. The hero, introductory source, description/OG tags,
OG PNG and llms.txt summary now lead with that definition. The versioned intro
was edited in place, including the upstream project docs copy, so existing
long-form references do not import the agent-originated, incorrect definition again.
LIA is and always was about intersections between fields. The artifact-form framing
was an assistant proposal carried into the docs and site by agents, never David's
earlier scope or a project evolution. Public copy states the definition directly,
without an origin/evolution narrative.

The index labels *Building an Instrument That Can Say No* as a methods note,
and its opening now bounds it as an artifact-inference example rather than the
program definition. Its deeper content/realization vocabulary, clay/print/code
examples, historical discussion and citations remain unchanged. The two creative
demos remain unchanged: their LIA references concern the software artist, not the
research program. The archive's methods-note title and description still accurately
describe that narrower note. No discoveries or empirical validation are claimed.

`npm run test:lia` checks generated-byte drift and the definition in the hero,
intro, metadata, agent index and OG source. `tests/lia.spec.ts` also checks the
visible definition, methods label, demo links and mobile overflow in Chromium.

The requested dated correction was appended to the vault's
`16-Projects/Latent-Information-Archaeology/Scope-and-continuity.md`.
The AGENTS.md rule edit was **not applied**: the protected-file approval gate
returned no consent. Do not bypass that gate. An authorized instruction-file edit remains
required; CLAUDE.md delegates to AGENTS.md. The rule should prohibit artifact-form
or content-versus-realization as the public definition and require the cross-field
definition in public summaries and introductions.

Review handoff is not publication. Critic reviews this diff; verifier performs the
merge/deploy and captures a **live custom-domain** screenshot after checking the
hero contains `intersections` and the old `the way that content takes form` phrase
has zero matches. Local screenshots are previews, not live evidence.

## Optional `lia.edgelesslab.com` redirect (not provisioned by this PR)

The main Pages repository already uses `edgelesslab.com`; **do not change its CNAME, Pages owner, or apex DNS**. A second repository can own the subdomain. Proposed exact redirect repository: `edgeless-ai/lia-redirect`. This repository does not exist as part of this change; create it only when carrying out these steps.

1. Create a public GitHub repository named `lia-redirect` under **edgeless-ai**, default branch `main`. Commit three files at its root:

   `CNAME` (one line):
   ```text
   lia.edgelesslab.com
   ```

   `index.html`:
   ```html
   <!doctype html>
   <html lang="en">
   <meta charset="utf-8">
   <meta name="viewport" content="width=device-width, initial-scale=1">
   <title>Latent Information Archaeology | Edgeless Lab</title>
   <link rel="canonical" href="https://edgelesslab.com/lia/">
   <meta http-equiv="refresh" content="0;url=https://edgelesslab.com/lia/">
   <script>
     const target = new URL('https://edgelesslab.com/lia/');
     target.search = location.search;
     target.hash = location.hash;
     location.replace(target.href);
   </script>
   <h1>Latent Information Archaeology</h1>
   <p><a href="https://edgelesslab.com/lia/">Continue to LIA at Edgeless Lab</a></p>
   </html>
   ```

   `404.html`: identical bytes to `index.html` (unknown old subpaths go to the LIA landing page, not a nonexistent mirrored path).

2. In **edgeless-ai/lia-redirect → Settings → Pages**, choose **Deploy from a branch → main → / (root)**. Set **Custom domain** to `lia.edgelesslab.com` and save. Equivalently, after committing the files:
   ```bash
   gh api --method POST repos/edgeless-ai/lia-redirect/pages \
     -f 'source[branch]=main' -f 'source[path]=/'
   gh api --method PUT repos/edgeless-ai/lia-redirect/pages \
     -f cname=lia.edgelesslab.com
   ```
   Use PUT rather than POST if Pages already exists. Confirm Pages reports the intended subdomain, not the apex.

3. In the DNS provider UI for **edgelesslab.com** (Google Domains may now be managed through Squarespace), add exactly this record, with no scheme or path:

   | Type | Host / Name | Value / Target | TTL |
   |---|---|---|---|
   | CNAME | `lia` | `edgeless-ai.github.io.` | `3600` seconds (or provider default) |

   Remove only a conflicting **lia** record if one exists; never touch apex/www records. The trailing dot is optional if the provider normalizes it. Do not point this record at `edgelesslab.com/lia/` (DNS cannot carry paths). Do not use the personal fork owner.

4. Once DNS and the TLS certificate are ready (may take longer than the UI changes), enable **Enforce HTTPS** for the redirect repository. Read back:
   ```bash
   gh api repos/edgeless-ai/lia-redirect/pages --jq '{cname,html_url,https_enforced}'
   dig +short CNAME lia.edgelesslab.com
   curl -sSIL https://lia.edgelesslab.com/
   ```
   Then open `https://lia.edgelesslab.com/` in a clean browser and confirm it ends at `https://edgelesslab.com/lia/`. Exercise JS-disabled fallback, an unknown path, and a query/hash. This static Pages approach uses **HTTP 200 + meta-refresh / location.replace**, not a server-side 301. A true HTTP 301 would require a redirect-capable edge or DNS-provider forwarding service.

Rollback: delete only the `lia` DNS record and disable Pages in `edgeless-ai/lia-redirect`. No change is needed in the main website repository. DNS/certificate wait time is separate from the approximately two-minute configuration work.
