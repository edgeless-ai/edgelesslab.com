"""Wholesale / MAO calculator.

MAO (Maximum Allowable Offer) = ARV * (1 - margin) - repairs - wholesale_fee

The margin is the END BUYER's required discount (default 30%, the classic
"70% rule"). The wholesale fee is YOUR assignment fee, subtracted so the
end buyer still hits their number after paying you.

R&D / educational-analytical use only — not financial or legal advice.
"""

from __future__ import annotations

from statistics import median

DEFAULT_MARGIN = 0.30  # 70% rule


# ---------------------------------------------------------------- MAO ------

def mao(
    arv: float,
    repairs: float,
    margin: float = DEFAULT_MARGIN,
    wholesale_fee: float = 0.0,
) -> float:
    """Maximum Allowable Offer to the seller.

    >>> mao(300_000, 40_000, margin=0.30, wholesale_fee=10_000)
    160000.0
    """
    return arv * (1.0 - margin) - repairs - wholesale_fee


# ------------------------------------------------- comp adjustments --------

def adjust_comp(comp_sale_price: float, adjustments: dict[str, float]) -> dict:
    """Adjust a comparable sale TOWARD the subject property.

    `adjustments` maps a label to a dollar amount, signed from the subject's
    perspective: POSITIVE if the subject is superior to the comp for that
    feature (add to the comp price), NEGATIVE if inferior.

    Example: subject has +200 sqft at $110/sqft (+22_000) but worse
    condition (-15_000):

    >>> adjust_comp(310_000, {"sqft": 22_000, "condition": -15_000})["adjusted_price"]
    317000.0
    """
    net = sum(adjustments.values())
    gross = sum(abs(v) for v in adjustments.values())
    return {
        "sale_price": comp_sale_price,
        "net_adjustment": net,
        "gross_adjustment": gross,
        "adjusted_price": comp_sale_price + net,
        # Appraisal hygiene: gross adjustments > 25% of sale price means the
        # comp is a stretch — flag it rather than silently trusting it.
        "reliable": gross <= 0.25 * comp_sale_price,
        "adjustments": dict(adjustments),
    }


def sqft_adjustment(subject_sqft: float, comp_sqft: float, dollars_per_sqft: float) -> float:
    """Signed sqft adjustment (positive when subject is larger)."""
    return (subject_sqft - comp_sqft) * dollars_per_sqft


def arv_from_comps(subject_sqft: float, comps: list[dict]) -> dict:
    """Estimate ARV from adjusted comps via median adjusted $/sqft.

    Each comp dict: {"sale_price": float, "sqft": float,
                     "adjustments": {label: signed dollars} (optional)}

    Median (not mean) so one bad comp can't drag the estimate.
    """
    if not comps:
        raise ValueError("need at least one comp")
    details = []
    for c in comps:
        adj = adjust_comp(c["sale_price"], c.get("adjustments", {}))
        ppsf = adj["adjusted_price"] / c["sqft"]
        details.append({**adj, "sqft": c["sqft"], "adjusted_ppsf": ppsf})
    med_ppsf = median(d["adjusted_ppsf"] for d in details)
    return {
        "arv": med_ppsf * subject_sqft,
        "median_adjusted_ppsf": med_ppsf,
        "subject_sqft": subject_sqft,
        "comp_count": len(details),
        "comps": details,
        "unreliable_comps": sum(1 for d in details if not d["reliable"]),
    }


# ------------------------------------------- assignment-fee scenarios ------

def assignment_scenarios(
    contract_price: float,
    arv: float,
    repairs: float,
    buyer_margin: float = DEFAULT_MARGIN,
    fees: tuple[float, ...] = (5_000, 10_000, 15_000, 20_000),
) -> list[dict]:
    """For each candidate assignment fee: does the end buyer still clear
    their margin after paying contract_price + fee?

    buyer_ceiling = ARV*(1-buyer_margin) - repairs  (buyer's own MAO)
    """
    buyer_ceiling = arv * (1.0 - buyer_margin) - repairs
    out = []
    for fee in fees:
        buyer_all_in = contract_price + fee
        out.append({
            "fee": fee,
            "buyer_price": buyer_all_in,
            "buyer_ceiling": buyer_ceiling,
            "buyer_headroom": buyer_ceiling - buyer_all_in,
            "viable": buyer_all_in <= buyer_ceiling,
        })
    return out


def max_assignment_fee(
    contract_price: float, arv: float, repairs: float,
    buyer_margin: float = DEFAULT_MARGIN,
) -> float:
    """Largest fee the deal supports (may be negative = you overpaid)."""
    return arv * (1.0 - buyer_margin) - repairs - contract_price


# -------------------------------------------------- sensitivity table ------

def sensitivity_table(
    arv: float,
    repairs: float,
    margin: float = DEFAULT_MARGIN,
    wholesale_fee: float = 0.0,
    arv_multipliers: tuple[float, ...] = (0.90, 0.95, 1.00, 1.05, 1.10),
    repair_multipliers: tuple[float, ...] = (0.75, 1.00, 1.25),
) -> dict:
    """MAO grid across ARV +/-10% and repairs +/-25% (defaults).

    Rows = repair scenarios, columns = ARV scenarios. The bottom-left cell
    (ARV -10%, repairs +25%) is the stress case: if the deal only works in
    the top-right, pass.
    """
    grid = [
        [mao(arv * am, repairs * rm, margin, wholesale_fee) for am in arv_multipliers]
        for rm in repair_multipliers
    ]
    return {
        "arv_values": [arv * am for am in arv_multipliers],
        "repair_values": [repairs * rm for rm in repair_multipliers],
        "arv_multipliers": list(arv_multipliers),
        "repair_multipliers": list(repair_multipliers),
        "grid": grid,
        "stress_mao": mao(arv * min(arv_multipliers), repairs * max(repair_multipliers),
                          margin, wholesale_fee),
    }


def format_sensitivity_table(table: dict) -> str:
    """Plain-text render of a sensitivity_table() result."""
    cols = table["arv_values"]
    header = "repairs \\ ARV | " + " | ".join(f"{v:>11,.0f}" for v in cols)
    sep = "-" * len(header)
    lines = [header, sep]
    for rv, row in zip(table["repair_values"], table["grid"]):
        lines.append(f"{rv:>13,.0f} | " + " | ".join(f"{m:>11,.0f}" for m in row))
    return "\n".join(lines)
