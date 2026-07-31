"""Denver residential-health-complaint adapter — the Mountain distress feed.
Hermetic: fixture default + monkeypatched live, zero network. The fixture is
real Founded-complaint ArcGIS data pulled from the live service.
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
        "dealflow_adapters.denver_health_complaints",
        ADAPTERS_DIR / "denver_health_complaints.py")
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
    assert all(s["property"]["state"] == "CO" for s in sigs)
    assert all(s["property"]["city"] == "DENVER" for s in sigs)
    assert all(s["evidence"]["county"] == "DENVER" for s in sigs)


def test_founded_outcome_is_strong(adapter):
    assert adapter._confidence("Founded") == 0.6
    assert adapter._confidence("Unsubstantiated") == 0.3
    assert adapter._confidence("") == 0.45


def test_address_parse_drops_unit_and_lifts_zip(adapter):
    # unit part dropped so units in one building merge; no trailing zip here
    assert adapter._parse_address("240 S MONACO ST, UNIT D-301, DENVER, CO") == \
        ("240 S MONACO ST", "")
    # zip lifted from the tail when present
    assert adapter._parse_address("1209 N ASH ST, DENVER, CO 80220") == \
        ("1209 N ASH ST", "80220")
    assert adapter._parse_address("") == ("", "")


def test_classify_distress_vs_routine(adapter):
    assert adapter._classify("Residential Health - vacant unit, no heat") == \
        ("owner_distress", True)
    assert adapter._classify("Residential Health - 100 Main St") == \
        ("health_complaint", False)


def test_no_address_drops_record(adapter):
    assert adapter._to_signal({"RECORD_ID": "x", "FULL_ADDRESS": ""}) is None
    assert adapter._to_signal({"RECORD_ID": "x"}) is None


def test_epoch_date_becomes_iso(adapter):
    rec = {"RECORD_ID": "r1", "FULL_ADDRESS": "1209 N ASH ST, DENVER, CO 80220",
           "INCIDENT_DATE": 1718863200000, "COMPLAINT_OUTCOME": "Founded",
           "RECORD_NAME": "Residential Health - 1209 N Ash St"}
    s = adapter._to_signal(rec)
    assert s["observed_at"].startswith("2024-06-")     # epoch ms -> ISO date
    assert s["confidence"] == 0.6
    assert s["property"]["zip"] == "80220"


def test_live_env_routes_to_arcgis(adapter, monkeypatch):
    seen = {}

    def fake(days, limit):
        seen["days"], seen["limit"] = days, limit
        return [{"RECORD_ID": "9", "FULL_ADDRESS": "5 B ST, DENVER, CO 80202",
                 "COMPLAINT_OUTCOME": "Founded", "RECORD_NAME": "Residential Health - mold",
                 "INCIDENT_DATE": 1718863200000}]
    monkeypatch.setattr(adapter, "_fetch_live", fake)
    monkeypatch.setenv(LIVE, "1")
    sigs = adapter.fetch(days=180, limit=42)
    assert seen == {"days": 180, "limit": 42}
    assert len(sigs) == 1
    assert sigs[0]["evidence"]["distress_tier"] == "owner_distress"
    assert "fixture_data" not in sigs[0]["evidence"]     # live path unmarked
