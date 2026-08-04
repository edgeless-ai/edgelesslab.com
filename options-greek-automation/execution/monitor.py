"""
Monitor loop: manages exits for open positions.

Rules:
  - Close at 50% of max profit (TastyTrade rule)
  - Close at 21 DTE (or roll)
  - Close if stop/target level breached
  - Auto-close at 3:30 PM on expiration day
"""
import time
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any

from execution.alpaca_client import AlpacaClient, build_occ_symbol
from db.engine import get_conn

logger = logging.getLogger("execution.monitor")


def get_open_trades() -> List[Dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM trades WHERE status = 'open' ORDER BY entry_ts"
        ).fetchall()
    return [dict(r) for r in rows]


def update_trade_pnl(trade: dict, client: AlpacaClient) -> None:
    """Query Alpaca for current position value and update unrealized P&L."""
    occ = build_occ_symbol(trade["underlying"], trade["expiration_date"], trade["contract_type"], trade["strike_price"])
    pos = client.get_position(occ)
    if not pos:
        return  # Position may have been closed externally

    current_value = float(pos["market_value"])
    qty = trade["qty"]
    entry_price = trade["entry_price"] or 0
    unrealized = current_value - (entry_price * qty)
    max_pnl = trade["max_pnl"] or 0
    max_dd = trade["max_drawdown"] or 0

    if unrealized > max_pnl:
        max_pnl = unrealized
    if unrealized < max_dd:
        max_dd = unrealized

    with get_conn() as conn:
        conn.execute("""
            UPDATE trades SET unrealized_pnl = ?, max_pnl = ?, max_drawdown = ?
            WHERE id = ?
        """, (unrealized, max_pnl, max_dd, trade["id"]))
        conn.commit()


def check_exit_conditions(trade: dict, client: AlpacaClient) -> bool:
    """Returns True if position should be closed."""
    # 1. Stop/target breach
    occ = build_occ_symbol(trade["underlying"], trade["expiration_date"], trade["contract_type"], trade["strike_price"])
    pos = client.get_position(occ)
    if not pos:
        return False

    current_price = float(pos["avg_entry_price"])  # Simplified: use avg entry as proxy
    # In reality, we need the current option price, which requires option chain data
    # For MVP, we track P&L from Alpaca's market_value
    unrealized = trade["unrealized_pnl"] or 0
    entry_premium = (trade["entry_price"] or 0) * trade["qty"]

    # 50% profit rule
    if entry_premium > 0 and unrealized / entry_premium >= 0.50:
        logger.info(f"Trade {trade['id']}: 50% profit reached")
        return True

    # Max loss rule (2x premium)
    if entry_premium > 0 and unrealized <= -2 * entry_premium:
        logger.info(f"Trade {trade['id']}: Max loss reached")
        return True

    # 21 DTE rule
    entry_dt = datetime.fromisoformat(trade["entry_ts"]) if trade["entry_ts"] else datetime.now(timezone.utc)
    dte = trade["dte_at_entry"] or 30
    days_held = (datetime.now(timezone.utc) - entry_dt).days
    if dte - days_held <= 21:
        logger.info(f"Trade {trade['id']}: 21 DTE reached")
        return True

    # Expiration day auto-close
    expiry = datetime.strptime(trade["expiration_date"], "%Y-%m-%d").date()
    if expiry == datetime.now(timezone.utc).date():
        now = datetime.now(timezone.utc)
        close_time = now.replace(hour=19, minute=30, second=0, microsecond=0)  # 3:30 PM ET
        if now >= close_time:
            logger.info(f"Trade {trade['id']}: Auto-close at 3:30 PM on expiration day")
            return True

    return False


def close_trade(trade: dict, client: AlpacaClient) -> None:
    """Close position and record realized P&L."""
    occ = build_occ_symbol(trade["underlying"], trade["expiration_date"], trade["contract_type"], trade["strike_price"])
    result = client.close_position(occ)
    logger.info(f"Closed trade {trade['id']}: {result}")

    # Update trade record
    realized = trade["unrealized_pnl"] or 0
    with get_conn() as conn:
        conn.execute("""
            UPDATE trades SET status = 'closed', exit_price = ?, realized_pnl = ?, exit_ts = ?
            WHERE id = ?
        """, (0, realized, datetime.now(timezone.utc).isoformat(), trade["id"]))
        conn.commit()

    # Update account state
    today = datetime.now(timezone.utc).date().isoformat()
    conn.execute("""
        UPDATE account_state SET daily_realized_pnl = daily_realized_pnl + ?, daily_trades_count = daily_trades_count + 1
        WHERE date = ?
    """, (realized, today))
    conn.commit()


def monitor_loop(interval_seconds: int = 60) -> None:
    """Run monitor loop indefinitely (or until market close)."""
    client = AlpacaClient()
    logger.info("Monitor loop started")
    while True:
        try:
            trades = get_open_trades()
            for trade in trades:
                update_trade_pnl(trade, client)
                if check_exit_conditions(trade, client):
                    close_trade(trade, client)
            time.sleep(interval_seconds)
        except Exception as e:
            logger.error(f"Monitor loop error: {e}")
            time.sleep(interval_seconds)


def run_once() -> None:
    """Run one monitor cycle (for cron jobs)."""
    client = AlpacaClient()
    trades = get_open_trades()
    for trade in trades:
        try:
            update_trade_pnl(trade, client)
            if check_exit_conditions(trade, client):
                close_trade(trade, client)
        except Exception as e:
            logger.error(f"Error processing trade {trade['id']}: {e}")


if __name__ == "__main__":
    run_once()
    print(f"✅ Monitor cycle complete: {len(get_open_trades())} open positions")
