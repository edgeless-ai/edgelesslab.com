# Revenue status

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
