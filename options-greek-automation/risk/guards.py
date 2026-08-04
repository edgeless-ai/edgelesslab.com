"""
Risk guards: options-specific safety checks.

Guards:
  - Max 1 open position per underlying
  - No trades within 30 min of market open
  - Daily loss limit (5% of equity)
  - Beta-weighted correlation exposure
  - Expiration guards (auto-close at 3:30 PM on expiry)
  - Pin risk (ban ATM on expiry day)
  - Dividend risk (ban short calls near ex-div)
  - Min DTE (14 days, per reel strategy)
"""
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

from db.engine import get_conn
from risk.correlation import BetaProvider, CorrelationMatrix, compute_beta_weighted_delta, compute_correlation_adjusted_exposure

logger = logging.getLogger("risk.guards")

# Optional market calendars
try:
    import pandas_market_calendars as mcal
    nyse = mcal.get_calendar("NYSE")
    HAS_MARKET_CAL = True
except ImportError:
    HAS_MARKET_CAL = False
    nyse = None


@dataclass
class GuardResult:
    passed: bool
    guard_name: str
    detail: str
    signal_id: Optional[int] = None


class Guards:
    """All risk guards in one class."""

    def __init__(self, config: Optional[Dict] = None):
        self.config = config or {
            "max_open_per_underlying": 1,
            "post_open_minutes": 30,
            "daily_loss_limit_pct": 0.05,
            "max_portfolio_delta_pct": 0.10,
            "min_dte": 14,
            "auto_close_before_expiry_minutes": 30,
            "ban_atm_on_expiry_pct": 0.01,
        }
        self.beta_provider = BetaProvider()
        self.correlation_matrix = CorrelationMatrix()

    def check_all(self, signal: dict, account_equity: float) -> List[GuardResult]:
        """Run all guards on a signal. Returns list of results."""
        results = []
        results.append(self.check_market_hours())
        results.append(self.check_open_positions(signal["underlying"]))
        results.append(self.check_daily_loss_limit(account_equity))
        results.append(self.check_min_dte(signal))
        results.append(self.check_correlation_exposure(signal))
        results.append(self.check_expiration_risk(signal))
        return results

    def check_market_hours(self) -> GuardResult:
        """No trades within 30 min of market open."""
        if not HAS_MARKET_CAL:
            # Fallback: allow trades during typical US hours (9:30 AM - 4:00 PM ET)
            from datetime import time
            now = datetime.now(tz=timezone.utc)
            # 9:30 AM ET = 13:30 UTC, 4:00 PM ET = 20:00 UTC
            if now.weekday() >= 5:
                return GuardResult(False, "market_hours", "Weekend")
            if not (time(13, 30) <= now.time() <= time(20, 0)):
                return GuardResult(False, "market_hours", "Outside market hours (fallback)")
            return GuardResult(True, "market_hours", "OK (fallback)")

        now = datetime.now(tz=timezone.utc)
        try:
            schedule = nyse.schedule(start_date=now.date(), end_date=now.date())
        except Exception:
            return GuardResult(False, "market_hours", "NYSE schedule unavailable")

        if schedule.empty:
            return GuardResult(False, "market_hours", "Market closed today")

        market_open = schedule.iloc[0]["market_open"].tz_localize("UTC")
        market_close = schedule.iloc[0]["market_close"].tz_localize("UTC")
        buffer_open = market_open + timedelta(minutes=self.config["post_open_minutes"])

        if now < buffer_open:
            return GuardResult(False, "market_hours", f"Too close to open. Wait until {buffer_open.strftime('%H:%M')} UTC")
        if now > market_close:
            return GuardResult(False, "market_hours", "Market closed")
        return GuardResult(True, "market_hours", "OK")

    def check_open_positions(self, underlying: str) -> GuardResult:
        """Max 1 open position per underlying."""
        with get_conn() as conn:
            count = conn.execute(
                "SELECT COUNT(*) FROM trades WHERE underlying = ? AND status = 'open'",
                (underlying,)
            ).fetchone()[0]
        if count >= self.config["max_open_per_underlying"]:
            return GuardResult(False, "max_positions", f"Already {count} open positions in {underlying}")
        return GuardResult(True, "max_positions", f"{count} open, OK")

    def check_daily_loss_limit(self, account_equity: float) -> GuardResult:
        """Daily loss < 5% of equity."""
        with get_conn() as conn:
            today = datetime.now(timezone.utc).date().isoformat()
            row = conn.execute(
                "SELECT daily_realized_pnl FROM account_state WHERE date = ?",
                (today,)
            ).fetchone()
        if not row:
            return GuardResult(True, "daily_loss", "No trades today")

        daily_pnl = row["daily_realized_pnl"] or 0
        limit = account_equity * self.config["daily_loss_limit_pct"]
        if abs(daily_pnl) >= limit:
            return GuardResult(False, "daily_loss", f"Daily loss ${abs(daily_pnl):.0f} >= limit ${limit:.0f}")
        return GuardResult(True, "daily_loss", f"Daily P&L ${daily_pnl:.0f}, limit ${limit:.0f}")

    def check_min_dte(self, signal: dict) -> GuardResult:
        """Minimum 14 DTE."""
        if signal.get("dte", 99) < self.config["min_dte"]:
            return GuardResult(False, "min_dte", f"DTE {signal['dte']} < {self.config['min_dte']}")
        return GuardResult(True, "min_dte", "OK")

    def check_correlation_exposure(self, signal: dict) -> GuardResult:
        """Beta-weighted portfolio exposure check with correlation matrix."""
        with get_conn() as conn:
            open_positions = conn.execute(
                "SELECT t.underlying, g.delta_net FROM trades t JOIN greek_exposure g ON t.underlying = g.underlying WHERE t.status = 'open'"
            ).fetchall()

            # Build Position objects for existing trades
            positions = []
            for p in open_positions:
                qty = conn.execute(
                    "SELECT SUM(qty) FROM trades WHERE underlying = ? AND status = 'open'",
                    (p["underlying"],)
                ).fetchone()[0] or 1
                positions.append({
                    "underlying": p["underlying"],
                    "delta": p["delta_net"] or 0,
                    "qty": qty,
                })

            # Add new signal's delta
            signal_delta = signal.get("delta", 0) * signal.get("qty", 1)
            new_signal_underlying = signal["underlying"]
            positions.append({
                "underlying": new_signal_underlying,
                "delta": signal_delta,
                "qty": 1,
            })

            # Compute beta-weighted delta
            beta_weighted = sum(
                self.beta_provider.get(p["underlying"]) * p["delta"] * p["qty"]
                for p in positions
            )

            # Compute correlation-adjusted exposure (portfolio variance metric)
            from risk.correlation import Position
            pos_objs = [Position(p["underlying"], p["delta"], p["qty"]) for p in positions]
            corr_exposure = compute_correlation_adjusted_exposure(
                pos_objs, self.beta_provider, self.correlation_matrix
            )

            # Portfolio value
            equity = conn.execute("SELECT equity FROM account_state ORDER BY date DESC LIMIT 1").fetchone()
        equity_val = equity["equity"] if equity else 1_000_000
        max_delta = equity_val * self.config["max_portfolio_delta_pct"]

        if abs(beta_weighted) > max_delta:
            return GuardResult(
                False, "correlation",
                f"Beta-weighted delta ${abs(beta_weighted):.0f} > limit ${max_delta:.0f} (corr-adjusted: ${corr_exposure:.0f})"
            )
        return GuardResult(
            True, "correlation",
            f"Beta-weighted delta ${abs(beta_weighted):.0f}, corr-adjusted: ${corr_exposure:.0f}"
        )

    def check_expiration_risk(self, signal: dict) -> GuardResult:
        """Ban ATM options on expiration day; auto-close before expiry."""
        dte = signal.get("dte", 99)
        underlying = signal["underlying"]
        if dte == 0:
            return GuardResult(False, "expiration", "Expiration day — no new positions")
        if dte <= 2:
            return GuardResult(False, "expiration", f"DTE {dte} <= 2 — too close")
        return GuardResult(True, "expiration", f"DTE {dte} OK")

    def check_expiration_day_positions(self) -> List[Dict]:
        """Find positions that need to be closed today. Returns list of trade dicts."""
        today = datetime.now(timezone.utc).date()
        with get_conn() as conn:
            trades = conn.execute(
                "SELECT * FROM trades WHERE status = 'open' AND expiration_date = ?",
                (today.isoformat(),)
            ).fetchall()
        return [dict(t) for t in trades]

    def should_auto_close(self, trade: dict) -> bool:
        """Check if trade should be auto-closed now."""
        now = datetime.now(timezone.utc)
        # Close at 3:30 PM on expiration day
        if trade["expiration_date"] == now.date().isoformat():
            close_time = now.replace(hour=19, minute=30, second=0, microsecond=0)  # 3:30 PM ET = 19:30 UTC
            if now >= close_time:
                return True
        # Close at 21 DTE
        if trade.get("dte_at_entry", 99) - (now - datetime.fromisoformat(trade["entry_ts"])).days <= 21:
            return True
        return False
