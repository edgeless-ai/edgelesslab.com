# Getting Started — Edgeless Options Greek Automation

## What You're Looking At

A fully automated options trading system that analyzes Greek exposure (Delta, Gamma, Vanna) in real-time and generates contrarian trading signals. Built for the 2-week MVP (Version C "Surgical").

## 5-Minute Setup

### 1. Activate Environment
```bash
cd ~/Codex-projects/options-greek-automation
source .venv/bin/activate
```

### 2. Verify Everything Works
```bash
# Test data source
python clients/convexvalue_client.py
# Should show: ✅ Day 0 verification complete — 36 expirations for SPY

# Run tests
pytest tests/ -v
# Should show: 11 passed

# Check database
python -c "from db.engine import get_conn; print('DB ready')"
```

### 3. Run Your First Pipeline
```bash
python jobs/orchestrator.py
```

This will:
1. Fetch SPY, QQQ, IWM chains from ConvexValue
2. Compute Greek exposure
3. Generate signals
4. Run risk guards
5. (Paper) Execute trades
6. Send alerts

### 4. View Results

**Option A: Next.js Dashboard**
```bash
cd dashboard/nextjs
pnpm install
pnpm run dev
# Open http://localhost:3001
```

**Option B: Marimo Lab**
```bash
marimo edit dashboard/marimo/options_lab.py
```

## What Each Component Does

| Component | File | Purpose |
|-----------|------|---------|
| **Data** | `clients/convexvalue_client.py` | Fetches real-time options + Greeks |
| **Ingest** | `ingest/pipeline.py` | Stores chains in SQLite with quality checks |
| **Strategy** | `strategy/reel_strategy.py` | 30/50/20 Delta/Gamma/Vanna signal generation |
| **Risk** | `risk/guards.py` | 6 safety guards (market hours, loss limits, etc.) |
| **Execute** | `execution/alpaca_client.py` | Paper trading with OCC symbols |
| **Monitor** | `execution/monitor.py` | Exit management (50% profit, 21 DTE) |
| **Notify** | `notify/telegram.py` | Signal + error alerts |
| **Metrics** | `telemetry/metrics.py` | Prometheus + structured logging |

## Understanding the Signals

### Signal Format
```
✅ SPY LONG — Confidence: 78%
Entry: $552.34 | Target: $558.50 | Stop: $547.80
Regime: high_vol
Factors: Δ=0.82, Γ=0.91, V=0.67
```

### What Each Metric Means

| Metric | What It Means | Signal |
|--------|--------------|--------|
| **Delta PCR** | Put/Call ratio | >1.2 = bearish (contrarian LONG) |
| **Gamma Net** | Dollar gamma exposure | Positive = buy support, Negative = sell resistance |
| **Vanna** | dVega/dSpot | Positive = dealers buy dips, Negative = dealers sell rips |
| **IV Rank** | Current IV vs 30-day range | High = expensive options, Low = cheap options |

### Why Contrarian?

The Reel Strategy is **contrarian to Delta PCR**:
- PCR > 1.2 (bearish) → **LONG** (everyone is bearish, reversal likely)
- PCR < 0.8 (bullish) → **SHORT** (everyone is bullish, reversal likely)

This is the core insight from the Instagram reel: when options positioning is extreme, the market tends to reverse.

## Risk Management

### Position Sizing
```python
# Example: $100k account, 2% risk per trade
max_risk = $100,000 × 0.02 = $2,000

# Defined risk spread (max loss $500)
contracts = $2,000 / $500 = 4 contracts

# Undefined risk (margin $1,000)
contracts = $2,000 / $1,000 = 2 contracts
```

### Exit Rules
The monitor loop checks every minute:
1. **50% profit** → Close immediately
2. **21 DTE** → Close or roll
3. **Stop/Target** → Close when breached
4. **Expiration day** → Close at 3:30 PM

## Customization

### Adjust Thresholds
```python
from strategy.reel_strategy import ReelStrategy

strategy = ReelStrategy(thresholds={
    "delta_pcr_long": 1.30,    # More conservative
    "delta_pcr_short": 0.70,   # More conservative
    "gamma_proximity": 0.03,   # Wider entry zone
    "vanna_threshold": 0.20,   # Stronger vanna required
    "confidence_min": 0.70,    # Higher confidence bar
})
```

### Add Underlyings
```python
# In strategy/reel_strategy.py
UNDERLYINGS = ["SPY", "QQQ", "IWM", "AAPL", "TSLA", "NVDA"]
```

### Change Risk Parameters
```python
# In risk/guards.py
Guards(config={
    "max_open_per_underlying": 2,
    "daily_loss_limit_pct": 0.03,
    "max_portfolio_delta_pct": 0.15,
})
```

## Monitoring

### Health Check
```bash
python -c "from jobs.orchestrator import run_health_check; print(run_health_check())"
```

### Prometheus Metrics
```bash
python telemetry/metrics.py
# Visit http://localhost:8002/metrics
```

### Telegram Alerts
Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in `.env` to receive:
- Signal alerts
- Error alerts
- Daily P&L summaries

## Troubleshooting

### No signals generated
```bash
# Check thresholds
python -c "from strategy.reel_strategy import ReelStrategy; print(ReelStrategy.DEFAULT_THRESHOLDS)"

# Check guards
python -c "from risk.guards import Guards; print(Guards().check_all({'underlying':'SPY','dte':30,'delta':0.3,'qty':1}, 100000))"

# Check exposure
python -c "from strategy.reel_strategy import ReelStrategy; print(ReelStrategy().compute_exposure('SPY', '2026-06-08T14:30:00Z'))"
```

### API errors
```bash
# Test ConvexValue
python clients/convexvalue_client.py

# Test Alpaca
python execution/alpaca_client.py
```

## Next Steps

1. **Day 1-3**: Run pipeline, observe signals, tune thresholds
2. **Day 4**: Upgrade to Schwab API (when ready)
3. **Day 5-10**: Paper trade, monitor exits, collect data
4. **Day 11-14**: Optimize thresholds, analyze performance

## Resources

- **README.md**: Full documentation
- **ARCHITECTURE.md**: System design
- **RUNBOOK.md**: Operations guide
- **POLYPAM_DATA_FEED_BRIEF.md**: API reference

## Support

Questions? Check the Telegram channel or the `#bot-backroom` Discord channel.
