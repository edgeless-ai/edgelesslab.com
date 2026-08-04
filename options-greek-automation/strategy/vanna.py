"""
Local Vanna computation from IV surface.

Vanna = dVega / dSpot ≈ Vega * Delta / Spot (approximation)
Or more precisely: Vanna = dVega/dSpot = dDelta/dVol

Since ConvexValue doesn't return vanna directly, we compute it from
the chain's delta, vega, and spot price.
"""
import math
from typing import List, Dict, Any


def _phi(x: float) -> float:
    """Standard normal probability density function."""
    return math.exp(-0.5 * x * x) / math.sqrt(2.0 * math.pi)


def _d1(S: float, K: float, T: float, sigma: float, r: float = 0.0) -> float:
    """Black-Scholes d1."""
    if sigma == 0 or T <= 0 or S == 0 or K == 0:
        return 0.0
    return (math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * math.sqrt(T))


def compute_vanna_black_scholes(S: float, K: float, T: float, sigma: float, r: float = 0.0) -> float:
    """
    Black-Scholes vanna: dVega / dSpot = dDelta / dVol.

    Numerical convention used here:
        vanna = phi(d1) * sqrt(T) / (S * sigma)

    Returns 0.0 for invalid inputs (zero price, zero time, zero vol).
    """
    d1 = _d1(S, K, T, sigma, r)
    if S == 0 or T <= 0 or sigma == 0:
        return 0.0
    return _phi(d1) * math.sqrt(T) / (S * sigma)


def compute_vanna_approx(delta: float, vega: float, spot: float) -> float:
    """
    Approximate vanna: dVega/dSpot ≈ vega * delta / spot
    This is the first-order approximation used in practice.
    """
    if spot == 0:
        return 0
    return vega * delta / spot


def compute_vanna_from_chain(chain_row: dict) -> float:
    """
    Compute vanna for a single contract from chain data.
    chain_row must have: delta, vega, underlying_price (spot)
    """
    delta = chain_row.get("delta") or 0
    vega = chain_row.get("vega") or 0
    spot = chain_row.get("underlying_price") or 0
    return compute_vanna_approx(delta, vega, spot)


def compute_vanna_surface(chain_data: List[dict]) -> Dict[str, Any]:
    """
    Compute vanna for all contracts in a chain.
    Returns a dict of {ticker: vanna_value}.
    """
    surface = {}
    for row in chain_data:
        ticker = row.get("ticker") or f"{row.get('underlying')}_{row.get('strike_price')}_{row.get('contract_type')}"
        surface[ticker] = compute_vanna_from_chain(row)
    return surface


def net_vanna_by_underlying(chain_rows: List[dict]) -> float:
    """
    Compute net portfolio vanna for an underlying.
    Weighted by open interest.
    """
    total = 0
    for row in chain_rows:
        vanna = compute_vanna_from_chain(row)
        oi = row.get("open_interest") or 0
        if row.get("contract_type") == "put":
            # Put vanna is negative of call vanna at same strike
            vanna = -abs(vanna)
        total += vanna * oi
    return total


def vanna_strength(vanna_net: float, vega_net: float, spot: float) -> float:
    """
    Vanna strength as a ratio of vanna to vega, normalized by spot.
    Higher = stronger vanna effect.
    """
    if vega_net == 0 or spot == 0:
        return 0
    return (vanna_net / vega_net) * spot


if __name__ == "__main__":
    # Test
    print("Vanna computation tests:")
    print(f"  delta=0.5, vega=0.10, spot=450 → vanna={compute_vanna_approx(0.5, 0.10, 450):.6f}")
    print(f"  delta=0.3, vega=0.20, spot=480 → vanna={compute_vanna_approx(0.3, 0.20, 480):.6f}")
