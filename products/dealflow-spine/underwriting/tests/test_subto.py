"""Known-answer tests for subto.py (hand-computed in comments)."""

from underwriting import subto, finance

# Reference deal, hand-computed:
#   value 340,000 | balance 280,000 @ 3.25% | PITI 1,650 (P&I 1,218.59)
#   rent 2,200 | arrears 8,000 | cash to seller 5,000 | closing 3,000
#   entry            = 8,000 + 5,000 + 3,000               = 16,000
#   reserves (15%)   = 2,200 * 0.15                        = 330
#   cash flow        = 2,200 - 330 - 1,650                 = 220 /mo
#   DSCR             = (2,200 - 330) / 1,650               = 1.1333
#   equity capture   = 340,000 - 280,000 - 16,000          = 44,000
#   cash-on-cash     = 220*12 / 16,000                     = 0.165
DEAL = {
    "value": 340_000, "loan_balance": 280_000, "loan_rate": 3.25,
    "piti": 1_650, "p_and_i": 1_218.59, "market_rent": 2_200,
    "arrears": 8_000, "cash_to_seller": 5_000, "closing_costs": 3_000,
}


class TestAnalyze:
    def test_entry_and_cashflow(self):
        r = subto.analyze(DEAL)
        assert r["entry_cost"] == 16_000
        assert abs(r["monthly_cash_flow"] - 220) < 0.01
        assert abs(r["dscr"] - 1.13333) < 0.001
        assert r["equity_capture"] == 44_000
        assert abs(r["cash_on_cash"] - 0.165) < 0.0001

    def test_rate_accepts_percent_or_decimal(self):
        a = subto.analyze({**DEAL, "loan_rate": 3.25})
        b = subto.analyze({**DEAL, "loan_rate": 0.0325})
        assert a["exits"]["hold"] == b["exits"]["hold"]

    def test_missing_keys_tolerated(self):
        r = subto.analyze({})
        assert r["entry_cost"] == 0 and r["dscr"] is None


class TestRiskFlags:
    def test_due_on_sale_always_flagged(self):
        flags = {f["flag"] for f in subto.analyze(DEAL)["risk_flags"]}
        assert "due_on_sale" in flags
        assert "reinstatement" in flags       # arrears > 0
        assert "low_dscr" in flags            # 1.133 < 1.20
        # 220/mo is under the 200 threshold? No: 220 >= 200 → not thin
        assert "thin_cash_flow" not in flags

    def test_negative_carry_is_fatal(self):
        r = subto.analyze({**DEAL, "piti": 2_600})
        # 2,200 - 330 - 2,600 = -730
        neg = [f for f in r["risk_flags"] if f["flag"] == "negative_cash_flow"]
        assert neg and neg[0]["severity"] == "fatal"

    def test_balloon_and_va_flags(self):
        r = subto.analyze({**DEAL, "balloon_months": 36, "loan_type": "va"})
        flags = {f["flag"] for f in r["risk_flags"]}
        assert "balloon" in flags and "va_entitlement" in flags


class TestExits:
    def test_flip_profit(self):
        # resale 340,000 - selling 7% (23,800) - balance 280,000 - entry 16,000
        # = 20,200
        r = subto.analyze(DEAL)
        assert abs(r["exits"]["flip"]["profit"] - 20_200) < 0.01

    def test_hold_paydown(self):
        # month-1 interest = 280,000 * 0.0325/12 = 758.33
        # month-1 principal = 1,218.59 - 758.33 = 460.26
        r = subto.analyze(DEAL)
        assert abs(r["exits"]["hold"]["first_month_principal_paydown"] - 460.26) < 0.5

    def test_wrap_exit(self):
        # wrap: sell 320,000 with 20,000 down → 300,000 note @ 8.5% / 360mo
        # standard tables: payment = 2,306.74
        # spread = 2,306.74 - 1,650 = 656.74 | cash at close = 20,000-16,000
        r = subto.analyze({**DEAL, "wrap_price": 320_000, "wrap_down": 20_000,
                           "wrap_rate": 8.5, "wrap_term_months": 360})
        w = r["exits"]["wrap"]
        assert abs(w["wrap_p_and_i"] - 2_306.74) < 0.5
        assert abs(w["monthly_spread"] - 656.74) < 0.5
        assert w["cash_at_close"] == 4_000


class TestFinancePrimitives:
    def test_monthly_payment_known_answer(self):
        # 280,000 @ 3.25% / 360 mo = 1,218.59 (standard mortgage tables)
        assert abs(finance.monthly_payment(280_000, 0.0325, 360) - 1_218.59) < 0.5

    def test_zero_rate(self):
        assert finance.monthly_payment(120_000, 0.0, 120) == 1_000

    def test_remaining_balance_endpoints(self):
        assert abs(finance.remaining_balance(280_000, 0.0325, 360, 0) - 280_000) < 0.01
        assert finance.remaining_balance(280_000, 0.0325, 360, 360) == 0.0
