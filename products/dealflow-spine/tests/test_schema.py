"""Contract tests: serialization roundtrips + forgiving from_dict coercion."""

import json

from spine_test_utils import make_signal

from spine.schema import (
    SIGNAL_TYPES,
    DealCandidate,
    Owner,
    PropertyRecord,
    PropertyRef,
    ScoreBreakdown,
    Signal,
    parse_iso8601,
)


def test_signal_json_roundtrip(fixture_signal_dicts):
    """Every fixture signal survives dict -> Signal -> json -> Signal."""
    for d in fixture_signal_dicts:
        sig = Signal.from_dict(d)
        wire = json.dumps(sig.to_dict())
        back = Signal.from_dict(json.loads(wire))
        assert back.to_dict() == sig.to_dict()
        assert back.dedupe_key == sig.dedupe_key


def test_fixture_coverage_of_all_signal_types(fixture_signals):
    seen = {s.signal_type for s in fixture_signals}
    assert seen == SIGNAL_TYPES, f"fixtures must cover every type, missing {SIGNAL_TYPES - seen}"


def test_unknown_signal_type_coerced_to_other():
    sig = make_signal(signal_type="vacancy")
    assert sig.signal_type == "other"
    assert sig.evidence["_original_signal_type"] == "vacancy"
    assert not sig.problems()


def test_confidence_clamped_and_coerced():
    assert make_signal(confidence=1.7).confidence == 1.0
    assert make_signal(confidence=-2).confidence == 0.0
    assert make_signal(confidence="not a number").confidence == 0.5
    assert make_signal(confidence="0.75").confidence == 0.75


def test_nonfinite_confidence_distrusted_not_maxed():
    """M3 regression (adversarial review 2026-07-04): NaN slipped through
    max(0, min(1, x)) as 1.0 — MAXIMUM trust for garbage input. Non-finite
    confidence is now 0.0 (distrust), not the 0.5 unparseable default."""
    assert make_signal(confidence=float("nan")).confidence == 0.0
    assert make_signal(confidence=float("inf")).confidence == 0.0
    assert make_signal(confidence=float("-inf")).confidence == 0.0
    assert make_signal(confidence="nan").confidence == 0.0  # float('nan') parses


def test_missing_id_generated_deterministically():
    a = make_signal(id=None)
    b = make_signal(id=None)
    assert a.id.startswith("gen-")
    assert a.id == b.id  # same inputs -> same id (re-fetch dedupes)
    c = make_signal(id=None, property={"address": "999 Other Rd"})
    assert c.id != a.id


def test_missing_observed_at_defaults_to_now():
    sig = make_signal(observed_at=None)
    assert parse_iso8601(sig.observed_at) is not None
    bad = make_signal(observed_at="not-a-date")
    assert parse_iso8601(bad.observed_at) is not None
    assert bad.evidence["_original_observed_at"] == "not-a-date"


def test_zulu_timestamps_parse():
    sig = make_signal(observed_at="2026-06-20T00:00:00Z")
    assert sig.observed_dt.tzinfo is not None


def test_problems_flags_unusable_signal():
    sig = make_signal(property={"address": "", "apn": None})
    assert any("neither address nor apn" in p for p in sig.problems())
    apn_only = make_signal(property={"address": "", "apn": "12-34"})
    assert not apn_only.problems()


def test_owner_none_when_empty():
    assert Owner.from_dict(None) is None
    assert Owner.from_dict({"name": None, "mailing_address": None}) is None
    assert Owner.from_dict({"name": "X"}).name == "X"


def test_property_record_roundtrip(fixture_signals):
    rec = PropertyRecord(
        key="addr:FL:33990:123 MAIN ST",
        property=PropertyRef(address="123 Main St", state="FL", zip="33990"),
        signals=fixture_signals[:3],
        owner=Owner(name="X", mailing_address="Y"),
        facts={"estimated_value": 250000},
    )
    back = PropertyRecord.from_dict(rec.to_dict())
    assert back.to_dict() == rec.to_dict()
    assert back.signal_count == 3


def test_deal_candidate_roundtrip(fixture_signals):
    cand = DealCandidate(
        property_key="apn:FL:1234",
        property=PropertyRef(address="123 Main St", state="FL", zip="33990", apn="1234"),
        signals=fixture_signals[:2],
        criteria_matches={"matched": True, "matches": ["geo:state=FL"], "misses": [], "unknowns": []},
        distress_score=4.2,
        recommended_strategy="stacked distress",
        score_breakdown=ScoreBreakdown(total=4.2, components={"a": 4.2}, reasons={"a": "why"}),
        route="hot",
    )
    wire = json.dumps(cand.to_dict())
    back = DealCandidate.from_dict(json.loads(wire))
    assert back.to_dict() == cand.to_dict()
    assert back.distinct_signal_types == cand.distinct_signal_types


def test_from_dict_ignores_unknown_keys():
    d = make_signal().to_dict()
    d["some_future_field"] = {"x": 1}
    sig = Signal.from_dict(d)
    assert not sig.problems()
