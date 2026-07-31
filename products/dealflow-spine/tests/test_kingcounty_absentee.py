"""King County absentee-owner adapter — the stacking partner for code
violations. Hermetic: fixture default + monkeypatched live, zero network.
The fixture is real ArcGIS attribute data pulled from the live service.
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
    """Real adapter bound to the real _common (test_assumable_live pattern)."""
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
        "dealflow_adapters.kingcounty_absentee",
        ADAPTERS_DIR / "kingcounty_absentee.py")
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
    assert all(s["property"]["state"] == "WA" for s in sigs)


def test_out_of_state_owner_maps_strong(adapter):
    rec = {"PIN": "1234567890", "ADDR_FULL": "8213 35TH AVE SW",
           "CTYNAME": "Seattle", "ZIP5": "98126", "LAT": 47.5, "LON": -122.3,
           "KCTP_ATTN": "SOME LLC", "KCTP_ADDR": "30 N GOULD ST",
           "KCTP_CTYST": "SHERIDAN WY", "KCTP_STATE": "WY", "KCTP_ZIP": "82801",
           "APPRLNDVAL": 300000, "APPR_IMPR": 408000,
           "PREUSE_DESC": "Single Family(Res Use/Zone)"}
    s = adapter._to_signal(rec)
    assert s["signal_type"] == "absentee_owner"
    assert s["confidence"] == 0.65
    assert s["property"]["address"] == "8213 35TH AVE SW"
    assert s["property"]["apn"] is None          # anchors on address, not APN
    ev = s["evidence"]
    assert ev["parcel_pin"] == "1234567890"      # PIN preserved in evidence
    assert ev["absentee_type"] == "out_of_state"
    assert ev["owner_state"] == "WY"
    assert ev["assessed_value"] == 708000
    assert ev["property_type"] == "single_family"
    assert ev["county"] == "KING"
    assert "SHERIDAN WY" in s["owner"]["mailing_address"]


def test_in_state_owner_is_weaker_and_flagged_in_state(adapter):
    rec = {"PIN": "9", "ADDR_FULL": "1 A ST", "CTYNAME": "Seattle",
           "ZIP5": "98101", "KCTP_STATE": "WA", "KCTP_CTYST": "TACOMA WA",
           "PREUSE_DESC": "Duplex"}
    s = adapter._to_signal(rec)
    assert s["confidence"] == 0.45
    assert s["evidence"]["absentee_type"] == "in_state"
    assert s["evidence"]["property_type"] == "duplex"


def test_no_address_drops_record(adapter):
    assert adapter._to_signal({"PIN": "9", "ADDR_FULL": ""}) is None
    assert adapter._to_signal({"PIN": "9"}) is None


def test_fetch_live_paginates_until_short_page(adapter, monkeypatch):
    """Full coverage: _fetch_live walks resultOffset in pages of 1000 and stops
    when the service returns a short page (no more rows)."""
    calls = []

    def fake_get_json(url, params=None, **kw):
        offset = int(params.get("resultOffset", 0))
        page_size = int(params["resultRecordCount"])
        calls.append((offset, page_size))
        remaining = 2500 - offset                     # 2500 total available
        n = max(0, min(page_size, remaining))
        feats = [{"attributes": {"PIN": str(offset + i),
                                 "ADDR_FULL": f"{offset + i} MAIN ST",
                                 "CTYNAME": "SEATTLE", "ZIP5": "98101",
                                 "KCTP_STATE": "CA"}} for i in range(n)]
        return {"features": feats, "exceededTransferLimit": (offset + n) < 2500}

    monkeypatch.setattr(adapter._common, "http_get_json", fake_get_json)
    recs = adapter._fetch_live(limit=5000)
    assert [c[0] for c in calls] == [0, 1000, 2000]   # 3rd page short -> stop
    assert len(recs) == 2500
    assert recs[0]["PIN"] == "0" and recs[-1]["PIN"] == "2499"


def test_fetch_live_dedupes_when_service_ignores_offset(adapter, monkeypatch):
    """Hardening: some ArcGIS layers silently ignore resultOffset and return the
    same window every page. Without a guard that inflates the ledger with
    duplicate PINs and loops to the cap. _fetch_live must dedupe by PIN and stop
    once a page adds nothing new."""
    def fake_get_json(url, params=None, **kw):
        page_size = int(params["resultRecordCount"])
        feats = [{"attributes": {"PIN": str(i), "ADDR_FULL": f"{i} X ST",
                                 "CTYNAME": "SEATTLE", "KCTP_STATE": "CA"}}
                 for i in range(page_size)]          # SAME rows every call
        return {"features": feats, "exceededTransferLimit": True}  # "more" forever

    monkeypatch.setattr(adapter._common, "http_get_json", fake_get_json)
    recs = adapter._fetch_live(limit=5000)
    pins = [r["PIN"] for r in recs]
    assert len(pins) == len(set(pins))     # no duplicate PINs
    assert len(recs) <= 1000               # stopped after the first (all-new) page


def test_fetch_live_respects_total_cap(adapter, monkeypatch):
    """Politeness bound: stop at `limit` even if the service says more exist."""
    def fake_get_json(url, params=None, **kw):
        offset = int(params.get("resultOffset", 0))
        page_size = int(params["resultRecordCount"])
        feats = [{"attributes": {"PIN": str(offset + i), "ADDR_FULL": f"{offset + i} X",
                                 "CTYNAME": "SEATTLE", "KCTP_STATE": "CA"}}
                 for i in range(page_size)]
        return {"features": feats, "exceededTransferLimit": True}  # always more

    monkeypatch.setattr(adapter._common, "http_get_json", fake_get_json)
    recs = adapter._fetch_live(limit=2500)
    assert len(recs) == 2500                          # capped, not runaway


def test_live_env_routes_to_arcgis(adapter, monkeypatch):
    seen = {}

    def fake(limit):
        seen["limit"] = limit
        return [{"PIN": "1", "ADDR_FULL": "5 B ST", "CTYNAME": "Seattle",
                 "ZIP5": "98101", "KCTP_STATE": "CA", "KCTP_CTYST": "LA CA"}]
    monkeypatch.setattr(adapter, "_fetch_live", lambda limit: fake(limit))
    monkeypatch.setenv(LIVE, "1")
    sigs = adapter.fetch(limit=17)
    assert seen["limit"] == 17
    assert len(sigs) == 1 and sigs[0]["evidence"]["owner_state"] == "CA"
    assert "fixture_data" not in sigs[0]["evidence"]   # live path unmarked
