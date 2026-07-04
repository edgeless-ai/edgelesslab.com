"""Loan-assumption analyzer (FHA / VA / USDA assumable mortgages).

A formal assumption transfers the EXISTING government-backed loan to the
buyer with the servicer's blessing — unlike sub-to there is no due-on-sale
risk, but the buyer must qualify with the servicer and must bridge the
EQUITY GAP (price minus loan balance) in cash or secondary financing.

The prize is the rate delta: assuming a 2.75% 2020-vintage VA note in a 7%
market is a transferable below-market annuity.

R&D / educational-analytical use only — not financial or legal advice.
"""

from __future__ import annotations

try:
    from . import finance
except ImportError:  # standalone execution
    import finance  # type: ignore

ASSUMABLE_TYPES = {"fha", "va", "usda"}
DEFAULT_MARKET_RATE = 0.07
DEFAULT_DISCOUNT_RATE = 0.05   # documented: opportunity cost of capital for
                               # NPV of payment savings; deliberately simple.
DEFAULT_HOLD_MONTHS = 60
FUNDABLE_GAP_PCT = 0.15        # gap <= 15% of price ~ a normal down payment
HARD_GAP_PCT = 0.25            # gap > 25% usually needs seller carry/private $


def analyze(deal: dict) -> dict:
    """Analyze an assumption from a plain dict (missing keys tolerated).

    Recognized keys:
      loan_type              'fha' | 'va' | 'usda' | 'conventional' | ...
      loan_balance           current balance
      loan_rate              annual rate, decimal or percent (2.75 == 0.0275)
      remaining_term_months  months left on the note
      price                  purchase price (drives equity gap)
      market_rate            competing new-loan rate (default 7%)
      hold_months            horizon for NPV of savings (default 60)
      discount_rate          annual discount rate for NPV (default 5%)

    Rate-delta convention: market payment is computed on the SAME balance
    over the SAME remaining term — i.e. "what would this exact debt cost at
    today's rate" — so the savings isolates the coupon, not the loan size.
    """
    loan_type = str(deal.get("loan_type", "")).lower()
    balance = float(deal.get("loan_balance") or 0)
    rate = _norm_rate(deal.get("loan_rate"))
    term = int(deal.get("remaining_term_months") or 360)
    price = float(deal.get("price") or deal.get("value") or 0)
    market_rate = _norm_rate(deal.get("market_rate")) or DEFAULT_MARKET_RATE
    hold = int(deal.get("hold_months") or DEFAULT_HOLD_MONTHS)
    disc = float(deal.get("discount_rate", DEFAULT_DISCOUNT_RATE))

    assumable = loan_type in ASSUMABLE_TYPES
    current_pmt = finance.monthly_payment(balance, rate, term)
    market_pmt = finance.monthly_payment(balance, market_rate, term)
    savings = market_pmt - current_pmt

    gap = max(0.0, price - balance)
    gap_pct = gap / price if price > 0 else None

    return {
        "assumable": assumable,
        "loan_type": loan_type,
        "mechanics": _mechanics(loan_type),
        "current_payment": current_pmt,
        "market_payment": market_pmt,
        "monthly_savings": savings,
        "rate_delta": market_rate - rate,
        "equity_gap": gap,
        "equity_gap_pct": gap_pct,
        "gap_financing": _gap_financing(gap, gap_pct, loan_type),
        "npv_savings": finance.annuity_pv(savings, disc, hold),
        "npv_assumptions": {"hold_months": hold, "discount_rate": disc,
                            "convention": "level monthly savings discounted at "
                                          "annual_rate/12; savings = payment on "
                                          "same balance/term at market rate "
                                          "minus current payment"},
        "buyer_qualification_checklist": qualification_checklist(loan_type),
    }


def _norm_rate(rate) -> float:
    r = float(rate or 0)
    return r / 100.0 if r > 1.0 else r


def _mechanics(loan_type: str) -> list[str]:
    common = [
        "Assumption is processed BY THE SERVICER — expect 45-90 days; get "
        "their assumption package in writing before contracting a date.",
        "Buyer takes over the exact note: rate, remaining term, and balance "
        "are unchanged.",
        "Formal assumption releases the transfer from due-on-sale exposure "
        "(unlike sub-to).",
    ]
    per_type = {
        "fha": ["FHA loans post-Dec-1989 are assumable WITH lender "
                "creditworthiness review (HUD 4000.1).",
                "Seller should obtain a formal release of liability at "
                "closing, or they remain on the hook."],
        "va": ["VA loans are assumable by veterans AND non-veterans with "
               "lender/VA approval; 0.5% VA funding fee applies.",
               "Seller's VA ENTITLEMENT stays tied up unless the buyer is a "
               "veteran who substitutes their own entitlement — a key seller "
               "negotiation point.",
               "Release of liability requires servicer approval of the buyer."],
        "usda": ["USDA 502 loans are assumable with agency approval; new "
                 "rates/terms may apply on some vintages — verify with the "
                 "servicer whether the assumption is 'same-rate'."],
    }
    if loan_type in per_type:
        return common + per_type[loan_type]
    return ["Conventional loans are generally NOT assumable (due-on-sale "
            "enforced); ARM carve-outs exist but are rare — verify the note."]


def _gap_financing(gap: float, gap_pct, loan_type: str) -> dict:
    if gap_pct is None:
        tier, options = "unknown", ["provide price to size the gap"]
    elif gap_pct <= FUNDABLE_GAP_PCT:
        tier = "fundable"
        options = ["buyer cash (behaves like a normal down payment)"]
    elif gap_pct <= HARD_GAP_PCT:
        tier = "stretch"
        options = ["buyer cash + seller carryback second (attorney-drafted)",
                    "gift funds / partner capital"]
    else:
        tier = "hard"
        options = ["large seller carryback second", "private/hard-money second "
                    "(rate drag can erase the assumption savings — model it)",
                    "renegotiate price"]
    return {"gap": gap, "gap_pct": gap_pct, "tier": tier, "options": options,
            "note": "secondary financing behind FHA/VA must satisfy the "
                    "agency's subordinate-lien rules — verify with servicer"}


def qualification_checklist(loan_type: str) -> list[str]:
    base = [
        "Servicer assumption application submitted (ask for the package by name)",
        "Buyer credit score meets servicer overlay (typically 580-640+)",
        "Buyer DTI qualifies on the EXISTING payment (usually <= 41-45%)",
        "Buyer documents funds for the full equity gap + closing costs",
        "Seller release-of-liability requested IN WRITING at closing",
        "Assumption fee + processing costs quoted up front (typ. $500-3,000)",
        "Title/escrow confirms no junior liens that survive the transfer",
    ]
    if loan_type == "va":
        base += ["If buyer is a veteran: entitlement substitution paperwork "
                 "(restores seller's entitlement)",
                 "0.5% VA funding fee budgeted",
                 "If buyer is NOT a veteran: seller informed their entitlement "
                 "stays encumbered until the loan is paid off"]
    if loan_type == "fha":
        base += ["Owner-occupancy: investor assumptions of FHA loans face "
                 "extra restrictions — verify the vintage and servicer policy"]
    return base
