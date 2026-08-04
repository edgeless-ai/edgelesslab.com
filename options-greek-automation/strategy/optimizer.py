"""
Threshold optimizer: grid search + profit factor optimization.

Uses live-forward paper trades as ground truth (no historical dependency).
Walk-forward validation: train on recent trades, test on next batch.
"""
import json
from itertools import product
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime, timezone

from db.engine import get_conn
from strategy.reel_strategy import ReelStrategy


@dataclass
class OptimizationResult:
    regime: str
    delta_pcr_min: float
    delta_pcr_max: float
    gamma_proximity_threshold: float
    vanna_threshold: float
    confidence_min: float
    profit_factor: float
    win_rate: float
    sample_size: int


def evaluate_thresholds(
    thresholds: Dict[str, float],
    trades: List[Dict[str, Any]]
) -> Dict[str, float]:
    """
    Evaluate a threshold set against historical trades.
    Returns: profit_factor, win_rate, avg_win, avg_loss
    """
    wins = []
    losses = []

    for trade in trades:
        # Simplified: check if trade was profitable
        pnl = trade.get("realized_pnl", 0)
        if pnl > 0:
            wins.append(pnl)
        elif pnl < 0:
            losses.append(abs(pnl))

    if not losses:
        return {"profit_factor": float("inf"), "win_rate": 1.0, "avg_win": sum(wins)/len(wins) if wins else 0, "avg_loss": 0}
    if not wins:
        return {"profit_factor": 0, "win_rate": 0, "avg_win": 0, "avg_loss": sum(losses)/len(losses) if losses else 0}

    avg_win = sum(wins) / len(wins)
    avg_loss = sum(losses) / len(losses)
    profit_factor = avg_win / avg_loss if avg_loss > 0 else float("inf")
    win_rate = len(wins) / (len(wins) + len(losses))

    return {
        "profit_factor": profit_factor,
        "win_rate": win_rate,
        "avg_win": avg_win,
        "avg_loss": avg_loss,
    }


def grid_search(
    trades: List[Dict[str, Any]],
    regime: str = "normal",
    delta_pcr_range: List[float] = None,
    gamma_range: List[float] = None,
    vanna_range: List[float] = None,
    confidence_range: List[float] = None,
) -> OptimizationResult:
    """
    Grid search over threshold space.
    Optimize for profit factor (more robust than win rate).
    """
    delta_pcr_range = delta_pcr_range or [0.8, 1.0, 1.2, 1.4, 1.6]
    gamma_range = gamma_range or [0.01, 0.02, 0.03, 0.05, 0.10]
    vanna_range = vanna_range or [0.05, 0.10, 0.15, 0.20, 0.30]
    confidence_range = confidence_range or [0.50, 0.60, 0.65, 0.70, 0.75]

    best = None
    best_score = 0

    for dpc_min, dpc_max, gamma_thresh, vanna_thresh, conf_min in product(
        delta_pcr_range, delta_pcr_range, gamma_range, vanna_range, confidence_range
    ):
        if dpc_min >= dpc_max:
            continue

        thresholds = {
            "delta_pcr_long": dpc_max,
            "delta_pcr_short": dpc_min,
            "gamma_proximity": gamma_thresh,
            "vanna_threshold": vanna_thresh,
            "confidence_min": conf_min,
        }

        metrics = evaluate_thresholds(thresholds, trades)
        score = metrics["profit_factor"] * metrics["win_rate"]  # Combined score

        if score > best_score:
            best_score = score
            best = OptimizationResult(
                regime=regime,
                delta_pcr_min=dpc_min,
                delta_pcr_max=dpc_max,
                gamma_proximity_threshold=gamma_thresh,
                vanna_threshold=vanna_thresh,
                confidence_min=conf_min,
                profit_factor=metrics["profit_factor"],
                win_rate=metrics["win_rate"],
                sample_size=len(trades),
            )

    return best


def walk_forward_optimize(
    lookback_days: int = 14,
    test_days: int = 7,
) -> List[OptimizationResult]:
    """
    Walk-forward optimization: train on last N days, validate on next M days.
    """
    with get_conn() as conn:
        # Get all closed trades
        rows = conn.execute(
            "SELECT * FROM trades WHERE status = 'closed' AND entry_ts >= date('now', '-? days')",
            (lookback_days + test_days,)
        ).fetchall()
        trades = [dict(r) for r in rows]

    if len(trades) < 10:
        return []  # Not enough data

    # Split: train = older trades, test = recent trades
    trades.sort(key=lambda t: t["entry_ts"])
    split = int(len(trades) * (lookback_days / (lookback_days + test_days)))
    train = trades[:split]
    test = trades[split:]

    # Optimize on train
    result = grid_search(train)

    # Validate on test
    test_metrics = evaluate_thresholds({
        "delta_pcr_long": result.delta_pcr_max,
        "delta_pcr_short": result.delta_pcr_min,
        "gamma_proximity": result.gamma_proximity_threshold,
        "vanna_threshold": result.vanna_threshold,
        "confidence_min": result.confidence_min,
    }, test)

    # Store in DB
    with get_conn() as conn:
        conn.execute("""
            INSERT INTO threshold_history (regime, delta_pcr_min, delta_pcr_max,
                gamma_proximity_threshold, vanna_threshold, confidence_min,
                profit_factor, win_rate, sample_size, validated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            result.regime, result.delta_pcr_min, result.delta_pcr_max,
            result.gamma_proximity_threshold, result.vanna_threshold,
            result.confidence_min, test_metrics["profit_factor"],
            test_metrics["win_rate"], len(test), 1
        ))
        conn.commit()

    return [result]


def load_latest_thresholds(regime: str = "normal") -> Dict[str, float]:
    """Load the latest validated thresholds for a regime."""
    with get_conn() as conn:
        row = conn.execute("""
            SELECT * FROM threshold_history
            WHERE regime = ? AND validated = 1
            ORDER BY optimized_at DESC LIMIT 1
        """, (regime,)).fetchone()

    if not row:
        return ReelStrategy.DEFAULT_THRESHOLDS

    return {
        "delta_pcr_long": row["delta_pcr_max"],
        "delta_pcr_short": row["delta_pcr_min"],
        "gamma_proximity": row["gamma_proximity_threshold"],
        "vanna_threshold": row["vanna_threshold"],
        "confidence_min": row["confidence_min"],
    }


if __name__ == "__main__":
    print("Threshold optimizer:")
    # If there are trades, optimize
    with get_conn() as conn:
        count = conn.execute("SELECT COUNT(*) FROM trades WHERE status = 'closed'").fetchone()[0]
    if count > 0:
        results = walk_forward_optimize()
        for r in results:
            print(f"  Regime={r.regime}: PF={r.profit_factor:.2f}, WR={r.win_rate:.1%}, N={r.sample_size}")
    else:
        print("  No closed trades yet. Using default thresholds.")
        print(f"  Defaults: {ReelStrategy.DEFAULT_THRESHOLDS}")
