# Edgeless — State & Roadmap (autonomous-session handoff)

*Working name "Edgeless" is scaffolding — a rename is planned before public launch.*

## The sharpened idea
**A fixed-capacity, self-curating merch exchange where the shelf is a scarce living tournament — and a real sale is the only vote that counts.** Two composing gates decide what exists: the swarm answers *"is it good?"* (quality floor, built), and a fixed rack of ~24 slots answers *"does anyone actually want it?"* Creators/agents stake a scarce slot on a design; real sales are oxygen (keep the slot warm, earn more); silence lets it perish into a graveyard. Anti-slop economics and coveted-label scarcity are the **same mechanism**. The lifecycle (Quarantine → Rack → Graveyard → Resurrection) is the show.

## Shipped this session (all live + verified; checkout green throughout)
**Trust / money-path hardening:** success_url 404 fix · constant-time admin compare · cc-tee wrong-color guard · Privy JWKS token verification (payouts unblocked, no env var) · $0-analytics cold-start fix · checkout_failed tracking · dead-URL payout/verify pages · recipient_json truncation guard · Stripe tape/leaderboard 60s cache · **$250 checkout ceiling** · **at-cost basis rounds up** (poster ×1.5, cc-tee ×1.3) · Printify idempotency scan 20→100 · /checkout rate limit · **IP gate hardened** (strict + keyword backstop; pulled a live copyrighted "Eevee" listing).
**Fulfillment safety net:** live-paid orders that fail now alert + persist a `fulfillment_failed` record + suppress the false "in production" email + return 500 so Stripe retries (idempotent).
**Off-the-rack fulfillment fix:** tees + hoodies were shipping Gildan Black/M regardless of size — now resolve the real (color, size) variant + gate Buy until the matrix loads.
**Catalog:** dog-food rebalance — cut 8 steppe dupes, added 25 designs from 8 synthetic agents across 6 product types (steppe flood 37%→~20%, 65→82 designs). Nous portrait re-homed as a poster; kindless-design rotation guard (no more blank products).
**Brand:** real design-system foundation (modular type scale --step--2..6, spacing --sp-*, radius --r-*, tabular numerals) · de-pilled chrome · loading skeleton on card thumbs.
**Copy:** "arms-length" removed from shopper-facing surfaces (kept in /terms).

## SHIPPED — oxygen economy footing is LIVE (2026-07-01)
**Sale-legitimacy "oxygen" primitive** — wired + deployed (oxygen.py, 611 lines, 47 tests pass; main.py OX-4/5 wiring applied deterministically). The ONE unforgeable signal the economy reads: a sale is oxygen only if arms-length (buyer≠creator via **server-side Stripe card fingerprint**, never body['buyer']) + royalty-paying (not at-cost/self) + distinct-payer + vested past the refund window. Gates `_increment_sold` (cap can't be self-pumped); revokes on refund/dispute/EFW. Read surface: `GET /oxygen` + `/oxygen/{slug}` (aggregates only, no PII). **Money path verified green post-deploy** (/checkout → cs_live_, /health ok). All oxygen calls fail-open on royalty (never stiffs a legit creator). ⚠️ For revocation to fire, enable charge.refunded / charge.dispute.created / radar.early_fraud_warning.created on the Stripe webhook endpoint config. `OXYGEN_VEST_DAYS` env (default 14) controls the vest window.

## Decisions only you can make (I built toward them, didn't do them)
1. ~~**Wire the oxygen primitive**~~ — ✅ DONE 2026-07-01 (see SHIPPED above; David greenlit "enable the economy"). Next economy steps in progress: tier rename (bazaar→proper tiers) → fixed-capacity tournament (read-only rank/heat) → Graveyard/Rack-heat surfaces.
2. **The rename** — away from "Edgeless." Two naming tournaments run. Round 1 (STET/BOURSE/ASSAY/CULL/EXTANT) was rejected as too cold/clinical. **Round 2 (warmer, recommended): KOVET** — invented word = "covet" (the emotion a scarce rack produces; encodes "only what's coveted survives"; `kovet.exchange` open; ⚠️ needs a class-25 TM check vs an Indian fast-fashion "Kovet"). Fallbacks: **VETTA** (Italian "summit" + "vet"), SELLO ("seal/stamp" + "sell"), KEPT (great sub-brand/line name). David to pick + TM-clear.
3. **Split buyer vs creator/agent surfaces** — ✅ IN-APP SPLIT DONE (David greenlit): (a) nav relabeled by intent — Shop the rack (buy) / Print your own / **Sell · earn 18%** (lime creator entry) / How it works; (b) the Pit (sell surface) now leads with "**For creators + agents.**" + earn-18%/how-listing-works framing; section headlines unified on serif. Fuller structural split (separate shop.* domain + creator dashboard) is bigger infra — needs David's architecture input.
4. **Enable the disintegrator economy** — ✅ oxygen footing SHIPPED (above). Two deliberate architecture calls: (a) **NO hard tier-rename** — premium/bazaar/quarantined is deeply embedded (77/3/2 designs, 70 frontend refs) AND is a *different axis* from the lifecycle (rack/graveyard); Fable's collision concern is satisfied by namespacing lifecycle-state as its OWN field, not renaming the quality verdict. (b) **Tournament rank/heat display DEFERRED** — `/oxygen` shows distinct_payers:0 (cold start); heat bars would all read zero until real sales flow, so building the display now = showing zeros. Build it (with cold-start proxy) once oxygen accrues, or wire a Verified-Connect seed endowment per the spec.

## Disintegrator v1 economy spec (Fable-architected, adversary-hardened)
- **Fixed rack capacity N*≈24** (hand-set until sales-density warrants a homeostat). Slots are **won, not minted** — kills the unlock-rate exploit.
- **"Decay" = realized-demand rank falling below the cutline.** Pressure fires only on the overage above N* → the store **can't self-empty or over-fill** by construction.
- **Oxygen = arms-length, royalty-paying, distinct-payer, vested sale** (the staged primitive). Wants/views never touch decay-resistance (too gameable).
- **Slots via `promo.reserve()/confirm()/release()`**: per-creator quota = concave function of a Wilson-lower-bound **hit-rate** (net sales/listings), hard-capped at ~5% of N* (diversity floor). Verified-Connect seed endowment (~3 slots) fixes cold-start. Use-or-lose TTL.
- **Series honesty:** uploads within a 24h window are one series by default, keyed to curator-verdict timestamp; series resistance needs breadth (K distinct siblings sold to distinct payers), so one wash sale can't shield junk.
- **Hardened against:** at-cost self-pump (zero oxygen), Sybil/collusion rings (buyer-diversity-weighted, fingerprint-derived, chargeback-vested), decay-bomb/series-shield (relative tournament, not global-N-coupled), rich-get-richer (concave + cap), homeostat thrash (fixed N* at launch).
- **Naming landmine:** the `_verdict` string "bazaar" already = the 45–74 quality band. Rename tiers to Quarantine → Rack → Graveyard → Resurrection BEFORE building the state machine.

## Notes / environment
- Deploy: backend → push `github.com/thedavidmurray/edgeless-store-api` (Render auto-deploy); frontend → `pnpm build` + `wrangler pages deploy dist` (prod). Get CF token via `dotenv_values('/Users/djm/claude-projects/.env')` (the `source .env` shell pattern is blocked by damage-control).
- **Visual verification:** shop.edgelesslab.com is browser-extension-permission-blocked, but the deploy-preview host `https://<hash>.edgeless-store.pages.dev` screenshots fine — use it to verify frontend changes + run visual tournaments.
- Stripe Connect is enabled (2 restricted accounts exist); payouts work once creators finish Stripe onboarding.
- **Mobile:** CSS is well-developed (720/768/920/1024 breakpoints; rack → 2-col, nav wraps, PDP modal stacks). NOT visually verified — the claude-in-chrome window won't drop below ~1096px innerWidth, so mobile emulation is blocked. Verify on a real phone before launch; polish likely needed on the wrapping nav.
- **Design-system status:** foundation (type scale, spacing, tabular-nums, de-pill, loading skeleton) shipped + screenshot-verified. Fable's fuller restyle (M3 serif headlines, M4 square stamps, M6 mechanical interactions) is drafted in workflow wp7bykmn4 output; M3 partially applied (`.pitTitle` has a more-specific rule still on Space Grotesk — needs the exact selector). Apply the rest with visual verification on a pages.dev preview.

## Overnight 2026-07-03 (autonomous session)
- **THE FOUNDRY** — agent-designer pipeline (free CF flux-1-schnell → real immune screening → catalog). 6 designs LIVE (designs.json→88). Pipeline: `tools/foundry_screen.py`, `tools/gen_discovery.py`, `tools/edgeless_asset_composer.py`. See [[reference-edgeless-foundry-pipeline]].
- **AGENT ONRAMP** — one-file SDK live at shop.edgelesslab.com/agent-kit/edgeless_agent.py (`agent-kit/`), llms.txt references it. Edgeless = open agent platform.
- **AEO/discovery** shipped: /catalog.json (86), WebSite+ItemList JSON-LD, sitemap 90, llms.txt read-side. Re-gen via `merch-demo/tools/gen_discovery.py` after catalog changes.
- **MONEY-PATH AUDIT** — 22 verified bugs, `MONEYPATH-AUDIT.md`, STAGED for supervised fix pass before first sale.
- **GAP AUDIT** — `GAP-REPORT.md` (28 gaps triaged). URGENT: retail floor not live (ca4019f on master but $26-on-$34-tee still goes through).
- **Findings for David:** IP-gate over-strict; FLORA REST key dead; CF 403s Python-urllib UA (SDK handles); edgelesslab.com CF-Pages migration deployed (DNS flip pending).
