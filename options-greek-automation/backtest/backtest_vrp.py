"""VRP put-credit-spread backtest — CORRECT income-strategy P&L on real chains.

Unlike the directional Reel backtest, P&L here is credit-kept vs buy-back cost, marked
to REAL later option prices for the SAME two contracts (same strikes + expiration). This
is a legitimate options-income backtest — no synthetic IV (RUNE's weakest link), real
bid/ask throughout.

⚠️ HONEST SCOPE: the ~30-DTE spreads outlive the 11-day snapshot window, so this is a
MARK-TO-MARKET over the available days (theta + spot drift), NOT hold-to-expiry. And 11
dates / a handful of spreads is a plumbing + directional sanity check, NOT significance.
It is also NOT the RUNE-validated PMCC — it's a related defined-risk structure priced on
real chains (see reports/trading-strategy-reconciliation.md).
"""
import glob
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from strategy.vrp_strategy import VrpPutCreditSpread
from db.engine import get_conn

SNAP_DIR = "/Users/djm/claude-projects/projects/trading-os/data/gex-snapshots"
SYMBOLS = ["SPY", "QQQ"]


def dates():
    return [os.path.basename(f)[:10] for f in sorted(glob.glob(f"{SNAP_DIR}/*-SPY.json.gz"))]


def ts_of(d):
    return f"{d}T20:00:00+00:00"


def leg_mid(conn, underlying, ts, exp, strike):
    r = conn.execute(
        "SELECT midpoint FROM options_chain_snapshots WHERE underlying=? AND snapshot_ts=? "
        "AND contract_type='put' AND expiration_date=? AND strike_price=? LIMIT 1",
        (underlying, ts, exp, strike)).fetchone()
    return r["midpoint"] if r and r["midpoint"] is not None else None


def spread_value(conn, sig, ts):
    """Cost to buy back the spread at ts (short_mid - long_mid) from real later prices."""
    sm = leg_mid(conn, sig.underlying, ts, sig.expiration, sig.short_strike)
    lm = leg_mid(conn, sig.underlying, ts, sig.expiration, sig.long_strike)
    if sm is None or lm is None:
        return None
    return sm - lm


def run():
    ds = dates()
    strat = VrpPutCreditSpread()
    rows = []
    with get_conn() as conn:
        for i, d in enumerate(ds):
            for sym in SYMBOLS:
                sig = strat.select_spread(sym, ts_of(d))
                if not sig:
                    continue
                # MTM at +3 available dates and at last available date
                def ror_at(j):
                    if j >= len(ds):
                        return None
                    v = spread_value(conn, sig, ts_of(ds[j]))
                    if v is None:
                        return None
                    return (sig.credit - v) / sig.max_risk  # return on risk (theta/vol capture)
                ror_3d = ror_at(i + 3)
                ror_last = ror_at(len(ds) - 1)
                rows.append({
                    "date": d, "symbol": sym, "exp": sig.expiration, "dte": sig.dte,
                    "short_k": sig.short_strike, "long_k": sig.long_strike,
                    "credit": sig.credit, "max_risk": sig.max_risk,
                    "cpw": sig.credit_pct_width, "iv_rank": sig.iv_rank,
                    "ror_3d": ror_3d, "ror_last": ror_last,
                })

        conn.execute("""CREATE TABLE IF NOT EXISTS vrp_backtest_results
            (date TEXT, symbol TEXT, exp TEXT, dte INT, short_k REAL, long_k REAL,
             credit REAL, max_risk REAL, cpw REAL, iv_rank REAL, ror_3d REAL, ror_last REAL)""")
        conn.execute("DELETE FROM vrp_backtest_results")
        for r in rows:
            conn.execute("INSERT INTO vrp_backtest_results VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                         (r["date"], r["symbol"], r["exp"], r["dte"], r["short_k"], r["long_k"],
                          r["credit"], r["max_risk"], r["cpw"], r["iv_rank"], r["ror_3d"], r["ror_last"]))
        conn.commit()

    print(f"VRP put-credit-spread backtest — {len(rows)} spreads over {len(ds)} dates\n")
    print("date        sym  short/long   credit  IVrank  RoR+3d   RoR@last")
    for r in rows:
        r3 = f"{r['ror_3d']*100:+6.1f}%" if r["ror_3d"] is not None else "   n/a"
        rl = f"{r['ror_last']*100:+6.1f}%" if r["ror_last"] is not None else "   n/a"
        print(f"{r['date']}  {r['symbol']:3}  {r['short_k']:.0f}/{r['long_k']:.0f}    "
              f"{r['credit']:.2f}    {r['iv_rank']:.2f}   {r3}   {rl}")

    for h in ("ror_3d", "ror_last"):
        v = [r[h] for r in rows if r[h] is not None]
        if v:
            wins = sum(1 for x in v if x > 0)
            print(f"\n  {h}: n={len(v)}  win-rate={wins/len(v)*100:.0f}%  "
                  f"avg RoR={sum(v)/len(v)*100:+.1f}%  cum={sum(v)*100:+.1f}%")
    print("\n⚠️  MTM over ~11 days (not to expiry); handful of spreads — REAL-CHAIN SANITY CHECK, not significant.")
    print("    NOT the RUNE-validated PMCC — see reports/trading-strategy-reconciliation.md")


if __name__ == "__main__":
    run()
