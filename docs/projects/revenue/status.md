# Revenue status

## Free-kit migration — 2026-10-15

**Current decision:** Gumroad = lead capture, not revenue. Everything is free. Primary metric: **emails captured/week**, counted as unique email addresses on completed free Gumroad claims in the trailing seven days. Retain only aggregate counts here, never buyer emails. Consented `cta_clicked` with `cta_name=free_kit_checkout` is a separate intent metric, not a purchase or captured email. The earlier paid-Pro positioning and missing-token statements below are historical and superseded.

### Verified progress

- Complete pagination found **21 original products**, including all eight reportedly missing short codes in the same account.
- All original base prices set to zero and individually read back; Prompt Engineering OS version surcharges also set to zero and read back.
- **One published listing: Edgeless Free Kit**, base price zero. All 21 original standalone listings unpublished and individually read back: 17 consolidated resources and four excluded unusable products. All 22 base prices read back as zero.
- Published **Edgeless Free Kit** with its clean cover, full contents list and verified archive. Approved customer path: `https://edgelessai.gumroad.com/l/edgeless-free-kit?wanted=true&price=0`.
- Consolidated 17 resources with a two-page START-HERE.pdf, browser contents page, and SHA-256 file manifest. Uploaded archive downloaded back: byte-for-byte match, CRC valid, **10,439,098 bytes**. Removed bundled dependencies, generated builds, bytecode, and sales-listing drafts; retained original licenses. Prompt OS includes its complete team edition once, rather than three duplicate tiers.
- Archives checked for extraction integrity and Python syntax parsed. Materials date to March–April 2026: compatibility with current services is **not integration-tested**. Prepared package/page explicitly label these as references requiring review and current vendor documentation, not current production guarantees.
- Deployed the one-CTA /products page with consent-aware click tracking and link to `/services/private-ai-systems` on canonical main. Legacy product URLs now describe the consolidation (or retirement) rather than advertising unusable files and prices. The public catalog/search index now offers only the free kit.

### Approved checkout decision

Gumroad automatically enables pay-what-you-want for a zero base price. Documentation and API readbacks agree: `customizable_price=false` via form/JSON, empty values, and a zero-priced version all leave `customizable_price=true`. A native `$0` product without pay-what-you-want cannot be represented as requested.

Real Chromium test on the **published Edgeless Free Kit** with `?wanted=true&price=0`: checkout shows **Total US$0**, email and **Get**, with no card fields or amount prompt. Empty-email validation sets `aria-invalid=true` and focuses the email field. No email entered, claim completed or payment submitted; purchase/checkout/charge POSTs were intercepted and blocked as an additional safeguard. Unpublishing the consolidated standalone listings also removes the distracting related-product suggestions.

**David approved** direct zero-price checkout in #ingest message 1560511853694689351, then confirmed in message 1560514316049059861 that **pay-what-you-want with a zero minimum is acceptable everywhere** and standard Gumroad URLs are also fine. The already-verified direct checkout remains in site CTAs; ordinary Gumroad pages retain pay-what-you-want.

Seller CLI authorization was available on this resumed run. Kit publication, cover/copy and original-listing consolidation have now executed and been read back from Gumroad.

### Product disposition

| Product | Status | Reason |
| --- | --- | --- |
| CLAUDE.md Template Pack | Kept in free kit; standalone unpublished | Extractable templates; start-here resource |
| Claude Code Cheat Sheet | Kept in free kit; standalone unpublished | Extractable browser reference |
| Quick Reference Cards | Kept in free kit; standalone unpublished | Extractable reference material |
| The Agent Cookbook | Kept in free kit; standalone unpublished | Extractable examples and guide |
| AI Code Review Playbook | Kept in free kit; standalone unpublished | Extractable review references |
| Hooks Library | Kept in free kit; standalone unpublished | Extractable examples; review before running |
| Claude Code Hooks Deep Dive | Kept in free kit; standalone unpublished | Extractable documentation/examples |
| Obsidian + Claude Code Setup Kit | Kept in free kit; standalone unpublished | Extractable setup references |
| MCP Server Starter Kit | Kept in free kit; standalone unpublished | Extractable starter examples; API compatibility unverified |
| Production MCP Server Kit | Kept in free kit; standalone unpublished | Extractable templates; not a current production guarantee |
| n8n AI Workflow Templates | Kept in free kit; standalone unpublished | Extractable workflows; import into a test instance |
| Prompt Testing Framework | Kept in free kit; standalone unpublished | Extractable source examples |
| The Prompt Engineering OS | Kept in free kit; standalone unpublished | Complete team edition; smaller duplicates omitted |
| Multi-Agent Orchestration Blueprint | Kept in free kit; standalone unpublished | Extractable architecture references |
| Autonomous Agent Safety Patterns | Kept in free kit; standalone unpublished | Extractable safety references |
| Generative Art Starter Kit | Kept in free kit; standalone unpublished | Extractable browser sketches |
| Digital Product Launch Toolkit | Kept in free kit; standalone unpublished | Extractable planning templates |
| Claude Memory Kit Pro | Retired / unpublished | Corrupt ZIP; invalid-distance zlib extraction failure |
| Edgeless Agent Starter Kit | Retired / unpublished | No delivered files; empty paid tiers |
| Email Inbox Triage — Gmail Classifier & Router | Retired / unpublished | No delivered files; unfinished draft |
| AI Digital Product Factory | Retired / unpublished | No delivered files; unfinished draft / paid tiers |

### Measurement and release verification

Seller API readback: **0 lifetime claims on all 22 records**, so baseline emails captured/week is **0** at release (no claims exist to deduplicate). No individual buyer data retained. Earlier PostHog baseline below remains historical, not evidence of captured emails. After release compare equivalent seven-day completed free claims, deduplicated emails, consented /products views, and free-kit CTA events separately.

Isolated dependency installation fixed the inherited cross-worktree executable wrappers. Full static export succeeded. Full Vitest run: **176 passed across 17 test files**; replaced superseded paid-kit regression assertions.

Deployed implementation **b0690afb956d4ca5b1da9a99ddb13c898354d0d9** to canonical main. Exact-head Frontend Tests (38852604496), E2E Tests (38852604472), and CI/CD with successful Deploy to GitHub Pages (38852604481) passed. Local Playwright: **14 passed**. Clean Chromium on the custom domain at desktop 1440×1000 and mobile 390×844: HTTP 200, one kit CTA, no stale paid claims, no horizontal overflow, **0 /products CSP violations and 0 page errors**. Both actual CTA clicks reached the published kit at **US$0** with required-email validation and no visible card/amount fields. No email entered and no claim/payment submitted. Gumroad's separate checkout emits Google Fonts CSP warnings under its own policy; those do not occur on /products and did not block the free checkout. Final release handoff is recorded on task t_70d5046b.

## CRO kickoff — 2026-10-15

### Baseline (before the featured-CTA change)

PostHog query window: **2026-09-15 23:53:00 UTC through 2026-10-15 23:53:00 UTC**, start inclusive / end exclusive.

| Stage | Recorded result |
|---|---:|
| `/products` or `/products/` page views | 10 |
| Unique distinct IDs on those views | 6 |
| Checkout CTA events from that listing | 0 |
| Purchase-initiated events from that listing | 0 |
| Gumroad sales / revenue | Unknown — seller API access token unavailable |

Source: PostHog HogQL query API. Page views use `$pageview` with `$pathname` or exact production `$current_url`; checkout events use `cta_clicked` with `cta_name` in `gumroad_checkout` / `stripe_checkout`, or `purchase_initiated`, and listing-path/current-url/page-url filters. No buyer identity data is retained here. The checkout query returned no rows. These are observed events, **not proof of no actual clicks or sales**: consent and an uninstrumented featured anchor limit coverage. Browser checks are synthetic and may contaminate subsequent analytics if consent/collection settings change.

Missing seller credential: **GUMROAD_ACCESS_TOKEN**, or an equivalent privately supplied seller OAuth token with sales-read permission. No Gumroad-named environment variable was available to this worker. Do not equate unknown revenue with $0. No purchase was made or Pay button pressed.

### One reversible conversion fix

Replace the featured raw anchor with the existing consent-aware `GumroadButton`, label it **Get Claude Memory Kit Pro**, show the existing product contents **12 templates · 5 stack libraries**, and attribute the destination with `utm_content=hero`. Before: ambiguous “Start with Claude Memory Kit” plus “Open references first,” with no component checkout instrumentation. After: explicit Pro-kit CTA using the same tracked overlay path as the catalog. Product pricing and offer scope are unchanged; the component's price metadata matches the existing catalog value.

Primary measurement: weekly consenting listing visitors with at least one checkout click / consenting listing visitors; report raw counts alongside the rate. Count `cta_clicked` (`gumroad_checkout` or legacy `stripe_checkout`) and `purchase_initiated` separately, never sum them as distinct clicks. Check destination `utm_content=hero` for featured attribution. Compare equivalent 7-day windows after release; with this tiny baseline, do not claim a conversion lift or significance. Reconcile sales and dollars with Gumroad once seller access exists.

### Live buy-path verification

Before release: clean Chromium contexts clicked every listing Gumroad anchor plus each product detail purchase destination: **20/20 passed**, **19 visible overlays**, **1 intentional new tab** (Agent Starter Kit). No Gumroad CSP violations. Agent Starter Kit uses the legacy `StripeButton` component despite its Gumroad URL; opening a new tab is not a broken link. Screenshots and JSON browser output are retained with the CRO worktree/task evidence, not committed generated site output.

Observed pricing discrepancy requiring David's decision, not an unauthorized pricing edit: Claude Memory Kit Pro's Gumroad overlay currently displays **$0+**, while the existing site catalog labels it **$29**. This change does not alter either price.

### Shop decisions (existing gated cards remain separate)

1. **Authorization/access/release:** Will David approve the isolated Stripe test envelope in t_0efafad9 (approved origins + pinned commit, privately injected test keys, at most one synthetic session and expiry, no Pay/supplier/email call), provide kilo authorized GitHub access for t_6c304ca7, and approve named release SHAs only after the combined candidate passes? No shop release is authorized by this CRO deploy.
2. **Fulfillment and totals:** Which supplier per SKU, selling countries, shipping quote source/rates, duties/tax responsibility, and production-cancellation window are approved? How must the delivered total be shown given the current single USD Stripe line item and no automatic tax/shipping options? Separately confirm whether the Pro kit's existing $29 site label or $0+ Gumroad setting is intended before any price change.
3. **Processors:** What are the actual purposes, configuration/retention and DPAs for PostHog, Privy, WalletConnect and external Google Fonts; should fonts remain external or be self-hosted?
4. **Jurisdiction/consumer rights:** What are the target markets and aggregate customer jurisdictions, and what does counsel decide about CCPA applicability and EU/UK/Brazil withdrawal handling?
5. **Rights:** Where is the per-asset/model/font/brand license evidence; what is the infringement-intake runbook and counsel's DMCA designated-agent decision?
6. **Support:** Which mailbox is canonical (souls@, help@, or david@), who owns handling, and is one harmless test delivery authorized?

Policy answers belong on t_d9a281c7; final policy publication remains David/counsel gated.

### Weekly line

Revenue last 7 days: **unknown (Gumroad seller token missing)**; conversations started: **not measured yet**; shipped change: featured Pro-kit CTA + tracked overlay; next measurement: 7-day listing-to-checkout counts and seller sales reconciliation. First Monday update should replace unknowns with verified numbers, never inferred zeros.
