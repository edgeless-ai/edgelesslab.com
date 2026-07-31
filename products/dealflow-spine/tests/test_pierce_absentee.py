"""Pierce County absentee-owner adapter — the stacking spine of the Tacoma
metro. Hermetic: fixture default + monkeypatched live. APN-anchored so it merges
exactly with tacoma_code_violations on the shared 10-digit parcel number.
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
        "dealflow_adapters.pierce_absentee", ADAPTERS_DIR / "pierce_absentee.py")
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
    assert all(s["evidence"]["county"] == "PIERCE" for s in sigs)
    assert all(s["evidence"]["owner_state"] != "WA" for s in sigs)


def test_apn_anchored_matches_tacoma_pin_format(adapter):
    """The signal keys on APN (the 10-digit Pierce parcel number) so it merges
    with the APN-anchored Tacoma code feed."""
    rec = {"TaxParcelNumber": "0019121006", "Site_Address": "11606 150TH AVE",
           "Delivery_Address": "1 FAR AWAY DR", "City_State": "CAMARILLO, CA",
           "Zipcode": "93010", "Landuse_Description": "SINGLE FAMILY DWELLING"}
    s = adapter._to_signal(rec)
    assert s["property"]["apn"] == "0019121006"
    assert s["evidence"]["parcel_pin"] == "0019121006"
    assert s["evidence"]["owner_state"] == "CA"
    assert s["evidence"]["property_type"] == "single_family"
    assert s["confidence"] == 0.65
    assert "CAMARILLO, CA" in s["owner"]["mailing_address"]


def test_owner_state_parse_and_wa_excluded(adapter):
    assert adapter._owner_state("ROSEVILLE, CA") == "CA"
    assert adapter._owner_state("TACOMA, WA") == "WA"
    # a WA owner is dropped defensively even if it slips the WHERE
    assert adapter._to_signal({"TaxParcelNumber": "1", "City_State": "TACOMA, WA",
                               "Site_Address": "1 A ST"}) is None


def test_no_pin_drops_record(adapter):
    assert adapter._to_signal({"Site_Address": "1 A ST", "City_State": "X, CA"}) is None


def test_fetch_live_paginates_and_dedupes(adapter, monkeypatch):
    calls = []

    def fake_get_json(url, params=None, **kw):
        offset = int(params.get("resultOffset", 0))
        page_size = int(params["resultRecordCount"])
        calls.append(offset)
        remaining = 2300 - offset                    # 2300 available
        n = max(0, min(page_size, remaining))
        feats = [{"attributes": {"TaxParcelNumber": str(offset + i),
                                 "Site_Address": f"{offset + i} MAIN ST",
                                 "City_State": "RENO, NV"}} for i in range(n)]
        return {"features": feats, "exceededTransferLimit": (offset + n) < 2300}

    monkeypatch.setattr(adapter._common, "http_get_json", fake_get_json)
    recs = adapter._fetch_live(limit=5000)
    assert calls == [0, 1000, 2000]                  # 3rd page short -> stop
    assert len(recs) == 2300
    pins = [r["TaxParcelNumber"] for r in recs]
    assert len(pins) == len(set(pins))               # deduped


def test_fetch_live_stops_when_service_ignores_offset(adapter, monkeypatch):
    def fake_get_json(url, params=None, **kw):
        page_size = int(params["resultRecordCount"])
        feats = [{"attributes": {"TaxParcelNumber": str(i), "Site_Address": f"{i} X",
                                 "City_State": "RENO, NV"}} for i in range(page_size)]
        return {"features": feats, "exceededTransferLimit": True}  # same rows, forever

    monkeypatch.setattr(adapter._common, "http_get_json", fake_get_json)
    recs = adapter._fetch_live(limit=5000)
    assert len(recs) <= 1000
    assert len({r["TaxParcelNumber"] for r in recs}) == len(recs)


def test_live_env_routes_to_arcgis(adapter, monkeypatch):
    def fake(limit):
        return [{"TaxParcelNumber": "5551112223", "Site_Address": "5 B ST",
                 "City_State": "AUSTIN, TX", "Landuse_Description": "SINGLE FAMILY DWELLING"}]
    monkeypatch.setattr(adapter, "_fetch_live", fake)
    monkeypatch.setenv(LIVE, "1")
    sigs = adapter.fetch()
    assert len(sigs) == 1 and sigs[0]["evidence"]["owner_state"] == "TX"
    assert "fixture_data" not in sigs[0]["evidence"]
