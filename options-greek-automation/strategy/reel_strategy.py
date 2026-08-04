"""
Reel Strategy — Implements Olivia Schremmer's options Greek framework.

Weights: Delta 30%, Gamma 50%, Vanna 20%
Rules:
  - 14+ DTE action window
  - Gamma levels as support/resistance
  - Vanna weekly alignment
  - Delta PCR for directional bias
"""
import math
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

from db.engine import get_conn
from strategy.vanna import compute_vanna_black_scholes


@dataclass
class Signal:
    underlying: str
    signal_type: str  # LONG, SHORT, NEUTRAL
    confidence: float
    entry_level: float
    target_level: float
    stop_level: float
    expires_at: str
    regime: str
    factors: Dict[str, float]
    narrative: str


class ReelStrategy:
    """Olivia Schremmer's framework: Delta 30%, Gamma 50%, Vanna 20%."""

    # Weights
    W_DELTA = 0.30
    W_GAMMA = 0.50
    W_VANNA = 0.20

    # Thresholds (will be overridden by optimizer)
    DEFAULT_THRESHOLDS = {
        "delta_pcr_long": 1.20,   # Put/call ratio > 1.2 = bearish -> contrarian LONG
        "delta_pcr_short": 0.80,  # PCR < 0.8 = bullish -> contrarian SHORT
        "gamma_proximity": 0.02,  # Spot within 2% of gamma concentration
        "vanna_threshold": 0.15,  # Net vanna magnitude
        "confidence_min": 0.65,
        "min_dte": 14,
    }

    def __init__(self, thresholds: Optional[Dict[str, float]] = None):
        self.thresholds = thresholds or self.DEFAULT_THRESHOLDS.copy()

    def compute_exposure(self, underlying: str, snapshot_ts: str) -> Dict[str, Any]:
        """Aggregate Greeks from chain snapshot into portfolio-level metrics."""
        with get_conn() as conn:
            rows = conn.execute("""
                SELECT * FROM options_chain_snapshots
                WHERE underlying = ? AND snapshot_ts = ?
                  AND expiration_date > date(?, '+14 days')
            """, (underlying, snapshot_ts, snapshot_ts)).fetchall()

        if not rows:
            return {}

        # Spot lives in underlying_snapshots, not on each chain row (schema had no
        # underlying_price column — the old rows[0]["underlying_price"] was a latent bug).
        # Spot at THIS snapshot_ts (exact match first — critical for backtests to avoid
        # lookahead; falls back to latest for live single-snapshot use).
        with get_conn() as _c:
            _sr = _c.execute(
                "SELECT spot_price FROM underlying_snapshots WHERE symbol = ? AND snapshot_ts = ? LIMIT 1",
                (underlying, snapshot_ts),
            ).fetchone()
            if not _sr:
                _sr = _c.execute(
                    "SELECT spot_price FROM underlying_snapshots WHERE symbol = ? ORDER BY snapshot_ts DESC LIMIT 1",
                    (underlying,),
                ).fetchone()
        spot = (_sr["spot_price"] if _sr else 0) or 0
        if not spot:
            return {}

        delta_calls = gamma_calls = vega_calls = vanna_calls = oi_calls = vol_calls = 0
        delta_puts = gamma_puts = vega_puts = vanna_puts = oi_puts = vol_puts = 0
        gamma_by_strike = {}

        for r in rows:
            oi = r["open_interest"] or 0
            d = r["delta"] or 0
            g = r["gamma"] or 0
            v = r["vega"] or 0
            iv = r["implied_volatility"] or 0
            strike = r["strike_price"]
            expiration = r["expiration_date"]
            dte = max(0, (datetime.strptime(expiration, "%Y-%m-%d").date() - datetime.now(timezone.utc).date()).days)

            # Vanna from the IV surface instead of using vega*delta/spot.
            # ConvexValue doesn't return vanna directly; this gives a Black-Scholes-based estimate.
            vanna = compute_vanna_black_scholes(spot, strike, dte / 365.0, iv)

            if r["contract_type"] == "call":
                delta_calls += d * oi
                gamma_calls += g * oi
                vega_calls += v * oi
                vanna_calls += vanna * oi
                oi_calls += oi
                vol_calls += (r["day_volume"] or 0)
            else:
                delta_puts += abs(d) * oi  # puts have negative delta, use abs
                gamma_puts += g * oi
                vega_puts += v * oi
                vanna_puts += vanna * oi
                oi_puts += oi
                vol_puts += (r["day_volume"] or 0)

            # GEX by strike
            gex = g * oi * spot * spot * 100 * 0.01
            gamma_by_strike[strike] = gamma_by_strike.get(strike, 0) + gex

        # Net metrics
        total_oi = oi_calls + oi_puts
        delta_pcr = delta_puts / delta_calls if delta_calls else 0
        gamma_net = gamma_calls - gamma_puts
        gex_net = (gamma_calls * oi_calls - gamma_puts * oi_puts) * spot * spot * 100 * 0.01

        # Find gamma concentration (max absolute GEX)
        max_gex_strike = max(gamma_by_strike, key=lambda k: abs(gamma_by_strike[k]), default=0)
        max_gex_value = gamma_by_strike.get(max_gex_strike, 0)

        # Max pain
        pain_by_strike = {}
        for r in rows:
            k = r["strike_price"]
            if r["contract_type"] == "call":
                pain_by_strike[k] = pain_by_strike.get(k, 0) + (r["open_interest"] or 0) * max(0, spot - k)
            else:
                pain_by_strike[k] = pain_by_strike.get(k, 0) + (r["open_interest"] or 0) * max(0, k - spot)
        max_pain_strike = min(pain_by_strike, key=pain_by_strike.get, default=0)

        # Dollar Greeks
        dollar_delta = (delta_calls - delta_puts) * spot * 100
        dollar_gamma = gamma_net * spot * spot * 100
        dollar_vega = (vega_calls + vega_puts) * 100
        vanna_net = vanna_calls - vanna_puts
        dollar_vanna = vanna_net * spot * 100

        # IV rank (simplified: current vs 30-day range)
        iv_rank = self._compute_iv_rank(underlying, snapshot_ts)

        # Term structure slope
        term_slope = self._compute_term_slope(rows, spot)

        return {
            "underlying": underlying,
            "snapshot_ts": snapshot_ts,
            "spot": spot,
            "delta_pcr": delta_pcr,
            "delta_net": delta_calls - delta_puts,
            "delta_dollar_net": dollar_delta,
            "gamma_net": gamma_net,
            "gamma_dollar_net": dollar_gamma,
            "gamma_concentration_strike": max_gex_strike,
            "gamma_concentration_value": max_gex_value,
            "max_pain_strike": max_pain_strike,
            "vega_net": vega_calls + vega_puts,
            "vega_dollar_net": dollar_vega,
            "vanna_net": vanna_net,
            "vanna_dollar_net": dollar_vanna,
            "iv_rank": iv_rank,
            "term_structure_slope": term_slope,
            "oi_calls": oi_calls,
            "oi_puts": oi_puts,
            "vol_calls": vol_calls,
            "vol_puts": vol_puts,
        }

    def _compute_iv_rank(self, underlying: str, snapshot_ts: str) -> Optional[float]:
        """Simplified IV rank: current IV vs 30-day range."""
        with get_conn() as conn:
            hist = conn.execute("""
                SELECT AVG(implied_volatility) as avg_iv, MIN(implied_volatility) as min_iv, MAX(implied_volatility) as max_iv
                FROM iv_history
                WHERE underlying = ? AND snapshot_ts >= date(?, '-30 days')
            """, (underlying, snapshot_ts)).fetchone()

        if not hist or hist["max_iv"] == hist["min_iv"]:
            return None
        current = hist["avg_iv"] or 0
        return (current - hist["min_iv"]) / (hist["max_iv"] - hist["min_iv"])

    def _compute_term_slope(self, rows: list, spot: float) -> Optional[float]:
        """IV term structure slope: near-term vs far-term."""
        near_iv = far_iv = None
        for r in rows:
            if abs(r["strike_price"] - spot) / spot < 0.05:
                dte = (datetime.strptime(r["expiration_date"], "%Y-%m-%d") - datetime.now()).days
                if dte < 30 and near_iv is None:
                    near_iv = r["implied_volatility"]
                if 60 < dte < 90 and far_iv is None:
                    far_iv = r["implied_volatility"]
        if near_iv and far_iv and far_iv != 0:
            return (far_iv - near_iv) / near_iv
        return None

    def generate_signal(self, underlying: str, snapshot_ts: str) -> Optional[Signal]:
        """Generate signal based on reel strategy rules."""
        exposure = self.compute_exposure(underlying, snapshot_ts)
        if not exposure:
            return None

        spot = exposure["spot"]
        delta_pcr = exposure["delta_pcr"]
        gamma_conc = exposure["gamma_concentration_strike"]
        gamma_val = exposure["gamma_concentration_value"]
        vanna_net = exposure["vanna_net"]
        iv_rank = exposure["iv_rank"]

        # Factor scores (0-1)
        delta_score = 0
        if delta_pcr > self.thresholds["delta_pcr_long"]:
            delta_score = min(1.0, (delta_pcr - self.thresholds["delta_pcr_long"]) / 0.5)
        elif delta_pcr < self.thresholds["delta_pcr_short"]:
            delta_score = min(1.0, (self.thresholds["delta_pcr_short"] - delta_pcr) / 0.5)

        gamma_dist = abs(spot - gamma_conc) / spot if spot and gamma_conc else 999
        gamma_score = max(0.0, 1.0 - gamma_dist / self.thresholds["gamma_proximity"])

        vanna_score = min(1.0, abs(vanna_net) / self.thresholds["vanna_threshold"])
        vanna_direction = 1 if vanna_net > 0 else -1

        # Confidence
        confidence = (
            delta_score * self.W_DELTA +
            gamma_score * self.W_GAMMA +
            vanna_score * self.W_VANNA
        )

        if confidence < self.thresholds["confidence_min"]:
            return None

        # Direction: contrarian to delta PCR
        if delta_pcr > self.thresholds["delta_pcr_long"]:
            signal_type = "LONG"
            # Target = gamma resistance above, stop = gamma support below
            entry = spot
            target = gamma_conc * 1.02 if gamma_conc > spot else spot * 1.02
            stop = gamma_conc * 0.98 if gamma_conc < spot else spot * 0.98
        elif delta_pcr < self.thresholds["delta_pcr_short"]:
            signal_type = "SHORT"
            entry = spot
            target = gamma_conc * 0.98 if gamma_conc < spot else spot * 0.98
            stop = gamma_conc * 1.02 if gamma_conc > spot else spot * 1.02
        else:
            return None

        # Regime detection
        regime = self._detect_regime(iv_rank, exposure["term_structure_slope"])

        # TTL: 2 snapshots = ~10 minutes
        expires = datetime.now(timezone.utc) + timedelta(minutes=10)

        factors = {
            "delta_score": round(delta_score, 2),
            "gamma_score": round(gamma_score, 2),
            "vanna_score": round(vanna_score, 2),
            "gamma_distance": round(gamma_dist, 4),
            "delta_pcr": round(delta_pcr, 2),
            "vanna_net": round(vanna_net, 4),
        }

        narrative = self._generate_narrative(signal_type, confidence, exposure, factors)

        return Signal(
            underlying=underlying,
            signal_type=signal_type,
            confidence=round(confidence, 2),
            entry_level=round(entry, 2),
            target_level=round(target, 2),
            stop_level=round(stop, 2),
            expires_at=expires.isoformat(),
            regime=regime,
            factors=factors,
            narrative=narrative,
        )

    def _detect_regime(self, iv_rank: Optional[float], term_slope: Optional[float]) -> str:
        """Simple regime detection."""
        if iv_rank is None:
            return "unknown"
        if iv_rank > 0.70:
            return "high_vol"
        if iv_rank < 0.30:
            return "low_vol"
        if term_slope and term_slope < -0.05:
            return "backwardation"
        if term_slope and term_slope > 0.05:
            return "contango"
        return "normal"

    def _generate_narrative(self, signal_type: str, confidence: float, exposure: Dict, factors: Dict) -> str:
        """Human-readable signal explanation."""
        spot = exposure["spot"]
        gamma_conc = exposure["gamma_concentration_strike"]
        delta_pcr = exposure["delta_pcr"]
        vanna = exposure["vanna_net"]

        narrative = (
            f"{signal_type} signal with {confidence:.0%} confidence. "
            f"Delta PCR is {delta_pcr:.2f} ({'bearish' if delta_pcr > 1 else 'bullish'}), "
            f"suggesting contrarian {signal_type}. "
            f"Gamma concentration at ${gamma_conc:.2f} ({abs(spot - gamma_conc) / spot:.1%} from spot). "
            f"Vanna net is {vanna:+.4f}, indicating {'dealer buy-the-dip' if vanna > 0 else 'dealer sell-the-rip'} alignment."
        )
        return narrative

    def store_signal(self, signal: Signal) -> int:
        """Store signal in DB. Returns signal_id."""
        with get_conn() as conn:
            cur = conn.execute("""
                INSERT INTO signals (underlying, snapshot_ts, signal_type, confidence,
                    entry_level, target_level, stop_level, expires_at, regime, factors, narrative)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                signal.underlying, signal.snapshot_ts, signal.signal_type, signal.confidence,
                signal.entry_level, signal.target_level, signal.stop_level, signal.expires_at,
                signal.regime, str(signal.factors), signal.narrative
            ))
            conn.commit()
            return cur.lastrowid


def generate_all_signals(underlyings: List[str] = None) -> List[Signal]:
    """Generate signals for all underlyings."""
    underlyings = underlyings or ["SPY", "QQQ", "IWM"]
    strategy = ReelStrategy()
    snapshot_ts = datetime.now(timezone.utc).isoformat()
    signals = []
    for u in underlyings:
        sig = strategy.generate_signal(u, snapshot_ts)
        if sig:
            strategy.store_signal(sig)
            signals.append(sig)
    return signals
