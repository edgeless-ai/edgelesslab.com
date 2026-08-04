"""
Telemetry layer: Prometheus metrics and structured logging.

Exposes:
  - pipeline_duration_seconds
  - signals_generated_total
  - trades_executed_total
  - guard_rejections_total
  - api_errors_total
  - data_freshness_seconds

Endpoint: http://localhost:8002/metrics
"""
import time
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any

# Try to import prometheus_client
try:
    from prometheus_client import Counter, Histogram, Gauge, start_http_server
    PROMETHEUS = True
except ImportError:
    PROMETHEUS = False
    print("WARNING: prometheus_client not installed. Metrics will be logged only.")

from db.engine import get_conn

logger = logging.getLogger("telemetry")

# Prometheus metrics
if PROMETHEUS:
    PIPELINE_DURATION = Histogram("pipeline_duration_seconds", "Pipeline run duration")
    SIGNALS_TOTAL = Counter("signals_generated_total", "Total signals generated", ["underlying", "regime"])
    TRADES_TOTAL = Counter("trades_executed_total", "Total trades executed", ["underlying", "side"])
    GUARD_REJECTIONS = Counter("guard_rejections_total", "Guard rejections", ["guard_name"])
    API_ERRORS = Counter("api_errors_total", "API errors", ["api_name", "error_type"])
    DATA_FRESHNESS = Gauge("data_freshness_seconds", "Seconds since last snapshot", ["underlying"])
    SYSTEM_UPTIME = Gauge("system_uptime_seconds", "System uptime")


class Telemetry:
    """Central telemetry handler."""

    def __init__(self, port: int = 8002):
        self.port = port
        self.start_time = time.time()
        if PROMETHEUS:
            try:
                start_http_server(port)
                logger.info(f"Prometheus metrics on port {port}")
            except Exception as e:
                logger.error(f"Failed to start metrics server: {e}")

    def record_pipeline_run(self, duration_ms: int, stats: Dict[str, Any]) -> None:
        """Log pipeline run metrics."""
        if PROMETHEUS:
            PIPELINE_DURATION.observe(duration_ms / 1000.0)
            SIGNALS_TOTAL.labels(underlying="all", regime="all").inc(stats.get("signals_generated", 0))
            TRADES_TOTAL.labels(underlying="all", side="all").inc(stats.get("trades_executed", 0))

        log_entry = {
            "event": "pipeline_run",
            "ts": datetime.now(timezone.utc).isoformat(),
            "duration_ms": duration_ms,
            "underlyings_processed": stats.get("underlyings_processed", 0),
            "rows_ingested": stats.get("rows_ingested", 0),
            "signals_generated": stats.get("signals_generated", 0),
            "trades_executed": stats.get("trades_executed", 0),
            "guard_rejections": stats.get("guard_rejections", 0),
            "error": stats.get("error"),
        }
        logger.info(json.dumps(log_entry))

    def record_guard_rejection(self, guard_name: str, signal_id: int = None) -> None:
        if PROMETHEUS:
            GUARD_REJECTIONS.labels(guard_name=guard_name).inc()
        logger.warning(f"Guard rejection: {guard_name} (signal_id={signal_id})")

    def record_api_error(self, api_name: str, error_type: str) -> None:
        if PROMETHEUS:
            API_ERRORS.labels(api_name=api_name, error_type=error_type).inc()
        logger.error(f"API error: {api_name} / {error_type}")

    def update_data_freshness(self, underlying: str, seconds: float) -> None:
        if PROMETHEUS:
            DATA_FRESHNESS.labels(underlying=underlying).set(seconds)

    def record_uptime(self) -> None:
        uptime = time.time() - self.start_time
        if PROMETHEUS:
            SYSTEM_UPTIME.set(uptime)

    def health_check(self) -> Dict[str, Any]:
        """Return system health status."""
        with get_conn() as conn:
            last_run = conn.execute(
                "SELECT * FROM pipeline_runs ORDER BY run_ts DESC LIMIT 1"
            ).fetchone()
            open_trades = conn.execute(
                "SELECT COUNT(*) FROM trades WHERE status = 'open'"
            ).fetchone()[0]
            pending_signals = conn.execute(
                "SELECT COUNT(*) FROM signals WHERE status = 'pending'"
            ).fetchone()[0]

        return {
            "status": "healthy" if last_run and last_run["error"] is None else "degraded",
            "last_pipeline_run": last_run["run_ts"] if last_run else None,
            "last_run_duration_ms": last_run["duration_ms"] if last_run else None,
            "open_trades": open_trades,
            "pending_signals": pending_signals,
            "uptime_seconds": time.time() - self.start_time,
        }


if __name__ == "__main__":
    tel = Telemetry()
    print("Telemetry server started. Visit http://localhost:8002/metrics")
    # Keep running
    while True:
        tel.record_uptime()
        time.sleep(10)
