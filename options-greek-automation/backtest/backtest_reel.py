"""Reel Strategy backtest on the CBOE snapshot history (lookahead-free sanity check).

⚠️ HONEST SCOPE: ~11 snapshot dates (2026-07-01→15), parity-derived spot (noisy for
QQQ). This is a PLUMBING + DIRECTIONAL sanity check — does the strategy's signal go
the right way over the next few days — NOT a statistically significant edge test.
Do not read alpha into 11 observations.

Method (no lookahead in signal formation): for each snapshot date, ingest that date's
chain stamped with that date's ts, generate the signal from ONLY that date's data,
then measure the forward directional return at +1 and +3 subsequent snapshot dates.
"""
import glob
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from clients.cboe_snapshot_client import CboeSnapshotClient
from ingest.pipeline import parse_chain
from strategy.reel_strategy import ReelStrategy
from db.engine import get_conn

SNAP_DIR = "/Users/djm/claude-projects/projects/trading-os/data/gex-snapshots"
SYMBOLS = ["SPY", "QQQ"]


def dates():
    fs = sorted(glob.glob(f"{SNAP_DIR}/*-SPY.json.gz"))
    return [os.path.basename(f)[:10] for f in fs]


def ts_of(d):
    return f"{d}T20:00:00+00:00"


def ingest_history():
    """Load every snapshot date into the db, each stamped with its own date ts."""
    spot_series = {s: {} for s in SYMBOLS}
    with get_conn() as conn:
        for d in dates():
            for sym in SYMBOLS:
                try:
                    c = CboeSnapshotClient(date=d)
                    chain = c.get_chain(sym)
                    spot = c._spot_cache.get(sym)
                except Exception:
                    continue
                if not spot:
                    continue
                spot_series[sym][d] = spot
                ts = ts_of(d)
                conn.execute(
                    "INSERT OR REPLACE INTO underlying_snapshots (symbol, spot_price, snapshot_ts, data_source) VALUES (?,?,?,?)",
                    (sym, spot, ts, "cboe_backtest"),
                )
                for r in parse_chain(chain, sym, ts):
                    conn.execute(
                        """INSERT OR REPLACE INTO options_chain_snapshots
                           (underlying,ticker,contract_type,strike_price,expiration_date,
                            delta,gamma,theta,vega,implied_volatility,open_interest,day_volume,
                            bid,ask,midpoint,snapshot_ts,data_source,data_quality_score)
                           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                        (r["underlying"], r["ticker"], r["contract_type"], r["strike_price"], r["expiration_date"],
                         r.get("delta"), r.get("gamma"), r.get("theta"), r.get("vega"), r.get("implied_volatility"),
                         r.get("open_interest"), r.get("day_volume"), r.get("bid"), r.get("ask"), r.get("midpoint"),
                         ts, "cboe_backtest", 1.0),
                    )
        conn.commit()
    return spot_series


def run():
    ds = dates()
    print(f"Backtest over {len(ds)} snapshot dates: {ds[0]}..{ds[-1]}")
    spot_series = ingest_history()
    strat = ReelStrategy()

    signals = []
    for i, d in enumerate(ds):
        for sym in SYMBOLS:
            if d not in spot_series[sym]:
                continue
            sig = strat.generate_signal(sym, ts_of(d))
            if not sig:
                continue
            stype = getattr(sig, "signal_type", None)
            entry = spot_series[sym][d]
            # forward directional returns at +1 and +3 available dates
            def fwd_ret(h):
                if i + h >= len(ds):
                    return None
                fd = ds[i + h]
                fs = spot_series[sym].get(fd)
                if not fs:
                    return None
                raw = (fs - entry) / entry
                return -raw if stype == "SHORT" else raw  # SHORT profits when spot falls
            signals.append({
                "date": d, "symbol": sym, "type": stype,
                "confidence": round(getattr(sig, "confidence", 0), 3),
                "entry": entry, "ret_1d": fwd_ret(1), "ret_3d": fwd_ret(3),
            })

    # persist + summarize
    with get_conn() as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS backtest_results
            (date TEXT, symbol TEXT, type TEXT, confidence REAL, entry REAL,
             ret_1d REAL, ret_3d REAL, run_ts TEXT)""")
        conn.execute("DELETE FROM backtest_results")
        from datetime import datetime, timezone
        rt = datetime.now(timezone.utc).isoformat()
        for s in signals:
            conn.execute("INSERT INTO backtest_results VALUES (?,?,?,?,?,?,?,?)",
                         (s["date"], s["symbol"], s["type"], s["confidence"], s["entry"],
                          s["ret_1d"], s["ret_3d"], rt))
        conn.commit()

    print(f"\nSignals generated: {len(signals)}")
    for s in signals:
        r1 = f"{s['ret_1d']*100:+.2f}%" if s["ret_1d"] is not None else "  n/a"
        r3 = f"{s['ret_3d']*100:+.2f}%" if s["ret_3d"] is not None else "  n/a"
        print(f"  {s['date']} {s['symbol']:3} {s['type']:5} conf={s['confidence']}  fwd +1d {r1}  +3d {r3}")

    for h in ("ret_1d", "ret_3d"):
        vals = [s[h] for s in signals if s[h] is not None]
        if vals:
            wins = sum(1 for v in vals if v > 0)
            print(f"\n  {h}: n={len(vals)}  hit-rate={wins/len(vals)*100:.0f}%  "
                  f"avg={sum(vals)/len(vals)*100:+.2f}%  cum={sum(vals)*100:+.2f}%")
    print("\n⚠️  11 dates, parity spot (noisy for QQQ) — DIRECTIONAL SANITY CHECK ONLY, not significant.")


if __name__ == "__main__":
    run()
