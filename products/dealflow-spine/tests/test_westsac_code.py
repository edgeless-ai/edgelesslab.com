"""West Sacramento code-enforcement adapter — a West Coast (CA/Yolo) distress
feed. Hermetic: fixture default + monkeypatched live, zero network. The fixture
is real ArcGIS case data pulled from the live service.
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
        "dealflow_adapters.westsac_code_enforcement",
        ADAPTERS_DIR / "westsac_code_enforcement.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture
def no_network(monkeypatch):
    def _refuse(*a, **k):
        raise AssertionError("network attempted in a hermetic test")
    monkeypatch.setattr(socket.socket, "connect", _refuse)


def test_disabled_in_default_pipeline(adapter):
    """West Sac is single-signal + low-score (watch-tier only), so it is
    excluded from the default pipeline (discover_adapters skips ENABLED=False).
    The adapter still works when imported/enabled directly."""
    assert adapter.ENABLED is False


def test_offline_default_serves_fixture(adapter, no_network, monkeypatch):
    monkeypatch.delenv(LIVE, raising=False)
    sigs = adapter.fetch()
    assert sigs, "fixture returned no signals"
    assert all(s["signal_type"] == "code_violation" for s in sigs)
    assert all(s["evidence"].get("fixture_data") for s in sigs)
    assert all(s["property"]["state"] == "CA" for s in sigs)
    assert all(s["property"]["city"] == "WEST SACRAMENTO" for s in sigs)
    assert all(s["evidence"]["county"] == "YOLO" for s in sigs)
    # honest: no invented distress flag (feed has no complaint detail)
    assert all(s["evidence"]["distress_hint"] is False for s in sigs)


def test_status_drives_confidence(adapter):
    assert adapter._confidence("ENFORCEMENT") == 0.6
    assert adapter._confidence("Complaint Received") == 0.4
    assert adapter._confidence("CLOSED") == 0.35
    assert adapter._confidence("") == 0.4


def test_address_parse_lifts_zip(adapter):
    assert adapter._parse_address("1917 WEST CAPITOL AVE, WEST SACRAMENTO, CA 95691") == \
        ("1917 WEST CAPITOL AVE", "95691")
    assert adapter._parse_address("") == ("", "")


def test_no_address_drops_record(adapter):
    assert adapter._to_signal({"CaseNumber": "x", "Address": ""}) is None
    assert adapter._to_signal({"CaseNumber": "x"}) is None


def test_epoch_date_becomes_iso(adapter):
    rec = {"CaseNumber": "CE25-1", "Address": "5 B ST, WEST SACRAMENTO, CA 95691",
           "DateOpened": 1718863200000, "Status": "ENFORCEMENT"}
    s = adapter._to_signal(rec)
    assert s["observed_at"].startswith("2024-06-")
    assert s["confidence"] == 0.6
    assert s["property"]["zip"] == "95691"


def test_live_env_routes_to_arcgis(adapter, monkeypatch):
    seen = {}

    def fake(days, limit):
        seen["days"], seen["limit"] = days, limit
        return [{"CaseNumber": "CE25-9", "Address": "9 A ST, WEST SACRAMENTO, CA 95605",
                 "DateOpened": 1718863200000, "Status": "INSPECTIONS"}]
    monkeypatch.setattr(adapter, "_fetch_live", fake)
    monkeypatch.setenv(LIVE, "1")
    sigs = adapter.fetch(days=200, limit=50)
    assert seen == {"days": 200, "limit": 50}
    assert len(sigs) == 1
    assert sigs[0]["confidence"] == 0.5
    assert "fixture_data" not in sigs[0]["evidence"]     # live path unmarked
