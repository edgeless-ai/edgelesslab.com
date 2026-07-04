# Playbook: Subject-To (Sub-To)

> **Not financial or legal advice.** Internal R&D / educational-analytical
> material. Sub-to carries REAL structural legal risk (due-on-sale, seller
> disclosure, foreclosure-rescue statutes in many states). Nothing here is a
> substitute for a licensed attorney reviewing the specific deal and state.

## When it applies

Strategy-picker rules S1–S4 (see `strategy_picker.RULES`):

- **Low equity (< 20%) + coupon ≥ 1.5% below market** — the canonical
  shape: there is nothing to buy but the debt, and the debt is the asset.
- **PITI ≤ market rent** — positive carry from day one.
- **Arrears / pre-foreclosure** — reinstatement is a solvable, priceable
  seller problem; the offer itself is the solution (be-honest-solve-problems).
- Disqualified when: no existing debt (→ seller finance), rate at/above
  market (nothing worth taking over), or PITI > 110% of market rent
  (structural negative carry).
- If the loan is **VA or FHA (assumable)**, the picker deliberately prefers
  **formal assumption** (rule A4): same rate capture, no due-on-sale risk,
  and the veteran's entitlement can be restored.

## Deal mechanics, step by step

1. **Verify the loan** — servicer statement, not the seller's memory:
   balance, rate, PITI split (P&I vs escrow), arrears, loan type.
2. **Run `subto.analyze(deal)`** with statement numbers + market rent.
   Kill on `negative_cash_flow`; treat `low_dscr`/`thin_cash_flow` as
   price-negotiation facts.
3. **Attorney designs the close**: deed transfer (often to a land trust),
   attorney-drafted seller disclosures acknowledging the loan stays in the
   seller's name and due-on-sale risk, third-party loan servicing so
   payments are provable.
4. **Cure arrears at closing through escrow** and obtain the reinstatement
   letter from the servicer (the `reinstatement` flag).
5. **Reserve for the structural risk**: hold enough liquidity to refinance
   or resell if the lender calls the note.
6. **Operate**: rent at market, autopay the underlying, monitor escrow
   changes (taxes/insurance repricing eats spread).
7. **Exit** per the modeled scenarios: hold, wrap, or retail flip.

## Worked example (actual `subto.analyze()` output)

Deal: value $340,000; existing loan $280,000 @ 3.25% (PITI $1,650, P&I
$1,218.59); market rent $2,200; arrears $8,000; cash to seller $5,000;
closing $3,000.

```
entry_cost            = 8,000 + 5,000 + 3,000            = $16,000
monthly reserves(15%) = 2,200 × 0.15                     = $330
monthly_cash_flow     = 2,200 − 330 − 1,650              = $220
annual_cash_flow                                          = $2,640
dscr                  = (2,200 − 330) / 1,650            = 1.13
equity_capture        = 340,000 − 280,000 − 16,000       = $44,000
cash_on_cash          = 2,640 / 16,000                   = 16.5%
risk_flags            = due_on_sale, low_dscr, reinstatement
```

**Exits** (same call):

- **Hold**: $220/mo cash flow + $460.26 first-month principal paydown →
  approx year-1 total return **$8,163** (paydown approximated as 12×
  month-1 principal — slightly understates).
- **Wrap** (sell at $320,000 with $20,000 down, wrap note $300,000 @ 8.5%
  / 360 mo): wrap P&I **$2,306.74**, monthly spread **$656.74**, cash at
  close **$4,000** (down payment minus entry cost).
- **Flip** (retail at $340,000, 7% selling costs $23,800): profit
  **$20,200** — thin; this deal is a hold/wrap, not a flip.

Read: DSCR 1.13 is below the 1.20 healthy line — the spread is real but
thin, so the equity capture and the wrap spread are what make this deal.

## Key risks and mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Due-on-sale call (Garn–St Germain) | Structural, always flagged | Refi/resale reserves; keep loan flawlessly current; attorney-drafted structure; never hide the transfer from your own paperwork |
| Seller disclosure / foreclosure-rescue statutes | Legal | Attorney-drafted acknowledgments; many states heavily regulate deals with sellers in default — check BEFORE contracting |
| Balloon on the underlying | Structural | `balloon_months` flag; exit must complete before the date |
| Negative or thin carry | Fatal / warning | `analyze()` flags it; walk or reprice |
| Escrow repricing (taxes/insurance up) | Operational | Underwrite with reserve_pct; re-run annually |
| VA loan seller harm (entitlement tied up) | Ethical | Picker prefers assumption on assumable loans (rule A4); disclose to veteran sellers |
| Seller expects credit repair miracles | Reputational | Honest script: loan STAYS on their credit; on-time payments help but the debt remains theirs |

## What the spine must provide

- `loan_balance, loan_rate, piti, loan_type` — mortgage/deed-of-trust data
  (DataTree-class) + servicer statement at HITL stage
- `arrears` / pre-foreclosure status — default/lis-pendens detectors
- `market_rent` — rent comps adapter
- `value` — AVM/comps
- `signals[]` — motivation detectors (arrears, pre_foreclosure, divorce…)
