"""Seattle code-complaint distress classifier — owner-distress vs tenant-dispute.

The record-type vocab ("Emergency", "Housing", "LandLord/Tenant") over-fires on
distress under a naive keyword match, so a tenant's "Emergency, LandLord/Tenant
— 3 day notice" must NOT read as an owner-sell signal. Hermetic: tests the pure
_classify + _seattle_to_signal mapping, no network.
"""

import importlib.util
import sys
from pathlib import Path

import pytest

from spine_test_utils import ROOT  # noqa: F401 (wires sys.path)

ADAPTERS_DIR = Path(ROOT) / "adapters"


@pytest.fixture
def adapter(monkeypatch):
    """Real adapter bound to the real _common (pattern from test_assumable_live)."""
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
        "dealflow_adapters.portland_code_violations",
        ADAPTERS_DIR / "portland_code_violations.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest.mark.parametrize("desc", [
    "Emergency , Vacant Building — NA (EO Vacate Close Issued)",
    "Severe fire in her apartment building",
    "Water damage in home 5/21, roof and floor damaged",
    "structure is boarded and condemned",
    "derelict building, roof collapse",
])
def test_owner_distress_ranks_high_and_flags(adapter, desc):
    tier, conf, distress = adapter._classify(desc)
    assert tier == "owner_distress"
    assert conf == 0.8
    assert distress is True


@pytest.mark.parametrize("desc", [
    "Emergency , LandLord/Tenant — 3 day notice",
    "Received rent increase, no 180-day notice",
    "lease dispute with tenant over the deposit",
])
def test_tenant_dispute_is_low_and_unflagged(adapter, desc):
    tier, conf, distress = adapter._classify(desc)
    assert tier == "tenant_dispute"
    assert conf == 0.4
    assert distress is False


def test_other_is_midlow(adapter):
    tier, conf, distress = adapter._classify("weeds along the sidewalk")
    assert (tier, conf, distress) == ("other", 0.5, False)


def test_owner_distress_wins_over_tenant_terms(adapter):
    # vacant + tenant both present -> the vacant structure dominates
    tier, _, distress = adapter._classify("vacant building, former tenant left")
    assert tier == "owner_distress" and distress is True


def test_seattle_signal_carries_tier_and_confidence(adapter):
    base = {"recordnum": "X-1", "originaladdress1": "1 A ST",
            "originalcity": "SEATTLE", "originalstate": "WA",
            "originalzip": "98101"}
    hot = adapter._seattle_to_signal(
        dict(base, recordtypedesc="Emergency , Vacant Building",
             description="boarded up"))
    assert hot["confidence"] == 0.8
    assert hot["evidence"]["distress_tier"] == "owner_distress"
    assert hot["evidence"]["distress_hint"] is True

    tenant = adapter._seattle_to_signal(
        dict(base, recordtypedesc="Emergency , LandLord/Tenant",
             description="3 day notice"))
    assert tenant["confidence"] == 0.4
    assert tenant["evidence"]["distress_tier"] == "tenant_dispute"
    assert tenant["evidence"]["distress_hint"] is False
