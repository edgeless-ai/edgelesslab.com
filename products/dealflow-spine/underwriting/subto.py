"""Subject-to (sub-to) deal calculator.

"Subject-to" = buyer takes title subject to the EXISTING mortgage, which
stays in the seller's name. Entry cost is arrears reinstatement + cash to
seller + closing costs (no new loan). The economics are the spread between
the existing PITI and market rent, plus equity captured at entry.

Hard structural risk: virtually all post-1982 conventional loans carry a
due-on-sale clause, and Garn–St Germain (1982) made those clauses federally
enforceable (it preempted state limits on enforcement — it did not insert
clauses into notes), so the lender MAY call the loan on transfer. This
module always flags it. R&D / educational-analytical use only — not
financial or legal advice; verify with an attorney.
"""

from __future__ import annotations

try:
    from . import finance
except ImportError:  # standalone execution
    import finance  # type: ignore

DEFAULT_RESERVE_PCT = 0.15   # vacancy + maintenance + management, as % of rent
DEFAULT_SELLING_COST_PCT = 0.07  # agent + closing on a retail flip exit
MIN_HEALTHY_DSCR = 1.20
THIN_CASHFLOW = 200.0        # $/mo under this = one repair from negative


def analyze(deal: dict) -> dict:
    """Full sub-to underwrite from a plain dict (missing keys tolerated).

    Recognized keys:
      value            as-is market value
      loan_balance     existing mortgage balance
      loan_rate        annual rate, decimal OR percent (3.25 == 0.0325)
      piti             full monthly payment incl. taxes/insurance
      p_and_i          principal+interest only (optional; enables paydown calc)
      market_rent      achievable monthly rent
      arrears, cash_to_seller, closing_costs   entry-cost components
      reserve_pct      vacancy/maint/mgmt reserve (default 0.15 of rent)
      balloon_months   months until any balloon comes due (optional)
      loan_type        'va'/'fha'/'conventional'... (va → entitlement flag)

    Returns entry_cost, monthly_cash_flow, dscr, equity_capture,
    cash_on_cash, risk_flags, exits{hold,flip[,wrap]}.
    """
    value = float(deal.get("value") or 0)
    balance = float(deal.get("loan_balance") or 0)
    rate = _norm_rate(deal.get("loan_rate"))
    piti = float(deal.get("piti") or 0)
    rent = float(deal.get("market_rent") or 0)
    arrears = float(deal.get("arrears") or 0)
    cash_to_seller = float(deal.get("cash_to_seller") or 0)
    closing = float(deal.get("closing_costs") or 0)
    reserve_pct = float(deal.get("reserve_pct", DEFAULT_RESERVE_PCT))

    entry_cost = arrears + cash_to_seller + closing
    reserves = rent * reserve_pct
    cash_flow = rent - reserves - piti
    # Conservative payment-coverage DSCR: PITI (incl. escrow) as the debt
    # service denominator. Stricter than NOI/P&I, on purpose.
    dscr = (rent - reserves) / piti if piti > 0 else None
    equity_capture = value - balance - entry_cost

    result = {
        "entry_cost": entry_cost,
        "monthly_reserves": reserves,
        "monthly_cash_flow": cash_flow,
        "annual_cash_flow": cash_flow * 12,
        "dscr": dscr,
        "equity_capture": equity_capture,
        "cash_on_cash": (cash_flow * 12 / entry_cost) if entry_cost > 0 else None,
        "risk_flags": risk_flags(deal, cash_flow, dscr, equity_capture),
        "exits": exit_scenarios(deal, entry_cost),
    }
    return result


def _norm_rate(rate) -> float:
    """Accept 0.0325 or 3.25 for 3.25% — finance.normalize_rate is the one
    shared convention (0.25 boundary; 1.0 means 1%/yr, never 100%/yr)."""
    r = finance.normalize_rate(rate)
    return 0.0 if r is None else r


# ------------------------------------------------------------- risk --------

def risk_flags(deal: dict, cash_flow: float, dscr, equity_capture: float) -> list[dict]:
    flags = [{
        "flag": "due_on_sale",
        "severity": "structural",
        "note": ("Transfer of title likely triggers the lender's due-on-sale "
                 "clause (Garn–St Germain). Lender MAY call the loan at any "
                 "time. Mitigate: reserves to refi/resell, servicing kept "
                 "current, attorney-drafted disclosures signed by seller."),
    }]
    if deal.get("balloon_months"):
        flags.append({
            "flag": "balloon",
            "severity": "structural",
            "note": f"Balloon due in {deal['balloon_months']} months — exit or "
                    "refi plan must complete before then.",
        })
    if str(deal.get("loan_type", "")).lower() == "va":
        flags.append({
            "flag": "va_entitlement",
            "severity": "ethical",
            "note": "Sub-to on a VA loan ties up the veteran seller's "
                    "entitlement indefinitely. A formal VA assumption with "
                    "entitlement substitution is usually the fairer structure.",
        })
    if cash_flow < 0:
        flags.append({"flag": "negative_cash_flow", "severity": "fatal",
                      "note": f"Carry is negative (${cash_flow:,.0f}/mo). Only "
                              "viable as a short-dated flip, not a hold."})
    elif cash_flow < THIN_CASHFLOW:
        flags.append({"flag": "thin_cash_flow", "severity": "warning",
                      "note": f"Cash flow ${cash_flow:,.0f}/mo is one repair "
                              "bill from negative."})
    if dscr is not None and dscr < MIN_HEALTHY_DSCR:
        flags.append({"flag": "low_dscr", "severity": "warning",
                      "note": f"DSCR {dscr:.2f} < {MIN_HEALTHY_DSCR}."})
    if equity_capture < 0:
        flags.append({"flag": "over_leveraged_entry", "severity": "warning",
                      "note": "Entry cost exceeds equity captured — you are "
                              "paying above as-is value."})
    if float(deal.get("arrears") or 0) > 0:
        flags.append({"flag": "reinstatement", "severity": "operational",
                      "note": "Arrears must be cured at close and PROVEN cured "
                              "(payoff/reinstatement letter from servicer)."})
    return flags


# ------------------------------------------------------------ exits --------

def exit_scenarios(deal: dict, entry_cost: float | None = None) -> dict:
    """Hold / flip always computed; wrap only when wrap terms provided."""
    if entry_cost is None:
        entry_cost = (float(deal.get("arrears") or 0)
                      + float(deal.get("cash_to_seller") or 0)
                      + float(deal.get("closing_costs") or 0))
    exits = {
        "hold": hold_exit(deal),
        "flip": flip_exit(deal, entry_cost),
    }
    if deal.get("wrap_price"):
        exits["wrap"] = wrap_exit(deal, entry_cost)
    else:
        exits["wrap"] = {"note": "provide wrap_price/wrap_down/wrap_rate/"
                                 "wrap_term_months for a wrap projection"}
    return exits


def hold_exit(deal: dict) -> dict:
    rent = float(deal.get("market_rent") or 0)
    piti = float(deal.get("piti") or 0)
    reserve_pct = float(deal.get("reserve_pct", DEFAULT_RESERVE_PCT))
    cash_flow = rent - rent * reserve_pct - piti
    out = {"strategy": "rent at market, keep existing financing",
           "monthly_cash_flow": cash_flow, "annual_cash_flow": cash_flow * 12}
    p_and_i = deal.get("p_and_i")
    rate = _norm_rate(deal.get("loan_rate"))
    balance = float(deal.get("loan_balance") or 0)
    if p_and_i and rate and balance:
        principal_m1 = finance.first_month_principal(balance, rate, float(p_and_i))
        out["first_month_principal_paydown"] = principal_m1
        out["approx_year1_total_return"] = cash_flow * 12 + principal_m1 * 12
        out["note"] = ("year-1 paydown approximated as 12x month-1 principal "
                       "(slightly understates; principal grows each month)")
    return out


def flip_exit(deal: dict, entry_cost: float,
              selling_cost_pct: float = DEFAULT_SELLING_COST_PCT) -> dict:
    resale = float(deal.get("resale_value") or deal.get("value") or 0)
    balance = float(deal.get("loan_balance") or 0)
    selling_costs = resale * selling_cost_pct
    return {
        "strategy": "retail resale, pay off underlying loan at close",
        "resale_value": resale,
        "selling_costs": selling_costs,
        "profit": resale - balance - entry_cost - selling_costs,
    }


def wrap_exit(deal: dict, entry_cost: float) -> dict:
    """Sell on a wraparound note: your buyer pays you on a new (higher-rate)
    note; you keep paying the underlying PITI. Spread = wrap P&I - PITI.

    Conservative: spread nets against full PITI (assumes you keep escrowing
    T&I; if the wrap buyer escrows their own T&I, spread improves).
    """
    price = float(deal["wrap_price"])
    down = float(deal.get("wrap_down") or 0)
    rate = _norm_rate(deal.get("wrap_rate"))
    term = int(deal.get("wrap_term_months") or 360)
    piti = float(deal.get("piti") or 0)
    wrap_pi = finance.monthly_payment(price - down, rate, term)
    return {
        "strategy": "sell on wraparound note, keep underlying loan in place",
        "wrap_note": price - down,
        "wrap_p_and_i": wrap_pi,
        "monthly_spread": wrap_pi - piti,
        "cash_at_close": down - entry_cost,
        "note": ("Wrap layers a SECOND due-on-sale exposure and, in many "
                 "states, Dodd-Frank/SAFE Act seller-finance licensing rules. "
                 "Attorney + RMLO required."),
    }
