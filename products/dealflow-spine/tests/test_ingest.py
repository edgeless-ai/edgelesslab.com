"""Adapter registry + idempotent ledger tests. Hermetic: tmp adapter dirs only."""

import json

from spine.ingest import (
    discover_adapters,
    existing_dedupe_keys,
    load_ledger_signals,
    run_ingest,
)


def test_run_twice_writes_nothing_new(tmp_adapters_dir, tmp_path):
    """THE dedupe invariant: same adapters, same upstream -> 0 new rows."""
    ledger = tmp_path / "data" / "signals.jsonl"
    first = run_ingest(tmp_adapters_dir, ledger)
    assert first.total_written == 13
    assert first.total_duplicates == 0
    n_lines = len(ledger.read_text().strip().splitlines())
    assert n_lines == 13

    second = run_ingest(tmp_adapters_dir, ledger)
    assert second.total_written == 0
    assert second.total_duplicates == 13
    assert len(ledger.read_text().strip().splitlines()) == n_lines


def test_ledger_roundtrip(tmp_adapters_dir, tmp_path):
    ledger = tmp_path / "signals.jsonl"
    run_ingest(tmp_adapters_dir, ledger)
    signals = load_ledger_signals(ledger)
    assert len(signals) == 13
    assert len({s.dedupe_key for s in signals}) == 13


def test_invalid_and_unanchored_signals_kept_out_of_ledger(tmp_path):
    adapters = tmp_path / "adapters"
    adapters.mkdir()
    (adapters / "half_bad.py").write_text(
        "def fetch():\n"
        "    good = {'id': 'g1', 'signal_type': 'other',\n"
        "            'observed_at': '2026-06-01T00:00:00+00:00',\n"
        "            'property': {'address': '1 Ok St', 'state': 'FL', 'zip': '33990'}}\n"
        "    unanchored = {'id': 'b1', 'signal_type': 'obituary',\n"
        "                  'observed_at': '2026-06-01T00:00:00+00:00',\n"
        "                  'property': {'address': '', 'apn': None, 'city': 'CAPE CORAL',\n"
        "                               'state': 'FL', 'zip': ''}}\n"
        "    not_even_a_dict = 42\n"
        "    return [good, unanchored, not_even_a_dict]\n"
    )
    ledger = tmp_path / "signals.jsonl"
    result = run_ingest(adapters, ledger)
    report = result.adapters[0]
    assert report.written == 1
    assert report.quarantined == 1   # parseable but no address/apn -> pending
    assert report.invalid == 1       # 42 is not a signal
    assert len(load_ledger_signals(ledger)) == 1


def test_quarantine_is_idempotent_and_carries_problems(tmp_path):
    adapters = tmp_path / "adapters"
    adapters.mkdir()
    (adapters / "obits.py").write_text(
        "def fetch():\n"
        "    return [{'id': 'ob1', 'signal_type': 'obituary',\n"
        "             'observed_at': '2026-06-01T00:00:00+00:00',\n"
        "             'property': {'address': '', 'city': 'CAPE CORAL', 'state': 'FL'},\n"
        "             'evidence': {'deceased_name': 'X Y'}}]\n"
    )
    ledger = tmp_path / "signals.jsonl"
    pending = tmp_path / "signals_pending.jsonl"
    run_ingest(adapters, ledger)
    run_ingest(adapters, ledger)  # second run must not duplicate pending rows
    rows = [json.loads(l) for l in pending.read_text().strip().splitlines()]
    assert len(rows) == 1
    assert rows[0]["dedupe_key"] == "obits:ob1"
    assert any("neither address nor apn" in p for p in rows[0]["problems"])
    assert not ledger.exists() or load_ledger_signals(ledger) == []


def test_crashing_adapter_is_isolated(tmp_path):
    adapters = tmp_path / "adapters"
    adapters.mkdir()
    (adapters / "boom.py").write_text(
        "def fetch():\n    raise RuntimeError('upstream down')\n"
    )
    (adapters / "steady.py").write_text(
        "def fetch():\n"
        "    return [{'id': 's1', 'signal_type': 'other',\n"
        "             'observed_at': '2026-06-01T00:00:00+00:00',\n"
        "             'property': {'address': '1 Ok St', 'state': 'FL', 'zip': '33990'}}]\n"
    )
    result = run_ingest(adapters, tmp_path / "signals.jsonl")
    by_name = {a.name: a for a in result.adapters}
    assert "RuntimeError" in by_name["boom"].error
    assert by_name["steady"].written == 1
    assert result.failed_adapters == ["boom"]


def test_broken_import_does_not_block_others(tmp_path):
    adapters = tmp_path / "adapters"
    adapters.mkdir()
    (adapters / "syntax_err.py").write_text("def fetch(:\n")
    (adapters / "fine.py").write_text("def fetch():\n    return []\n")
    found = discover_adapters(adapters)
    assert "fine" in found and "syntax_err" not in found


def test_disabled_and_private_and_fetchless_modules_skipped(tmp_path):
    adapters = tmp_path / "adapters"
    adapters.mkdir()
    (adapters / "wip.py").write_text("ENABLED = False\ndef fetch():\n    return []\n")
    (adapters / "_helper.py").write_text("def fetch():\n    return []\n")
    (adapters / "no_fetch.py").write_text("X = 1\n")
    assert discover_adapters(adapters) == {}


def test_shared_helper_import_styles(tmp_path):
    """Adapters may `from . import _common` OR `import _common` — both work."""
    adapters = tmp_path / "adapters"
    adapters.mkdir()
    (adapters / "_common.py").write_text("MAGIC = 7\n")
    (adapters / "rel_style.py").write_text(
        "try:\n    from . import _common\nexcept ImportError:\n    import _common\n"
        "def fetch():\n"
        "    assert _common.MAGIC == 7\n"
        "    return []\n"
    )
    (adapters / "flat_style.py").write_text(
        "import _common\n"
        "def fetch():\n"
        "    assert _common.MAGIC == 7\n"
        "    return []\n"
    )
    result = run_ingest(adapters, tmp_path / "signals.jsonl")
    assert result.failed_adapters == []
    assert len(result.adapters) == 2


def test_missing_source_stamped_from_module(tmp_path):
    adapters = tmp_path / "adapters"
    adapters.mkdir()
    (adapters / "stamper.py").write_text(
        "SOURCE = 'canonical_name'\n"
        "def fetch():\n"
        "    return [{'id': 'x1', 'signal_type': 'other',\n"
        "             'observed_at': '2026-06-01T00:00:00+00:00',\n"
        "             'property': {'address': '1 Ok St', 'state': 'FL', 'zip': '33990'}}]\n"
    )
    ledger = tmp_path / "signals.jsonl"
    run_ingest(adapters, ledger)
    sig = load_ledger_signals(ledger)[0]
    assert sig.source == "canonical_name"
    assert sig.dedupe_key == "canonical_name:x1"


def test_malformed_ledger_lines_skipped(tmp_path):
    ledger = tmp_path / "signals.jsonl"
    ledger.write_text(
        json.dumps({"dedupe_key": "a:1", "signal": {
            "id": "1", "source": "a", "signal_type": "other",
            "observed_at": "2026-06-01T00:00:00+00:00",
            "property": {"address": "1 St", "state": "FL", "zip": "33990"},
        }}) + "\n"
        + "{ this is not json\n"
        + "\n"
    )
    assert existing_dedupe_keys(ledger) == {"a:1"}
    assert len(load_ledger_signals(ledger)) == 1
