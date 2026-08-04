import pytest
from datetime import datetime, timezone
from risk.guards import Guards, GuardResult


def test_guard_result():
    gr = GuardResult(True, "test", "OK")
    assert gr.passed
    assert gr.guard_name == "test"


def test_check_min_dte():
    guards = Guards()
    result = guards.check_min_dte({"dte": 10})
    assert not result.passed
    assert result.guard_name == "min_dte"

    result = guards.check_min_dte({"dte": 20})
    assert result.passed


def test_check_correlation_exposure_empty_portfolio():
    guards = Guards()
    signal = {"underlying": "SPY", "delta": 0.3, "qty": 1}
    result = guards.check_correlation_exposure(signal)
    assert result.passed
    assert "corr-adjusted" in result.detail
    assert "Beta-weighted delta" in result.detail


def test_check_correlation_exposure_high_beta():
    guards = Guards()
    # With a tiny equity, even a small delta should exceed 10%
    guards.config["max_portfolio_delta_pct"] = 0.0001
    signal = {"underlying": "SPY", "delta": 0.3, "qty": 1}
    result = guards.check_correlation_exposure(signal)
    assert not result.passed
    assert result.guard_name == "correlation"
    assert "Beta-weighted delta" in result.detail


def test_check_correlation_exposure_with_beta_provider():
    from risk.correlation import BetaProvider
    guards = Guards()
    guards.beta_provider = BetaProvider({"SPY": 1.5})
    guards.config["max_portfolio_delta_pct"] = 0.0001
    signal = {"underlying": "SPY", "delta": 0.3, "qty": 1}
    result = guards.check_correlation_exposure(signal)
    assert not result.passed
    assert "Beta-weighted delta" in result.detail
    assert "corr-adjusted" in result.detail