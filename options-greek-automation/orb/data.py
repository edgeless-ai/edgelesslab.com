"""Intraday bar sources for ORB — Alpaca + TradingView, into one local store.

ORB needs intraday minute bars, which the options-snapshot recorder does NOT capture.
Two feeds, one SQLite store (`orb/orb_bars.db`), so the strategy/backtest read one shape
regardless of source:

  • Alpaca  — historical + live 1/5-min bars, free with the paper account. Blocked until
              valid paper keys exist (~/.config/alpaca/config.yaml, currently 401).
  • TradingView — the live MCP reads the open chart. An MCP tool CANNOT be called from
              inside this script, so the flow is: the agent pulls bars via the tradingview
              MCP (data_get_ohlcv) or a Pine export, writes them to CSV, then calls
              import_csv() here. TradingView backtesting needs the desktop app open, NOT
              real money.

No synthetic bars, ever — an empty store returns [] and the backtest says so honestly.
"""
import csv
import sqlite3
from pathlib import Path
from typing import List

from orb.orb_strategy import Bar

DB = Path(__file__).parent / "orb_bars.db"


def _conn():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    c.execute("""CREATE TABLE IF NOT EXISTS bars (
        symbol TEXT, ts TEXT, o REAL, h REAL, l REAL, c REAL, v REAL, source TEXT,
        PRIMARY KEY (symbol, ts))""")
    return c


def load_bars(symbol: str, day: str) -> List[Bar]:
    """All bars for one symbol on one date (YYYY-MM-DD), sorted by time."""
    with _conn() as c:
        rows = c.execute(
            "SELECT ts,o,h,l,c,v FROM bars WHERE symbol=? AND substr(ts,1,10)=? ORDER BY ts",
            (symbol, day)).fetchall()
    return [Bar(r["ts"], r["o"], r["h"], r["l"], r["c"], r["v"]) for r in rows]


def available_days(symbol: str) -> List[str]:
    with _conn() as c:
        return [r[0] for r in c.execute(
            "SELECT DISTINCT substr(ts,1,10) FROM bars WHERE symbol=? ORDER BY 1", (symbol,)).fetchall()]


def _upsert(symbol: str, rows, source: str) -> int:
    with _conn() as c:
        c.executemany(
            "INSERT OR REPLACE INTO bars (symbol,ts,o,h,l,c,v,source) VALUES (?,?,?,?,?,?,?,?)",
            [(symbol, r["ts"], r["o"], r["h"], r["l"], r["c"], r.get("v", 0), source) for r in rows])
        c.commit()
        return len(list(rows)) if isinstance(rows, list) else 0


def import_csv(symbol: str, path: str, source: str = "tradingview") -> int:
    """Import bars from CSV with columns ts,o,h,l,c[,v]. Use for TradingView MCP exports."""
    with open(path) as f:
        rows = [{"ts": r["ts"], "o": float(r["o"]), "h": float(r["h"]), "l": float(r["l"]),
                 "c": float(r["c"]), "v": float(r.get("v", 0) or 0)} for r in csv.DictReader(f)]
    n = _upsert(symbol, rows, source)
    print(f"imported {n} bars for {symbol} from {path} ({source})")
    return n


def import_from_alpaca(symbol: str, start: str, end: str, timeframe: str = "5Min") -> int:
    """Pull historical bars from Alpaca Market Data (data.alpaca.markets/v2/stocks/{sym}/bars).

    NOT the trading endpoint the existing AlpacaClient wraps (that's account/orders only) —
    bars need the market-data host + the same key/secret. Implemented directly here with the
    configured 'pamela' profile; blocked until those keys are valid (currently 401).
    """
    import requests
    from execution.alpaca_client import load_alpaca_config
    cfg = load_alpaca_config()
    key, secret = cfg.get("api_key") or cfg.get("key_id"), cfg.get("api_secret") or cfg.get("secret_key")
    if not key or not secret:
        raise RuntimeError("No Alpaca keys in ~/.config/alpaca/config.yaml (profile pamela).")
    headers = {"APCA-API-KEY-ID": key, "APCA-API-SECRET-KEY": secret}
    url = f"https://data.alpaca.markets/v2/stocks/{symbol}/bars"
    rows, page_token = [], None
    while True:
        params = {"start": start, "end": end, "timeframe": timeframe, "limit": 10000, "adjustment": "raw"}
        if page_token:
            params["page_token"] = page_token
        r = requests.get(url, headers=headers, params=params, timeout=30)
        if r.status_code in (401, 403):
            raise RuntimeError(f"Alpaca market-data auth failed ({r.status_code}) — add valid keys before importing bars.")
        r.raise_for_status()
        data = r.json()
        for b in data.get("bars", []):
            rows.append({"ts": b["t"][:16], "o": b["o"], "h": b["h"], "l": b["l"], "c": b["c"], "v": b.get("v", 0)})
        page_token = data.get("next_page_token")
        if not page_token:
            break
    n = _upsert(symbol, rows, "alpaca")
    print(f"imported {n} Alpaca bars for {symbol}")
    return n


if __name__ == "__main__":
    import sys
    sym = sys.argv[1] if len(sys.argv) > 1 else "SPY"
    days = available_days(sym)
    print(f"{sym}: {len(days)} days of bars in store" + (f" ({days[0]}..{days[-1]})" if days else " — EMPTY. "
          "Load bars first: import_csv() from a TradingView export, or import_from_alpaca() once keys work."))
