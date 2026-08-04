"""VRP put-credit-spread signal — grounded in the RUNE research (VRP harvest /
defined-risk put spreads), priced on REAL CBOE chains.

Unlike the Instagram Reel Strategy (directional spot bet, no edge in backtest), this
is an options-INCOME strategy: sell an OTM put spread when implied vol is rich, collect
the credit, profit from theta + spot staying above the short strike. P&L is credit-kept
vs breach — NOT spot direction. Every leg is priced from real bid/ask; the IV-rank gate
uses the actual IV history in the db.

Params are the defined-risk-put-spread conventions (short ~0.30Δ, ~30 DTE, defined
width, credit ≥ a floor % of width, IV-rank gate). Tune via the class attrs.
"""
import sys
from dataclasses import dataclass, asdict
from datetime import date
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from db.engine import get_conn


@dataclass
class SpreadSignal:
    underlying: str
    snapshot_ts: str
    strategy: str            # "put_credit_spread"
    expiration: str
    dte: int
    short_strike: float
    long_strike: float
    width: float
    credit: float            # net premium collected (per share)
    max_risk: float          # width - credit
    credit_pct_width: float
    short_delta: float
    iv_rank: float
    ret_on_risk_if_expire_otm: float  # credit / max_risk (max win)


class VrpPutCreditSpread:
    TARGET_DTE = 30
    DTE_MIN, DTE_MAX = 25, 50
    SHORT_DELTA = 0.30          # sell the ~30-delta put
    DELTA_TOL = 0.10
    WIDTH = 10.0               # dollars below short strike for the long leg
    IV_RANK_MIN = 0.30         # only sell vol when IV is at least mid-range rich
    MIN_CREDIT_PCT_WIDTH = 0.12  # reject spreads that don't pay enough for the risk

    def _rows(self, conn, underlying, snapshot_ts, exp=None):
        q = ("SELECT strike_price, expiration_date, delta, midpoint, bid, ask, implied_volatility "
             "FROM options_chain_snapshots WHERE underlying=? AND snapshot_ts=? AND contract_type='put'")
        args = [underlying, snapshot_ts]
        if exp:
            q += " AND expiration_date=?"
            args.append(exp)
        return conn.execute(q, args).fetchall()

    def iv_rank(self, conn, underlying, snapshot_ts) -> float:
        """Percentile rank of this date's near-ATM put IV among all snapshot dates in db."""
        def near_atm_iv(ts):
            rs = conn.execute(
                "SELECT implied_volatility iv, delta FROM options_chain_snapshots "
                "WHERE underlying=? AND snapshot_ts=? AND contract_type='put' "
                "AND delta IS NOT NULL AND implied_volatility>0", (underlying, ts)).fetchall()
            band = [r["iv"] for r in rs if 0.25 <= abs(r["delta"]) <= 0.55]
            return sum(band) / len(band) if band else None

        all_ts = [r["snapshot_ts"] for r in conn.execute(
            "SELECT DISTINCT snapshot_ts FROM options_chain_snapshots WHERE underlying=?",
            (underlying,)).fetchall()]
        series = [(ts, near_atm_iv(ts)) for ts in all_ts]
        series = [(ts, v) for ts, v in series if v is not None]
        cur = dict(series).get(snapshot_ts)
        if cur is None or len(series) < 2:
            return 0.0
        vals = sorted(v for _, v in series)
        below = sum(1 for v in vals if v < cur)
        return below / (len(vals) - 1)

    def select_spread(self, underlying: str, snapshot_ts: str) -> Optional[SpreadSignal]:
        with get_conn() as conn:
            d0 = date.fromisoformat(snapshot_ts[:10])
            exps = sorted({r["expiration_date"] for r in self._rows(conn, underlying, snapshot_ts)})
            cand = [(e, (date.fromisoformat(e) - d0).days) for e in exps]
            cand = [(e, dte) for e, dte in cand if self.DTE_MIN <= dte <= self.DTE_MAX]
            if not cand:
                return None
            exp, dte = min(cand, key=lambda x: abs(x[1] - self.TARGET_DTE))

            legs = [r for r in self._rows(conn, underlying, snapshot_ts, exp)
                    if r["delta"] is not None and r["bid"] and r["bid"] > 0 and r["midpoint"]]
            if not legs:
                return None
            # short leg: put nearest SHORT_DELTA
            short = min(legs, key=lambda r: abs(abs(r["delta"]) - self.SHORT_DELTA))
            if abs(abs(short["delta"]) - self.SHORT_DELTA) > self.DELTA_TOL:
                return None
            # long leg: nearest strike to (short - WIDTH), strictly below short
            below = [r for r in legs if r["strike_price"] < short["strike_price"]]
            if not below:
                return None
            long = min(below, key=lambda r: abs(r["strike_price"] - (short["strike_price"] - self.WIDTH)))

            width = short["strike_price"] - long["strike_price"]
            credit = round(short["midpoint"] - long["midpoint"], 3)
            if width <= 0 or credit <= 0:
                return None
            max_risk = round(width - credit, 3)
            cpw = credit / width
            iv_r = self.iv_rank(conn, underlying, snapshot_ts)

            # gates: enough vol richness + enough pay for the risk
            if iv_r < self.IV_RANK_MIN or cpw < self.MIN_CREDIT_PCT_WIDTH:
                return None

            return SpreadSignal(
                underlying=underlying, snapshot_ts=snapshot_ts, strategy="put_credit_spread",
                expiration=exp, dte=dte, short_strike=short["strike_price"],
                long_strike=long["strike_price"], width=width, credit=credit,
                max_risk=max_risk, credit_pct_width=round(cpw, 3),
                short_delta=round(short["delta"], 3), iv_rank=round(iv_r, 3),
                ret_on_risk_if_expire_otm=round(credit / max_risk, 3) if max_risk else 0.0,
            )


if __name__ == "__main__":
    strat = VrpPutCreditSpread()
    for sym in ("SPY", "QQQ"):
        for d in ("2026-07-01", "2026-07-08", "2026-07-15"):
            sig = strat.select_spread(sym, f"{d}T20:00:00+00:00")
            print(sym, d, "→", asdict(sig) if sig else "no signal (gate)")
