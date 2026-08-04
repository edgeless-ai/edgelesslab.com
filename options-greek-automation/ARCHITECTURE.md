# Architecture — Edgeless Options Greek Automation

## Overview

```
├── clients/          # Data source adapters
│   ├── convexvalue_client.py   # ConvexValue MCP wrapper
│   └── POLYPAM_DATA_FEED_BRIEF.md
├── ingest/           # Data ingestion + resilience
│   ├── pipeline.py             # Chain ingestion
│   └── resilience.py         # Circuit breaker, retry, quality gate
├── db/               # SQLite schema + engine
│   └── engine.py               # WAL-mode SQLite
├── analytics/        # Exposure + IV calculations
│   ├── exposure.py             # Greek aggregation
│   └── iv_term.py             # IV rank, term structure
├── strategy/         # Signal generation
│   ├── reel_strategy.py       # 30/50/20 Delta/Gamma/Vanna
│   ├── vanna.py               # Local vanna computation
│   └── optimizer.py           # Threshold optimization
├── execution/        # Order execution + monitoring
│   ├── alpaca_client.py       # Paper trading client
│   ├── monitor.py             # Exit management loop
│   └── sizing.py              # Kelly criterion sizing
├── risk/             # Risk guards
│   └── guards.py              # Market hours, loss limits, correlation
├── notify/           # Telegram alerts
│   └── telegram.py            # Signal + error alerts
├── jobs/             # Pipeline orchestration
│   └── orchestrator.py        # Full pipeline run
├── telemetry/        # Metrics + logging
│   └── metrics.py             # Prometheus metrics
├── dashboard/        # Dual dashboard
│   ├── nextjs/               # React/Next.js web UI
│   └── marimo/               # GPU-accelerated notebook
├── config/           # Cron + environment
├── logs/             # Pipeline + monitor logs
└── tests/            # Unit tests
```

## Data Flow

```
ConvexValue API → ingest/pipeline.py → db/engine.py (SQLite)
                    ↓
strategy/reel_strategy.py → compute_exposure() → greek_exposure
                    ↓
                    generate_signal() → signals
                    ↓
risk/guards.py → check_all() → guard_events
                    ↓
execution/alpaca_client.py → submit_order() → trades
                    ↓
execution/monitor.py → check_exit_conditions() → closed trades
                    ↓
notify/telegram.py → send_signal_alert()
                    ↓
telemetry/metrics.py → Prometheus + logs
```

## Key Decisions

1. **ConvexValue over Polygon** — Free, already active, provides Greeks
2. **Alpaca Paper** — Single-leg only, custom monitor for exits
3. **SQLite with WAL** — MVP simplicity, PostgreSQL reserved for Phase 3
4. **Dual Dashboard** — Next.js for web, Marimo for GPU analysis
5. **Reel Strategy** — 30/50/20 Delta/Gamma/Vanna weighting
6. **Local Vanna** — Computed from IV surface since API doesn't provide it
7. **Kelly Sizing** — Half-Kelly for variance reduction
8. **Live-Forward Backtest** — Paper trades as ground truth, no historical dependency

## Schema

### Tables
- `underlying_snapshots` — spot prices
- `options_chain_snapshots` — full chains with Greeks
- `greek_exposure` — aggregated metrics
- `signals` — generated signals with TTL
- `trades` — executed orders
- `account_state` — daily P&L, equity
- `pipeline_runs` — run metadata
- `guard_events` — rejection reasons
- `iv_history` — IV time series
- `threshold_history` — optimized parameters

### Indexes
- `idx_chain_underlying_ts` — fast chain lookup
- `idx_signals_status` — pending signal queries
- `idx_trades_status` — open position queries

## API Contracts

### ConvexValue MCP
```
get_chain(symbol, fields) → {symbol, params, chain}
screen(columns, filters, sort, limit) → {columns, rows, row_count}
query_sql(sql) → {rows, row_count, elapsed_ms}
```

### Alpaca Paper
```
GET /v2/account → {equity, cash, buying_power}
POST /v2/orders → {id, status, symbol, qty, side}
GET /v2/positions/{symbol} → {symbol, qty, avg_entry_price, market_value}
DELETE /v2/positions/{symbol} → {id, status}
```

### Internal Telemetry
```
Prometheus: http://localhost:8002/metrics
Health: python jobs/orchestrator.py → health_check()
```

## Scaling Plan

### Phase 1 (MVP, Weeks 1-2)
- 3 underlyings (SPY, QQQ, IWM)
- ConvexValue data
- SQLite
- Single-leg paper trades

### Phase 2 (Weeks 3-4)
- 10 underlyings
- Schwab API for historical backfill
- Real-time WebSocket
- Parameter optimization

### Phase 3 (Weeks 5-6)
- PostgreSQL migration
- ChromaDB for pattern matching
- LLM signal narratives
- Mobile-responsive dashboard

## Dependencies

```
python3.11+
alpaca-py (or requests)
pandas_market_calendars
prometheus_client (optional)
marimo (for dashboard)
nextjs (for web dashboard)
```

## Security

- API keys in `.env` (not in repo)
- Alpaca paper only (no real money)
- Telegram bot token in env var
- No admin endpoints exposed
- Private repo
