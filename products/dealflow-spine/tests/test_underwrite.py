"""Picker-integration tests: spine candidates -> underwriting.strategy_picker.

Hermetic: tmp dirs, zero network, fixed clock (fixtures via tmp_adapters_dir).
"""

import json

from spine_test_utils import FIXED_NOW, make_signal

from spine.criteria import BuyBox
from spine.merge import merge_signals
from spine.pipeline import Paths, run_pipeline
from spine.route import build_candidates, load_candidates
from spine.underwrite import (
    picker_facts,
    top_reason,
    underwrite_candidate,
    underwrite_candidates,
)

BOX = BuyBox({
    "name": "lee-county-fl-default",
    "geo": {"states": ["FL"], "zips": ["339*"], "counties": ["LEE"]},
    "price_band": {"min": 60000, "max": 600000},
    "min_equity_pct": 0.2,
    "property_types": ["single_family", "duplex", "triplex", "quadplex", "mobile_home"],
    "min_signal_count": 2,
    "unknown_policy": "lenient",
})

VERDICT_KEYS = {"recommendation", "ranked_top3", "hitl_note"}


def _candidates_from(signals):
    return build_candidates(merge_signals(signals), BOX, now=FIXED_NOW)


# ---------------------------------------------------------------- pipeline ----

def test_pipeline_attaches_verdicts_to_hot_and_warm(tmp_adapters_dir, tmp_path):
    paths = Paths(root=tmp_path, adapters_dir=tmp_adapters_dir,
                  data_dir=tmp_path / "data")
    result = run_pipeline(paths=paths, buybox=BOX, now=FIXED_NOW)

    hot_warm = [c for c in result.candidates if c.route in ("hot", "warm")]
    assert hot_warm and result.underwritten == len(hot_warm)
    for c in hot_warm:
        uw = c.underwriting
        assert uw is not None and set(uw) == VERDICT_KEYS
        assert 1 <= len(uw["ranked_top3"]) <= 3
        assert uw["recommendation"] == uw["ranked_top3"][0]["strategy"]
        assert "HUMAN" in uw["hitl_note"]
    # watch/discard candidates are NOT underwritten
    for c in result.candidates:
        if c.route in ("watch", "discard"):
            assert c.underwriting is None

    # the verdict survives the JSONL snapshot round-trip
    reloaded = load_candidates(paths.candidates)
    hot = [c for c in reloaded if c.route == "hot"]
    assert hot and all(c.underwriting is not None for c in hot)
    with paths.candidates.open() as f:
        rows = [json.loads(line) for line in f if line.strip()]
    assert any(isinstance(r.get("underwriting"), dict) for r in rows)


def test_digest_hot_section_shows_strategy_and_top_reason(tmp_adapters_dir, tmp_path):
    paths = Paths(root=tmp_path, adapters_dir=tmp_adapters_dir,
                  data_dir=tmp_path / "data")
    result = run_pipeline(paths=paths, buybox=BOX, now=FIXED_NOW)

    text = (paths.data_dir / "digest-latest.md").read_text()
    hot_section = text.split("## 🌤 Warm")[0]
    assert "Underwrite |" in hot_section          # hot table column
    assert "- Underwrite: **" in hot_section      # receipts line
    for c in result.candidates:
        if c.route == "hot":
            assert f"**{c.underwriting['recommendation']}**" in hot_section
            reason = top_reason(c.underwriting)
            assert reason and reason in hot_section


# --------------------------------------------------------------- fact map ----

def test_va_loanish_candidate_gets_assumption_ranked():
    """Low equity + assumable VA note deep below market -> assumption on top."""
    signals = [
        make_signal(id="va-1", signal_type="assumable_loan",
                    evidence={"loan_program": "VA", "note_rate": 2.75,
                              "loan_amount": 265000,
                              "estimated_value": 300000,
                              "property_type": "single_family",
                              "county": "LEE"}),
        make_signal(id="td-1", signal_type="tax_delinquent",
                    evidence={"amount_due": 5200, "county": "LEE"}),
    ]
    cand = _candidates_from(signals)[0]
    assert cand.route == "hot"

    verdict = underwrite_candidate(cand)
    strategies = [e["strategy"] for e in verdict["ranked_top3"]]
    assert "assumption" in strategies
    assumption = next(e for e in verdict["ranked_top3"]
                      if e["strategy"] == "assumption")
    assert assumption["applicable"] and assumption["score"] > 0
    assert verdict["recommendation"] == "assumption"


def test_picker_facts_mapping_is_deliberate():
    signals = [
        make_signal(id="a", signal_type="code_violation",
                    evidence={"estimated_value": 285000, "equity_pct": 0.55,
                              "absentee_owner": True, "county": "LEE"}),
        make_signal(id="b", signal_type="fema_disaster"),
        make_signal(id="c", signal_type="other",
                    evidence={"_original_signal_type": "fsbo"}),
    ]
    cand = _candidates_from(signals)[0]
    facts = picker_facts(cand)

    # signal vocabulary mapped; absentee fact folded in
    assert set(facts["signals"]) == {"code_violations", "insurance_gap",
                                     "fsbo", "absentee"}
    # equity 0.55 on a 285k value -> implied balance passes the same debt
    # picture the buy-box saw
    assert facts["value"] == 285000
    assert abs(facts["loan_balance"] - 285000 * 0.45) < 1e-6


def test_picker_facts_withholds_value_when_debt_unknown():
    """No balance evidence + no equity fact -> value withheld so the picker
    never scores an unknown debt picture as free-and-clear."""
    from underwriting import strategy_picker

    signals = [make_signal(id="a", evidence={"estimated_value": 200000})]
    cand = _candidates_from(signals)[0]
    facts = picker_facts(cand)
    assert "value" not in facts and "loan_balance" not in facts

    result = strategy_picker.pick(facts)
    seller_finance = next(e for e in result["ranked"]
                          if e["strategy"] == "seller_finance")
    assert not any(r["rule"] == "F2" for r in seller_finance["reasons"])
    # single weak signal, nothing else known -> honest 'pass'
    assert result["recommendation"] == "pass"


def test_underwrite_candidates_returns_count_and_skips_cold_routes():
    signals = [
        make_signal(id="a"),
        make_signal(id="b", signal_type="code_violation"),
        make_signal(id="oh", property={"address": "9 Ohio St", "state": "OH",
                                       "zip": "45503", "city": "Springfield"}),
    ]
    cands = _candidates_from(signals)
    routes = {c.route for c in cands}
    assert "hot" in routes and "discard" in routes
    n = underwrite_candidates(cands)
    assert n == sum(1 for c in cands if c.route in ("hot", "warm"))
    assert all((c.underwriting is None) == (c.route not in ("hot", "warm"))
               for c in cands)


# -------------------------------------------------------------------- cli ----

def test_cli_underwrite_command(tmp_adapters_dir, tmp_path, capsys):
    import cli

    data_dir = tmp_path / "data"
    base = ["--config", str(cli.ROOT / "config" / "buybox.json"),
            "--data-dir", str(data_dir),
            "--adapters-dir", str(tmp_adapters_dir)]
    assert cli.main(base + ["run"]) == 0
    assert cli.main(base + ["underwrite"]) == 0
    out = capsys.readouterr().out
    assert "underwrote" in out and "->" in out

    reloaded = load_candidates(data_dir / "candidates.jsonl")
    assert any(c.underwriting for c in reloaded)
