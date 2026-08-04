"""
Pipeline orchestration: full end-to-end run.

Steps:
  1. Ingest options chains for all underlyings
  2. Compute Greek exposure
  3. Generate signals
  4. Run risk guards
  5. Execute paper trades
  6. Send notifications
  7. Log pipeline run
"""
import time
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List

from ingest.pipeline import ingest_all
from strategy.reel_strategy import ReelStrategy, generate_all_signals
from risk.guards import Guards
from execution.alpaca_client import AlpacaClient
from execution.sizing import SizingConfig, calculate_position_size
from execution.monitor import run_once as monitor_once
from telemetry.metrics import Telemetry
from notify.telegram import send_signal_alert
from db.engine import get_conn

logger = logging.getLogger("jobs.orchestrator")


def run_pipeline() -> Dict[str, Any]:
    """Run full pipeline. Returns stats dict."""
    start = time.time()
    telemetry = Telemetry()
    stats = {
        "underlyings_processed": 0,
        "rows_ingested": 0,
        "signals_generated": 0,
        "trades_executed": 0,
        "guard_rejections": 0,
        "error": None,
    }

    try:
        # Step 1: Ingest
        logger.info("Pipeline: Ingesting chains...")
        ingest_results = ingest_all()
        stats["underlyings_processed"] = len(ingest_results)
        stats["rows_ingested"] = sum(r.get("rows", 0) for r in ingest_results)

        # Step 2: Compute exposure + generate signals
        logger.info("Pipeline: Generating signals...")
        signals = generate_all_signals()
        stats["signals_generated"] = len(signals)

        # Step 3: Run guards + execute trades
        logger.info("Pipeline: Running guards and executing trades...")
        guards = Guards()
        alpaca = AlpacaClient()
        alpaca.update_account_state()

        with get_conn() as conn:
            acc = conn.execute("SELECT * FROM account_state ORDER BY date DESC LIMIT 1").fetchone()
        account_equity = acc["equity"] if acc else 100_000

        for sig in signals:
            # Run guards
            guard_results = guards.check_all({
                "underlying": sig.underlying,
                "dte": 21,  # Simplified; would compute from signal
                "delta": 0.3,
                "qty": 1,
            }, account_equity)

            for gr in guard_results:
                if not gr.passed:
                    stats["guard_rejections"] += 1
                    telemetry.record_guard_rejection(gr.guard_name)
                    logger.info(f"Signal {sig.underlying} rejected: {gr.guard_name}")
                    continue

            # Execute trade
            # Simplified: always buy 1 ATM call for MVP
            # In production, select contract based on signal details
            occ = f"{sig.underlying}..."  # Would build proper OCC symbol
            try:
                # Mock execution for MVP (no real money)
                # alpaca.submit_order(occ, "buy", 1)
                stats["trades_executed"] += 1
                logger.info(f"Executed trade for {sig.underlying}")
                send_signal_alert(sig)
            except Exception as e:
                logger.error(f"Trade execution failed: {e}")
                telemetry.record_api_error("alpaca", str(e))

        # Step 4: Run monitor
        logger.info("Pipeline: Running monitor...")
        monitor_once()

        # Step 5: Log
        duration_ms = int((time.time() - start) * 1000)
        telemetry.record_pipeline_run(duration_ms, stats)

        with get_conn() as conn:
            conn.execute("""
                INSERT INTO pipeline_runs (duration_ms, underlyings_processed, rows_ingested,
                    signals_generated, trades_executed, guard_rejections, error, run_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (duration_ms, stats["underlyings_processed"], stats["rows_ingested"],
                  stats["signals_generated"], stats["trades_executed"],
                  stats["guard_rejections"], stats["error"], "scheduled"))
            conn.commit()

        logger.info(f"Pipeline complete: {stats}")
        return stats

    except Exception as e:
        stats["error"] = str(e)
        logger.error(f"Pipeline failed: {e}")
        return stats


def run_health_check() -> Dict[str, Any]:
    """Run health check only."""
    telemetry = Telemetry()
    health = telemetry.health_check()
    logger.info(f"Health check: {health}")
    return health


def purge_old_data(days: int = 90) -> int:
    """Purge snapshots older than N days. Returns rows deleted."""
    with get_conn() as conn:
        cur = conn.execute("DELETE FROM options_chain_snapshots WHERE snapshot_ts < date('now', '-? days')", (days,))
        conn.execute("DELETE FROM iv_history WHERE snapshot_ts < date('now', '-? days')", (days,))
        conn.execute("DELETE FROM greek_exposure WHERE snapshot_ts < date('now', '-? days')", (days,))
        conn.commit()
        return cur.rowcount


if __name__ == "__main__":
    print("Running pipeline...")
    stats = run_pipeline()
    print(json.dumps(stats, indent=2, default=str))
