# Playbook: Wholesale (Assignment)

> **Not financial or legal advice.** Internal R&D / educational-analytical
> material. Contract assignability, disclosure duties, and wholesaling
> licensing rules vary by state (some require a license or ban marketing the
> property itself) — verify with a local real-estate attorney before any use.

## When it applies

The strategy picker routes here when (see `strategy_picker.RULES` W1–W4):

- **Equity ≥ 30%** and **2+ overlapping motivation signals** — the
  "2+ list targeting = highest conviction" rule from the strategy doc.
- **Condition ≤ 2 (poor/teardown)** — retail buyers and their lenders are
  out; flip buyers (the assignment buyer pool) are the natural exit.
- **Misfit toys** — non-conforming / appraisal-gap outliers that financing
  chokes on. Cash-buyer assignment is the clean exit.
- Disqualified when **equity < 15%**: no spread can absorb the end buyer's
  margin plus your fee.

## Deal mechanics, step by step

1. **Spine hands you the lead** with signals attached (e.g. fire_damage +
   absentee). Confirm facts on the seller call (see seller-conversation.md).
2. **Establish ARV** from adjusted comps — `wholesale.arv_from_comps()`.
   Median adjusted $/sqft, not mean; flag any comp whose gross adjustments
   exceed 25% of its sale price.
3. **Estimate repairs** (walkthrough, photos, or contractor bid — the
   spine's condition-from-imagery signal is a screen, not an estimate).
4. **Compute MAO** — `wholesale.mao(arv, repairs, margin, fee)` — and run
   the **sensitivity table** before offering. If the deal only works in the
   optimistic corner, pass.
5. **Contract with the seller** at or below MAO, with an assignability
   clause and honest disclosure that you may assign. Deposit with title.
6. **Size the assignment fee** — `wholesale.assignment_scenarios()` /
   `max_assignment_fee()` — from the END BUYER's ceiling, not from greed.
7. **Assign to a cash buyer**, close through title/escrow, collect fee at
   closing (never outside escrow).

## Worked example (actual calculator output)

Subject: 1,550 sqft, fire-damaged, absentee owner.

**ARV from comps** — `arv_from_comps(1550, comps)` with three comps
(300k/1,500 sqft; 330k/1,650 sqft; 352k/1,600 sqft with a −$32,000 pool
adjustment) → adjusted median **$200/sqft → ARV $310,000** (rounded to
$300,000 for underwriting margin below).

**MAO** — `mao(300_000, 40_000, margin=0.30, wholesale_fee=10_000)`:

```
300,000 × 0.70 = 210,000 − 40,000 repairs − 10,000 fee = MAO $160,000
```

**Sensitivity** — `format_sensitivity_table(sensitivity_table(300_000, 40_000, 0.30, 10_000))`:

```
repairs \ ARV |     270,000 |     285,000 |     300,000 |     315,000 |     330,000
-----------------------------------------------------------------------------------
       30,000 |     149,000 |     159,500 |     170,000 |     180,500 |     191,000
       40,000 |     139,000 |     149,500 |     160,000 |     170,500 |     181,000
       50,000 |     129,000 |     139,500 |     150,000 |     160,500 |     171,000
```

Stress case (ARV −10%, repairs +25%) = **$129,000**. If the seller needs
more than that, you know exactly how much optimism you're buying.

**Assignment fee** — contracted at $155,000; `assignment_scenarios(155_000, 300_000, 40_000)`:

| Fee | Buyer all-in | Buyer ceiling | Headroom | Viable |
|---|---|---|---|---|
| $5,000 | $160,000 | $170,000 | $10,000 | yes |
| $10,000 | $165,000 | $170,000 | $5,000 | yes |
| $15,000 | $170,000 | $170,000 | $0 | yes (max fee) |
| $20,000 | $175,000 | $170,000 | −$5,000 | **no** |

`max_assignment_fee(155_000, 300_000, 40_000)` = **$15,000**.

## Key risks and mitigations

| Risk | Mitigation |
|---|---|
| State wholesaling/licensing rules (varies widely) | Attorney review of contract + marketing practice per state; some states require licensure |
| Repair estimate wrong → buyer retrades | Sensitivity table before offer; contract at stress-case number when signals are heavy |
| Comp quality (few sales, outliers) | Median $/sqft; `reliable` flag on >25% gross adjustments; widen radius honestly |
| No end buyer (mispriced fee) | Size fee from `assignment_scenarios` headroom, keep ≥ $5k buyer headroom |
| Seller feels deceived (assignment surprise) | Disclose assignability plainly at contract — the be-honest-solve-problems rule |
| Earnest money loss if you can't perform | Inspection contingency window sized to your buyer-list depth |

## What the spine must provide

- `arv` or comp set (sale_price, sqft, adjustment hints) — from comps adapter
- `condition` (1–5) — condition-from-imagery signal
- `signals[]` — motivation detectors (fire_damage, absentee, probate, …)
- `value` + `loan_balance` (for equity %) — deed/lien data (DataTree-class)
- owner mailing address (absentee flag) — cadastral spine
