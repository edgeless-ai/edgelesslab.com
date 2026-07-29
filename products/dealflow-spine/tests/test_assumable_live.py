"""assumable_heuristic live path (ACRIS x HMDA join) — hermetic, zero network.

The live probes behind these shapes are real (fixtures/adapters/probes/,
docs/deed-data-sources.md, survey 2026-07-04); tests replay them offline.
"""

import importlib.util
import socket
import sys
from pathlib import Path

import pytest

from spine_test_utils import ROOT  # noqa: F401 (wires sys.path)

ADAPTERS_DIR = Path(ROOT) / "adapters"
LIVE = "DEALFLOW_LIVE"


@pytest.fixture
def adapter(monkeypatch):
    """The REAL assumable_heuristic bound to the REAL _common, loaded by
    path (same rationale as test_live_flag._load_real_common: other tests
    seed toy `_common` modules into the shared package cache)."""
    spec = importlib.util.spec_from_file_location(
        "dealflow_adapters._common", ADAPTERS_DIR / "_common.py")
    common = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(common)
    monkeypatch.setitem(sys.modules, "dealflow_adapters._common", common)
    monkeypatch.setitem(sys.modules, "_common", common)
    pkg = sys.modules.get("dealflow_adapters")
    if pkg is not None:
        # `from . import _common` resolves through the package ATTRIBUTE,
        # which earlier tests may have bound to a toy module
        monkeypatch.setattr(pkg, "_common", common, raising=False)
    for name in list(sys.modules):
        if name.startswith("dealflow_adapters.") and not name.endswith("._common"):
            monkeypatch.delitem(sys.modules, name)

    spec = importlib.util.spec_from_file_location(
        "dealflow_adapters.assumable_heuristic",
        ADAPTERS_DIR / "assumable_heuristic.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    assert mod._common is common
    return mod


@pytest.fixture
def no_network(monkeypatch):
    def _refuse(*a, **k):
        raise AssertionError("network attempted in a hermetic test")
    monkeypatch.setattr(socket.socket, "connect", _refuse)


# --- gating ----------------------------------------------------------------

def test_offline_default_serves_fixture_without_sockets(
        adapter, no_network, monkeypatch):
    monkeypatch.delenv(LIVE, raising=False)
    signals = adapter.fetch()
    assert signals, "fixture path returned no signals"
    assert all(s["evidence"].get("fixture_data") for s in signals)
    assert all(s["evidence"]["loan_program_source"] == "stated"
               for s in signals)


def test_explicit_offline_beats_live_env(adapter, no_network, monkeypatch):
    monkeypatch.setenv(LIVE, "1")
    signals = adapter.fetch(offline=True)
    assert signals and all(s["evidence"].get("fixture_data") for s in signals)


def test_records_arg_bypasses_both_paths(adapter, no_network, monkeypatch):
    monkeypatch.setenv(LIVE, "1")   # even live-enabled: no fetch, no fixture
    assert adapter.fetch(records=[]) == []


def test_live_env_routes_to_live_records(adapter, monkeypatch):
    seen = {}

    def fake_live(borough, limit):
        seen["args"] = (borough, limit)
        return []

    monkeypatch.setattr(adapter, "_live_records",
                        lambda borough, limit: fake_live(borough, limit))
    monkeypatch.setenv(LIVE, "1")
    assert adapter.fetch(borough="4", limit=7) == []
    assert seen["args"] == ("4", 7)


# --- multi-borough aim (gov-dense default) ---------------------------------

def _record_boroughs(adapter, monkeypatch):
    """Patch _live_records to log the boroughs it is asked to pull, tagging
    one record per borough so record identity is traceable."""
    seen: list[str] = []

    def fake(borough, limit):
        seen.append(str(borough))
        return [{"instrument_id": f"I-{borough}", "recorded_date": "2020-06-01",
                 "doc_type": "MORTGAGE", "loan_program": "FHA",
                 "loan_amount": 355000.0, "origination_date": "2020-06-01",
                 "property": {"address": f"{borough} MAIN ST", "apn": borough}}]

    monkeypatch.setattr(adapter, "_live_records",
                        lambda borough, limit: fake(borough, limit))
    monkeypatch.setenv(LIVE, "1")
    return seen


def test_default_aim_is_gov_dense_bronx_and_queens(adapter, monkeypatch):
    seen = _record_boroughs(adapter, monkeypatch)
    signals = adapter.fetch()                 # no borough -> default aim
    assert seen == ["2", "4"]                 # Bronx, then Queens
    assert adapter.DEFAULT_BOROUGHS == ("2", "4")
    # every targeted borough's records flow through to signals
    assert {s["evidence"]["instrument_id"] for s in signals} == {"I-2", "I-4"}


def test_default_aim_excludes_low_share_boroughs(adapter):
    # Brooklyn (3) is below Queens on HMDA gov share; Manhattan (1) negligible
    assert "3" not in adapter.DEFAULT_BOROUGHS
    assert "1" not in adapter.DEFAULT_BOROUGHS


def test_explicit_boroughs_list_overrides_default(adapter, monkeypatch):
    seen = _record_boroughs(adapter, monkeypatch)
    adapter.fetch(boroughs=["2", "3"])
    assert seen == ["2", "3"]


def test_explicit_single_borough_wins_over_default(adapter, monkeypatch):
    seen = _record_boroughs(adapter, monkeypatch)
    adapter.fetch(borough="1")
    assert seen == ["1"]


def test_bad_borough_raises_before_network(adapter, monkeypatch):
    monkeypatch.setenv(LIVE, "1")
    with pytest.raises(ValueError):
        adapter.fetch(boroughs=["2", "5"])    # 5 = Staten Island, not in ACRIS


# --- HMDA inference --------------------------------------------------------

def test_bin_midpoint_matches_public_lar_convention(adapter):
    # public LAR reports 355000.0 for anything in [350k, 360k)
    assert adapter._bin_midpoint(352_500) == 355_000
    assert adapter._bin_midpoint(359_999) == 355_000
    assert adapter._bin_midpoint(360_000) == 365_000
    assert adapter._bin_midpoint(100_000) == 105_000


def test_infer_program_majority_and_metadata(adapter):
    bins = {(2020, 355_000.0): {"FHA": 8, "VA": 2}}
    program, meta = adapter._infer_program(351_200, 2020, bins)
    assert program == "FHA"
    assert meta["method"] == "hmda_amount_bin_county_year_match"
    assert meta["bin_counts"] == {"FHA": 8, "VA": 2}
    assert "verify" in meta["caveat"]
    # no FHA/VA/USDA origination in the bin -> no label, no signal later
    assert adapter._infer_program(600_000, 2020, bins) == (None, None)
    # same amount, different year -> no match
    assert adapter._infer_program(351_200, 2021, bins) == (None, None)


# --- record assembly (replays real probe shapes) ----------------------------

MASTER = {  # shape: fixtures/adapters/probes/acris_master_2020_sample.json
    "document_id": "2020050400526001", "record_type": "A",
    "crfn": "2020000160425", "recorded_borough": "3", "doc_type": "MTGE",
    "document_date": "2020-04-24T00:00:00.000",
    "document_amt": "352500.00",
    "recorded_datetime": "2020-06-01T00:00:00.000",
}
LEGAL = {  # shape: fixtures/adapters/probes/acris_legals_sample.json
    "document_id": "2020050400526001", "record_type": "L", "borough": "3",
    "block": "7713", "lot": "146", "property_type": "D1",
    "street_number": "1742", "street_name": "EAST 31ST   STREET",
}


def _wire_live(adapter, monkeypatch, masters, legals, bins, shares=None):
    monkeypatch.setattr(adapter, "_fetch_acris_mortgages",
                        lambda borough, limit: masters)
    monkeypatch.setattr(adapter, "_fetch_acris_legals",
                        lambda ids: legals)
    monkeypatch.setattr(adapter, "_fetch_hmda_bins",
                        lambda fips, years=adapter.HMDA_YEARS: bins)
    monkeypatch.setattr(adapter, "_fetch_hmda_county_share",
                        lambda fips, years=adapter.HMDA_YEARS:
                        {2020: 0.4} if shares is None else shares)


def test_live_records_maps_acris_join_to_fixture_format(adapter, monkeypatch):
    conv = dict(MASTER, document_id="X2", document_amt="900000.00")
    orphan = dict(MASTER, document_id="X3")            # no legals row
    _wire_live(adapter, monkeypatch,
               masters=[MASTER, conv, orphan],
               legals={"2020050400526001": LEGAL,
                       "X2": dict(LEGAL, document_id="X2")},
               bins={(2020, 355_000.0): {"VA": 3}})
    recs = adapter._live_records(borough="3", limit=10)

    assert [r["instrument_id"] for r in recs] == ["2020050400526001", "X2"]
    va = recs[0]
    assert va["loan_program"] == "VA"
    assert va["program_inference"]["matched_bin"] == 355_000
    # Bayes posterior: share 0.4 / match_rate 0.5 (1 matched of 2 eligible;
    # the legals-orphan X3 never became a record)
    assert va["program_inference"]["batch_match_rate"] == 0.5
    assert va["program_inference"]["posterior_gov_probability"] == 0.8
    assert va["loan_amount"] == 352_500.0
    assert va["origination_date"] == "2020-04-24"      # document (execution)
    assert va["recorded_date"] == "2020-06-01"
    assert va["property"] == {"apn": "3-07713-0146",
                              "address": "1742 EAST 31ST   STREET",
                              "city": "BROOKLYN", "state": "NY", "zip": "",
                              "lat": None, "lon": None}
    assert va["county"] == "KINGS"
    assert va["note_rate"] is None                     # never on the index
    # unmatched bin -> honest non-label (filtered later, no fake signal)
    assert recs[1]["loan_program"] == "CONV_OR_UNKNOWN"
    assert "program_inference" not in recs[1]


def test_live_fetch_caps_inferred_confidence_and_carries_provenance(
        adapter, monkeypatch):
    _wire_live(adapter, monkeypatch,
               masters=[MASTER], legals={"2020050400526001": LEGAL},
               bins={(2020, 355_000.0): {"VA": 3}})
    monkeypatch.setenv(LIVE, "1")
    signals = adapter.fetch(borough="3")   # pin: default aim is multi-borough
    assert len(signals) == 1
    sig = signals[0]
    assert sig["signal_type"] == "assumable_loan"
    # PMMS 2020-04 = 3.31 -> delta 3.49 would score 0.65; the inference
    # posterior governs instead: share 0.4 / match_rate 1.0 = 0.4
    assert sig["confidence"] == 0.4
    ev = sig["evidence"]
    assert ev["loan_program_source"] == "inferred"
    assert ev["program_inference"]["bin_counts"] == {"VA": 3}
    assert ev["loan_program"] == "VA"
    assert ev["rate_source"] == "freddie_mac_pmms_monthly_avg"
    assert "fixture_data" not in ev
    assert sig["source_url"] and "2020050400526001" in sig["source_url"]
    # anchored: merge can key on address AND the BBL-as-APN
    assert sig["property"]["address"] and sig["property"]["apn"]


def test_live_fetch_drops_out_of_window_and_unmatched(adapter, monkeypatch):
    stale = dict(MASTER, document_id="OLD",
                 document_date="2018-05-01T00:00:00.000")
    conv = dict(MASTER, document_id="X2", document_amt="900000.00")
    _wire_live(adapter, monkeypatch,
               masters=[MASTER, stale, conv],
               legals={"2020050400526001": LEGAL,
                       "OLD": dict(LEGAL, document_id="OLD"),
                       "X2": dict(LEGAL, document_id="X2")},
               bins={(2020, 355_000.0): {"FHA": 1},
                     (2018, 355_000.0): {"FHA": 9}})
    signals = adapter.fetch(offline=False, borough="3")
    assert [s["evidence"]["instrument_id"] for s in signals] \
        == ["2020050400526001"]      # 2018 vintage + CONV both filtered


def test_posterior_bounds_cap_and_floor(adapter, monkeypatch):
    """Gov-dense county: posterior above the hard cap -> cap wins. Weak
    market (the live-verified Queens case, share ~0.09 with ~0.88 match
    rate): confidence honestly deflates toward the posterior, floored."""
    wire = lambda shares: _wire_live(
        adapter, monkeypatch, masters=[MASTER],
        legals={"2020050400526001": LEGAL},
        bins={(2020, 355_000.0): {"FHA": 5}}, shares=shares)

    wire({2020: 0.9})    # posterior 0.9 -> hard cap
    sig = adapter.fetch(offline=False, borough="3")[0]
    assert sig["confidence"] == adapter.INFERRED_CONFIDENCE_CAP

    wire({2020: 0.03})   # posterior 0.03 -> floor 0.05
    sig = adapter.fetch(offline=False, borough="3")[0]
    assert sig["confidence"] == adapter.INFERRED_CONFIDENCE_FLOOR

    wire({})             # share unknown -> posterior None -> flat cap
    sig = adapter.fetch(offline=False, borough="3")[0]
    assert sig["confidence"] == adapter.INFERRED_CONFIDENCE_CAP
    assert sig["evidence"]["program_inference"][
        "posterior_gov_probability"] is None


def test_hmda_bin_parsing_from_lar_csv(adapter, monkeypatch):
    csv_text = (
        "activity_year,lei,loan_type,loan_amount,interest_rate\n"
        "2020,ABC,2,355000.0,3.125\n"
        "2020,ABC,3,355000.0,2.75\n"
        "2020,ABC,3,355000.0,2.5\n"
        "2020,ABC,1,355000.0,3.5\n"      # conventional: ignored
        "2020,ABC,2,,\n"                 # blank amount: skipped
    )

    class Resp:
        text = csv_text

    calls = []
    monkeypatch.setattr(adapter._common, "http_get",
                        lambda url, params=None, **kw: calls.append(params) or Resp())
    bins = adapter._fetch_hmda_bins("36047", years=(2020,))
    assert bins == {(2020, 355_000.0): {"FHA": 1, "VA": 2}}
    assert calls[0]["counties"] == "36047"
    assert calls[0]["loan_types"] == "2,3,4"
