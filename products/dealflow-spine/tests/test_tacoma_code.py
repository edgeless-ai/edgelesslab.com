"""Tacoma code-violation adapter — the distress half of the Tacoma metro.
Hermetic: fixture default + monkeypatched live, zero network. The fixture is
real ArcGIS case data pulled from the live service. APN-anchored so it merges
with the Pierce absentee feed on the shared 10-digit parcel number.
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
        "dealflow_adapters.tacoma_code_violations",
        ADAPTERS_DIR / "tacoma_code_violations.py")
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
    assert all(s["property"]["city"] == "TACOMA" for s in sigs)
    assert all(s["evidence"]["county"] == "PIERCE" for s in sigs)


def test_apn_anchored_for_pierce_merge(adapter):
    """Both this feed and Pierce absentee carry the 10-digit parcel number;
    anchoring on APN (not address) makes the parcel merge exact."""
    rec = {"casenumber": "C1", "address": "2113 E 65TH ST",
           "parcelnumber": "2445220570", "casetype": "Nuisance",
           "opendate": 1694592000000}
    s = adapter._to_signal(rec)
    assert s["property"]["apn"] == "2445220570"


def test_derelict_is_owner_distress_flagged(adapter):
    tier, conf, flag = adapter._classify("Derelict Building - 2.01.060 (D)")
    assert (tier, conf, flag) == ("owner_distress", 0.8, True)
    tier2, conf2, flag2 = adapter._classify("Substandard Building")
    assert flag2 is True and conf2 == 0.8


def test_graffiti_is_other_unflagged(adapter):
    tier, conf, flag = adapter._classify("Graffiti")
    assert (tier, conf, flag) == ("other", 0.5, False)


def test_dropped_only_when_no_addr_and_no_pin(adapter):
    assert adapter._to_signal({"casenumber": "x"}) is None
    # a record with only a PIN still anchors (APN merge)
    s = adapter._to_signal({"casenumber": "x", "parcelnumber": "1234567890",
                            "casetype": "Nuisance", "opendate": 1694592000000})
    assert s is not None and s["property"]["apn"] == "1234567890"


def test_epoch_date_becomes_iso(adapter):
    s = adapter._to_signal({"casenumber": "C2", "address": "5 B ST",
                            "parcelnumber": "9", "casetype": "Derelict Building",
                            "opendate": 1694592000000})
    assert s["observed_at"].startswith("2023-09-")
    assert s["confidence"] == 0.8


def test_live_env_routes_to_arcgis(adapter, monkeypatch):
    seen = {}

    def fake(days, limit):
        seen["days"], seen["limit"] = days, limit
        return [{"casenumber": "C9", "address": "9 A ST", "parcelnumber": "5551112223",
                 "casetype": "Substandard Building", "opendate": 1694592000000}]
    monkeypatch.setattr(adapter, "_fetch_live", fake)
    monkeypatch.setenv(LIVE, "1")
    sigs = adapter.fetch(days=90, limit=33)
    assert seen == {"days": 90, "limit": 33}
    assert len(sigs) == 1 and sigs[0]["evidence"]["distress_tier"] == "owner_distress"
    assert "fixture_data" not in sigs[0]["evidence"]
