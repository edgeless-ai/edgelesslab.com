"""
Telegram notifications for signals and alerts.

Uses Hermes send_message or direct HTTP to Telegram bot.
"""
import os
import json
import urllib.request
from typing import Optional
from dataclasses import dataclass

from strategy.reel_strategy import Signal


TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")


def send_signal_alert(signal: Signal) -> bool:
    """Send formatted signal alert to Telegram."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("WARNING: Telegram not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.")
        return False

    emoji = "🔴" if signal.signal_type == "LONG" else "🔵" if signal.signal_type == "SHORT" else "⚪"
    text = (
        f"{emoji} <b>SIGNAL: {signal.underlying} {signal.signal_type}</b>\n\n"
        f"Confidence: {signal.confidence:.0%}\n"
        f"Entry: ${signal.entry_level:.2f}\n"
        f"Target: ${signal.target_level:.2f} | Stop: ${signal.stop_level:.2f}\n"
        f"Regime: {signal.regime}\n\n"
        f"<b>Factors:</b>\n"
        f"Δ-score: {signal.factors.get('delta_score', 0)}\n"
        f"Γ-score: {signal.factors.get('gamma_score', 0)}\n"
        f"V-score: {signal.factors.get('vanna_score', 0)}\n\n"
        f"<i>{signal.narrative}</i>"
    )

    return send_telegram_message(text, parse_mode="HTML")


def send_telegram_message(text: str, parse_mode: str = "HTML") -> bool:
    """Send raw message to Telegram."""
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = json.dumps({
        "chat_id": TELEGRAM_CHAT_ID,
        "text": text,
        "parse_mode": parse_mode,
        "disable_web_page_preview": True,
    }).encode()

    req = urllib.request.Request(url, data=payload, method="POST",
                                  headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 200
    except Exception as e:
        print(f"Telegram send failed: {e}")
        return False


def send_error_alert(error: str, context: str = "") -> bool:
    """Send error alert to Telegram."""
    text = f"⚠️ <b>Error</b>: {error}\n{context}"
    return send_telegram_message(text)


def send_daily_summary(pnl: float, trades: int, signals: int) -> bool:
    """Send daily P&L summary."""
    emoji = "📈" if pnl >= 0 else "📉"
    text = (
        f"{emoji} <b>Daily Summary</b>\n\n"
        f"P&L: ${pnl:+.2f}\n"
        f"Trades: {trades}\n"
        f"Signals: {signals}"
    )
    return send_telegram_message(text)


if __name__ == "__main__":
    # Test
    test_signal = Signal(
        underlying="SPY",
        signal_type="LONG",
        confidence=0.78,
        entry_level=450.0,
        target_level=455.0,
        stop_level=445.5,
        expires_at="2026-06-08T15:00:00",
        regime="normal",
        factors={"delta_score": 0.8, "gamma_score": 0.9, "vanna_score": 0.7},
        narrative="Contrarian long on high put/call ratio with gamma support.",
    )
    send_signal_alert(test_signal)
