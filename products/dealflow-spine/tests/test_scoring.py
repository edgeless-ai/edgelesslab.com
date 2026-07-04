"""Distress-score tests: stacking, dampening, decay, confidence, explainability."""

from datetime import timedelta

from spine_test_utils import FIXED_NOW, make_signal

from spine.merge import merge_signals
from spine.scoring import ScoringConfig, score_record


def _score(signals, **cfg):
    records = merge_signals(signals)
    assert len(records) == 1
    return score_record(records[0], ScoringConfig.from_dict(cfg) if cfg else None,
                        now=FIXED_NOW)


RECENT = "2026-07-01T00:00:00+00:00"


def test_two_distinct_types_beat_two_of_same_type():
    """The EBRE stacking thesis, as an invariant: same weight class, same
    confidence, same day — two DIFFERENT signal types must outscore two
    copies of the same type."""
    same = [
        make_signal(id="a", signal_type="code_violation", observed_at=RECENT),
        make_signal(id="b", signal_type="code_violation", observed_at=RECENT),
    ]
    distinct = [
        make_signal(id="a", signal_type="code_violation", observed_at=RECENT),
        make_signal(id="b", signal_type="fema_disaster", observed_at=RECENT),  # same weight (2.0)
    ]
    same_total, _ = _score(same)
    distinct_total, _ = _score(distinct)
    assert distinct_total > same_total


def test_stack_bonus_scales_with_distinct_types():
    one, _ = _score([make_signal(id="a", observed_at=RECENT)])
    two, b2 = _score([
        make_signal(id="a", observed_at=RECENT),
        make_signal(id="b", signal_type="code_violation", observed_at=RECENT),
    ])
    three, b3 = _score([
        make_signal(id="a", observed_at=RECENT),
        make_signal(id="b", signal_type="code_violation", observed_at=RECENT),
        make_signal(id="c", signal_type="obituary", observed_at=RECENT),
    ])
    assert "stack_bonus" not in _score([make_signal(id="a", observed_at=RECENT)])[1].components
    assert b2.components["stack_bonus"] == 2.0
    assert b3.components["stack_bonus"] == 4.0
    assert three > two > one


def test_same_type_repeats_are_dampened():
    _, breakdown = _score([
        make_signal(id="new", observed_at=RECENT, confidence=1.0),
        make_signal(id="old", observed_at="2026-06-30T00:00:00+00:00", confidence=1.0),
    ])
    newest = breakdown.components["signal:tax_delinquent:new"]
    repeat = breakdown.components["signal:tax_delinquent:old"]
    assert repeat < newest / 1.5  # x0.5 dampening (plus a day of decay)
    assert "repeat #2" in breakdown.reasons["signal:tax_delinquent:old"]


def test_recency_decay_half_life():
    fresh, _ = _score([make_signal(observed_at=FIXED_NOW.isoformat(), confidence=1.0)])
    old_iso = (FIXED_NOW - timedelta(days=180)).isoformat()
    old, _ = _score([make_signal(observed_at=old_iso, confidence=1.0)])
    assert abs(old - fresh / 2) < 0.01  # one half-life = half the score


def test_signals_past_max_age_contribute_zero_and_dont_unlock_stack():
    ancient = (FIXED_NOW - timedelta(days=1000)).isoformat()
    total, breakdown = _score([
        make_signal(id="live", observed_at=RECENT),
        make_signal(id="dead", signal_type="code_violation", observed_at=ancient),
    ])
    assert breakdown.components["signal:code_violation:dead"] == 0.0
    assert "stack_bonus" not in breakdown.components  # only 1 LIVE type


def test_duplicate_signal_id_does_not_overwrite_component():
    """M2 regression (adversarial review 2026-07-04): two signals with the
    same (type, id) on one record used to collide on the component key —
    the dampened repeat OVERWROTE the full-credit first contribution,
    halving the score. Components are now key-uniquified; the invariant
    total == sum(components) holds."""
    from spine.schema import PropertyRecord, PropertyRef

    dup = make_signal(id="same", observed_at=RECENT, confidence=1.0)
    dup2 = make_signal(id="same", observed_at=RECENT, confidence=1.0)
    record = PropertyRecord(key="k", property=PropertyRef(address="1 X St"),
                            signals=[dup, dup2])
    solo = PropertyRecord(key="k", property=PropertyRef(address="1 X St"),
                          signals=[dup])
    total_dup, breakdown = score_record(record, now=FIXED_NOW)
    total_solo, _ = score_record(solo, now=FIXED_NOW)
    assert len(breakdown.components) == 2       # nothing overwritten
    assert total_dup > total_solo               # corroboration, not halving
    assert abs(total_dup - sum(breakdown.components.values())) < 1e-9
    assert set(breakdown.reasons) == set(breakdown.components)


def test_confidence_scales_linearly():
    full, _ = _score([make_signal(observed_at=RECENT, confidence=1.0)])
    half, _ = _score([make_signal(observed_at=RECENT, confidence=0.5)])
    assert abs(half - full / 2) < 1e-3  # components round to 4 decimals


def test_total_equals_sum_of_components(fixture_signals):
    from spine.merge import merge_signals as ms
    for record in ms(fixture_signals):
        total, breakdown = score_record(record, now=FIXED_NOW)
        assert abs(total - sum(breakdown.components.values())) < 1e-6
        assert set(breakdown.reasons) == set(breakdown.components)  # every component explained


def test_config_overrides():
    total_default, _ = _score([make_signal(observed_at=RECENT, confidence=1.0)])
    total_boosted, _ = _score(
        [make_signal(observed_at=RECENT, confidence=1.0)],
        weights={"tax_delinquent": 10.0},
    )
    assert total_boosted > total_default * 3
