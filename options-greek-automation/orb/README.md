# ORB — Opening Range Breakout

Intraday equity/futures breakout engine. Separate from the options-income strategies
(reel/vrp/pmcc) — different instrument, different data (intraday minute bars, not EOD
option chains).

## Status
- ✅ **Engine** (`orb_strategy.py`) — parameterized ORB state machine, verified on a synthetic self-test.
- ✅ **Data adapter** (`data.py`) — one SQLite bar store (`orb_bars.db`), two feeds: Alpaca market-data + TradingView CSV import.
- ✅ **Backtest** (`backtest_orb.py`) — runs the engine over every day of real bars; refuses to fabricate a track record when the store is empty.
- ⛔ **Spec** — defaults are the **canonical Crabel/textbook** ORB. The saved reel/screenshot David referenced was **not found** in the vault/OCR cache — its exact rules (range window, filters, target, sizing) still need to be supplied, then set in `OrbParams`.
- ⛔ **Data** — bar store is EMPTY. Needs one of the two feeds below.

## Load bars (pick one)
```bash
V=/opt/homebrew/opt/python@3.11/bin/python3.11
# A) TradingView (no real money — just needs TradingView Desktop open with CDP):
#    agent pulls bars via the tradingview MCP → CSV with columns ts,o,h,l,c[,v] → import:
$V -c "from orb.data import import_csv; import_csv('SPY','/path/spy_5min.csv')"

# B) Alpaca market data (needs valid PAPER keys — currently 401):
$V -c "from orb.data import import_from_alpaca; import_from_alpaca('SPY','2024-01-01','2026-07-16','5Min')"
```

## Run
```bash
$V -m orb.backtest_orb SPY
```

## Params (`OrbParams`) — set these to match a SOURCED spec
`range_minutes` (5/15/30) · `bar_minutes` · `entry_buffer_pct` (noise filter) ·
`stop` (opposite edge / full range) · `target_r` (R-multiple) · `direction` (both/long/short) ·
`one_trade_per_day` · `max_range_pct` / `min_range_pct` (Crabel: trade contracted ranges).

## Honesty rules (same as the rest of the system)
No synthetic bars, ever. No fabricated track record. Match params to a real source and say
where they came from — don't repeat the un-sourced Instagram Reel Strategy mistake. A real
ORB track record needs many months of bars including a drawdown regime.
