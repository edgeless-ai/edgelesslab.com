import pytest
from execution.sizing import SizingConfig, calculate_position_size, kelly_fraction


def test_kelly_fraction():
    # p=0.60, b=2 (avg win 2x avg loss)
    # kelly = (0.6*2 - 0.4) / 2 = 0.4
    f = kelly_fraction(0.60, 200, 100)
    assert abs(f - 0.4) < 0.01


def test_kelly_no_loss():
    f = kelly_fraction(0.60, 200, 0)
    assert f == 0


def test_defined_risk_sizing():
    config = SizingConfig(strategy_type="defined_risk", max_risk_pct=0.02)
    contracts = calculate_position_size(
        account_equity=100_000,
        premium_per_contract=200,
        config=config,
        max_loss_per_contract=500,
    )
    # max_risk = $2,000, max_loss = $500 → 4 contracts
    assert contracts == 4


def test_undefined_risk_sizing():
    config = SizingConfig(strategy_type="undefined_risk", max_risk_pct=0.02)
    contracts = calculate_position_size(
        account_equity=100_000,
        premium_per_contract=200,
        config=config,
        margin_per_contract=1000,
    )
    # max_risk = $2,000, margin = $1,000 → 2 contracts
    assert contracts == 2
