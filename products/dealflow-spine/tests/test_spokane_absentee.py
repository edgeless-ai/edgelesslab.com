"""Spokane County absentee-owner adapter — the stacking spine of the Spokane
metro. Hermetic: fixture default + monkeypatched live. APN-anchored so it
merges exactly with spokane_code_violations on the shared assessor parcel
number ('35082.4002' normalized to alnum).
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
    spec = importlib.util.spec_from_file_location(
        "dealflow_adapters._common", ADAPTERS_DIR / "_common.py")
    common = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(common)
    monkeypatch.setitem(sys.modules, "dealflow_adapters._common", common)
    monkeypatch.setitem(sys.modules, "_common", common)
    pkg = sys.modules.get("dealflow_adapters")
    if pkg is not None:
        monkeypatch.setattr(pkg, "_common", common, raising=False)
    spec = importlib.util.spec_from_file_location(
        "dealflow_adapters.spokane_absentee", ADAPTERS_DIR / "spokane_absentee.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture
def no_network(monkeypatch):
    def _refuse(*a, **k):
        raise AssertionError("network attempted in a hermetic test")
    monkeypatch.setattr(socket.socket, "connect", _refuse)


def test_offline_default_serves_fixture(adapter, no_network, monkeypatch):
    monkeypatch.delenv(LIVE, raising=False)
    sigs = adapter.fetch()
    assert sigs, "fixture returned no signals"
    assert all(s["signal_type"] == "absentee_owner" for s in sigs)
    assert all(s["evidence"].get("fixture_data") for s in sigs)
    assert all(s["evidence"]["county"] == "SPOKANE" for s in sigs)
    assert all(s["evidence"]["owner_state"] != "WA" for s in sigs)
    assert all(s["property"]["city"] == "SPOKANE" for s in sigs)


def test_apn_anchored_matches_code_feed_pin_format(adapter):
    """The signal keys on APN (the assessor parcel number, alnum-normalized)
    so it merges with the APN-anchored Spokane code feed."""
    rec = {"PID_NUM": "35082.4002", "site_address": "2730 N STANDARD ST",
           "site_city": "SPOKANE", "site_zip": "99207",
           "taxpayer_name": "DOE, JANE", "taxpayer_address1": "1 FAR AWAY DR",
           "taxpayer_city": "CAMARILLO", "taxpayer_state": "CA",
           "taxpayer_zip": "93010", "prop_use_desc": "Single Unit"}
    s = adapter._to_signal(rec)
    assert s["property"]["apn"] == "350824002"
    assert s["evidence"]["parcel_pin"] == "350824002"
    assert s["evidence"]["owner_state"] == "CA"
    assert s["evidence"]["property_type"] == "single_family"
    assert s["confidence"] == 0.65
    assert "CAMARILLO" in s["owner"]["mailing_address"]
    assert s["owner"]["name"] == "DOE, JANE"
    assert s["property"]["zip"] == "99207"


def test_wa_or_blank_owner_state_dropped(adapter):
    # a WA owner is dropped defensively even if it slips the WHERE
    assert adapter._to_signal({"PID_NUM": "1", "taxpayer_state": "WA",
                               "site_address": "1 A ST"}) is None
    assert adapter._to_signal({"PID_NUM": "1", "taxpayer_state": "",
                               "site_address": "1 A ST"}) is None


def test_two_to_four_unit_leaves_type_unknown(adapter):
    """'Two-to-Four Unit' spans duplex..quadplex — no single property_type
    claim; the lenient buy-box keeps it in-box."""
    rec = {"PID_NUM": "2", "taxpayer_state": "OR", "site_address": "2 B ST",
           "prop_use_desc": "Two-to-Four Unit"}
    s = adapter._to_signal(rec)
    assert s is not None and "property_type" not in s["evidence"]


def test_no_pin_drops_record(adapter):
    assert adapter._to_signal({"site_address": "1 A ST",
                               "taxpayer_state": "CA"}) is None


def test_fetch_live_paginates_and_dedupes(adapter, monkeypatch):
    calls = []

    def fake_get_json(url, params=None, **kw):
        offset = int(params.get("resultOffset", 0))
        page_size = int(params["resultRecordCount"])
        calls.append(offset)
        remaining = 3700 - offset                    # 3700 available
        n = max(0, min(page_size, remaining))
        feats = [{"attributes": {"PID_NUM": str(offset + i),
                                 "site_address": f"{offset + i} MAIN ST",
                                 "taxpayer_state": "NV"}} for i in range(n)]
        return {"features": feats, "exceededTransferLimit": (offset + n) < 3700}

    monkeypatch.setattr(adapter._common, "http_get_json", fake_get_json)
    recs = adapter._fetch_live(limit=5000)
    assert calls == [0, 2000]                        # 2nd page short -> stop
    assert len(recs) == 3700
    pins = [r["PID_NUM"] for r in recs]
    assert len(pins) == len(set(pins))               # deduped


def test_fetch_live_stops_when_service_ignores_offset(adapter, monkeypatch):
    def fake_get_json(url, params=None, **kw):
        page_size = int(params["resultRecordCount"])
        feats = [{"attributes": {"PID_NUM": str(i), "site_address": f"{i} X",
                                 "taxpayer_state": "NV"}} for i in range(page_size)]
        return {"features": feats, "exceededTransferLimit": True}  # same rows, forever

    monkeypatch.setattr(adapter._common, "http_get_json", fake_get_json)
    recs = adapter._fetch_live(limit=5000)
    assert len(recs) <= 2000
    assert len({r["PID_NUM"] for r in recs}) == len(recs)


def test_live_env_routes_to_arcgis(adapter, monkeypatch):
    def fake(limit):
        return [{"PID_NUM": "35054.3507", "site_address": "5 B ST",
                 "taxpayer_state": "TX", "taxpayer_city": "AUSTIN",
                 "prop_use_desc": "Single Unit"}]
    monkeypatch.setattr(adapter, "_fetch_live", fake)
    monkeypatch.setenv(LIVE, "1")
    sigs = adapter.fetch()
    assert len(sigs) == 1 and sigs[0]["evidence"]["owner_state"] == "TX"
    assert "fixture_data" not in sigs[0]["evidence"]
