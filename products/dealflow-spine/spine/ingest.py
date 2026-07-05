"""
ingest.py — adapter registry + runner + idempotent signal ledger.

ADAPTER CONTRACT (for the agents building adapters/*.py):

  Any .py file dropped into adapters/ (not starting with '_') is an adapter.
  It must expose:

      def fetch() -> list        # of Signal objects OR plain dicts shaped
                                 # like Signal.to_dict() (dicts are fine —
                                 # they go through Signal.from_dict, which
                                 # is forgiving)

  Optional module attributes:
      SOURCE: str    — canonical source name; stamped onto any signal that
                       forgot to set `source`. Defaults to the module name.
      ENABLED: bool  — set False to keep a WIP adapter out of runs.

  Rules:
    - fetch() must be zero-argument and should not prompt or block forever.
    - Signal.id must be STABLE per upstream record (re-fetch => same id);
      the ledger dedupes on (source, id). If upstream has no id, use
      Signal.generate_id(...).
    - Raise freely — a crashing adapter is isolated and reported; it never
      takes down the run.

LEDGER (data/signals.jsonl):
  Append-only JSONL, one row per accepted signal:
      {"dedupe_key": "<source>:<id>", "ingested_at": iso8601, "signal": {...}}
  Idempotent by dedupe_key — running the same adapters twice writes nothing
  new. Pattern lifted from triage_core.append_archive_jsonl (task-302),
  rebuilt standalone. A torn final line (crash mid-append) is healed on load:
  quarantined to signals.jsonl.corrupt if unparseable, newline-terminated in
  place if it was a complete row (M4, review 2026-07-04).

QUARANTINE (data/signals_pending.jsonl):
  Signals that parse but are UNANCHORED (no address AND no APN — e.g. an
  obituary that only knows city + deceased name) can't join the merge without
  corrupting address grouping. They are quarantined here (same idempotent row
  shape, plus "problems": [...]) instead of dropped. The consumer is
  spine/enrich.py: it resolves pending signals against parcel resolvers
  (resolvers/*.py) and re-emits them anchored through append_signal. The
  pending file is an append-only EVENT LOG — enrich appends updated rows
  (status/attempts) for the same dedupe_key; readers take the last row per
  key (enrich.load_pending), and existing_dedupe_keys keeps working as the
  ingest-side dedupe unchanged.
"""

from __future__ import annotations

import fcntl
import importlib.util
import json
import math
import sys
import traceback
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from types import ModuleType

from .schema import Signal

DEFAULT_LEDGER = Path(__file__).resolve().parent.parent / "data" / "signals.jsonl"
DEFAULT_ADAPTERS_DIR = Path(__file__).resolve().parent.parent / "adapters"


# ---------------------------------------------------------------------------
# results
# ---------------------------------------------------------------------------

@dataclass
class AdapterReport:
    name: str
    fetched: int = 0
    written: int = 0
    duplicates: int = 0
    invalid: int = 0        # unparseable / non-dict items (dropped)
    quarantined: int = 0    # parsed but unanchored -> signals_pending.jsonl
    error: str | None = None


@dataclass
class IngestResult:
    adapters: list[AdapterReport] = field(default_factory=list)

    @property
    def total_fetched(self) -> int:
        return sum(a.fetched for a in self.adapters)

    @property
    def total_written(self) -> int:
        return sum(a.written for a in self.adapters)

    @property
    def total_duplicates(self) -> int:
        return sum(a.duplicates for a in self.adapters)

    @property
    def total_invalid(self) -> int:
        return sum(a.invalid for a in self.adapters)

    @property
    def total_quarantined(self) -> int:
        return sum(a.quarantined for a in self.adapters)

    @property
    def failed_adapters(self) -> list[str]:
        return [a.name for a in self.adapters if a.error]


# ---------------------------------------------------------------------------
# adapter discovery
# ---------------------------------------------------------------------------

_ADAPTER_PKG = "dealflow_adapters"


def _ensure_adapter_package(adapters_dir: Path) -> None:
    """Register a synthetic parent package for the adapters dir so adapter
    modules can share helpers either way:
        from . import _common     # relative import within the package
        import _common            # plain import (dir is on sys.path)
    """
    pkg = sys.modules.get(_ADAPTER_PKG)
    if pkg is None:
        pkg = ModuleType(_ADAPTER_PKG)
        pkg.__path__ = []  # type: ignore[attr-defined]
        sys.modules[_ADAPTER_PKG] = pkg
    if str(adapters_dir) not in pkg.__path__:  # type: ignore[attr-defined]
        pkg.__path__.append(str(adapters_dir))  # type: ignore[attr-defined]
    if str(adapters_dir) not in sys.path:
        sys.path.append(str(adapters_dir))


def discover_adapters(adapters_dir: str | Path = DEFAULT_ADAPTERS_DIR) -> dict[str, ModuleType]:
    """Import every adapters/*.py (skipping _private files) that exposes a
    callable fetch(). Import errors are swallowed per-module and reported on
    stderr — one broken adapter must not block the others."""
    adapters_dir = Path(adapters_dir).resolve()
    found: dict[str, ModuleType] = {}
    if not adapters_dir.is_dir():
        return found
    _ensure_adapter_package(adapters_dir)
    for path in sorted(adapters_dir.glob("*.py")):
        if path.name.startswith("_"):
            continue
        mod_name = f"{_ADAPTER_PKG}.{path.stem}"
        try:
            spec = importlib.util.spec_from_file_location(mod_name, path)
            if spec is None or spec.loader is None:
                continue
            module = importlib.util.module_from_spec(spec)
            sys.modules[mod_name] = module
            spec.loader.exec_module(module)
        except Exception:
            print(f"[ingest] adapter {path.name} failed to import:", file=sys.stderr)
            traceback.print_exc()
            continue
        if not getattr(module, "ENABLED", True):
            continue
        if callable(getattr(module, "fetch", None)):
            found[path.stem] = module
        else:
            print(f"[ingest] adapter {path.name} has no fetch() — skipped", file=sys.stderr)
    return found


# ---------------------------------------------------------------------------
# ledger primitives (idempotent JSONL — triage_core lineage)
# ---------------------------------------------------------------------------

def _jsonable(obj):
    """Coerce arbitrary adapter payloads into strict, RFC-8259-safe JSON.

    Adapters control Signal.evidence, so a poisoned upstream record can carry
    non-string dict KEYS (tuple/bytes — json.dumps `default=` never applies to
    keys, so it raises TypeError) or NaN/Infinity floats (Python json emits
    them, but the row becomes invalid JSON for every non-Python consumer).
    Defensive rules: keys stringified, non-finite floats -> None, unknown
    objects -> str(). One bad signal must never kill an ingest run (H1/M3).
    """
    if isinstance(obj, dict):
        return {str(k): _jsonable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, set)):
        return [_jsonable(v) for v in obj]
    if isinstance(obj, float):
        return obj if math.isfinite(obj) else None
    if obj is None or isinstance(obj, (str, int, bool)):
        return obj
    return str(obj)


def _dumps_row(row: dict) -> str:
    """Serialize one ledger/quarantine row defensively (see _jsonable)."""
    return json.dumps(_jsonable(row), allow_nan=False)


def _locked_append(path: Path, line: str) -> None:
    """Append one line under an exclusive flock so two overlapping ingest
    processes (cron + manual) can't interleave partial rows (M2). Single-host
    ledger, so fcntl on the ledger file itself is sufficient.

    Anti-fuse guard (M4): if some OTHER process crashed mid-append after our
    load-time heal ran, the file may end without a newline; terminate that
    tail first so this row can never fuse onto it. (The torn fragment itself
    is quarantined by _heal_torn_tail on the next load if it doesn't parse.)
    """
    with path.open("a+b") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        try:
            if f.seek(0, 2) > 0:
                f.seek(-1, 2)
                if f.read(1) != b"\n":
                    f.write(b"\n")
            f.write(line.encode("utf-8") + b"\n")
            f.flush()
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)


def _heal_torn_tail(ledger_path: Path) -> None:
    """Heal a torn FINAL line left by a crash/full-disk mid-append (M4,
    adversarial review 2026-07-04).

    `_locked_append` writes `row + "\\n"` in one call, so a partial flush
    leaves an unterminated tail; the next append would fuse onto it, turning
    two rows into one unparseable line and silently losing both. Called on
    every ledger LOAD, under the same flock as the append path:

      * tail parses as JSON (row complete, only the newline lost) ->
        terminate it in place — a VALID line is never swallowed;
      * tail doesn't parse (truly torn) -> move the fragment to
        <ledger>.corrupt and truncate it off, with a stderr warning.

    Mid-file malformed lines are newline-terminated (can't fuse with future
    appends) and are left alone — readers already skip them. Any healing
    failure (read-only fs, etc.) degrades to a warning: load never crashes.
    """
    try:
        with ledger_path.open("r+b") as f:
            fcntl.flock(f, fcntl.LOCK_EX)
            try:
                size = f.seek(0, 2)
                if size == 0:
                    return
                f.seek(-1, 2)
                if f.read(1) == b"\n":
                    return  # cleanly terminated — nothing torn
                # find the start of the unterminated tail (byte after the
                # last newline), scanning backward in chunks
                pos, last_nl = size, -1
                while pos > 0 and last_nl < 0:
                    step = min(4096, pos)
                    pos -= step
                    f.seek(pos)
                    idx = f.read(step).rfind(b"\n")
                    if idx >= 0:
                        last_nl = pos + idx
                tail_start = last_nl + 1
                f.seek(tail_start)
                fragment = f.read()
                try:
                    json.loads(fragment.decode("utf-8"))
                except (UnicodeDecodeError, json.JSONDecodeError):
                    corrupt = ledger_path.with_name(ledger_path.name + ".corrupt")
                    with corrupt.open("ab") as cf:
                        cf.write(fragment + b"\n")
                    f.truncate(tail_start)
                    print(f"[ingest] torn final line in {ledger_path.name} "
                          f"({len(fragment)} bytes, likely a crash mid-append) — "
                          f"quarantined to {corrupt.name}", file=sys.stderr)
                else:
                    # complete row that only lost its newline: keep it
                    f.seek(0, 2)
                    f.write(b"\n")
            finally:
                fcntl.flock(f, fcntl.LOCK_UN)
    except OSError as e:
        print(f"[ingest] could not heal ledger tail of {ledger_path}: {e}",
              file=sys.stderr)


def existing_dedupe_keys(ledger_path: str | Path) -> set[str]:
    """Stream the ledger and collect dedupe_keys. The torn-tail check runs
    first (see _heal_torn_tail); other malformed rows are skipped silently —
    an archive with one bad line beats a crashed run."""
    ledger_path = Path(ledger_path)
    keys: set[str] = set()
    if not ledger_path.exists():
        return keys
    _heal_torn_tail(ledger_path)
    with ledger_path.open() as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            k = row.get("dedupe_key")
            if k:
                keys.add(k)
    return keys


def append_signal(
    ledger_path: str | Path,
    signal: Signal,
    known_keys: set[str] | None = None,
) -> bool:
    """Append one signal to the ledger, idempotent by signal.dedupe_key.

    Returns True if written, False if skipped as duplicate. Pass `known_keys`
    (mutated in place) when appending in a loop to avoid re-scanning the file
    per signal.
    """
    ledger_path = Path(ledger_path)
    if known_keys is None:
        known_keys = existing_dedupe_keys(ledger_path)
    if signal.dedupe_key in known_keys:
        return False
    ledger_path.parent.mkdir(parents=True, exist_ok=True)
    row = {
        "dedupe_key": signal.dedupe_key,
        "ingested_at": datetime.now(timezone.utc).isoformat(),
        "signal": signal.to_dict(),
    }
    _locked_append(ledger_path, _dumps_row(row))
    known_keys.add(signal.dedupe_key)
    return True


def load_ledger_signals(ledger_path: str | Path = DEFAULT_LEDGER) -> list[Signal]:
    """Read every signal back out of the ledger (malformed rows skipped).

    Deduped by (source, id) on the way out: overlapping ingest processes can
    race the dedupe-key snapshot and append the same signal twice (M2), and a
    duplicate row would otherwise HALVE the merged property's score via the
    same-type dampening. First occurrence wins.
    """
    ledger_path = Path(ledger_path)
    signals: list[Signal] = []
    seen: set[str] = set()
    if not ledger_path.exists():
        return signals
    _heal_torn_tail(ledger_path)
    with ledger_path.open() as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
                payload = row.get("signal")
                if payload:
                    sig = Signal.from_dict(payload)
                    if sig.dedupe_key in seen:
                        continue
                    seen.add(sig.dedupe_key)
                    signals.append(sig)
            except (json.JSONDecodeError, TypeError):
                continue
    return signals


# ---------------------------------------------------------------------------
# normalization + runner
# ---------------------------------------------------------------------------

def normalize_fetched(
    raw_items: list, default_source: str
) -> tuple[list[Signal], list[tuple[Signal, list[str]]], int]:
    """Coerce whatever an adapter returned into Signals.

    Accepts Signal instances and dicts. Returns
    (valid_signals, quarantine, invalid_count) where:
      - valid: passes Signal.problems() after the forgiving from_dict pass
      - quarantine: parsed fine but unusable for merge (e.g. no address AND
        no apn) — kept with its problem list for later enrichment
      - invalid: not coercible at all (non-dict, from_dict exploded)
    """
    valid: list[Signal] = []
    quarantine: list[tuple[Signal, list[str]]] = []
    invalid = 0
    for item in raw_items or []:
        try:
            if isinstance(item, Signal):
                sig = item
            elif isinstance(item, dict):
                d = dict(item)
                d.setdefault("source", default_source)
                sig = Signal.from_dict(d)
            else:
                invalid += 1
                continue
            if not sig.source or sig.source == "unknown":
                sig.source = default_source
            problems = sig.problems()
            if problems:
                quarantine.append((sig, problems))
            else:
                valid.append(sig)
        except Exception:
            invalid += 1
    return valid, quarantine, invalid


def run_ingest(
    adapters_dir: str | Path = DEFAULT_ADAPTERS_DIR,
    ledger_path: str | Path = DEFAULT_LEDGER,
    only: list[str] | None = None,
) -> IngestResult:
    """Discover adapters, fetch, normalize, and append to the ledger.

    Idempotent: re-running with the same upstream data writes 0 new rows.
    `only` restricts to specific adapter module names.
    """
    result = IngestResult()
    modules = discover_adapters(adapters_dir)
    if only:
        modules = {k: v for k, v in modules.items() if k in set(only)}
    known_keys = existing_dedupe_keys(ledger_path)
    pending_path = Path(ledger_path).parent / "signals_pending.jsonl"
    pending_keys = existing_dedupe_keys(pending_path)

    for name, module in modules.items():
        report = AdapterReport(name=name)
        source = getattr(module, "SOURCE", name)
        try:
            raw = module.fetch()
        except Exception as e:
            report.error = f"{type(e).__name__}: {e}"
            result.adapters.append(report)
            print(f"[ingest] adapter {name} fetch() raised:", file=sys.stderr)
            traceback.print_exc()
            continue

        signals, quarantine, invalid = normalize_fetched(raw, default_source=source)
        report.fetched = len(raw or [])
        report.invalid = invalid
        for sig in signals:
            # Per-signal isolation (mirrors the fetch() contract): one signal
            # whose payload defeats even the defensive serializer must be
            # dropped with a warning, never abort the rest of the run (H1).
            try:
                written = append_signal(ledger_path, sig, known_keys)
            except Exception as e:
                report.invalid += 1
                print(f"[ingest] adapter {name}: signal {sig.dedupe_key!r} "
                      f"could not be written ({type(e).__name__}: {e}) — dropped",
                      file=sys.stderr)
                continue
            if written:
                report.written += 1
            else:
                report.duplicates += 1
        for sig, problems in quarantine:
            if sig.dedupe_key not in pending_keys:
                pending_path.parent.mkdir(parents=True, exist_ok=True)
                row = {
                    "dedupe_key": sig.dedupe_key,
                    "ingested_at": datetime.now(timezone.utc).isoformat(),
                    "problems": problems,
                    "signal": sig.to_dict(),
                }
                try:
                    _locked_append(pending_path, _dumps_row(row))
                except Exception as e:
                    report.invalid += 1
                    print(f"[ingest] adapter {name}: quarantine row "
                          f"{sig.dedupe_key!r} could not be written "
                          f"({type(e).__name__}: {e}) — dropped", file=sys.stderr)
                    continue
                pending_keys.add(sig.dedupe_key)
            report.quarantined += 1
        result.adapters.append(report)
    return result
