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


class TestUnknownBalance:
    """H3 regressions (adversarial review 2026-07-04): a MISSING loan balance
    is UNKNOWN, not zero debt. The picker used to derive balance=0 whenever
    the caller omitted it, mint equity_pct=1.0 (overriding the caller's
    stated 10%), and recommend seller finance with the reason 'Free and
    clear: ... no underlying lien' on a property the caller said is 90%
    levered."""

    REVIEW_REPRO = {"value": 400_000, "equity_pct": 0.10,
                    "signals": ["probate", "arrears"]}

    def test_unknown_balance_is_not_free_and_clear(self):
        r = sp.pick(self.REVIEW_REPRO)
        d = r["derived"]
        assert d["balance_known"] is False
        assert d["equity_pct"] == 0.10          # caller's number is authoritative
        sf = entry(r, "seller_finance")
        assert not any(hit["rule"] == "F2" for hit in sf["reasons"])
        assert not sf["applicable"]             # F-DQ1: stated equity < 30%
        assert r["recommendation"] != "seller_finance"
        # sub-to must not be DQ'd for "No existing debt" either — unknown != 0
        s = entry(r, "subto")
        assert not any(dq["rule"] == "S-DQ1" for dq in s["disqualifiers"])

    def test_caller_equity_authoritative_when_balance_missing(self):
        """value present + balance missing is exactly the case where value
        and balance CAN'T derive equity — the stated fraction wins."""
        d = sp.derive_facts({"value": 500_000, "equity_pct": 0.40})
        assert d["balance_known"] is False
        assert d["equity_pct"] == 0.40
        # but a KNOWN balance still derives (more accurate than a stated pct)
        d2 = sp.derive_facts({"value": 500_000, "loan_balance": 250_000,
                              "equity_pct": 0.40})
        assert d2["balance_known"] is True
        assert d2["equity_pct"] == 0.50

    def test_free_and_clear_requires_affirmative_knowledge(self):
        # explicit zero balance -> free and clear (F2 fires)
        explicit = sp.pick({"value": 400_000, "loan_balance": 0,
                            "condition": 4, "signals": ["tired_landlord"]})
        assert explicit["derived"]["balance_known"] is True
        assert any(hit["rule"] == "F2"
                   for hit in entry(explicit, "seller_finance")["reasons"])
        # the free_and_clear fact is equivalent to an explicit 0
        fact = sp.pick({"value": 400_000, "free_and_clear": True,
                        "condition": 4, "signals": ["tired_landlord"]})
        assert fact["derived"]["balance_known"] is True
        assert fact["derived"]["loan_balance"] == 0.0
        assert fact["recommendation"] == explicit["recommendation"] == "seller_finance"


class TestNegativeEquity:
    """M6 regressions (adversarial review 2026-07-04): underwater loans
    (equity < 0) used to sail through A2 — max(0, value-balance) clamped the
    gap to 0, so the picker ranked assumption #1 with the reason 'bridgeable
    with a normal down payment' on a deal where the buyer would overpay
    principal vs value. Domain rule now explicit: underwater is a DQ (A-DQ4)
    UNLESS the coupon's rate-savings NPV strictly exceeds the negative
    equity (A5) — an underwater FHA/VA with a big enough rate delta is still
    economically assumable."""

    def _rule(self, rid):
        return next(r for r in sp.RULES if r.id == rid)

    def test_underwater_low_delta_is_disqualified(self):
        """Clear DQ: $50k underwater, 1.5% delta -> NPV ~ $18k < $50k."""
        r = sp.pick({"value": 300_000, "loan_balance": 350_000,
                     "loan_type": "va", "loan_rate": 5.5,
                     "signals": ["divorce"]})
        a = entry(r, "assumption")
        assert not a["applicable"]
        assert any(d["rule"] == "A-DQ4" for d in a["disqualifiers"])
        assert not any(hit["rule"] == "A2" for hit in a["reasons"])
        assert r["recommendation"] != "assumption"
        assert r["derived"]["underwater"] is True
        assert r["derived"]["negative_equity"] == 50_000

    def test_underwater_big_delta_survives_via_npv_exception(self):
        """$20k underwater VA at 2.5% in a 7% market: NPV of savings ~ $46k
        covers the shortfall — still assumable, but the WHY must say
        underwater, never 'bridgeable gap'."""
        r = sp.pick({"value": 300_000, "loan_balance": 320_000,
                     "loan_type": "va", "loan_rate": 2.5,
                     "signals": ["divorce"]})
        a = entry(r, "assumption")
        assert a["applicable"]
        rules_hit = {hit["rule"] for hit in a["reasons"]}
        assert "A5" in rules_hit and "A2" not in rules_hit
        assert r["recommendation"] == "assumption"   # A1+A3+A4 still stand
        d = r["derived"]
        assert d["negative_equity"] == 20_000
        assert d["npv_rate_savings"] > d["negative_equity"]
        # A5 is explanatory, not a bonus: weight 0
        a5 = next(hit for hit in a["reasons"] if hit["rule"] == "A5")
        assert a5["weight"] == 0

    def test_review_m6_repro_is_explicitly_handled(self):
        """The review's exact repro (value 300k, balance 350k, VA 2.5%).
        Its NPV sits ~0.2% ABOVE the $50k shortfall, so applicability is a
        genuine judgment call the numbers happen to win — what the finding
        actually demands is that A2's false 'bridgeable' reason is gone and
        the underwater state is named either way."""
        r = sp.pick({"value": 300_000, "loan_balance": 350_000,
                     "loan_type": "va", "loan_rate": 2.5,
                     "signals": ["divorce"]})
        a = entry(r, "assumption")
        hits = ({h["rule"] for h in a["reasons"]}
                | {d["rule"] for d in a["disqualifiers"]})
        assert "A2" not in hits
        assert hits & {"A5", "A-DQ4"}                # underwater named
        assert r["derived"]["underwater"] is True

    def test_boundary_balance_equals_value_is_not_underwater(self):
        """equity == 0 exactly: gap is genuinely zero, A2 legitimately
        fires, no underwater machinery."""
        d = sp.derive_facts({"value": 300_000, "loan_balance": 300_000,
                             "loan_type": "va", "loan_rate": 2.5})
        assert d["underwater"] is False and d["negative_equity"] == 0.0
        assert self._rule("A2").test(d)
        assert not self._rule("A-DQ4").test(d)
        assert not self._rule("A5").test(d)

    def test_boundary_npv_exactly_equal_is_still_dq(self):
        """'Exceeds' is strict: at NPV == shortfall the buyer takes
        assumption friction and DOS-free paperwork for zero gain."""
        d = sp.derive_facts({"value": 300_000, "loan_balance": 350_000,
                             "loan_type": "va", "loan_rate": 2.5})
        d["npv_rate_savings"] = d["negative_equity"]   # forced boundary
        assert self._rule("A-DQ4").test(d)
        assert not self._rule("A5").test(d)

    def test_underwater_with_unknowable_npv_is_dq(self):
        """No rate -> NPV unverifiable -> the exception can't be claimed."""
        r = sp.pick({"value": 300_000, "loan_balance": 350_000,
                     "loan_type": "va", "signals": ["divorce"]})
        a = entry(r, "assumption")
        assert not a["applicable"]
        assert any(d["rule"] == "A-DQ4" for d in a["disqualifiers"])
        assert r["derived"]["npv_rate_savings"] is None

    def test_stated_negative_equity_without_balance_counts(self):
        """Caller states equity_pct=-0.10 with the balance unknown: underwater
        anyway (dollars derived from value), and the clamped gap must not
        resurrect A2."""
        d = sp.derive_facts({"value": 400_000, "equity_pct": -0.10,
                             "loan_type": "fha", "loan_rate": 2.75})
        assert d["underwater"] is True
        assert d["negative_equity"] == 40_000
        assert not self._rule("A2").test(d)
        # balance unknown -> savings NPV can't be computed -> DQ path
        assert d["npv_rate_savings"] is None
        assert self._rule("A-DQ4").test(d)

    def test_m6_rules_cite_the_review(self):
        for rid in ("A5", "A-DQ4"):
            assert self._rule(rid).cite == sp.CITE_M6
        # and the citation reaches the output payload
        r = sp.pick({"value": 300_000, "loan_balance": 320_000,
                     "loan_type": "va", "loan_rate": 2.5,
                     "signals": ["divorce"]})
        a5 = next(hit for hit in entry(r, "assumption")["reasons"]
                  if hit["rule"] == "A5")
        assert "adversarial-review-2026-07-04" in a5["cite"]

    def test_npv_convention_matches_assumption_analyze(self):
        """The picker's gate and assumption.analyze() must not disagree about
        the savings NPV (same balance/term/hold/discount)."""
        from underwriting import assumption
        facts = {"value": 300_000, "loan_balance": 320_000,
                 "loan_type": "va", "loan_rate": 2.5}
        d = sp.derive_facts(facts)
        full = assumption.analyze(facts)
        assert abs(d["npv_rate_savings"] - full["npv_savings"]) < 1e-6


class TestNormalization:
    def test_rate_percent_and_decimal_equivalent(self):
        a = sp.derive_facts({"loan_rate": 3.25})
        b = sp.derive_facts({"loan_rate": 0.0325})
        assert a["loan_rate"] == b["loan_rate"] == 3.25

    def test_rate_convention_shared_with_calculators(self):
        """M5 regression (adversarial review 2026-07-04): the picker read
        loan_rate=1.0 as 1%/yr while subto read the same field as 100%/yr
        (wrap P&I $24k/mo on a $290k note). One shared convention now lives
        in finance.normalize_rate: >= 0.25 is percent form, < 0.25 decimal."""
        from underwriting import assumption, finance, subto

        # picker and both calculators agree at the old 1.0 boundary
        assert sp.derive_facts({"loan_rate": 1.0})["loan_rate"] == 1.0   # 1%/yr
        assert subto._norm_rate(1.0) == 0.01
        assert assumption._norm_rate(1.0) == 0.01
        # 0.9 is a teaser/ARM floor (0.9%/yr), not a 90% note
        assert subto._norm_rate(0.9) == finance.normalize_rate(0.9)
        assert abs(subto._norm_rate(0.9) - 0.009) < 1e-12
        assert sp.derive_facts({"loan_rate": 0.9})["loan_rate"] == 0.9
        # boundary semantics: 0.25 is percent form, just below is decimal
        assert finance.normalize_rate(0.25) == 0.0025
        assert finance.normalize_rate(0.2499) == 0.2499
        # unambiguous forms unchanged
        assert finance.normalize_rate(2.75) == 0.0275
        assert finance.normalize_rate(0.0275) == 0.0275
        assert finance.normalize_rate(8.5) == 0.085
        assert finance.normalize_rate(None) is None
        assert finance.normalize_rate(0) == 0.0
        assert finance.normalize_rate(float("nan")) is None

    def test_wrap_exit_sane_at_rate_one(self):
        """The concrete M5 blowup: wrap_rate=1.0 produced a $24,166/mo wrap
        P&I (100%/yr). It now reads as 1%/yr."""
        from underwriting import subto

        wrap = subto.wrap_exit({"wrap_price": 310_000, "wrap_down": 20_000,
                                "wrap_rate": 1.0, "piti": 1_500}, 10_000)
        assert wrap["wrap_p_and_i"] < 1_500  # ~$933/mo at 1% — not $24k

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
