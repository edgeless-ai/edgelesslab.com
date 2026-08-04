"""PMCC selector on REAL chains — ports the RUNE-validated structure off synthetic IV.

RUNE's PMCC is the only strategy with real backtest numbers, but it prices every leg
with Black-Scholes on synthetic IV (its self-flagged #1 flaw). This module selects the
same structure from REAL CBOE contracts: real per-contract delta picks the strikes (no
BS binary search), real bid/ask gives the true net debit.

Structure (RUNE `PMCC_PARAMS` / pmcc_backtest_v3.py):
  Long call  ~0.75Δ, ~365 DTE   (LEAPS)
  Short call ~0.30Δ,  30–45 DTE
  Gate: net_debit ≤ 75% of strike width; net_debit > 0.
  IV-rank gate 15–50 (approx here — needs a 252-day history to be true; we use the
  db's available-dates proxy and LABEL it as such).
  Regime gate (trending_bull) is NOT computable from an options snapshot — left to the
  caller; flagged, not faked.

⚠️ This is a SELECTOR + entry-gate, not a backtest. A real PMCC backtest needs months
(LEAPS held ~1yr, short call rolled monthly) — impossible on the 11-day snapshot window.
Gated on the accumulating recorder history. Do not fake an 11-day PMCC P&L.
"""
import sys
from dataclasses import dataclass, asdict
from datetime import date
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from db.engine import get_conn
from strategy.vrp_strategy import VrpPutCreditSpread  # reuse iv_rank proxy


@dataclass
class PmccSignal:
    underlying: str
    snapshot_ts: str
    strategy: str
    long_exp: str
    long_dte: int
    long_strike: float
    long_delta: float
    long_debit: float          # price paid for the LEAPS (per share)
    short_exp: str
    short_dte: int
    short_strike: float
    short_delta: float
    short_credit: float        # premium collected on the short call
    net_debit: float           # long_debit - short_credit
    strike_width: float        # short_strike - long_strike
    debit_pct_width: float
    iv_rank_proxy: float
    passes_debit_gate: bool


class PmccSelector:
    LONG_DELTA, LONG_DTE = 0.75, 365
    LONG_DTE_MIN, LONG_DTE_MAX = 300, 420
    SHORT_DELTA = 0.30
    SHORT_DTE_MIN, SHORT_DTE_MAX = 30, 45
    NET_DEBIT_LIMIT_PCT = 0.75
    IV_RANK_MIN, IV_RANK_MAX = 0.15, 0.50

    def _calls(self, conn, underlying, ts, exp=None):
        q = ("SELECT strike_price, expiration_date, delta, midpoint, bid, ask "
             "FROM options_chain_snapshots WHERE underlying=? AND snapshot_ts=? "
             "AND contract_type='call' AND delta IS NOT NULL AND bid IS NOT NULL AND bid>0")
        args = [underlying, ts]
        if exp:
            q += " AND expiration_date=?"
            args.append(exp)
        return conn.execute(q, args).fetchall()

    def _pick_exp(self, conn, underlying, ts, d0, dte_min, dte_max, target):
        exps = sorted({r["expiration_date"] for r in self._calls(conn, underlying, ts)})
        cand = [(e, (date.fromisoformat(e) - d0).days) for e in exps]
        cand = [(e, x) for e, x in cand if dte_min <= x <= dte_max]
        return min(cand, key=lambda x: abs(x[1] - target)) if cand else (None, None)

    def select(self, underlying: str, snapshot_ts: str) -> Optional[PmccSignal]:
        with get_conn() as conn:
            d0 = date.fromisoformat(snapshot_ts[:10])
            long_exp, long_dte = self._pick_exp(conn, underlying, snapshot_ts, d0,
                                                self.LONG_DTE_MIN, self.LONG_DTE_MAX, self.LONG_DTE)
            short_exp, short_dte = self._pick_exp(conn, underlying, snapshot_ts, d0,
                                                  self.SHORT_DTE_MIN, self.SHORT_DTE_MAX, 37)
            if not long_exp or not short_exp:
                return None
            longs = self._calls(conn, underlying, snapshot_ts, long_exp)
            shorts = self._calls(conn, underlying, snapshot_ts, short_exp)
            if not longs or not shorts:
                return None
            lc = min(longs, key=lambda r: abs(r["delta"] - self.LONG_DELTA))
            sc = min(shorts, key=lambda r: abs(r["delta"] - self.SHORT_DELTA))
            if not lc["midpoint"] or not sc["midpoint"]:
                return None
            width = sc["strike_price"] - lc["strike_price"]
            net_debit = round(lc["midpoint"] - sc["midpoint"], 3)
            dpw = (net_debit / width) if width > 0 else 999
            iv_r = VrpPutCreditSpread().iv_rank(conn, underlying, snapshot_ts)
            passes = (net_debit > 0) and (width > 0) and (dpw <= self.NET_DEBIT_LIMIT_PCT)
            return PmccSignal(
                underlying=underlying, snapshot_ts=snapshot_ts, strategy="pmcc_diagonal",
                long_exp=long_exp, long_dte=long_dte, long_strike=lc["strike_price"],
                long_delta=round(lc["delta"], 3), long_debit=round(lc["midpoint"], 3),
                short_exp=short_exp, short_dte=short_dte, short_strike=sc["strike_price"],
                short_delta=round(sc["delta"], 3), short_credit=round(sc["midpoint"], 3),
                net_debit=net_debit, strike_width=width, debit_pct_width=round(dpw, 3),
                iv_rank_proxy=round(iv_r, 3), passes_debit_gate=passes,
            )


if __name__ == "__main__":
    sel = PmccSelector()
    for sym in ("SPY", "QQQ"):
        sig = sel.select(sym, "2026-07-01T20:00:00+00:00")
        if sig:
            a = asdict(sig)
            print(f"{sym}: LONG {a['long_strike']:.0f}C {a['long_exp']} (Δ{a['long_delta']}, ${a['long_debit']}) "
                  f"/ SHORT {a['short_strike']:.0f}C {a['short_exp']} (Δ{a['short_delta']}, ${a['short_credit']}) "
                  f"→ net debit ${a['net_debit']}, {a['debit_pct_width']*100:.0f}% of ${a['strike_width']:.0f} width, "
                  f"debit-gate {'PASS' if a['passes_debit_gate'] else 'FAIL'}, IVrank~{a['iv_rank_proxy']}")
        else:
            print(f"{sym}: no PMCC selectable")
    print("\n⚠️  Selector only. A real PMCC backtest needs months of data (LEAPS ~1yr, monthly short-call rolls) — "
          "gated on the accumulating recorder. NOT faked on 11 days.")
