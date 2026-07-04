"""Scenario matrix for strategy_picker.py — 10 scenarios incl. edge cases."""

from underwriting import strategy_picker as sp


def top(facts):
    return sp.pick(facts)["recommendation"]


def entry(result, strategy):
    return next(e for e in result["ranked"] if e["strategy"] == strategy)


class TestScenarioMatrix:
    def test_1_no_equity_low_rate_arrears_is_subto(self):
        """Canonical sub-to: nothing to buy but the debt."""
        r = sp.pick({"value": 350_000, "loan_balance": 340_000,  # 2.9% equity
                     "loan_rate": 3.0, "loan_type": "conventional",
                     "piti": 1_900, "market_rent": 2_300, "condition": 3,
                     "signals": ["arrears", "absentee"]})
        assert r["recommendation"] == "subto"
        # S1(3)+S2(2)+S3(2)+S4(1) = 8
        assert entry(r, "subto")["score"] == 8
        assert not entry(r, "wholesale")["applicable"]      # equity < 15%
        assert not entry(r, "assumption")["applicable"]     # conventional

    def test_2_high_equity_distress_is_wholesale(self):
        """Fire-damaged, 85% equity absentee: classic assignment."""
        r = sp.pick({"value": 260_000, "loan_balance": 40_000,   # 84.6% equity
                     "loan_rate": 6.5, "loan_type": "conventional",
                     "condition": 1, "signals": ["fire_damage", "absentee"]})
        assert r["recommendation"] == "wholesale"
        assert entry(r, "wholesale")["score"] == 5          # W1(3)+W2(2)

    def test_3_va_275_2020_loan_is_assumption(self):
        """The spec's canonical case: VA 2.75% 2020 vintage."""
        r = sp.pick({"value": 455_000, "loan_balance": 400_000,  # gap 12.1%
                     "loan_rate": 2.75, "loan_type": "va",
                     "piti": 2_400, "market_rent": 2_600, "condition": 4,
                     "signals": ["job_relocation"]})
        assert r["recommendation"] == "assumption"
        # A1(3)+A2(2)+A3(1)+A4(2) = 8 beats subto S1(3)+S2(2)+S4(1) = 6
        assert entry(r, "assumption")["score"] == 8
        assert entry(r, "subto")["score"] == 6

    def test_4_free_and_clear_tired_landlord_is_seller_finance(self):
        r = sp.pick({"value": 400_000, "loan_balance": 0, "condition": 4,
                     "signals": ["tired_landlord"]})
        assert r["recommendation"] == "seller_finance"
        # F1(3)+F2(2)+F3(1)+F4(1) = 7
        assert entry(r, "seller_finance")["score"] == 7
        assert not entry(r, "subto")["applicable"]          # no debt
        assert not entry(r, "assumption")["applicable"]

    def test_5_zero_motivation_is_pass_even_if_shape_fits(self):
        """Great sub-to shape but NO motivation → pass outranks everything."""
        r = sp.pick({"value": 350_000, "loan_balance": 320_000,
                     "loan_rate": 3.0, "piti": 1_800, "market_rent": 2_300,
                     "condition": 4, "signals": []})
        assert r["recommendation"] == "pass"
        assert entry(r, "pass")["score"] > entry(r, "subto")["score"]

    def test_6_low_equity_high_rate_all_disqualified_is_pass(self):
        r = sp.pick({"value": 300_000, "loan_balance": 270_000,  # 10% equity
                     "loan_rate": 7.5, "loan_type": "conventional",
                     "signals": ["absentee"]})
        assert r["recommendation"] == "pass"
        for s in ("wholesale", "subto", "assumption", "seller_finance"):
            assert not entry(r, s)["applicable"], s

    def test_7_misfit_toy_scores_wholesale_with_citation(self):
        r = sp.pick({"value": 300_000, "loan_balance": 150_000,  # 50% equity
                     "condition": 3, "signals": ["non_conforming", "absentee"]})
        assert r["recommendation"] == "wholesale"
        w = entry(r, "wholesale")
        assert any(hit["rule"] == "W3" for hit in w["reasons"])
        assert any("misfit" in hit["why"].lower() for hit in w["reasons"])
        # non_conforming is a property flag, NOT motivation
        assert r["derived"]["motivation_count"] == 1

    def test_8_fha_low_rate_but_huge_gap_dq_assumption_sf_wins(self):
        r = sp.pick({"value": 500_000, "loan_balance": 140_000,  # 72% equity
                     "loan_rate": 3.0, "loan_type": "fha", "condition": 4,
                     "piti": 900, "market_rent": 2_400,
                     "signals": ["tired_landlord"]})
        assert r["recommendation"] == "seller_finance"
        a = entry(r, "assumption")
        assert not a["applicable"]
        assert any(d["rule"] == "A-DQ3" for d in a["disqualifiers"])  # 72% gap

    def test_9_negative_carry_disqualifies_subto(self):
        r = sp.pick({"value": 300_000, "loan_balance": 270_000,
                     "loan_rate": 3.5, "loan_type": "conventional",
                     "piti": 2_600, "market_rent": 2_200,  # 2600 > 2420
                     "signals": ["arrears"]})
        s = entry(r, "subto")
        assert not s["applicable"]
        assert any(d["rule"] == "S-DQ3" for d in s["disqualifiers"])
        assert r["recommendation"] == "pass"

    def test_10_empty_dict_is_forgiving(self):
        r = sp.pick({})
        assert r["recommendation"] == "pass"
        assert r["derived"]["equity_pct"] is None


class TestNormalization:
    def test_rate_percent_and_decimal_equivalent(self):
        a = sp.derive_facts({"loan_rate": 3.25})
        b = sp.derive_facts({"loan_rate": 0.0325})
        assert a["loan_rate"] == b["loan_rate"] == 3.25

    def test_condition_words(self):
        assert sp.derive_facts({"condition": "teardown"})["condition"] == 1
        assert sp.derive_facts({"condition": "Turnkey"})["condition"] == 5
        assert sp.derive_facts({"condition": "weird"})["condition"] is None

    def test_signal_normalization_and_unknowns(self):
        d = sp.derive_facts({"signals": ["Pre-Foreclosure", "ALIEN LANDING"]})
        assert "pre_foreclosure" in d["signals"]
        assert "alien_landing" in d["unrecognized_signals"]

    def test_arv_used_when_value_missing(self):
        d = sp.derive_facts({"arv": 200_000, "loan_balance": 100_000})
        assert d["equity_pct"] == 0.5


class TestAPIContract:
    """pick() must return ONE stable shape for messy-but-plausible inputs.

    Regression for a coordinator-verified failure (2026-07): these inputs
    used to derive loan_balance=0/motivation=0 (nested `loan` dict,
    `motivation_signals` key, direct `equity_pct`, and the 'relocation'
    alias were all silently ignored) and mis-ranked 'pass'.
    """

    MESSY_1 = {"equity_pct": 0.12,
               "loan": {"type": "VA", "rate": 2.75,
                        "origination_year": 2020, "balance": 310_000},
               "condition": 4, "motivation_signals": ["relocation"],
               "market_rate": 6.8}
    MESSY_2 = {"equity_pct": 0.12,
               "loan": {"type": "VA", "rate": 2.75,
                        "origination_year": 2020, "balance": 310_000},
               "condition": 4, "signals": ["relocation"],
               "market_rate": 6.8}
    MESSY_3 = {"equity_pct": "12%",
               "loan": {"type": "va", "rate": "2.75%", "balance": "$310,000"},
               "condition": "good", "signals": "relocation",  # bare string!
               "market_rate": "6.8"}

    def _assert_shape(self, r):
        assert isinstance(r, dict)
        assert isinstance(r["ranked"], list)          # ALWAYS a plain list
        assert r["ranked"][:3] and len(r["ranked"][:3]) == 3   # sliceable
        for e in r["ranked"]:
            assert isinstance(e, dict)
            for key in ("strategy", "score", "applicable", "reasons",
                        "disqualifiers", "next_action"):
                assert key in e, key
            assert isinstance(e["reasons"], list)
        assert r["recommendation"] == r["ranked"][0]["strategy"]
        assert isinstance(r["derived"], dict)

    def test_nested_loan_and_motivation_signals_key(self):
        r = sp.pick(self.MESSY_1)
        self._assert_shape(r)
        d = r["derived"]
        assert d["loan_type"] == "va" and d["loan_balance"] == 310_000
        assert d["equity_pct"] == 0.12
        assert "job_relocation" in d["signals"]        # relocation aliased
        assert d["motivation_count"] > 0
        # VA 2.75% + nonzero motivation must NOT rank pass first
        assert r["recommendation"] == "assumption"

    def test_signals_key_variant_same_result(self):
        r = sp.pick(self.MESSY_2)
        self._assert_shape(r)
        assert r["recommendation"] == "assumption"
        # identical economics → identical ranking either key spelling
        assert ([e["strategy"] for e in r["ranked"]]
                == [e["strategy"] for e in sp.pick(self.MESSY_1)["ranked"]])

    def test_string_rates_and_bare_signal_string(self):
        r = sp.pick(self.MESSY_3)
        self._assert_shape(r)
        d = r["derived"]
        assert d["loan_rate"] == 2.75 and d["market_rate"] == 6.8
        assert d["loan_balance"] == 310_000
        assert r["recommendation"] == "assumption"

    def test_unknown_signal_counts_as_generic_motivation(self):
        # novel detector label must not zero out to 'pass' — it contributes
        # 0.5 to motivation_count (2 known + 1 unknown = 2.5 here)
        r = sp.pick({"value": 260_000, "loan_balance": 40_000, "condition": 1,
                     "signals": ["alien_landing", "fire_damage", "absentee"]})
        assert r["derived"]["motivation_count"] == 2.5
        assert "alien_landing" in r["derived"]["unrecognized_signals"]
        assert r["recommendation"] == "wholesale"     # W1+W2 = 5 beats F1 = 3

    def test_non_dict_input_degrades_to_pass(self):
        for bad in (None, [], "house"):
            r = sp.pick(bad)
            self._assert_shape(r)
            assert r["recommendation"] == "pass"


class TestOutputContract:
    def test_every_entry_has_next_action_and_hitl_note(self):
        r = sp.pick({"value": 260_000, "loan_balance": 40_000, "condition": 1,
                     "signals": ["fire_damage", "absentee"]})
        assert all(e["next_action"] for e in r["ranked"])
        assert "HUMAN" in r["hitl_note"]

    def test_reasons_carry_citations(self):
        r = sp.pick({"value": 260_000, "loan_balance": 40_000, "condition": 1,
                     "signals": ["fire_damage", "absentee"]})
        for e in r["ranked"]:
            for reason in e["reasons"]:
                assert reason["cite"]

    def test_rule_table_renders(self):
        txt = sp.rule_table()
        assert "W1" in txt and "S-DQ3" in txt and "F1" in txt
