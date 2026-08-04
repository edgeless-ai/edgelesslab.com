"""Spokane code-complaint adapter — the distress half of the Spokane metro.
Hermetic: fixture default + monkeypatched live, zero network. The fixture is
real Accela case data pulled from the live city service. APN-anchored so it
merges with the Spokane absentee feed on the shared assessor parcel number.
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
        "dealflow_adapters.spokane_code_violations",
        ADAPTERS_DIR / "spokane_code_violations.py")
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
    assert all(s["signal_type"] == "code_violation" for s in sigs)
    assert all(s["evidence"].get("fixture_data") for s in sigs)
    assert all(s["property"]["state"] == "WA" for s in sigs)
    assert all(s["property"]["city"] == "SPOKANE" for s in sigs)
    assert all(s["evidence"]["county"] == "SPOKANE" for s in sigs)


def test_apn_anchored_for_spokane_merge(adapter):
    """Both this feed and the assessor absentee feed carry the parcel number
    in the '35082.4002' format; normalizing to alnum makes the merge exact."""
    rec = {"RecordId": "E26-04887", "Address": "2730 N STANDARD ST",
           "Parcel": "35082.4002", "ComplaintType": "Illegal Dumps",
           "ComplaintStatus": "Closed", "RecordOpenDate": 1780531200000}
    s = adapter._to_signal(rec)
    assert s["property"]["apn"] == "350824002"


def test_substandard_is_owner_distress_flagged(adapter):
    tier, conf, flag = adapter._classify("Substandard Building")
    assert (tier, conf, flag) == ("owner_distress", 0.8, True)


def test_fire_hazard_is_other_unflagged(adapter):
    """Spokane 'Fire Hazard' = weeds/combustible material, not a failing
    structure — deliberately NOT owner-distress (unlike Tacoma's vocab)."""
    tier, conf, flag = adapter._classify("Fire Hazard")
    assert (tier, conf, flag) == ("other", 0.5, False)
    assert adapter._classify("Graffiti") == ("other", 0.5, False)


def test_no_violation_outcome_is_dropped(adapter):
    """A complaint the city inspected and closed 'No Violation' is not a
    distress signal."""
    rec = {"RecordId": "E26-1", "Address": "1 A ST", "Parcel": "35082.4002",
           "ComplaintType": "Initial Inspection",
           "ComplaintStatus": "No Violation", "RecordOpenDate": 1780531200000}
    assert adapter._to_signal(rec) is None


def test_dropped_only_when_no_addr_and_no_pin(adapter):
    assert adapter._to_signal({"RecordId": "x", "ComplaintType": "Zoning Violation"}) is None
    # a record with only a PIN still anchors (APN merge)
    s = adapter._to_signal({"RecordId": "x", "Parcel": "35054.3507",
                            "ComplaintType": "Zoning Violation",
                            "RecordOpenDate": 1780531200000})
    assert s is not None and s["property"]["apn"] == "350543507"


def test_epoch_date_becomes_iso(adapter):
    s = adapter._to_signal({"RecordId": "E26-2", "Address": "5 B ST",
                            "Parcel": "9", "ComplaintType": "Substandard Building",
                            "RecordOpenDate": 1694592000000})
    assert s["observed_at"].startswith("2023-09-")
    assert s["confidence"] == 0.8


def test_fetch_live_paginates_and_dedupes(adapter, monkeypatch):
    calls = []

    def fake_get_json(url, params=None, **kw):
        offset = int(params.get("resultOffset", 0))
        page_size = int(params["resultRecordCount"])
        calls.append(offset)
        remaining = 4300 - offset                    # 4300 available
        n = max(0, min(page_size, remaining))
        feats = [{"attributes": {"RecordId": f"E{offset + i}",
                                 "Address": f"{offset + i} MAIN ST",
                                 "Parcel": f"{offset + i}",
                                 "ComplaintType": "Illegal Dumps",
                                 "ComplaintStatus": "Open"}} for i in range(n)]
        return {"features": feats, "exceededTransferLimit": (offset + n) < 4300}

    monkeypatch.setattr(adapter._common, "http_get_json", fake_get_json)
    recs = adapter._fetch_live(days=180, limit=6000)
    assert calls == [0, 2000, 4000]                  # 3rd page short -> stop
    assert len(recs) == 4300
    ids = [r["RecordId"] for r in recs]
    assert len(ids) == len(set(ids))                 # deduped


def test_live_env_routes_to_arcgis(adapter, monkeypatch):
    seen = {}

    def fake(days, limit):
        seen["days"], seen["limit"] = days, limit
        return [{"RecordId": "E26-9", "Address": "9 A ST", "Parcel": "35182.3103",
                 "ComplaintType": "Substandard Building",
                 "ComplaintStatus": "In Violation",
                 "RecordOpenDate": 1694592000000}]
    monkeypatch.setattr(adapter, "_fetch_live", fake)
    monkeypatch.setenv(LIVE, "1")
    sigs = adapter.fetch(days=90, limit=33)
    assert seen == {"days": 90, "limit": 33}
    assert len(sigs) == 1 and sigs[0]["evidence"]["distress_tier"] == "owner_distress"
    assert "fixture_data" not in sigs[0]["evidence"]
