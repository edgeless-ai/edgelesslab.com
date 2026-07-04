"""Routing, candidate emission, and digest tests."""

from spine_test_utils import FIXED_NOW, make_signal

from spine.criteria import BuyBox
from spine.merge import merge_signals
from spine.route import (
    Route,
    build_candidates,
    load_candidates,
    recommend_strategy,
    render_digest,
    write_candidates,
    write_digest,
)

BOX = BuyBox({
    "name": "test-box",
    "geo": {"states": ["FL"], "zips": ["339*"]},
    "price_band": {"min": 60000, "max": 600000},
    "min_signal_count": 2,
})

GOOD_FACTS = {"estimated_value": 250000, "property_type": "single_family"}
RECENT = "2026-07-01T00:00:00+00:00"


def _candidates(signals):
    records = merge_signals(signals)
    return build_candidates(records, BOX, now=FIXED_NOW)


def test_hot_needs_stack_plus_box_fit():
    cands = _candidates([
        make_signal(id="a", observed_at=RECENT, evidence=GOOD_FACTS),
        make_signal(id="b", signal_type="code_violation", observed_at=RECENT),
    ])
    assert cands[0].route == Route.HOT.value


def test_single_signal_in_box_is_warm_not_hot():
    """The box demands 2+ signals, but a single-signal record that otherwise
    fits must land WARM (routing owns the stacking rule, not the box)."""
    cands = _candidates([
        make_signal(id="a", observed_at=RECENT, confidence=0.9, evidence=GOOD_FACTS),
    ])
    assert cands[0].route == Route.WARM.value


def test_stacked_but_out_of_box_is_watch():
    cands = _candidates([
        make_signal(id="a", observed_at=RECENT,
                    evidence={"estimated_value": 1250000}),  # price miss
        make_signal(id="b", signal_type="code_violation", observed_at=RECENT),
    ])
    assert cands[0].route == Route.WATCH.value


def test_geo_miss_discards_regardless_of_score():
    cands = _candidates([
        make_signal(id="a", observed_at=RECENT, confidence=1.0,
                    property={"state": "OH", "zip": "45503"}),
        make_signal(id="b", signal_type="pre_foreclosure", observed_at=RECENT,
                    confidence=1.0, property={"state": "OH", "zip": "45503"}),
    ])
    assert cands[0].route == Route.DISCARD.value


def test_below_floor_discards():
    cands = _candidates([
        make_signal(id="a", signal_type="other", observed_at="2026-01-01T00:00:00+00:00",
                    confidence=0.05, evidence=GOOD_FACTS),
    ])
    assert cands[0].route == Route.DISCARD.value


def test_candidates_sorted_hot_first_then_score():
    cands = _candidates([
        # hot
        make_signal(id="h1", observed_at=RECENT, evidence=GOOD_FACTS),
        make_signal(id="h2", signal_type="code_violation", observed_at=RECENT),
        # warm (different property)
        make_signal(id="w1", observed_at=RECENT, confidence=0.9,
                    property={"address": "77 Warm Way"}, evidence=GOOD_FACTS),
        # discard (different property, out of state)
        make_signal(id="d1", observed_at=RECENT,
                    property={"address": "9 Ohio St", "state": "OH", "zip": "45503"}),
    ])
    assert [c.route for c in cands] == ["hot", "warm", "discard"]


def test_recommended_strategy_priority_and_stack_prefix():
    single = merge_signals([make_signal(id="a", signal_type="assumable_loan")])[0]
    assert "assumption" in recommend_strategy(single)
    stacked = merge_signals([
        make_signal(id="a", signal_type="assumable_loan"),
        make_signal(id="b", signal_type="pre_foreclosure"),
    ])[0]
    strat = recommend_strategy(stacked)
    assert strat.startswith("stacked distress (2 signals)")
    assert "pre-foreclosure" in strat  # higher priority headline wins


def test_candidate_snapshot_roundtrip_and_rewrite(tmp_path):
    cands = _candidates([
        make_signal(id="a", observed_at=RECENT, evidence=GOOD_FACTS),
        make_signal(id="b", signal_type="code_violation", observed_at=RECENT),
    ])
    path = tmp_path / "candidates.jsonl"
    write_candidates(cands, path)
    write_candidates(cands, path)  # snapshot semantics: rewrite, not append
    loaded = load_candidates(path)
    assert len(loaded) == len(cands) == 1
    assert loaded[0].to_dict() == cands[0].to_dict()


def test_digest_render_and_write(tmp_path):
    cands = _candidates([
        make_signal(id="a", observed_at=RECENT, evidence=GOOD_FACTS),
        make_signal(id="b", signal_type="code_violation", observed_at=RECENT),
        make_signal(id="d1", observed_at=RECENT,
                    property={"address": "9 Ohio St", "state": "OH", "zip": "45503"}),
    ])
    text = render_digest(cands, buybox_name="test-box", now=FIXED_NOW)
    assert "123 Main St" in text          # hot table
    assert "stack_bonus" in text          # receipts printed for hot
    assert "9 Ohio St" in text            # discard listed with reason
    assert "hot: **1**" in text

    dated = write_digest(cands, digest_dir=tmp_path, buybox_name="test-box", now=FIXED_NOW)
    assert dated.name == "digest-2026-07-04.md"
    assert (tmp_path / "digest-latest.md").read_text() == dated.read_text()
