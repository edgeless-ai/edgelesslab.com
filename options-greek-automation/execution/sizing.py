"""
Position sizing with Kelly criterion and risk-adjusted notional.

Strategies:
  - Defined risk (spreads, iron condors): size by max loss
  - Undefined risk (naked calls/puts): size by delta-adjusted notional
  - Kelly criterion: f* = (bp - q) / b, where b = avg win / avg loss
"""
from typing import Optional, Dict
from dataclasses import dataclass


@dataclass
class SizingConfig:
    strategy_type: str = "undefined_risk"  # defined_risk, undefined_risk
    max_risk_pct: float = 0.02  # 2% of account per trade
    kelly_fraction: float = 0.5  # Half-Kelly to reduce variance
    max_contracts: int = 10
    min_contracts: int = 1


def kelly_fraction(win_rate: float, avg_win: float, avg_loss: float) -> float:
    """
    Kelly criterion: f* = (bp - q) / b
    b = avg_win / avg_loss, p = win_rate, q = 1-p
    """
    if avg_loss == 0 or avg_win <= 0:
        return 0
    b = avg_win / avg_loss
    q = 1 - win_rate
    f = (b * win_rate - q) / b
    return max(0, min(f, 1))


def calculate_position_size(
    account_equity: float,
    premium_per_contract: float,
    config: SizingConfig,
    backtest_stats: Optional[Dict] = None,
    margin_per_contract: Optional[float] = None,
    max_loss_per_contract: Optional[float] = None,
) -> int:
    """
    Calculate position size in contracts.

    Args:
        account_equity: Total account value
        premium_per_contract: Option premium per contract
        config: Sizing strategy
        backtest_stats: Optional {"win_rate", "avg_win", "avg_loss"}
        margin_per_contract: Required margin (for undefined risk)
        max_loss_per_contract: Max loss (for defined risk)
    """
    if config.strategy_type == "defined_risk" and max_loss_per_contract:
        # Size by max loss
        max_risk_dollars = account_equity * config.max_risk_pct
        if backtest_stats:
            kelly = kelly_fraction(
                backtest_stats["win_rate"],
                backtest_stats["avg_win"],
                backtest_stats["avg_loss"],
            )
            kelly_adjusted = kelly * config.kelly_fraction
            max_risk_dollars = account_equity * min(config.max_risk_pct, kelly_adjusted)

        contracts = int(max_risk_dollars / max_loss_per_contract)
        return max(config.min_contracts, min(contracts, config.max_contracts))

    elif config.strategy_type == "undefined_risk":
        # Size by margin requirement or delta-adjusted notional
        max_risk_dollars = account_equity * config.max_risk_pct
        if margin_per_contract:
            contracts = int(max_risk_dollars / margin_per_contract)
        else:
            # Fallback: delta-adjusted notional
            # Assume delta ~ 0.30, notional = spot * 100
            contracts = int(max_risk_dollars / (premium_per_contract * 100))
        return max(config.min_contracts, min(contracts, config.max_contracts))

    else:
        raise ValueError(f"Unknown strategy_type: {config.strategy_type}")
