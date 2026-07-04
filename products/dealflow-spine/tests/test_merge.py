"""Address normalization + signal->PropertyRecord merge tests."""

from spine_test_utils import make_signal

from spine.merge import (
    merge_signals,
    normalize_address,
    normalize_apn,
    property_key,
)
from spine.schema import PropertyRef


def test_normalize_address_variants():
    assert normalize_address("1417 SE 12th Terrace") == "1417 SE 12TH TER"
    assert normalize_address("1417 Southeast 12th Terrace") == "1417 SE 12TH TER"
    assert normalize_address("1417 SE 12TH TER.") == "1417 SE 12TH TER"
    assert normalize_address("902 Palm Avenue") == normalize_address("902 PALM AVE.")
    assert normalize_address("10 North  Main   Street") == "10 N MAIN ST"
    assert normalize_address("") == ""


def test_normalize_apn():
    assert normalize_apn("13-44-24-C3-00542.0010") == "134424C3005420010"
    assert normalize_apn("13 4424 c3 00542.0010") == "134424C3005420010"
    assert normalize_apn(None) is None
    assert normalize_apn("--") is None


def test_property_key_prefers_apn():
    with_apn = PropertyRef(address="1 Main St", state="FL", zip="33990", apn="12-34")
    assert property_key(with_apn) == "apn:FL:1234"
    without = PropertyRef(address="1 Main St", state="FL", zip="33990")
    assert property_key(without) == "addr:FL:33990:1 MAIN ST"


def test_spelling_variants_merge_to_one_record():
    signals = [
        make_signal(id="a", property={"address": "902 Palm Avenue"}),
        make_signal(id="b", signal_type="code_violation",
                    property={"address": "902 PALM AVE."}),
    ]
    records = merge_signals(signals)
    assert len(records) == 1
    assert records[0].signal_count == 2
    assert records[0].distinct_signal_types == {"tax_delinquent", "code_violation"}


def test_apn_bridges_different_address_strings():
    """Obituary knows the street but not the zip; tax roll knows the APN in a
    different format. Same APN -> one record."""
    signals = [
        make_signal(id="a", property={"address": "315 Riverside Drive",
                                      "zip": "33905", "apn": "10-43-25-P1-00300.0010"}),
        make_signal(id="b", signal_type="obituary",
                    property={"address": "315 Riverside Dr", "zip": "",
                              "apn": "10432 5P1 00300.0010"}),
    ]
    records = merge_signals(signals)
    assert len(records) == 1
    rec = records[0]
    assert rec.key.startswith("apn:FL:")
    assert rec.property.zip == "33905"  # backfilled from the signal that knew it


def test_no_apn_no_matching_address_stays_separate():
    signals = [
        make_signal(id="a", property={"address": "1 First St"}),
        make_signal(id="b", property={"address": "2 Second St"}),
    ]
    assert len(merge_signals(signals)) == 2


def test_facts_lifted_most_recent_wins():
    signals = [
        make_signal(id="old", observed_at="2026-01-01T00:00:00+00:00",
                    evidence={"estimated_value": 100000, "property_type": "single_family",
                              "not_a_fact_key": True}),
        make_signal(id="new", observed_at="2026-06-01T00:00:00+00:00",
                    evidence={"estimated_value": 120000}),
    ]
    rec = merge_signals(signals)[0]
    assert rec.facts["estimated_value"] == 120000       # newest wins
    assert rec.facts["property_type"] == "single_family"  # older fills gaps
    assert "not_a_fact_key" not in rec.facts             # only KNOWN_FACT_KEYS lift


def test_owner_merged_from_most_recent_that_knows():
    signals = [
        make_signal(id="old", observed_at="2026-01-01T00:00:00+00:00",
                    owner={"name": "OLD NAME", "mailing_address": "PO BOX 1"}),
        make_signal(id="new", observed_at="2026-06-01T00:00:00+00:00",
                    owner={"name": "NEW NAME"}),
    ]
    rec = merge_signals(signals)[0]
    assert rec.owner.name == "NEW NAME"
    assert rec.owner.mailing_address == "PO BOX 1"  # backfilled


def test_fixture_merge_shape(fixture_signals):
    """13 fixture signals -> 8 properties, with the stacks we designed."""
    records = merge_signals(fixture_signals)
    assert len(records) == 8
    by_count = sorted((r.signal_count for r in records), reverse=True)
    assert by_count == [4, 2, 2, 1, 1, 1, 1, 1]
    # keyed by APN (parcel identity beats address string)
    cape = next(r for r in records if r.key == "apn:FL:134424C3005420010")
    assert cape.signal_count == 4  # 3 sources, address spelled 4 ways
    assert cape.distinct_signal_types == {"fema_disaster", "tax_delinquent", "code_violation"}
    assert cape.owner.name == "HAROLD J WHEELER"


def test_merge_is_deterministic(fixture_signals):
    a = merge_signals(fixture_signals)
    b = merge_signals(list(reversed(fixture_signals)))
    assert [r.key for r in a] == [r.key for r in b]
    assert [[s.dedupe_key for s in r.signals] for r in a] == \
           [[s.dedupe_key for s in r.signals] for r in b]
