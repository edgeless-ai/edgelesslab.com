from underwriting.finance import normalize_rate

class TestNormalizeRateStrings:
    """Regression: string rates crashed normalize_rate after the M5
    consolidation (orchestrator spot-check, 2026-07-04). The pre-M5
    subto._norm_rate accepted "2.75%" — the shared helper must too."""

    def test_percent_string(self):
        assert abs(normalize_rate("2.75%") - 0.0275) < 1e-12

    def test_bare_numeric_string(self):
        assert abs(normalize_rate("6.8") - 0.068) < 1e-12

    def test_percent_marker_bypasses_boundary(self):
        # "0.2%" is explicitly percent-form even though 0.2 < 0.25
        assert abs(normalize_rate("0.2%") - 0.002) < 1e-12

    def test_messy_string(self):
        assert abs(normalize_rate(" 2,75".replace(",", ".") + " ") - 0.0275) < 1e-12

    def test_garbage_string(self):
        assert normalize_rate("call for rate") is None
