"""Known-answer tests for wholesale.py (all hand-computed in comments)."""

from underwriting import wholesale


class TestMAO:
    def test_classic_70_rule(self):
        # ARV 300,000 * 0.70 = 210,000; - 40,000 repairs - 10,000 fee = 160,000
        assert wholesale.mao(300_000, 40_000, margin=0.30, wholesale_fee=10_000) == 160_000

    def test_light_rehab_25_margin(self):
        # ARV 500,000 * 0.75 = 375,000; - 0 repairs - 15,000 fee = 360,000
        assert wholesale.mao(500_000, 0, margin=0.25, wholesale_fee=15_000) == 360_000

    def test_mao_can_go_negative(self):
        # ARV 100,000 * 0.70 = 70,000; - 80,000 repairs = -10,000 (a real signal!)
        assert wholesale.mao(100_000, 80_000) == -10_000


class TestCompAdjustments:
    def test_adjust_comp_hand_case(self):
        # comp sold 310,000; subject +200sqft @ $110 = +22,000; subject worse
        # condition = -15,000 → adjusted = 310,000 + 7,000 = 317,000
        r = wholesale.adjust_comp(310_000, {"sqft": 22_000, "condition": -15_000})
        assert r["adjusted_price"] == 317_000
        assert r["net_adjustment"] == 7_000
        assert r["gross_adjustment"] == 37_000
        assert r["reliable"] is True  # 37,000 <= 25% of 310,000 (77,500)

    def test_unreliable_when_gross_adjustment_huge(self):
        r = wholesale.adjust_comp(200_000, {"gut_rehab": 60_000})
        assert r["reliable"] is False  # 60,000 > 50,000 (25% of 200,000)

    def test_sqft_adjustment_sign(self):
        # subject 1,700 vs comp 1,500 @ $110 → +22,000 (subject superior)
        assert wholesale.sqft_adjustment(1_700, 1_500, 110) == 22_000

    def test_arv_from_comps_median_ppsf(self):
        # comp A: 300,000 / 1,500 = 200/sqft
        # comp B: 330,000 / 1,650 = 200/sqft
        # comp C: (352,000 - 32,000) / 1,600 = 200/sqft
        # median 200/sqft * subject 1,550 sqft = 310,000
        comps = [
            {"sale_price": 300_000, "sqft": 1_500},
            {"sale_price": 330_000, "sqft": 1_650},
            {"sale_price": 352_000, "sqft": 1_600, "adjustments": {"pool": -32_000}},
        ]
        r = wholesale.arv_from_comps(1_550, comps)
        assert abs(r["arv"] - 310_000) < 0.01
        assert r["median_adjusted_ppsf"] == 200


class TestAssignment:
    def test_scenarios_viability(self):
        # buyer ceiling = 300,000*0.70 - 40,000 = 170,000; contract at 155,000
        # fee 10,000 → buyer pays 165,000 <= 170,000 viable (headroom 5,000)
        # fee 20,000 → buyer pays 175,000 > 170,000 NOT viable (headroom -5,000)
        rows = wholesale.assignment_scenarios(155_000, 300_000, 40_000,
                                              fees=(10_000, 20_000))
        assert rows[0]["viable"] and rows[0]["buyer_headroom"] == 5_000
        assert not rows[1]["viable"] and rows[1]["buyer_headroom"] == -5_000

    def test_max_assignment_fee(self):
        # 170,000 ceiling - 155,000 contract = 15,000
        assert wholesale.max_assignment_fee(155_000, 300_000, 40_000) == 15_000


class TestSensitivity:
    def test_grid_shape_and_corners(self):
        t = wholesale.sensitivity_table(300_000, 40_000, margin=0.30,
                                        wholesale_fee=10_000)
        assert len(t["grid"]) == 3 and all(len(row) == 5 for row in t["grid"])
        # base case (repairs x1.00 row index 1, ARV x1.00 col index 2) = 160,000
        assert t["grid"][1][2] == 160_000
        # stress: ARV 270,000*0.7=189,000 - repairs 50,000 - 10,000 = 129,000
        assert t["stress_mao"] == 129_000
        assert t["grid"][2][0] == 129_000
        # best: ARV 330,000*0.7=231,000 - 30,000 - 10,000 = 191,000
        assert abs(t["grid"][0][4] - 191_000) < 0.01

    def test_format_renders(self):
        t = wholesale.sensitivity_table(300_000, 40_000)
        txt = wholesale.format_sensitivity_table(t)
        assert "ARV" in txt and txt.count("\n") >= 4
