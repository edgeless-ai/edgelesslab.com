"""
Alpaca Paper Trading Client for Options (Single-leg, OCC format).

Uses the existing ~/.config/alpaca/config.yaml profile 'pamela'.
Single-leg orders only — bracket orders are unsupported for options.
"""
import os
import yaml
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime, timezone

# Try to import alpaca-py; if not available, use requests fallback
try:
    from alpaca.trading.client import TradingClient
    from alpaca.trading.requests import MarketOrderRequest
    from alpaca.trading.enums import OrderSide, TimeInForce
    ALPACA_SDK = True
except ImportError:
    ALPACA_SDK = False
    import requests

from db.engine import get_conn


CONFIG_PATH = Path.home() / ".config" / "alpaca" / "config.yaml"


def load_alpaca_config(profile: str = "pamela") -> Dict[str, str]:
    """Resolve Alpaca paper keys. Order: live env vars → project .env → empty.

    The ~/.config/alpaca/config.yaml file holds only CLI defaults (no secrets), so keys
    come from ALPACA_API_KEY / ALPACA_API_SECRET (also accepts the APCA-* names Alpaca
    uses). Drop them in /Users/djm/claude-projects/.env and this picks them up.
    """
    key = os.getenv("ALPACA_API_KEY") or os.getenv("APCA_API_KEY_ID") or ""
    secret = os.getenv("ALPACA_API_SECRET") or os.getenv("APCA_API_SECRET_KEY") or ""
    if not (key and secret):
        try:
            from dotenv import dotenv_values
            env = dotenv_values("/Users/djm/claude-projects/.env")
            key = key or env.get("ALPACA_API_KEY") or env.get("APCA_API_KEY_ID") or ""
            secret = secret or env.get("ALPACA_API_SECRET") or env.get("APCA_API_SECRET_KEY") or ""
        except Exception:
            pass
    return {"api_key": key, "api_secret": secret,
            "key_id": key, "secret_key": secret}  # aliases for callers


def build_occ_symbol(underlying: str, expiration: str, option_type: str, strike: float) -> str:
    """Build OCC symbol: SPY240719C00450000"""
    exp_dt = datetime.strptime(expiration, "%Y-%m-%d")
    type_code = "C" if option_type == "call" else "P"
    return f"{underlying}{exp_dt.strftime('%y%m%d')}{type_code}{int(strike * 1000):08d}"


class AlpacaClient:
    """Paper trading client for single-leg options orders."""

    def __init__(self, profile: str = "pamela"):
        self.config = load_alpaca_config(profile)
        self.api_key = self.config["api_key"]
        self.api_secret = self.config["api_secret"]
        self.base_url = "https://paper-api.alpaca.markets"

        if ALPACA_SDK:
            self.client = TradingClient(self.api_key, self.api_secret, paper=True)
        else:
            self.client = None
            self.session = requests.Session()
            self.session.headers.update({
                "APCA-API-KEY-ID": self.api_key,
                "APCA-API-SECRET-KEY": self.api_secret,
            })

    def get_account(self) -> Dict[str, Any]:
        """Fetch account equity/cash."""
        if ALPACA_SDK:
            acc = self.client.get_account()
            return {
                "equity": float(acc.equity),
                "cash": float(acc.cash),
                "buying_power": float(acc.buying_power),
            }
        else:
            r = self.session.get(f"{self.base_url}/v2/account")
            r.raise_for_status()
            data = r.json()
            return {
                "equity": float(data["equity"]),
                "cash": float(data["cash"]),
                "buying_power": float(data["buying_power"]),
            }

    def submit_order(self, occ_symbol: str, side: str, qty: int) -> Dict[str, Any]:
        """Submit single-leg options market order."""
        side_enum = "buy" if side.lower() == "buy" else "sell"

        if ALPACA_SDK:
            order = MarketOrderRequest(
                symbol=occ_symbol,
                qty=qty,
                side=OrderSide.BUY if side_enum == "buy" else OrderSide.SELL,
                time_in_force=TimeInForce.DAY,
            )
            result = self.client.submit_order(order)
            return {
                "id": str(result.id),
                "status": result.status,
                "symbol": result.symbol,
                "qty": result.qty,
                "side": result.side,
            }
        else:
            payload = {
                "symbol": occ_symbol,
                "qty": str(qty),
                "side": side_enum,
                "type": "market",
                "time_in_force": "day",
            }
            r = self.session.post(f"{self.base_url}/v2/orders", json=payload)
            r.raise_for_status()
            data = r.json()
            return {
                "id": data["id"],
                "status": data["status"],
                "symbol": data["symbol"],
                "qty": data["qty"],
                "side": data["side"],
            }

    def get_position(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get open position for a symbol."""
        if ALPACA_SDK:
            try:
                pos = self.client.get_open_position(symbol)
                return {
                    "symbol": pos.symbol,
                    "qty": pos.qty,
                    "avg_entry_price": pos.avg_entry_price,
                    "market_value": pos.market_value,
                }
            except Exception:
                return None
        else:
            r = self.session.get(f"{self.base_url}/v2/positions/{symbol}")
            if r.status_code == 404:
                return None
            r.raise_for_status()
            data = r.json()
            return {
                "symbol": data["symbol"],
                "qty": data["qty"],
                "avg_entry_price": data["avg_entry_price"],
                "market_value": data["market_value"],
            }

    def close_position(self, symbol: str) -> Dict[str, Any]:
        """Close entire position."""
        if ALPACA_SDK:
            result = self.client.close_position(symbol)
            return {
                "id": str(result.id),
                "status": result.status,
            }
        else:
            r = self.session.delete(f"{self.base_url}/v2/positions/{symbol}")
            r.raise_for_status()
            data = r.json()
            return {
                "id": data["id"],
                "status": data["status"],
            }

    def update_account_state(self) -> None:
        """Sync account state to SQLite."""
        acc = self.get_account()
        today = datetime.now(timezone.utc).date().isoformat()
        with get_conn() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO account_state (date, equity, cash, buying_power)
                VALUES (?, ?, ?, ?)
            """, (today, acc["equity"], acc["cash"], acc["buying_power"]))
            conn.commit()


if __name__ == "__main__":
    # Day 0 verification
    client = AlpacaClient()
    print("Alpaca Account State:")
    print(client.get_account())
    print("\nOCC Symbol Test:", build_occ_symbol("SPY", "2026-07-19", "call", 450.00))
