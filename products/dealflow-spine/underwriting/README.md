# Underwriting Library

Deal-math and strategy-selection layer for the dealflow-spine opportunity
engine. Python 3.11, **stdlib only**. All modules accept **plain dicts** and
are forgiving about missing keys — a `DealCandidate` object that supports
`dict(candidate)` or exposes the keys below plugs straight in.

> **Not financial or legal advice.** R&D / educational-analytical software.
> Every structure here (sub-to especially) has real legal exposure — verify
> with a licensed attorney before acting. Per the strategy doc: the AI is the
> sourcing/screening firehose; a **human** underwrites, offers, and wires.

Framework source: `claude-vault/04-Sessions/2026-06-23-ebre-cmco-opportunity-engine.md`.

## Conventions (all modules)

- Rates accepted as percent **or** decimal (`3.25` == `0.0325`); terms in months.
- Missing keys tolerated → `None`/`0` outputs, never exceptions.
- Dollar outputs are floats; compare with tolerance.

## `finance.py` — shared TVM primitives

```python
monthly_payment(principal, annual_rate, term_months) -> float
remaining_balance(principal, annual_rate, term_months, payments_made) -> float
annuity_pv(monthly_cashflow, annual_discount_rate, months) -> float
first_month_principal(balance, annual_rate, p_and_i) -> float
```

## `wholesale.py` — MAO calculator

```python
mao(arv, repairs, margin=0.30, wholesale_fee=0.0) -> float
    # ARV*(1-margin) - repairs - fee

adjust_comp(comp_sale_price, {label: signed_dollars}) -> dict
    # signs from the SUBJECT's perspective: + if subject superior
sqft_adjustment(subject_sqft, comp_sqft, dollars_per_sqft) -> float
arv_from_comps(subject_sqft, comps) -> dict         # median adjusted $/sqft
    # comps: [{"sale_price", "sqft", "adjustments": {...} (opt)}]

assignment_scenarios(contract_price, arv, repairs, buyer_margin=0.30,
                     fees=(5k,10k,15k,20k)) -> list[dict]  # viability per fee
max_assignment_fee(contract_price, arv, repairs, buyer_margin=0.30) -> float

sensitivity_table(arv, repairs, ...) -> dict    # ARV ±10% x repairs ±25% grid
format_sensitivity_table(table) -> str          # plain-text render
```

## `subto.py` — subject-to analyzer

```python
analyze(deal: dict) -> dict
```

Input keys: `value, loan_balance, loan_rate, piti, p_and_i (opt),
market_rent, arrears, cash_to_seller, closing_costs, reserve_pct (0.15),
balloon_months (opt), loan_type (opt), resale_value (opt),
wrap_price/wrap_down/wrap_rate/wrap_term_months (opt → wrap exit)`.

Output: `entry_cost, monthly_cash_flow, annual_cash_flow, dscr,
equity_capture, cash_on_cash, risk_flags[], exits{hold, flip, wrap}`.

DSCR convention (documented, conservative): `(rent − reserves) / PITI` —
full PITI including escrow as the denominator. `due_on_sale` is **always**
flagged (structural to sub-to).

## `assumption.py` — FHA/VA/USDA assumption analyzer

```python
analyze(deal: dict) -> dict
```

Input keys: `loan_type, loan_balance, loan_rate, remaining_term_months,
price, market_rate (7%), hold_months (60), discount_rate (0.05)`.

Output: `assumable, mechanics[], current_payment, market_payment,
monthly_savings, rate_delta, equity_gap, equity_gap_pct,
gap_financing{tier, options}, npv_savings, npv_assumptions,
buyer_qualification_checklist[]`.

Savings convention: market payment computed on the **same balance over the
same remaining term** at market rate — isolates the coupon. NPV discounts
level monthly savings at `discount_rate/12` (simple, documented; default 5%
annual = opportunity cost of parked capital).

## `strategy_picker.py` — the decision engine

```python
pick(facts: dict) -> {"ranked": [...], "recommendation": str,
                      "derived": {...}, "hitl_note": str}
derive_facts(facts) -> dict     # the normalization step, exposed for testing
rule_table() -> str             # human-readable dump of every rule
```

**Stable shape contract**: `pick()` ALWAYS returns
`{"ranked": list-of-dicts (best first, sliceable, 'pass' included),
"recommendation": str (== ranked[0]["strategy"]), "derived": dict,
"hitl_note": str}` — every ranked entry has `strategy, score, applicable,
reasons[] (rule id + why + citation), disqualifiers[], next_action`.
Non-dict/empty input degrades to a `pass` recommendation, never raises.

Input keys (all optional, aggressively forgiving):

- `value` (or `arv` / `price`), `loan_balance`, `loan_rate`, `loan_type`,
  `market_rate`, `piti`, `market_rent`
- loan facts may instead be nested: `loan: {balance, rate, type}`
- `equity_pct` (0.12 or 12) is honored when value/balance can't derive it
- rates/dollars accept numbers or strings (`2.75`, `0.0275`, `"2.75%"`,
  `"$310,000"`)
- `condition`: 1–5 or teardown/poor/fair/good/turnkey
- signals under `signals`, `motivation`, or `motivation_signals`; a bare
  string is treated as a one-element list

**Signal vocabulary** (canonical, in `MOTIVATION_SIGNALS`): `arrears,
pre_foreclosure, probate, estate, divorce, tax_delinquent, fire_damage,
insurance_gap, job_relocation, tired_landlord, vacant, fsbo, absentee,
code_violations, eviction, obituary`. Property-shape flags (not motivation):
`non_conforming, misfit, unfinished_basement`. Common synonyms map via
`SIGNAL_ALIASES` (`relocation→job_relocation`, `foreclosure/nod→
pre_foreclosure`, `behind_on_payments/delinquent→arrears`, `inherited→
probate`, `out_of_state→absentee`, …). **Unrecognized signal strings count
as generic motivation at 0.5 weight** (`UNKNOWN_SIGNAL_WEIGHT`) — a novel
detector label is still evidence of a seller problem and never silently
zeroes out to `pass`; it is surfaced in `derived["unrecognized_signals"]`.

`pass` is a first-class strategy: zero motivation signals **always** ranks
pass first ("no seller problem to solve = no deal at any structure").

Rules live in `strategy_picker.RULES` — one dataclass per rule, explicit
weight, testable predicate, and citation. Run
`python3.11 -c "from underwriting import strategy_picker; print(strategy_picker.rule_table())"`
for the full table.

## Tests

```bash
cd products/dealflow-spine
python3.11 -m pytest underwriting/tests/ -q     # 55 tests, hand-computed cases
```

## Playbooks

Operational manuals with worked examples using these calculators' actual
output: `../playbooks/{wholesale,subto,assumption,seller-conversation}.md`.
