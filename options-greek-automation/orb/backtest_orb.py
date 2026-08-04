"""ORB backtest — runs the ORB engine over every day of real bars in the store.

Honest by construction: if the bar store is empty (no Alpaca keys, no TradingView export
yet), it prints exactly that and exits — it never invents bars or fabricates a track
record. Feed it real bars via orb/data.py first.
"""
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from orb.orb_strategy import OrbParams, simulate_day
from orb.data import load_bars, available_days


def run(symbol="SPY", params: OrbParams = None):
    params = params or OrbParams()
    days = available_days(symbol)
    if not days:
        print(f"❌ No bars for {symbol} in orb/orb_bars.db — nothing to backtest.")
        print("   Load real intraday bars first (orb/data.py: import_csv from a TradingView")
        print("   export, or import_from_alpaca once valid paper keys exist). NO synthetic fallback.")
        return None

    trades = []
    for d in days:
        t = simulate_day(load_bars(symbol, d), params)
        if t:
            trades.append(t)

    print(f"ORB backtest {symbol} — {len(days)} days, {len(trades)} trades")
    if not trades:
        print("  no breakouts triggered under these params.")
        return []
    rs = [t.r_multiple for t in trades]
    wins = sum(1 for r in rs if r > 0)
    print(f"  win-rate {wins/len(rs)*100:.0f}%  |  avg {statistics.mean(rs):+.2f}R  |  "
          f"expectancy {statistics.mean(rs):+.2f}R/trade  |  cum {sum(rs):+.1f}R")
    by_reason = {}
    for t in trades:
        by_reason[t.reason] = by_reason.get(t.reason, 0) + 1
    print(f"  exits: {by_reason}")
    print("\n⚠️  Track record only as good as the sample: needs many months of bars + a "
          "drawdown regime before it means anything. Match params to a SOURCED spec, not a guess.")
    return trades


if __name__ == "__main__":
    run(sys.argv[1] if len(sys.argv) > 1 else "SPY")
