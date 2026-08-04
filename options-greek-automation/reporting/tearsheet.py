"""Hedge-fund-style tearsheet — reads the REAL track record, never mocks.

Sources, in priority: (1) live paper trades (Alpaca `trades` table) once execution
is unblocked; (2) the backtest_results track record. Computes the standard metrics
(hit rate, avg win/loss, expectancy, cumulative return, exposure) and writes a
markdown tearsheet with an HONEST sample-size banner. As paper/backtest data grows,
the same scaffold produces progressively meaningful numbers — no rewrite needed.
"""
import statistics
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from db.engine import get_conn

OUT = "/Users/djm/claude-projects/reports/trading-tearsheet.md"


def _table_exists(conn, name):
    return conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (name,)
    ).fetchone() is not None


def _metrics(returns):
    if not returns:
        return {}
    wins = [r for r in returns if r > 0]
    losses = [r for r in returns if r < 0]
    n = len(returns)
    m = {
        "n": n,
        "hit_rate": len(wins) / n,
        "avg_return": statistics.mean(returns),
        "avg_win": statistics.mean(wins) if wins else 0.0,
        "avg_loss": statistics.mean(losses) if losses else 0.0,
        "cum_return": sum(returns),
        "best": max(returns),
        "worst": min(returns),
    }
    # expectancy = p_win*avg_win + p_loss*avg_loss
    p_w = len(wins) / n
    m["expectancy"] = p_w * m["avg_win"] + (1 - p_w) * m["avg_loss"]
    if len(returns) > 1:
        sd = statistics.pstdev(returns)
        m["return_stdev"] = sd
        m["sharpe_naive"] = (m["avg_return"] / sd) if sd else 0.0  # per-trade, unannualised
    return m


def build():
    with get_conn() as conn:
        has_trades = _table_exists(conn, "trades") and conn.execute("SELECT COUNT(*) FROM trades").fetchone()[0] > 0
        has_bt = _table_exists(conn, "backtest_results")
        bt = []
        if has_bt:
            bt = [dict(r) for r in conn.execute("SELECT * FROM backtest_results ORDER BY date").fetchall()]
        vrp = []
        if _table_exists(conn, "vrp_backtest_results"):
            vrp = [dict(r) for r in conn.execute("SELECT * FROM vrp_backtest_results ORDER BY date").fetchall()]
        latest_sig = None
        if _table_exists(conn, "signals"):
            row = conn.execute("SELECT * FROM signals ORDER BY snapshot_ts DESC LIMIT 1").fetchone()
            latest_sig = dict(row) if row else None

    lines = ["# Edgeless Trading — Tearsheet", ""]
    lines.append(f"_Generated {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}_  ")
    lines.append("")

    # Source banner
    if has_trades:
        lines.append("**Source: LIVE PAPER TRADES.**")
    else:
        lines.append("> ⚠️ **NO LIVE PAPER TRADES YET** — Alpaca paper execution is blocked (401, keys needed). "
                     "Metrics below are from the **backtest** track record only.")
    lines.append("")

    if bt:
        for horizon in ("ret_1d", "ret_3d"):
            rets = [r[horizon] for r in bt if r.get(horizon) is not None]
            m = _metrics(rets)
            if not m:
                continue
            lines.append(f"## Backtest — forward {horizon.replace('ret_','').upper()} return")
            lines.append(f"- **Signals (n):** {m['n']}")
            lines.append(f"- **Hit rate:** {m['hit_rate']*100:.0f}%")
            lines.append(f"- **Avg return / signal:** {m['avg_return']*100:+.2f}%")
            lines.append(f"- **Avg win / avg loss:** {m['avg_win']*100:+.2f}% / {m['avg_loss']*100:+.2f}%")
            lines.append(f"- **Expectancy:** {m['expectancy']*100:+.3f}% per signal")
            lines.append(f"- **Cumulative:** {m['cum_return']*100:+.2f}%   (best {m['best']*100:+.2f}%, worst {m['worst']*100:+.2f}%)")
            if "sharpe_naive" in m:
                lines.append(f"- **Per-signal Sharpe (naive, unannualised):** {m['sharpe_naive']:.2f}")
            lines.append("")
        # by symbol / type
        by = {}
        for r in bt:
            by.setdefault((r["symbol"], r["type"]), []).append(r)
        lines.append("## Breakdown")
        lines.append("| Symbol | Type | Signals | Avg +1d |")
        lines.append("|---|---|---|---|")
        for (sym, typ), rs in sorted(by.items()):
            r1 = [x["ret_1d"] for x in rs if x.get("ret_1d") is not None]
            avg = f"{statistics.mean(r1)*100:+.2f}%" if r1 else "n/a"
            lines.append(f"| {sym} | {typ} | {len(rs)} | {avg} |")
        lines.append("")

    if vrp:
        lines.append("## VRP put-credit-spread (real-chain income backtest)")
        for h in ("ror_3d", "ror_last"):
            v = [r[h] for r in vrp if r.get(h) is not None]
            m = _metrics(v)
            if not m:
                continue
            label = "+3d MTM" if h == "ror_3d" else "MTM @ last date"
            lines.append(f"- **{label}:** n={m['n']}, win-rate {m['hit_rate']*100:.0f}%, "
                         f"avg return-on-risk {m['avg_return']*100:+.1f}%, cum {m['cum_return']*100:+.1f}%")
        lines.append("> ⚠️ **Regime-flattered, not edge.** These spreads were sold into a benign rising tape "
                     "(SPY 745→755) with ZERO tail events — put-credit-spreads always win in that regime. "
                     "The short strike was never breached; the strategy's real risk is entirely unmeasured "
                     "(Khan-2026 hidden-tail warning). MTM, not hold-to-expiry. See trading-strategy-reconciliation.md.")
        lines.append("")

    if latest_sig:
        lines.append("## Latest live signal")
        lines.append(f"- {latest_sig.get('underlying','?')} {latest_sig.get('signal_type','?')} "
                     f"(confidence {latest_sig.get('confidence','?')}) @ {latest_sig.get('snapshot_ts','?')}")
        lines.append("")

    # Honest verdict
    lines.append("## Honest verdict")
    n_bt = len(bt)
    lines.append(f"- **Sample: {n_bt} backtest signals over ~11 snapshot dates. NOT statistically significant.** "
                 "A tearsheet needs dozens–hundreds of trades; treat all numbers as plumbing validation, not edge.")
    lines.append("- Spot is parity-derived (noisy for QQQ). Strategy only fired SPY-SHORT — a directional bias to investigate.")
    lines.append("- **Not fundable on this evidence.** Path to real numbers: (a) valid Alpaca paper keys → live paper track record, "
                 "(b) accumulate more CBOE dates, (c) reconcile toward the validated VRP/put-credit thesis (RUNE).")
    Path(OUT).write_text("\n".join(lines))
    print(f"wrote {OUT}")
    print("\n".join(lines[:4]))


if __name__ == "__main__":
    build()
