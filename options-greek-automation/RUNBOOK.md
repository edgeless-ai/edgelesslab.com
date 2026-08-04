# Edgeless Options Greek Automation — RUNBOOK

## System Overview
- **Repo:** `~/Codex-projects/options-greek-automation/`
- **Data:** ConvexValue API (real-time options + Greeks)
- **Execution:** Alpaca Paper Trading
- **DB:** SQLite with WAL mode
- **Dashboard:** Next.js + Marimo (dual)
- **Notifications:** Telegram

## Quick Start
```bash
cd ~/Codex-projects/options-greek-automation
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python db/engine.py  # Initialize database
python clients/convexvalue_client.py  # Verify data source
python execution/alpaca_client.py  # Verify Alpaca
python jobs/orchestrator.py  # Run one pipeline
```

## Daily Operations

### Start Pipeline
```bash
cd ~/Codex-projects/options-greek-automation && source .venv/bin/activate
python jobs/orchestrator.py
```

### Start Monitor
```bash
cd ~/Codex-projects/options-greek-automation && source .venv/bin/activate
python execution/monitor.py
```

### Start Dashboard
```bash
# Next.js
cd dashboard/nextjs && pnpm install && pnpm run dev

# Marimo
marimo edit dashboard/marimo/options_lab.py
```

### Start Metrics
```bash
python telemetry/metrics.py
```

## Troubleshooting

### "Data quality gate failed"
- Check ConvexValue API key: `cat clients/convexvalue_client.py | grep DEFAULT_API_KEY`
- Check null ratio in chain: `python -c "from ingest.pipeline import ingest_all; print(ingest_all())"`

### "Circuit breaker OPEN"
- Wait 5 minutes for cooldown
- Check API status: `curl -I https://tap.convexvalue.com`
- Restart MCP server if needed

### "Alpaca order rejected"
- Verify paper account: `python execution/alpaca_client.py`
- Check OCC symbol format: `SPY260719C00450000`
- Ensure single-leg (bracket orders unsupported)

### "No signals generated"
- Check thresholds: `SELECT * FROM threshold_history ORDER BY optimized_at DESC`
- Check guards: `SELECT * FROM guard_events ORDER BY run_ts DESC`
- Check exposure: `SELECT * FROM greek_exposure ORDER BY snapshot_ts DESC`

### "Database locked"
- WAL mode handles this automatically
- If still locked: `sqlite3 db/data/options_greek.db "PRAGMA wal_checkpoint;"`

## Cron Jobs
```bash
# Pipeline every 5 minutes
*/5 * * * 1-5 cd ~/Codex-projects/options-greek-automation && source .venv/bin/activate && python jobs/orchestrator.py >> logs/pipeline.log 2>&1

# Monitor every minute
* * * * * cd ~/Codex-projects/options-greek-automation && source .venv/bin/activate && python execution/monitor.py >> logs/monitor.log 2>&1

# Health check every hour
0 * * * * cd ~/Codex-projects/options-greek-automation && source .venv/bin/activate && python -c "from jobs.orchestrator import run_health_check; print(run_health_check())" >> logs/health.log 2>&1

# Data purge weekly
0 2 * * 0 cd ~/Codex-projects/options-greek-automation && source .venv/bin/activate && python -c "from jobs.orchestrator import purge_old_data; print(purge_old_data(90))" >> logs/purge.log 2>&1
```

## Emergency Procedures

### Stop Everything
```bash
pkill -f "python jobs/orchestrator.py"
pkill -f "python execution/monitor.py"
pkill -f "python telemetry/metrics.py"
```

### Close All Positions
```bash
python -c "
from execution.alpaca_client import AlpacaClient
client = AlpacaClient()
# Get positions and close all
"
```

### Reset Database
```bash
rm db/data/options_greek.db*
python db/engine.py
```

## Metrics
- Prometheus: http://localhost:8002/metrics
- Health: `python -c "from jobs.orchestrator import run_health_check; print(run_health_check())"`

## Support
- ConvexValue API: https://tap.convexvalue.com
- Alpaca: https://alpaca.markets
- Repo: https://github.com/thedavidmurray/options-greek-automation
