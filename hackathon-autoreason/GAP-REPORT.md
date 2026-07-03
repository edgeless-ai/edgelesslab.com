# Edgeless gap audit — triaged (2026-07-03)

*6-agent full-spectrum audit → 28 gaps. This report = what I FIXED autonomously (safe) vs what's STAGED for you (money-path / product / infra decisions).*

## ✅ Fixed this pass (safe, done)
- **Durability** — tonight's work was an incomplete git snapshot (main.py/oxygen.py committed, ~20 sibling backend modules untracked). Now: full backend source committed + **pushed off-disk** to `ops:feat/edgeless-overnight-swings`. No longer trapped on one machine.
- **Ephemeral→durable** — Foundry pipeline (`/tmp/foundry_screen.py`) → `tools/`; marketing assets (session scratchpad) → `marketing-assets/`.
- **DEPLOY.md webhook step** — added the 3 missing Stripe events (`charge.refunded`, `charge.dispute.created`, `radar.early_fraud_warning.created`) that oxygen-revocation needs (else refunds never revoke demand).
- **Memory** — persisted the Foundry pipeline + Flora-dead + CF-UA-block findings.

## 🔴 STAGED FOR YOU — highest first

### URGENT — live money bug: retail floor not enforced
A **$26 request on a $34 listed tee produced a real Stripe session for $26** (verified live via session amount_total). The fix `_retail_price_cents_for_slug()` is on the deploy repo master (`ca4019f`) but is NOT live — either Render hasn't deployed it, OR it only covers *live-submitted* listings (its `_find_submission` misses baked `designs.json` slugs, which is most of the catalog). A buyer can currently under-quote any listed item above cost but below shelf price. **Money-path — I did not hot-patch. Decide: confirm the Render deploy of ca4019f, and extend the floor to baked designs.**

### Other gated items (money / product / infra — your call)
- **[HIGH]** The fulfillment-failure operator alert relies entirely on RESEND_API_KEY being set on Render, fails completely silently if it isn't (bare `except: pass` around the send, and resend_client._enabled() short-circuits to a n  
  *Fix:* Add a `resend_configured: bool(os.getenv('RESEND_API_KEY'))` field to GET /health (safe, no-decision, no secret exposure -- mirrors the existing stripe_configured/creator_payouts_c
- **[MEDIUM]** One live catalog listing's storefront image is an ephemeral Printful S3 'tmp' upload URL, not a permanent asset. Design `sub-cc51de38a247` (creator `stamp`) in /catalog.json has `image: https://printful-upload.s3-acceler  
  *Fix:* see audit
- **[MEDIUM]** The Foundry carousel copy (slide 3 of tools/foundry_carousel.spec.json) states '23 designed by 6 distinct agents · 6 passed to the shelf · 12 quarantined in public' — 6+12=18, silently leaving 5 of the 23 generated piece  
  *Fix:* Either (a) run the remaining 5 through tools/foundry_screen.py so the real tally is 23 screened / N cleared / M quarantined, or (b) rewrite the slide copy to say '18 of 23 screened
- **[LOW]** DATA_DIR is never set in the Dockerfile and is absent from DEPLOY.md's list of environment variables to configure on Render, so it silently defaults (per main.py:77 comment) to the code directory inside the container — w  
  *Fix:* Requires provisioning a Render persistent disk and setting DATA_DIR to its mount path — an infrastructure/cost decision that needs David (Render dashboard access + billing), not a 
- **[LOW]** 30 of 88 designs.json entries (all 'dogfood-*' slugs) have no 'kind' field, relying on client-side rotation fallback logic in the frontend rather than an explicit value.  
  *Fix:* Not a standalone bug to patch blindly -- verify (don't blind-fix) that the kind value shown in the shopGrid/RACK mapping is the exact value sent to POST /checkout for these 30 desi

### Already-known gated (from tonight, unchanged)
- **Money-path fix pass** — 22 verified bugs, `MONEYPATH-AUDIT.md` (royalty double-pay, webhook keying, hoodie-ships-tee, royalty-on-failed-fulfillment). Do before first real sale.
- **IP-gate calibration** — immune system rejects good originals (Circuit Caduceus 85 quarantined).
- **edgelesslab.com DNS flip** — CF Pages migration deployed, just needs the DNS pointer.
- **Flora key** — dead; refresh to unblock the asset engine.
- **Launch thread** — post it (your handle).

## 🟡 Safe but I deferred (backend deploy or your-preference — recommend, didn't do unattended)
- **[HIGH]** (backend-config) DEPLOY.md's Stripe webhook setup step lists only `checkout.session.completed` as the event to enable, but main.py's oxygen-revocation branch (main.py:441-458) requires `charge.refu  
  *Fix:* Add the three event names to DEPLOY.md step 3's 'Events:' line (`checkout.session.completed, charge.refunded, charge.dispute.created, radar.early_frau
- **[HIGH]** (backend-config) GET /health does not report whether the R2 state-store persistence backend is configured/reachable, even though state_store.py already defines an `enabled()` helper for exactly thi  
  *Fix:* Add `"state_store_configured": state_store.enabled()` to the /health JSONResponse (import state_store is already done at module top). Read-only additi
- **[MEDIUM]** (backend-config) DEPLOY.md describes the `CLOUDFLARE_API_TOKEN` env var only as '(R2 art hosting)' in its required-environment-variables checklist.  
  *Fix:* Reword DEPLOY.md:37 to '(R2 art hosting + state_store persistence — oxygen/royalty/payments/promo/submissions all live here; do not scope this down or

## Full list (all 28)
1. [HIGH][✅FIXED] (repo-hygiene) Live checkout on api.edgelesslab.com is missing a server-side retail-price-floor fix that already exists (committed) in 
2. [HIGH][✅FIXED] (repo-hygiene) The one big 'overnight big swings' commit (842ceb4a, this morning 06:25) that captured oxygen economy wiring, AEO/discov
3. [HIGH][✅FIXED] (repo-hygiene) The 842ceb4a commit is functionally incomplete: it tracked hackathon-autoreason/mpp-earn-svc/main.py and oxygen.py, but 
4. [HIGH][✅FIXED] (backend-config) DEPLOY.md's Stripe webhook setup step lists only `checkout.session.completed` as the event to enable, but main.py's oxyg
5. [HIGH][🟡SAFE] (backend-config) GET /health does not report whether the R2 state-store persistence backend is configured/reachable, even though state_st
6. [HIGH][✅FIXED] (marketing-launch) marketing-kit.md (committed, current launch thread) tells the poster the 5 OG share cards live 'in scratchpad/marketing/
7. [HIGH][🟡SAFE] (economy-product) The agent-facing discovery feed (catalog.json / sitemap.xml / llms.txt's 'browse the catalog' section) is generated by a
8. [HIGH][🟡SAFE] (economy-product) The entire product catalog (designs.json, bazaar-extra.json -- 88 + 36 designs, the sole source of truth for what's for 
9. [HIGH][🔴GATED] (economy-product) The fulfillment-failure operator alert relies entirely on RESEND_API_KEY being set on Render, fails completely silently 
10. [MEDIUM][✅FIXED] (repo-hygiene) hackathon-autoreason/mpp-spend-svc/ (an entire sibling service directory) is fully untracked -- appears as a single coll
11. [MEDIUM][🔴GATED] (live-surface) One live catalog listing's storefront image is an ephemeral Printful S3 'tmp' upload URL, not a permanent asset. Design 
12. [MEDIUM][✅FIXED] (backend-config) DEPLOY.md describes the `CLOUDFLARE_API_TOKEN` env var only as '(R2 art hosting)' in its required-environment-variables 
13. [MEDIUM][🟡SAFE] (docs-state) EDGELESS-STATE.md (the living ops/handoff doc) never mentions The Foundry (agent-designer pipeline, designs.json 82→88),
14. [MEDIUM][✅FIXED] (docs-state) tools/foundry_screen.py (the only committed piece of the Foundry pipeline) hard-depends on captures/foundry/manifest.jso
15. [MEDIUM][🟡SAFE] (docs-state) Memory file reference-edgeless-web-surfaces.md states flatly that the MAIN site edgelesslab.com is 'GitHub Pages... NOT 
16. [MEDIUM][✅FIXED] (docs-state) marketing-kit.md's 'Assets' section points to 'scratchpad/marketing/' (resolves to the ephemeral session-scratchpad path
17. [MEDIUM][🟡SAFE] (marketing-launch) The launch thread's tweet 4 claims '100+ designs have cleared the immune system so far, from 17 creators.' Live catalog.
18. [MEDIUM][🔴GATED] (marketing-launch) The Foundry carousel copy (slide 3 of tools/foundry_carousel.spec.json) states '23 designed by 6 distinct agents · 6 pas
19. [MEDIUM][🟡SAFE] (marketing-launch) Two competing 'launch kit' documents exist for the same product: the current, committed marketing-kit.md (tagline 'A mar
20. [MEDIUM][🟡SAFE] (economy-product) promo_state.json (per-code redemption counts for ATCOST/FRIENDS/NOUS/STEPPE/NOUSGANG/INSPOART/HERMES) is stored only in 
21. [LOW][🟡SAFE] (repo-hygiene) The 373 files that would be newly captured by a commit are ~1.8GB of working tree (mostly merch-demo/node_modules at 919
22. [LOW][🟡SAFE] (live-surface) ~20 Python modules that the live backend actually imports and runs (curator.py, demand_gate.py, pod_client.py, printful_
23. [LOW][✅FIXED] (live-surface) The scratchpad deploy clone used for pushing to the live backend is 1 commit behind origin/master: local HEAD=740e030, o
24. [LOW][✅FIXED] (backend-config) DATA_DIR is never set in the Dockerfile and is absent from DEPLOY.md's list of environment variables to configure on Ren
25. [LOW][🟡SAFE] (backend-config) `_ROYALTY_PENDING_FILE` (main.py:767) and `PAYMENTS_FILE` (main.py:88) are dead module-level assignments — grepped: thei
26. [LOW][🟡SAFE] (docs-state) marketing-kit.md (last written 2026-07-01 23:06, before the Foundry pipeline ran ~02:20 on 07-03) does not reference the
27. [LOW][🟡SAFE] (marketing-launch) The frontend catch-all route https://shop.edgelesslab.com/s/<slug> returns HTTP 200 but with generic, site-wide OG/Twitt
28. [LOW][🔴GATED] (economy-product) 30 of 88 designs.json entries (all 'dogfood-*' slugs) have no 'kind' field, relying on client-side rotation fallback log