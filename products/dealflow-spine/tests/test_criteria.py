"""Buy-box engine tests."""

from spine_test_utils import make_signal

from spine.criteria import BuyBox
from spine.merge import merge_signals

BOX = {
    "name": "test-box",
    "geo": {"states": ["FL"], "zips": ["339*"]},
    "price_band": {"min": 60000, "max": 600000},
    "min_equity_pct": 0.2,
    "property_types": ["single_family", "duplex"],
    "min_signal_count": 2,
    "unknown_policy": "lenient",
}


def _record(**sig_overrides):
    return merge_signals([make_signal(**sig_overrides)])[0]


def test_full_match():
    rec = _record(evidence={"estimated_value": 250000, "equity_pct": 0.5,
                            "property_type": "single_family"})
    rec.signals.append(make_signal(id="t-2", signal_type="obituary"))
    result = BuyBox(BOX).evaluate(rec)
    assert result.matched
    assert not result.misses
    assert any(m.startswith("geo:state") for m in result.matches)
    assert any(m.startswith("signals:2") for m in result.matches)


def test_geo_state_miss_is_hard_disqualifier():
    rec = _record(property={"state": "OH", "zip": "45503"})
    result = BuyBox(BOX).evaluate(rec)
    assert not result.matched
    assert result.geo_missed


def test_zip_prefix_glob():
    assert not BuyBox(BOX).evaluate(_record(property={"zip": "33990"})).geo_missed
    out = BuyBox(BOX).evaluate(_record(property={"zip": "34110", "city": "NAPLES"}))
    assert out.geo_missed


def test_geo_city_fallback():
    box = BuyBox({"geo": {"states": ["FL"], "cities": ["CAPE CORAL"]}})
    rec = _record(property={"zip": "", "city": "Cape Coral"})
    assert not box.evaluate(rec).geo_missed


def test_geo_county_fact_fallback():
    box = BuyBox({"geo": {"states": ["FL"], "counties": ["LEE"]}})
    rec = _record(property={"zip": "", "city": ""}, evidence={"county": "LEE"})
    assert not box.evaluate(rec).geo_missed


def test_price_band():
    over = _record(evidence={"estimated_value": 1250000})
    result = BuyBox(BOX).evaluate(over)
    assert any(m.startswith("price:") for m in result.misses)
    under = _record(evidence={"estimated_value": 45000})
    assert any(m.startswith("price:") for m in BuyBox(BOX).evaluate(under).misses)


def test_value_fact_priority():
    """estimated_value beats assessed_value when both present."""
    rec = _record(evidence={"assessed_value": 30000, "estimated_value": 200000})
    result = BuyBox(BOX).evaluate(rec)
    assert not any(m.startswith("price:") for m in result.misses)


def test_unknowns_lenient_vs_strict():
    rec = _record()  # no facts at all
    lenient = BuyBox({**BOX, "min_signal_count": 0}).evaluate(rec)
    assert lenient.matched  # unknowns don't fail
    assert lenient.unknowns  # ...but are reported
    strict = BuyBox({**BOX, "min_signal_count": 0, "unknown_policy": "strict"}).evaluate(rec)
    assert not strict.matched


def test_equity_and_property_type():
    rec = _record(evidence={"equity_pct": 0.1, "property_type": "condo",
                            "estimated_value": 200000})
    result = BuyBox(BOX).evaluate(rec)
    assert any(m.startswith("equity:") for m in result.misses)
    assert any(m.startswith("property_type:") for m in result.misses)


def test_min_signal_count_uses_distinct_types():
    rec = _record()
    rec.signals.append(make_signal(id="t-2"))  # same type again
    result = BuyBox(BOX).evaluate(rec)
    assert any(m.startswith("signals:1 distinct") for m in result.misses)
    rec.signals.append(make_signal(id="t-3", signal_type="code_violation"))
    result = BuyBox(BOX).evaluate(rec)
    assert any(m.startswith("signals:2 distinct") for m in result.matches)


def test_empty_box_matches_everything():
    result = BuyBox().evaluate(_record(property={"state": "OH", "zip": "45503"}))
    assert result.matched
    assert not result.misses and not result.unknowns


def test_load_json_box(tmp_path):
    import json
    p = tmp_path / "box.json"
    p.write_text(json.dumps(BOX))
    box = BuyBox.load(p)
    assert box.name == "test-box"
    assert box.states == ["FL"]
    assert box.min_signal_count == 2
