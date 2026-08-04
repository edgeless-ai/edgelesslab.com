"""
IV term structure analytics.

Computes:
  - IV rank (current vs 52-week range)
  - IV percentile
  - Term structure slope (near vs far term)
  - Skew (OTM vs ATM IV)
"""
from typing import List, Dict, Any, Optional
from datetime import datetime
from collections import defaultdict

from db.engine import get_conn


def compute_iv_rank(underlying: str, current_iv: float, lookback_days: int = 30) -> Optional[float]:
    """
    IV rank: where current IV falls in the historical range.
    rank = (current - min) / (max - min)
    """
    with get_conn() as conn:
        hist = conn.execute("""
            SELECT MIN(implied_volatility) as min_iv, MAX(implied_volatility) as max_iv
            FROM iv_history
            WHERE underlying = ? AND snapshot_ts >= date('now', '-? days')
        """, (underlying, lookback_days)).fetchone()

    if not hist or hist["max_iv"] is None or hist["min_iv"] is None:
        return None
    if hist["max_iv"] == hist["min_iv"]:
        return 0.5
    return (current_iv - hist["min_iv"]) / (hist["max_iv"] - hist["min_iv"])


def compute_iv_percentile(underlying: str, current_iv: float, lookback_days: int = 30) -> Optional[float]:
    """
    IV percentile: percentage of days below current IV.
    """
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT DISTINCT implied_volatility
            FROM iv_history
            WHERE underlying = ? AND snapshot_ts >= date('now', '-? days')
              AND implied_volatility IS NOT NULL
        """, (underlying, lookback_days)).fetchall()

    if not rows:
        return None
    ivs = [r["implied_volatility"] for r in rows]
    below = sum(1 for iv in ivs if iv < current_iv)
    return below / len(ivs)


def compute_term_slope(rows: List[Dict[str, Any]], spot: float) -> Optional[float]:
    """
    Term structure slope: (far IV - near IV) / near IV.
    Positive = contango, negative = backwardation.
    """
    near_ivs = []
    far_ivs = []
    for r in rows:
        if abs(r["strike_price"] - spot) / spot < 0.05:
            dte = (datetime.strptime(r["expiration_date"], "%Y-%m-%d") - datetime.now()).days
            if dte < 30:
                near_ivs.append(r["implied_volatility"])
            elif 60 < dte < 90:
                far_ivs.append(r["implied_volatility"])

    near = sum(near_ivs) / len(near_ivs) if near_ivs else None
    far = sum(far_ivs) / len(far_ivs) if far_ivs else None
    if near and far and near > 0:
        return (far - near) / near
    return None


def compute_skew(rows: List[Dict[str, Any]], spot: float) -> Optional[float]:
    """
    IV skew: OTM put IV vs ATM IV.
    Higher = more fear (puts expensive).
    """
    atm_ivs = [r["implied_volatility"] for r in rows if abs(r["strike_price"] - spot) / spot < 0.02]
    otm_put_ivs = [r["implied_volatility"] for r in rows
                   if r["contract_type"] == "put" and r["strike_price"] < spot * 0.95]

    atm = sum(atm_ivs) / len(atm_ivs) if atm_ivs else None
    otm_put = sum(otm_put_ivs) / len(otm_put_ivs) if otm_put_ivs else None
    if atm and otm_put and atm > 0:
        return (otm_put - atm) / atm
    return None


def store_iv_history(underlying: str, snapshot_ts: str) -> None:
    """Store current IV snapshot for historical analysis."""
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT DISTINCT expiration_date, strike_price, implied_volatility FROM options_chain_snapshots WHERE underlying = ? AND snapshot_ts = ?",
            (underlying, snapshot_ts)
        ).fetchall()
        for r in rows:
            conn.execute("""
                INSERT OR REPLACE INTO iv_history
                (underlying, expiration_date, strike_price, implied_volatility, snapshot_ts)
                VALUES (?, ?, ?, ?, ?)
            """, (underlying, r["expiration_date"], r["strike_price"], r["implied_volatility"], snapshot_ts))
        conn.commit()
