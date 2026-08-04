# PolyPam Data Feed Briefing — ConvexValue API

**Status:** LIVE — Day 0 verified June 8, 2026
**Source:** ConvexValue (cvforge) — real-time US equity options chain + Greeks
**API Key:** set `CV_API_KEY` in your environment (a `cv_live_…` key from ConvexValue). Never hardcode it here.
**Base URL:** `https://tap.convexvalue.com/api/data`
**MCP Server:** `/Applications/cvforge.app/Contents/Resources/cv-mcp`

---

## What You Have Access To

| Tool | Purpose | Rate Limit |
|------|---------|------------|
| `get_chain(symbol, fields)` | Full options chain for one underlying | N/A (local MCP) |
| `screen(columns, filters, sort, limit)` | Cross-symbol screener (e.g., high IV, unusual OI) | N/A (local MCP) |
| `query_sql(sql)` | Read-only DuckDB SQL on options_snapshots | N/A (local MCP) |
| `list_chain_fields()` | All available fields + defaults | N/A (local MCP) |

**Available Fields:**
- `delta`, `gamma`, `theta`, `vega` — Greeks
- `implied_volatility` — IV
- `open_interest`, `day_volume` — Flow
- `bid`, `ask`, `midpoint` — Pricing
- `underlying_price` — Spot
- `strike_price`, `expiration_date`, `contract_type` — Contract specs
- `underlying_ticker`, `ticker` — Identifiers

---

## How To Use It

```python
from convexvalue_client import ConvexValueClient

client = ConvexValueClient()

# 1. Get SPY chain with Greeks
chain = client.get_chain(
    "SPY",
    fields=["delta", "gamma", "vega", "theta", "implied_volatility", "open_interest"]
)
# Returns: {symbol, params, chain:[{expiration, strikes:[[strike, [call_vals], [put_vals]]]}]}

# 2. Screen for high-IV SPY contracts
screen = client.screen(
    columns=["ticker", "implied_volatility", "open_interest", "delta", "gamma"],
    filters=[
        {"field": "underlying_ticker", "op": "eq", "value": "SPY"},
        {"field": "open_interest", "op": "gt", "value": 1000}
    ],
    sort=[{"field": "implied_volatility", "direction": "desc"}],
    limit=10
)

# 3. SQL query
rows = client.query_sql("SELECT * FROM options_snapshots WHERE underlying_ticker = 'SPY' LIMIT 5")

client.close()
```

---

## What You DON'T Have (Yet)

| Missing | Workaround | Resolution |
|---------|------------|------------|
| **Vanna** | Compute locally from IV surface: `vanna = dVega/dSpot` | Schwab API will provide this directly |
| **Real-time quote stream** | Poll every 60s | WebSocket feed not available via ConvexValue |
| **VIX/SPX index options** | Use `I:SPX`, `I:VIX` prefix | Supported via same API |
| **Historical backfill** | Limited to current snapshot | Schwab API will provide historical chains |

---

## Next Steps

1. **Use this for MVP Days 1–3** — Ingestion pipeline, backtest engine, signal generation
2. **Schwab API upgrade on Day 4** — User will provide Schwab developer credentials for:
   - Native vanna computation
   - Historical backfill for 30-day backtest
   - Real-time streaming quotes
   - Order execution (though Alpaca paper still handles trades)

---

## Key Files

```
~/Codex-projects/options-greek-automation/
├── clients/
│   ├── convexvalue_client.py      ← Python wrapper (this doc)
│   └── POLYPAM_DATA_FEED_BRIEF.md ← This file
```

---

## Troubleshooting

- **"invalid api key"** — Check `CV_API_KEY` env var; key must be live (not demo)
- **"data-api /chains returned 401"** — API key expired or rate-limited; contact ConvexValue
- **MCP server not found** — Ensure cvforge.app is installed at `/Applications/cvforge.app`
- **Empty chain** — Symbol may not have options (try SPY, QQQ, IWM, AAPL, TSLA)

---

**Questions? Ask Beau or check the Day 0 verification script:**
`python3 ~/Codex-projects/options-greek-automation/clients/convexvalue_client.py`
