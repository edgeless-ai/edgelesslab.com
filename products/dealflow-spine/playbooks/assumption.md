# Playbook: Loan Assumption (FHA / VA / USDA)

> **Not financial or legal advice.** Internal R&D / educational-analytical
> material. Assumption terms are controlled by the servicer and the agency
> handbook in force — verify everything in writing with the servicer and an
> attorney before contracting.

## When it applies

Strategy-picker rules A1–A4 (see `strategy_picker.RULES`):

- Loan type is **FHA, VA, or USDA** (conventional = due-on-sale enforced,
  disqualified) **and rate ≥ 1.5% below market** — the rate delta is
  legally transferable: a below-market annuity.
- **Equity gap ≤ 15% of value** scores extra (bridgeable like a normal down
  payment); **gap > 25% disqualifies** (typical buyers can't bridge it —
  the rate delta is stranded; consider seller carryback).
- When both sub-to and assumption fit, assumption is deliberately preferred
  (rule A4): no due-on-sale risk, and the honest structure for VA sellers.

## Deal mechanics, step by step

1. **Confirm assumability**: loan type + vintage from the deed of trust /
   note. FHA post-1989 = assumable with creditworthiness review. VA =
   assumable by veterans AND non-veterans with approval (0.5% funding fee).
2. **Request the servicer's assumption package** by name — this starts the
   45–90 day clock and gets the fees and overlay requirements in writing.
3. **Run `assumption.analyze(deal)`** — payment savings, equity gap tier,
   NPV of savings over the hold period.
4. **Bridge the equity gap**: cash if `fundable` (≤15%), seller carryback
   second or partner capital if `stretch`, renegotiate price if `hard`
   (secondary financing behind FHA/VA must satisfy agency subordinate-lien
   rules — verify).
5. **Buyer qualifies with the servicer** on the EXISTING payment (credit +
   DTI). Use the module's `buyer_qualification_checklist`.
6. **VA specifics**: if the buyer is a veteran, file entitlement
   substitution (restores the seller's entitlement — a genuine seller
   benefit worth negotiating on). If not, the seller must be told plainly
   their entitlement stays encumbered.
7. **Close through title**: seller obtains **release of liability in
   writing** at closing, or they remain on the hook.

## Worked example (actual `assumption.analyze()` output)

Deal: VA loan, balance $400,000 @ 2.75%, 300 months remaining; purchase
price $460,000; market rate 7.0%; hold 60 months; discount rate 5%.

```
current_payment  (400,000 @ 2.75% / 300 mo)   = $1,845.24
market_payment   (same balance/term @ 7.00%)  = $2,827.12
monthly_savings                                = $981.87
rate_delta                                     = 4.25%
equity_gap       (460,000 − 400,000)          = $60,000  (13.0% of price)
gap tier                                       = fundable (≤15% ≈ normal down payment)
npv_savings      (60 mo @ 5%/yr discount)     = $52,030
```

Read: the buyer pays $60,000 down and inherits a payment $982/mo below
what the same debt costs today — worth ~$52k in present value over just a
5-year hold (NPV convention documented in `npv_assumptions`: level monthly
savings discounted at 5%/12; savings computed on the same balance and
remaining term so it isolates the coupon).

## Key risks and mitigations

| Risk | Mitigation |
|---|---|
| Servicer slow-walks (45–90+ days) | Assumption package requested before contract; closing date set from the servicer's timeline, not hope |
| Buyer fails servicer overlay (credit/DTI) | Pre-check against `buyer_qualification_checklist` before contracting |
| Equity gap financing falls through | Gap tier drives the plan up front; agency subordinate-lien rules verified for any second |
| Seller not released from liability | Written release of liability at closing — non-negotiable |
| VA seller's entitlement stranded (non-vet buyer) | Disclose plainly; price the concession; prefer veteran buyers when the seller needs entitlement back |
| Rate delta eaten by expensive gap second | Model blended cost: hard-money second at 12% can erase the assumption savings — run the numbers, not the vibe |
| Assumption fees surprise | Fees quoted in the servicer package up front (typ. $500–3,000) |

## What the spine must provide

- `loan_type` + origination date/vintage — deed-of-trust records (FHA/VA
  case numbers appear on recorded instruments)
- `loan_balance, loan_rate, remaining_term_months` — origination amount/date
  + amortization estimate; servicer statement at HITL stage
- `price`/`value` — AVM/comps (drives the equity gap)
- `market_rate` — weekly rate feed (Freddie PMMS-class)
- `signals[]` — motivation detectors (job_relocation, divorce, …)
