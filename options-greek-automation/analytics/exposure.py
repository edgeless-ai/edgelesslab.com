"""
Greek exposure analytics: aggregation and normalization.

Computes:
  - Dollar Greeks (delta, gamma, vega, vanna)
  - GEX by strike (dealer convention)
  - Max pain
  - Delta put/call ratio
"""
from typing import List, Dict, Any
from datetime import datetime
from db.engine import get_conn


def compute_dollar_greeks(rows: List[Dict[str, Any]], spot: float) -> Dict[str, float]:
    """
    Compute dollar-normalized Greeks for cross-underlying comparison.
    """
    delta_calls = sum((r["delta"] or 0) * (r["open_interest"] or 0) for r in rows if r["contract_type"] == "call")
    delta_puts = sum(abs(r["delta"] or 0) * (r["open_interest"] or 0) for r in rows if r["contract_type"] == "put")
    gamma_calls = sum((r["gamma"] or 0) * (r["open_interest"] or 0) for r in rows if r["contract_type"] == "call")
    gamma_puts = sum((r["gamma"] or 0) * (r["open_interest"] or 0) for r in rows if r["contract_type"] == "put")
    vega_total = sum((r["vega"] or 0) * (r["open_interest"] or 0) for r in rows)

    return {
        "delta_dollar_net": (delta_calls - delta_puts) * spot * 100,
        "gamma_dollar_net": (gamma_calls - gamma_puts) * spot * spot * 100,
        "vega_dollar_net": vega_total * 100,
    }


def compute_gex_by_strike(rows: List[Dict[str, Any]], spot: float) -> Dict[float, float]:
    """
    Compute Gamma Exposure by strike (dealer convention).
    gex = gamma * OI * spot² * 100 * 0.01
    """
    gex = {}
    for r in rows:
        strike = r["strike_price"]
        gamma = r["gamma"] or 0
        oi = r["open_interest"] or 0
        sign = 1 if r["contract_type"] == "call" else -1
        gex[strike] = gex.get(strike, 0) + sign * gamma * oi * spot * spot * 100 * 0.01
    return gex


def compute_max_pain(rows: List[Dict[str, Any]], spot: float) -> float:
    """
    Compute max pain: strike where total option value is minimized.
    """
    pain = {}
    for r in rows:
        k = r["strike_price"]
        oi = r["open_interest"] or 0
        if r["contract_type"] == "call":
            pain[k] = pain.get(k, 0) + oi * max(0, spot - k)
        else:
            pain[k] = pain.get(k, 0) + oi * max(0, k - spot)
    if not pain:
        return 0
    return min(pain, key=pain.get)


def compute_delta_pcr(rows: List[Dict[str, Any]]) -> float:
    """
    Delta Put/Call Ratio = delta_put / delta_call.
    """
    delta_calls = sum((r["delta"] or 0) * (r["open_interest"] or 0) for r in rows if r["contract_type"] == "call")
    delta_puts = sum(abs(r["delta"] or 0) * (r["open_interest"] or 0) for r in rows if r["contract_type"] == "put")
    return delta_puts / delta_calls if delta_calls else 0


def aggregate_exposure(underlying: str, snapshot_ts: str) -> Dict[str, Any]:
    """
    Aggregate all exposure metrics for an underlying at a snapshot.
    """
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM options_chain_snapshots WHERE underlying = ? AND snapshot_ts = ?",
            (underlying, snapshot_ts)
        ).fetchall()
        rows = [dict(r) for r in rows]

    if not rows:
        return {}

    spot = rows[0].get("underlying_price") or 0
    if not spot:
        return {}

    dollar = compute_dollar_greeks(rows, spot)
    gex = compute_gex_by_strike(rows, spot)
    max_pain = compute_max_pain(rows, spot)
    delta_pcr = compute_delta_pcr(rows)

    # Find gamma concentration
    max_gex_strike = max(gex, key=lambda k: abs(gex[k]), default=0) if gex else 0

    return {
        "underlying": underlying,
        "snapshot_ts": snapshot_ts,
        "spot": spot,
        "delta_pcr": delta_pcr,
        **dollar,
        "gamma_concentration_strike": max_gex_strike,
        "max_pain_strike": max_pain,
        "gex_net": sum(gex.values()) if gex else 0,
    }


def store_exposure(data: Dict[str, Any]) -> None:
    """Store computed exposure to greek_exposure table."""
    with get_conn() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO greek_exposure
            (underlying, snapshot_ts, delta_pcr, delta_dollar_net, gamma_dollar_net,
             gamma_concentration_strike, max_pain_strike, vega_dollar_net)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data["underlying"], data["snapshot_ts"], data["delta_pcr"],
            data["delta_dollar_net"], data["gamma_dollar_net"],
            data["gamma_concentration_strike"], data["max_pain_strike"],
            data["vega_dollar_net"]
        ))
        conn.commit()
