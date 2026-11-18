# Duplicate catalog retirement — t_749a7410

David's rescope: retire `/product-factory/`, do not build a second storefront. The canonical shop is https://shop.edgelesslab.com/.

## Implementation

- A noindex legacy page redirects to shop home immediately. A syntactically valid legacy `sku` gets an exact available/not-sold-out match against the real shop's `catalog.json`; only a match redirects to `/d/<slug>/`. The origin is fixed, not supplied by the caller or catalog. Offline, malformed catalog, unavailable and unknown IDs go home. No-JavaScript clients have a meta-refresh plus a manual shop link.
- Remove unbacked gallery print links, including runtime-created cards. Keep the gallery's runtime CSS through the existing postbuild preservation flag. The Studio links to the real shop. The built sitemap and llms.txt already omit the retired route.
- No checkout/payment, product approval, release or publication API call was performed. Real-shop catalog prices and identities are read-only inputs; no products/prices were invented.

## Reproduce

```sh
node --test scripts/check-product-factory.test.mjs
npm run build
node scripts/check-product-factory.mjs --dir out --evidence /absolute/evidence/path
node scripts/check-product-factory.mjs --url https://edgelesslab.com --evidence /absolute/live-evidence/path
```

The last command is a production witness, not replaceable by the local run. Attached PNGs are local built evidence, not live deployment proof.

Committed `before-built.log` and `before-live.log` preserve failed baselines. `after-built.json` records 12 passed/0 failed: actual Chromium redirects for base, available SKU, unknown SKU and hostile-origin input; HTTP/canonical listing validation; 143 exported gallery files with no legacy links; no unbacked rendered print CTAs or site JavaScript errors. Console before/after output is pasted on the parent Kanban card. Eighteen focused unit tests and scoped ESLint pass; 262 Vitest tests pass and full static export succeeds. The default full smoke run has **16 passed / 3 failed**: all three Prompt Engine generation tests time out while checking dupes. Existing independent perf repair PR #124 targets this bottleneck; no full-suite green or waiver is claimed here. Verifier must satisfy all required publication gates.

## Private poster staging (not release-ready)

`scripts/render-gallery-posters.mjs` captures two source-grounded native 3600×5400 masters (12×18 inches, 300 effective DPI), seed 7497410/frame 240, art-only, with source/master hashes. `scripts/stage-gallery-posters.py MASTER_DIR TOKEN_PATH` uses the real API `/upload-art` and `/submit`, then authenticates `/drafts/<id>` and normalized artwork readbacks and verifies absence from public `/submissions`. Requests are content-addressed; reuse the same private ownership capability, never print or commit it.

`private-draft-receipts.json` preserves real source/master/upload/draft/readback evidence for Flow Field Calligraphy and Lunar Flow Cartography. Both have `private=true`, `listed=false`, `status=needs_changes`, `rights_attested=false` and `catalog_variant_id=null`. Full-resolution PNGs and manifest are task attachments. They are staged candidates, **not automatically publishable when posters are enabled**. Rights confirmation, provider variant, color profile, bleed/safe area/placement, margin and physical sample approval still require their normal gates. Flow Field Calligraphy is deliberately sparse/low-contrast and needs independent aesthetic/print review; do not represent a pixel-dimension check as approval.

## Publication ownership

Implementation parent t_749a7410 → independent critic t_0ed14183 → existing verifier t_22bfad81. Verifier owns reviewed merge, all three main workflows (Frontend, E2E, Pages), custom-domain probe, fresh 375/1440 PNGs and knowledge close-out. Never substitute fork hosting or local export for production proof. Poster fulfilment enablement remains the separately tracked owner gate t_d1eb0ceb; it does not block retiring the duplicate catalog.
