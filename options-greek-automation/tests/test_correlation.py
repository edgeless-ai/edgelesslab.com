"""Tests for risk/correlation.py"""
import pytest
from risk.correlation import (
    BetaProvider,
    CorrelationMatrix,
    Position,
    compute_beta_weighted_delta,
    compute_correlation_adjusted_exposure,
    DEFAULT_BETAS,
    DEFAULT_CORRELATIONS,
)


class TestBetaProvider:
    def test_default_beta(self):
        bp = BetaProvider()
        assert bp.get("SPY") == 1.0
        assert bp.get("QQQ") == 0.95
        assert bp.get("IWM") == 0.85

    def test_fallback_beta(self):
        bp = BetaProvider()
        assert bp.get("UNKNOWN") == 1.0

    def test_custom_beta(self):
        bp = BetaProvider({"CUSTOM": 1.5})
        assert bp.get("CUSTOM") == 1.5
        assert bp.get("SPY") == 1.0

    def test_update_beta(self):
        bp = BetaProvider()
        bp.update("SPY", 1.1)
        assert bp.get("SPY") == 1.1


class TestCorrelationMatrix:
    def test_default_correlation(self):
        cm = CorrelationMatrix()
        assert cm.get("SPY", "QQQ") == 0.97
        assert cm.get("QQQ", "SPY") == 0.97  # symmetric

    def test_self_correlation(self):
        cm = CorrelationMatrix()
        assert cm.get("SPY", "SPY") == 1.0

    def test_unknown_correlation(self):
        cm = CorrelationMatrix()
        assert cm.get("UNKNOWN", "SPY") == 0.0

    def test_custom_correlation(self):
        custom = {"A": {"B": 0.5}}
        cm = CorrelationMatrix(custom)
        assert cm.get("A", "B") == 0.5
        assert cm.get("B", "A") == 0.5


class TestComputeBetaWeightedDelta:
    def test_single_position(self):
        bp = BetaProvider()
        pos = [Position("SPY", 0.3, 1)]
        assert compute_beta_weighted_delta(pos, bp) == pytest.approx(0.3)

    def test_multiple_positions(self):
        bp = BetaProvider()
        pos = [
            Position("SPY", 0.3, 1),
            Position("QQQ", 0.3, 1),
        ]
        expected = 0.3 * 1.0 + 0.3 * 0.95
        assert compute_beta_weighted_delta(pos, bp) == pytest.approx(expected)

    def test_qty_scaling(self):
        bp = BetaProvider()
        pos = [Position("SPY", 0.3, 2)]
        assert compute_beta_weighted_delta(pos, bp) == pytest.approx(0.6)


class TestComputeCorrelationAdjustedExposure:
    def test_empty_positions(self):
        bp = BetaProvider()
        cm = CorrelationMatrix()
        assert compute_correlation_adjusted_exposure([], bp, cm) == 0.0

    def test_single_position(self):
        bp = BetaProvider()
        cm = CorrelationMatrix()
        pos = [Position("SPY", 0.3, 1)]
        result = compute_correlation_adjusted_exposure(pos, bp, cm)
        assert result == pytest.approx(0.3)

    def test_two_correlated_positions(self):
        bp = BetaProvider()
        cm = CorrelationMatrix()
        pos = [
            Position("SPY", 0.3, 1),
            Position("QQQ", 0.3, 1),
        ]
        result = compute_correlation_adjusted_exposure(pos, bp, cm)
        w1 = 0.3 * 1.0
        w2 = 0.3 * 0.95
        expected = (w1 * w1 * 1.0 + w2 * w2 * 1.0 + 2 * w1 * w2 * 0.97) ** 0.5
        assert result == pytest.approx(expected)
