"""Ambiguous-enrichment review flow (spine/review.py): list -> pick -> re-ingest.

Hermetic: tmp dirs, zero network (socket-guarded), the offline fixture resolver
only. Builds a real ambiguous pending row by ingesting an obituary whose
deceased name matches two parcels in the fixture owner index, running one
enrich pass (which parks both candidates), then reviewing it.
"""

import json
import socket

import pytest

from spine_test_utils import ROOT, FIXED_NOW  # noqa: F401 (wires sys.path)

from spine.enrich import run_enrich, load_pending
from spine.ingest import load_ledger_signals, run_ingest
from spine.review import apply_pick, list_ambiguous

RESOLVERS_DIR = ROOT / "resolvers"


# ---------------------------------------------------------------------------
# helpers (mirror test_enrich's real quarantine path)
# ---------------------------------------------------------------------------

def _obit_signal(name: str, sig_id: str, city="KLAMATH FALLS", state="OR",
                 county="KLAMATH") -> dict:
    return {
        "id": sig_id,
        "source": "newspaper_rss_obituaries_klamath_falls",
        "signal_type": "probate_lead",
        "observed_at": "2026-06-20T00:00:00+00:00",
        "property": {"apn": None, "address": None, "city": city, "state": state,
                     "zip": None, "lat": None, "lon": None},
        "owner": None,
        "evidence": {"deceased_name": name, "county": county},
        "source_url": None,
        "confidence": 0.2,
    }


def _seed_pending(tmp_path, signals):
    adapters = tmp_path / "adapters"
    adapters.mkdir(exist_ok=True)
    (adapters / "obit_seed.py").write_text(
        "import json\n"
        "SOURCE = 'newspaper_rss_obituaries_klamath_falls'\n"
        f"SIGNALS = json.loads({json.dumps(signals)!r})\n"
        "def fetch():\n"
        "    return SIGNALS\n"
    )
    ledger = tmp_path / "data" / "signals.jsonl"
    result = run_ingest(adapters, ledger)
    assert result.total_quarantined == len(signals)
    return ledger, tmp_path / "data" / "signals_pending.jsonl"


@pytest.fixture
def no_network(monkeypatch):
    def _no(*a, **k):
        raise AssertionError("review attempted a network connection")
    monkeypatch.delenv("DEALFLOW_LIVE", raising=False)
    monkeypatch.setattr(socket.socket, "connect", _no)


def _seed_ambiguous(tmp_path):
    """One obituary that resolves to 2 fixture parcels -> ambiguous pending."""
    ledger, pending = _seed_pending(
        tmp_path, [_obit_signal("Virginia May Rajnus", "ob-rajnus")])
    result = run_enrich(resolvers_dir=RESOLVERS_DIR, pending_path=pending,
                        ledger_path=ledger, now=FIXED_NOW)
    assert result.ambiguous == 1 and result.resolved == 0
    assert load_ledger_signals(ledger) == []
    return ledger, pending


# ---------------------------------------------------------------------------
# list
# ---------------------------------------------------------------------------

def test_list_surfaces_ambiguous_row_with_candidates(tmp_path, no_network):
    _, pending = _seed_ambiguous(tmp_path)
    items = list_ambiguous(pending)
    assert len(items) == 1
    it = items[0]
    assert it.name == "Virginia May Rajnus"
    assert it.status == "pending"
    assert it.resolver == "fixture_owner_index"
    assert {c["apn"] for c in it.candidates} == {
        "R-3810-032AD-00900", "R-4011-006B-01100"}


def test_list_empty_when_nothing_ambiguous(tmp_path, no_network):
    ledger, pending = _seed_pending(
        tmp_path, [_obit_signal("Janet Lorraine Lehman", "ob-lehman")])
    run_enrich(resolvers_dir=RESOLVERS_DIR, pending_path=pending,
               ledger_path=ledger, now=FIXED_NOW)                # resolves uniquely
    assert list_ambiguous(pending) == []


# ---------------------------------------------------------------------------
# pick -> re-ingest
# ---------------------------------------------------------------------------

def test_pick_anchors_signal_and_resolves_row(tmp_path, no_network):
    ledger, pending = _seed_ambiguous(tmp_path)
    key = list_ambiguous(pending)[0].dedupe_key

    res = apply_pick(key, 1, pending_path=pending, ledger_path=ledger,
                     now=FIXED_NOW)
    assert res.ok and res.wrote_ledger
    assert res.apn == "R-4011-006B-01100"

    sigs = load_ledger_signals(ledger)
    assert len(sigs) == 1
    sig = sigs[0]
    assert sig.property.apn == "R-4011-006B-01100"
    assert sig.property.address                      # anchored
    assert sig.property.state == "OR"                # original jurisdiction kept
    assert 0 < sig.confidence <= 0.4                 # name-match cap holds
    assert sig.evidence["enriched_by"] == "fixture_owner_index:human_pick"
    assert sig.evidence["human_pick"] is True
    assert sig.evidence["picked_candidate"]["apn"] == "R-4011-006B-01100"

    row = load_pending(pending)[key]
    assert row["status"] == "resolved"
    assert row["human_reviewed"] is True
    # resolved rows drop off the review list
    assert list_ambiguous(pending) == []


def test_pick_is_idempotent(tmp_path, no_network):
    ledger, pending = _seed_ambiguous(tmp_path)
    key = list_ambiguous(pending)[0].dedupe_key

    first = apply_pick(key, 0, pending_path=pending, ledger_path=ledger,
                       now=FIXED_NOW)
    assert first.ok and first.wrote_ledger
    # picking again (already resolved) is refused, ledger unchanged
    again = apply_pick(key, 0, pending_path=pending, ledger_path=ledger,
                       now=FIXED_NOW)
    assert not again.ok and "already resolved" in again.message
    assert len(load_ledger_signals(ledger)) == 1


def test_pick_out_of_range_touches_nothing(tmp_path, no_network):
    ledger, pending = _seed_ambiguous(tmp_path)
    key = list_ambiguous(pending)[0].dedupe_key
    res = apply_pick(key, 9, pending_path=pending, ledger_path=ledger,
                     now=FIXED_NOW)
    assert not res.ok and "out of range" in res.message
    assert load_ledger_signals(ledger) == []
    assert list_ambiguous(pending)[0].dedupe_key == key   # still awaiting


def test_pick_unknown_key_is_rejected(tmp_path, no_network):
    ledger, pending = _seed_ambiguous(tmp_path)
    res = apply_pick("nope:nobody", 0, pending_path=pending, ledger_path=ledger,
                     now=FIXED_NOW)
    assert not res.ok and "no pending row" in res.message
    assert load_ledger_signals(ledger) == []
