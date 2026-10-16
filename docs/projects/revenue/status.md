# Revenue status

## Free-kit migration — 2026-10-15 (incomplete)

**Current decision:** Gumroad = lead capture, not revenue. Everything is free. Primary metric: **emails captured/week**, counted as unique email addresses on completed free Gumroad claims in the trailing seven days. Retain only aggregate counts here, never buyer emails. Consented `cta_clicked` with `cta_name=free_kit_checkout` is a separate intent metric, not a purchase or captured email. The earlier paid-Pro positioning and missing-token statements below are historical and superseded.

### Verified progress

- Complete pagination found **21 original products**, including all eight reportedly missing short codes in the same account.
- All original base prices set to zero and individually read back; Prompt Engineering OS version surcharges also set to zero and read back.
- **17 original listings remain published**, each base price zero. Four unusable products unpublished and individually read back.
- Created **Edgeless Free Kit** as an **unpublished draft** at `https://edgelessai.gumroad.com/l/edgeless-free-kit`. Do not send traffic to it yet.
- Consolidated 17 resources with a two-page START-HERE.pdf, browser contents page, and SHA-256 file manifest. Uploaded archive downloaded back: byte-for-byte match, CRC valid, **10,439,098 bytes**. Removed bundled dependencies, generated builds, bytecode, and sales-listing drafts; retained original licenses. Prompt OS includes its complete team edition once, rather than three duplicate tiers.
- Archives checked for extraction integrity and Python syntax parsed. Materials date to March–April 2026: compatibility with current services is **not integration-tested**. Prepared package/page explicitly label these as references requiring review and current vendor documentation, not current production guarantees.
- Prepared one-CTA /products page, cover, contents, consent-aware click tracking and link to the existing `/services/private-ai-systems` offer in an isolated worktree. **Not deployed.**

### Blocker / decision

Gumroad automatically enables pay-what-you-want for a zero base price. Documentation and API readbacks agree: `customizable_price=false` via form/JSON, empty values, and a zero-priced version all leave `customizable_price=true`. A native `$0` product without pay-what-you-want cannot be represented as requested.

Real Chromium test on an existing resource with `?wanted=true&price=0`: direct checkout showed **Total US$0**, required email and **Get**, with no card fields or amount prompt. No claim/payment submitted. Prepared site uses this direct-checkout pattern. This is **not** verification of the unpublished bundle; its ordinary Gumroad product page would still expose pay-what-you-want.

**Decision needed:** approve direct zero-price checkout as the no-nag customer path despite native product-page behavior, or choose a different email-gated delivery mechanism.

Two subsequent compound mutation commands were refused before execution by the tool safety gate (`Potential credential file access`). Attempted original-listing consolidation and kit-description update **did not execute**. Do not assume success or bypass the gate.

### Product disposition

| Product | Status | Reason |
| --- | --- | --- |
| CLAUDE.md Template Pack | Included in draft kit; original free | Extractable templates; start-here resource |
| Claude Code Cheat Sheet | Included in draft kit; original free | Extractable browser reference |
| Quick Reference Cards | Included in draft kit; original free | Extractable reference material |
| The Agent Cookbook | Included in draft kit; original free | Extractable examples and guide |
| AI Code Review Playbook | Included in draft kit; original free | Extractable review references |
| Hooks Library | Included in draft kit; original free | Extractable examples; review before running |
| Claude Code Hooks Deep Dive | Included in draft kit; original free | Extractable documentation/examples |
| Obsidian + Claude Code Setup Kit | Included in draft kit; original free | Extractable setup references |
| MCP Server Starter Kit | Included in draft kit; original free | Extractable starter examples; API compatibility unverified |
| Production MCP Server Kit | Included in draft kit; original free | Extractable templates; not a current production guarantee |
| n8n AI Workflow Templates | Included in draft kit; original free | Extractable workflows; import into a test instance |
| Prompt Testing Framework | Included in draft kit; original free | Extractable source examples |
| The Prompt Engineering OS | Included in draft kit; original free | Complete team edition; smaller duplicates omitted |
| Multi-Agent Orchestration Blueprint | Included in draft kit; original free | Extractable architecture references |
| Autonomous Agent Safety Patterns | Included in draft kit; original free | Extractable safety references |
| Generative Art Starter Kit | Included in draft kit; original free | Extractable browser sketches |
| Digital Product Launch Toolkit | Included in draft kit; original free | Extractable planning templates |
| Claude Memory Kit Pro | Retired / unpublished | Corrupt ZIP; invalid-distance zlib extraction failure |
| Edgeless Agent Starter Kit | Retired / unpublished | No delivered files; empty paid tiers |
| Email Inbox Triage — Gmail Classifier & Router | Retired / unpublished | No delivered files; unfinished draft |
| AI Digital Product Factory | Retired / unpublished | No delivered files; unfinished draft / paid tiers |

### Acceptance remaining

Actual completed-claim/email baseline has not been calculated. Earlier PostHog baseline below remains historical, not evidence of captured emails. After release compare equivalent seven-day completed free claims, deduplicated emails, consented /products views, and free-kit CTA events separately.

Targeted free-kit regression tests: **4 passed** (real Vitest run). `git diff --check` passed. Full build attempted but blocked by inherited shared node_modules executable wrappers resolving to a different worktree (missing TypeScript CLI path); design-system checks ran 69 tests successfully before that failure. No full static export or deployment claimed.

Still required: resolve pricing constraint; finish kit copy/cover and publication; verify actual bundle checkout; repair isolated dependency installation, build and commit/push canonical main; require exact-head Frontend Tests, E2E Tests and Pages deployment; verify live desktop/mobile /products with zero CSP violations. Do not report this migration complete.

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
