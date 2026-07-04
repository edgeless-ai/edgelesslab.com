"""Known-answer tests for assumption.py (hand-computed in comments)."""

from underwriting import assumption

# Canonical case: 2020-vintage VA loan
#   balance 400,000 @ 2.75%, 300 months remaining, price 460,000, market 7%
#   current payment: 400,000 @ 2.75%/300  = 1,845.25  (annuity formula)
#   market payment : 400,000 @ 7.00%/300  = 2,827.13
#   monthly savings                        = 981.88
#   equity gap = 460,000 - 400,000         = 60,000  (13.04% of price)
#   NPV @ 5%/yr over 60 mo: 981.88 * 52.9896 = 52,029  (annuity factor
#     (1-(1+0.05/12)^-60)/(0.05/12) = 52.9896)
VA_DEAL = {
    "loan_type": "va", "loan_balance": 400_000, "loan_rate": 2.75,
    "remaining_term_months": 300, "price": 460_000, "market_rate": 7.0,
    "hold_months": 60, "discount_rate": 0.05,
}


class TestVAAssumption:
    def test_payments_and_savings(self):
        r = assumption.analyze(VA_DEAL)
        assert r["assumable"] is True
        assert abs(r["current_payment"] - 1_845.25) < 1.0
        assert abs(r["market_payment"] - 2_827.13) < 1.0
        assert abs(r["monthly_savings"] - 981.88) < 2.0
        assert abs(r["rate_delta"] - 0.0425) < 1e-9

    def test_equity_gap(self):
        r = assumption.analyze(VA_DEAL)
        assert r["equity_gap"] == 60_000
        assert abs(r["equity_gap_pct"] - 60_000 / 460_000) < 1e-9
        assert r["gap_financing"]["tier"] == "fundable"  # 13.04% <= 15%

    def test_npv_of_savings(self):
        r = assumption.analyze(VA_DEAL)
        assert abs(r["npv_savings"] - 52_029) < 100

    def test_va_checklist_mentions_entitlement(self):
        r = assumption.analyze(VA_DEAL)
        text = " ".join(r["buyer_qualification_checklist"]).lower()
        assert "entitlement" in text and "funding fee" in text


class TestGapTiers:
    def test_stretch_gap(self):
        # gap 100,000 on 500,000 price = 20% → stretch (15% < 20% <= 25%)
        r = assumption.analyze({**VA_DEAL, "loan_balance": 400_000,
                                "price": 500_000})
        assert r["gap_financing"]["tier"] == "stretch"

    def test_hard_gap(self):
        # gap 200,000 on 600,000 = 33.3% → hard
        r = assumption.analyze({**VA_DEAL, "price": 600_000})
        assert r["gap_financing"]["tier"] == "hard"


class TestNonAssumable:
    def test_conventional_not_assumable(self):
        r = assumption.analyze({**VA_DEAL, "loan_type": "conventional"})
        assert r["assumable"] is False
        assert "not assumable" in " ".join(r["mechanics"]).lower()

    def test_fha_assumable_with_creditworthiness(self):
        r = assumption.analyze({**VA_DEAL, "loan_type": "fha"})
        assert r["assumable"] is True
        assert "creditworthiness" in " ".join(r["mechanics"]).lower()


class TestForgivingInput:
    def test_empty_dict_no_crash(self):
        r = assumption.analyze({})
        assert r["assumable"] is False and r["current_payment"] == 0.0

    def test_decimal_rate_accepted(self):
        a = assumption.analyze(VA_DEAL)
        b = assumption.analyze({**VA_DEAL, "loan_rate": 0.0275, "market_rate": 0.07})
        assert abs(a["monthly_savings"] - b["monthly_savings"]) < 1e-6
