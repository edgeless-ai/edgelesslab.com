"""Enrichment-stage tests: pending-file consumer, resolver registry,
identity/supersede semantics. Hermetic: tmp dirs, zero network (socket-
guarded), fixture resolvers only."""

import json
import socket

import pytest

from spine_test_utils import ROOT, FIXED_NOW  # noqa: F401 (wires sys.path)

from spine.enrich import (
    MAX_ATTEMPTS,
    discover_resolvers,
    load_pending,
    run_enrich,
)
from spine.ingest import load_ledger_signals, run_ingest

RESOLVERS_DIR = ROOT / "resolvers"


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _obit_signal(name: str, sig_id: str, city="KLAMATH FALLS", state="OR",
                 county="KLAMATH") -> dict:
    """An unanchored obituary Signal dict (the real quarantine shape)."""
    return {
        "id": sig_id,
        "source": "newspaper_rss_obituaries_klamath_falls",
        "signal_type": "obituary",
        "observed_at": "2026-07-01T00:00:00+00:00",
        "property": {"apn": None, "address": "", "city": city,
                     "state": state, "zip": "", "lat": None, "lon": None},
        "owner": None,
        "evidence": {"deceased_name": name, "metro": "klamath_falls",
                     "county": county},
        "source_url": None,
        "confidence": 0.2,
    }


def _seed_pending(tmp_path, signals: list[dict]):
    """Write initial quarantine rows the way ingest does (via a tmp adapter,
    so the rows go through the REAL quarantine path)."""
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


def _enrich(ledger, pending, **kw):
    return run_enrich(resolvers_dir=RESOLVERS_DIR, pending_path=pending,
                      ledger_path=ledger, now=FIXED_NOW, **kw)


@pytest.fixture
def no_network(monkeypatch):
    """Socket guard (pattern from test_live_flag): any connect() fails."""
    def _no(*a, **k):
        raise AssertionError("enrich attempted a network connection "
                             "while offline (DEALFLOW_LIVE unset)")
    monkeypatch.delenv("DEALFLOW_LIVE", raising=False)
    monkeypatch.setattr(socket.socket, "connect", _no)


# ---------------------------------------------------------------------------
# pending -> resolved flow
# ---------------------------------------------------------------------------

def test_pending_to_resolved_flow(tmp_path, no_network):
    """A quarantined obituary whose deceased matches exactly one fixture
    parcel gets anchored and re-emitted through the normal ingest append."""
    ledger, pending = _seed_pending(
        tmp_path, [_obit_signal("Janet Lorraine Lehman", "ob-lehman")])
    assert load_ledger_signals(ledger) == []          # quarantined, not ingested

    result = _enrich(ledger, pending)
    assert result.resolvers == ["philly_opa", "fixture_owner_index"]
    assert result.examined == 1
    assert result.resolved == 1
    assert result.resolver_errors == {}

    sigs = load_ledger_signals(ledger)
    assert len(sigs) == 1
    sig = sigs[0]
    # property block filled
    assert sig.property.address == "1934 Earle St"
    assert sig.property.apn == "R-3809-025BB-01700"
    assert sig.property.zip == "97601"
    # confidence adjusted but capped — a name match is never > 0.4
    assert 0 < sig.confidence <= 0.4
    # provenance in evidence, not identity
    assert sig.evidence["enriched_by"] == "fixture_owner_index"
    assert sig.evidence["enrichment"]["original_confidence"] == 0.2
    assert sig.evidence["deceased_name"] == "Janet Lorraine Lehman"

    row = load_pending(pending)[sig.dedupe_key]
    assert row["status"] == "resolved"
    assert row["attempts"] == 1
    assert row["enriched_by"] == "fixture_owner_index"


def test_identity_preserved_supersedes_pending_twin(tmp_path, no_network):
    """THE identity decision: the enriched signal keeps the pending twin's
    exact (source, id) — same dedupe_key — so it supersedes, never duplicates."""
    ledger, pending = _seed_pending(
        tmp_path, [_obit_signal("Edward Sawyer", "ob-sawyer")])
    pending_key = next(iter(load_pending(pending)))

    _enrich(ledger, pending)
    sigs = load_ledger_signals(ledger)
    assert [s.dedupe_key for s in sigs] == [pending_key]
    assert sigs[0].id == "ob-sawyer"
    assert sigs[0].source == "newspaper_rss_obituaries_klamath_falls"


def test_enrich_twice_no_duplicates(tmp_path, no_network):
    """Idempotency: a second enrich pass writes nothing new to the ledger
    and skips already-resolved rows."""
    ledger, pending = _seed_pending(
        tmp_path, [_obit_signal("Janet Lorraine Lehman", "ob-lehman"),
                   _obit_signal("Edward Sawyer", "ob-sawyer")])
    first = _enrich(ledger, pending)
    assert first.resolved == 2

    second = _enrich(ledger, pending)
    assert second.resolved == 0
    assert second.duplicates == 0        # resolved rows aren't even re-tried
    assert second.skipped == 2
    assert len(load_ledger_signals(ledger)) == 2

    # ledger file itself has exactly 2 rows (no appended twins)
    n_lines = len(ledger.read_text().strip().splitlines())
    assert n_lines == 2


def test_reingest_after_enrichment_never_resurrects_raw_twin(tmp_path, no_network):
    """The raw unanchored signal keeps arriving from the adapter on every
    ingest; the pending-file dedupe + shared (source, id) identity mean the
    ledger never gains a second copy."""
    signals = [_obit_signal("Janet Lorraine Lehman", "ob-lehman")]
    ledger, pending = _seed_pending(tmp_path, signals)
    _enrich(ledger, pending)
    assert len(load_ledger_signals(ledger)) == 1

    # upstream serves the same record again
    rerun = run_ingest(tmp_path / "adapters", ledger)
    assert rerun.total_written == 0
    assert len(load_ledger_signals(ledger)) == 1
    # pending row still says resolved (ingest didn't reset it)
    row = next(iter(load_pending(pending).values()))
    assert row["status"] == "resolved"
    # and another enrich pass still writes nothing
    again = _enrich(ledger, pending)
    assert again.resolved == 0 and again.skipped == 1
    assert len(load_ledger_signals(ledger)) == 1


# ---------------------------------------------------------------------------
# ambiguity: never guess
# ---------------------------------------------------------------------------

def test_ambiguous_match_stays_pending_with_candidates(tmp_path, no_network):
    """Two parcels for one owner name: the signal stays pending and EVERY
    candidate is recorded in evidence — no guessing between parcels."""
    ledger, pending = _seed_pending(
        tmp_path, [_obit_signal("Virginia May Rajnus", "ob-rajnus")])
    result = _enrich(ledger, pending)
    assert result.ambiguous == 1
    assert result.resolved == 0
    assert load_ledger_signals(ledger) == []          # nothing hit the ledger

    row = next(iter(load_pending(pending).values()))
    assert row["status"] == "pending"
    assert row["attempts"] == 1
    cands = row["signal"]["evidence"]["enrichment_candidates"]
    assert len(cands) == 2
    assert {c["apn"] for c in cands} == {"R-3810-032AD-00900", "R-4011-006B-01100"}
    assert row["signal"]["evidence"]["enrichment_candidates_by"] == "fixture_owner_index"


# ---------------------------------------------------------------------------
# attempts counter + unresolvable parking
# ---------------------------------------------------------------------------

def test_attempts_counter_and_unresolvable_after_max(tmp_path, no_network):
    ledger, pending = _seed_pending(
        tmp_path, [_obit_signal("Zebulon Nomatch", "ob-nomatch")])

    for expected_attempts in range(1, MAX_ATTEMPTS + 1):
        result = _enrich(ledger, pending)
        row = next(iter(load_pending(pending).values()))
        assert row["attempts"] == expected_attempts
        assert row["last_attempt"] == FIXED_NOW.isoformat()
        if expected_attempts < MAX_ATTEMPTS:
            assert result.unmatched == 1
            assert row["status"] == "pending"
        else:
            assert result.newly_unresolvable == 1
            assert row["status"] == "unresolvable"

    # a 4th pass doesn't retry it — and never deletes it
    result4 = _enrich(ledger, pending)
    assert result4.examined == 0
    assert result4.skipped == 1
    row = next(iter(load_pending(pending).values()))
    assert row["status"] == "unresolvable"
    assert row["attempts"] == MAX_ATTEMPTS
    assert load_ledger_signals(ledger) == []


def test_pending_file_is_append_only_event_log(tmp_path, no_network):
    """History is never rewritten: every pass appends an updated row; the
    original quarantine row survives; last-row-per-key wins on read."""
    ledger, pending = _seed_pending(
        tmp_path, [_obit_signal("Zebulon Nomatch", "ob-nomatch")])
    assert len(pending.read_text().strip().splitlines()) == 1

    _enrich(ledger, pending)
    _enrich(ledger, pending)
    lines = [json.loads(l) for l in pending.read_text().strip().splitlines()]
    assert len(lines) == 3                       # ingest row + 2 enrich updates
    assert len({l["dedupe_key"] for l in lines}) == 1
    assert "status" not in lines[0]              # untouched original
    assert [l.get("attempts") for l in lines[1:]] == [1, 2]
    assert len(load_pending(pending)) == 1       # one logical row


# ---------------------------------------------------------------------------
# offline default = zero network
# ---------------------------------------------------------------------------

def test_offline_default_makes_zero_network_calls(tmp_path, no_network):
    """The whole enrich pass — including a Philadelphia-jurisdiction signal
    that would tempt the live OPA resolver — opens no sockets by default."""
    philly = _obit_signal("John Fred Smith", "ob-philly",
                          city="PHILADELPHIA", state="PA", county="PHILADELPHIA")
    ledger, pending = _seed_pending(
        tmp_path, [philly, _obit_signal("Janet Lorraine Lehman", "ob-lehman")])

    result = _enrich(ledger, pending)             # socket guard is armed
    assert result.resolver_errors == {}
    assert result.resolved == 1                   # Klamath via fixture resolver
    assert result.unmatched == 1                  # Philly declined offline


# ---------------------------------------------------------------------------
# resolver registry (adapter-pattern parity)
# ---------------------------------------------------------------------------

def test_crashing_resolver_is_isolated(tmp_path, no_network):
    resolvers = tmp_path / "resolvers"
    resolvers.mkdir()
    (resolvers / "boom.py").write_text(
        "ORDER = 1\ndef resolve(signal):\n    raise RuntimeError('down')\n")
    (resolvers / "steady.py").write_text(
        "ORDER = 2\n"
        "def resolve(signal):\n"
        "    return {'status': 'resolved', 'confidence': 0.3,\n"
        "            'property': {'address': '1 Ok St', 'city': 'X',\n"
        "                         'state': 'FL', 'zip': '33990'},\n"
        "            'evidence': {}}\n")
    ledger, pending = _seed_pending(
        tmp_path, [_obit_signal("Any Name", "ob-1")])
    result = run_enrich(resolvers_dir=resolvers, pending_path=pending,
                        ledger_path=ledger, now=FIXED_NOW)
    assert "RuntimeError" in result.resolver_errors["boom"]
    assert result.resolved == 1                   # steady still resolved it
    assert load_ledger_signals(ledger)[0].evidence["enriched_by"] == "steady"


def test_registry_order_enabled_private_and_resolveless(tmp_path):
    resolvers = tmp_path / "resolvers"
    resolvers.mkdir()
    (resolvers / "zz_first.py").write_text("ORDER = 1\ndef resolve(s):\n    return None\n")
    (resolvers / "aa_last.py").write_text("ORDER = 50\ndef resolve(s):\n    return None\n")
    (resolvers / "named.py").write_text("NAME = 'custom'\ndef resolve(s):\n    return None\n")
    (resolvers / "wip.py").write_text("ENABLED = False\ndef resolve(s):\n    return None\n")
    (resolvers / "_private.py").write_text("def resolve(s):\n    return None\n")
    (resolvers / "no_resolve.py").write_text("X = 1\n")
    (resolvers / "broken.py").write_text("def resolve(:\n")
    found = discover_resolvers(resolvers)
    assert [n for n, _ in found] == ["zz_first", "aa_last", "custom"]


def test_first_resolved_wins_over_later_ambiguous(tmp_path, no_network):
    """ORDER is trust order: a definitive match from an earlier resolver
    short-circuits; an early ambiguous answer still lets later resolvers try."""
    resolvers = tmp_path / "resolvers"
    resolvers.mkdir()
    (resolvers / "vague.py").write_text(
        "ORDER = 1\n"
        "def resolve(signal):\n"
        "    return {'status': 'ambiguous', 'resolver': 'vague',\n"
        "            'candidates': [{'apn': 'A'}, {'apn': 'B'}], 'evidence': {}}\n")
    (resolvers / "sure.py").write_text(
        "ORDER = 2\n"
        "def resolve(signal):\n"
        "    return {'status': 'resolved', 'confidence': 0.3,\n"
        "            'property': {'address': '9 Sure St', 'city': 'X',\n"
        "                         'state': 'FL', 'zip': '33990'},\n"
        "            'evidence': {}}\n")
    ledger, pending = _seed_pending(tmp_path, [_obit_signal("Any Name", "ob-1")])
    result = run_enrich(resolvers_dir=resolvers, pending_path=pending,
                        ledger_path=ledger, now=FIXED_NOW)
    assert result.resolved == 1 and result.ambiguous == 0
    assert load_ledger_signals(ledger)[0].property.address == "9 Sure St"


def test_unanchored_resolution_rejected_defensively(tmp_path, no_network):
    """A resolver that claims 'resolved' but returns no anchor can't smuggle
    an unanchored signal into the ledger."""
    resolvers = tmp_path / "resolvers"
    resolvers.mkdir()
    (resolvers / "liar.py").write_text(
        "def resolve(signal):\n"
        "    return {'status': 'resolved', 'confidence': 0.3,\n"
        "            'property': {}, 'evidence': {}}\n")
    ledger, pending = _seed_pending(tmp_path, [_obit_signal("Any Name", "ob-1")])
    result = run_enrich(resolvers_dir=resolvers, pending_path=pending,
                        ledger_path=ledger, now=FIXED_NOW)
    assert result.resolved == 0
    assert "unanchored" in result.resolver_errors["liar"]
    assert load_ledger_signals(ledger) == []
    assert next(iter(load_pending(pending).values()))["status"] == "pending"


# ---------------------------------------------------------------------------
# the live philly_opa resolver (match logic on the SAVED live sample — no net)
# ---------------------------------------------------------------------------

@pytest.fixture
def philly_opa():
    mods = dict(discover_resolvers(RESOLVERS_DIR))
    return mods["philly_opa"]


@pytest.fixture
def opa_sample():
    return json.loads(
        (ROOT / "fixtures" / "resolvers" / "philly_opa_sample.json").read_text())


def test_philly_opa_unique_match_resolves(philly_opa, opa_sample):
    out = philly_opa.evaluate_rows("John Fred Smith",
                                   opa_sample["unique_match"]["rows"])
    assert out["status"] == "resolved"
    assert out["confidence"] <= 0.4
    assert out["property"]["apn"] == "361285400"
    assert out["property"]["address"] == "2235 LATONA ST"
    assert out["property"]["state"] == "PA"
    assert out["evidence"]["county"] == "PHILADELPHIA"
    assert out["evidence"]["assessed_value"] == 314000


def test_philly_opa_common_name_is_ambiguous_not_guessed(philly_opa, opa_sample):
    """25 live rows for 'SMITH JOHN%': exact-ish filtering keeps the bare
    'SMITH JOHN' owners AND 'SMITH JOHN FRED' as candidates (any could be
    the deceased) — ambiguous, never a guess."""
    rows = opa_sample["ambiguous_match"]["rows"]
    out = philly_opa.evaluate_rows("John Fred Smith", rows)
    assert out["status"] == "ambiguous"
    assert len(out["candidates"]) >= 2
    owners = {c["owner_1"] for c in out["candidates"]}
    assert "SMITH JOHN FRED" in owners
    # exact-ish filter really dropped the different people
    assert "SMITH JOHNSON KEISHA" not in owners
    assert "SMITH JOHNNIE" not in owners


def test_philly_opa_owner2_match_reports_right_owner(philly_opa, opa_sample):
    """A parcel whose SECOND owner is the match (live-verified: Cheryl Lynne
    McGovern -> 1434 S NEWKIRK ST) must report that owner in evidence, not
    owner_1."""
    rows = opa_sample["ambiguous_match"]["rows"]
    out = philly_opa.evaluate_rows("Cheryl Lynne McGovern", rows)
    assert out["status"] == "resolved"
    assert out["property"]["apn"] == "364366300"
    assert out["evidence"]["matched_owner"] == "MCGOVERN CHERYL LYNNE"


def test_philly_opa_gates(philly_opa, monkeypatch):
    monkeypatch.delenv("DEALFLOW_LIVE", raising=False)
    # jurisdiction gate: not Philadelphia -> None, no network attempted
    assert philly_opa.resolve(_obit_signal("John Fred Smith", "x")) is None
    # junk owner-name gate ('not available' is not a person)
    philly = _obit_signal("x", "x", city="PHILADELPHIA", state="PA",
                          county="PHILADELPHIA")
    philly["evidence"]["deceased_name"] = None
    philly["owner"] = {"name": "not available"}
    assert philly_opa.resolve(philly) is None
    # live-only gate: in-jurisdiction + good name, but offline -> None
    good = _obit_signal("John Fred Smith", "x", city="PHILADELPHIA",
                        state="PA", county="PHILADELPHIA")
    assert philly_opa.resolve(good) is None


def test_philly_opa_live_path_with_stubbed_query(philly_opa, opa_sample,
                                                 monkeypatch):
    """Full resolve() in live mode with the HTTP hop stubbed by the saved
    live sample — proves the wiring without a socket."""
    monkeypatch.setenv("DEALFLOW_LIVE", "1")
    seen = {}

    def fake_query(query_name):
        seen["query"] = query_name
        return opa_sample["unique_match"]["rows"]

    monkeypatch.setattr(philly_opa, "_query_rows", fake_query)
    sig = _obit_signal("John Fred Smith", "ob-x", city="PHILADELPHIA",
                       state="PA", county="PHILADELPHIA")
    out = philly_opa.resolve(sig)
    assert seen["query"] == "SMITH JOHN"          # LAST FIRST assessor prefix
    assert out["status"] == "resolved"
    assert out["property"]["apn"] == "361285400"


# ---------------------------------------------------------------------------
# full pipeline: enrich runs after ingest, before merge
# ---------------------------------------------------------------------------

def test_pipeline_enriches_between_ingest_and_merge(tmp_path, no_network):
    """cli.py run order: a quarantined obituary is resolved and becomes a
    routed candidate in the SAME run — and a second run changes nothing."""
    from spine.criteria import BuyBox
    from spine.pipeline import Paths, run_pipeline

    adapters = tmp_path / "adapters"
    adapters.mkdir()
    sig = _obit_signal("Janet Lorraine Lehman", "ob-lehman")
    (adapters / "obits.py").write_text(
        "import json\n"
        "SOURCE = 'newspaper_rss_obituaries_klamath_falls'\n"
        f"SIG = json.loads({json.dumps(sig)!r})\n"
        "def fetch():\n    return [SIG]\n"
    )
    paths = Paths(root=tmp_path, adapters_dir=adapters,
                  data_dir=tmp_path / "data")   # resolvers_dir = real registry

    result = run_pipeline(paths=paths, buybox=BuyBox(), now=FIXED_NOW)
    assert result.ingest.total_quarantined == 1
    assert result.enrich.resolved == 1
    addrs = [c.property.address for c in result.candidates]
    assert addrs == ["1934 Earle St"]             # enriched signal was merged+routed
    cand = result.candidates[0]
    assert cand.signals[0].evidence["enriched_by"] == "fixture_owner_index"
    assert cand.signals[0].confidence <= 0.4

    result2 = run_pipeline(paths=paths, buybox=BuyBox(), now=FIXED_NOW)
    assert result2.ingest.total_written == 0
    assert result2.enrich.resolved == 0
    assert result2.enrich.skipped == 1
    assert len(result2.candidates) == 1           # no duplicate property
    assert len(load_ledger_signals(paths.ledger)) == 1
