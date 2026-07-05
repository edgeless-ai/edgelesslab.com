"""
enrich.py — the quarantine consumer: property resolution for unanchored signals.

THE SEAM (see ingest.py): signals that parse but have neither address nor APN
(today: every obituary signal, plus the odd degraded assessor row) are
quarantined in data/signals_pending.jsonl and can't join the merge. This
module consumes that file: it tries to RESOLVE each pending signal to a
parcel through pluggable resolvers, and re-emits resolved signals — anchored,
enriched, confidence-adjusted — through the NORMAL ingest append.

RESOLVER REGISTRY (mirrors the adapter registry):
  Any resolvers/*.py (not starting with '_') exposing a callable

      def resolve(signal: dict) -> dict | None

  is a resolver. Optional module attributes: NAME (default module name),
  ENABLED (default True), ORDER (default 100 — lower runs first, so live
  resolvers can outrank the offline fixture stand-in). Return contract is
  documented in resolvers/_common.py: None | {"status": "resolved", ...} |
  {"status": "ambiguous", "candidates": [...]}. A crashing resolver is
  isolated and reported, exactly like a crashing adapter. First "resolved"
  wins; an "ambiguous" answer is kept but later resolvers still get a shot
  at a definitive match.

PENDING FILE = APPEND-ONLY EVENT LOG (never rewritten, never deleted):
  ingest appends the initial quarantine row; enrich appends UPDATED rows for
  the same dedupe_key (status / attempts / last_attempt / enrichment fields).
  Readers take the LAST row per dedupe_key (load_pending). This keeps the
  flock-append crash-safety story of the ledger, keeps history inspectable,
  and leaves ingest's existing_dedupe_keys() working unchanged.

  Row statuses:
    pending      — awaiting resolution (ambiguous matches STAY here, with
                   every candidate parcel recorded in signal evidence —
                   never guess between parcels)
    resolved     — anchored twin appended to signals.jsonl
    unresolvable — MAX_ATTEMPTS (3) resolution passes found nothing
                   definitive; parked, never deleted, revivable by hand
                   (append a row with "status": "pending")

IDENTITY / SUPERSEDE — the (source, id) decision:
  The enriched signal KEEPS the pending twin's exact (source, id), i.e. the
  same dedupe_key. Enrichment is a transformation of the same upstream
  observation, not a new observation. Deliberate consequences:
    - the ledger's source:id dedupe makes enrichment idempotent for free —
      running enrich twice appends nothing new to signals.jsonl;
    - the raw unanchored twin can never separately enter the ledger (same
      key), so pending row and ledger row can't double-count one obituary;
    - re-ingesting the same upstream record keeps hitting the pending-file
      dedupe in ingest and never resurrects a second copy;
    - provenance lives in evidence (enriched_by, enrichment{...}), never in
      identity.
  Rejected alternative: minting a derived id ("<id>-enriched") would create
  a second identity for the same upstream fact — the raw twin could later
  slip into the ledger beside it, and scoring's same-type dampening would
  treat one death as two corroborating signals.
"""

from __future__ import annotations

import importlib.util
import sys
import traceback
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from types import ModuleType

from .ingest import (
    _dumps_row,
    _locked_append,
    existing_dedupe_keys,
    append_signal,
)
from .schema import Signal

PACKAGE_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_PENDING = PACKAGE_ROOT / "data" / "signals_pending.jsonl"
DEFAULT_LEDGER = PACKAGE_ROOT / "data" / "signals.jsonl"
DEFAULT_RESOLVERS_DIR = PACKAGE_ROOT / "resolvers"

MAX_ATTEMPTS = 3          # pending -> unresolvable after this many passes
MAX_NAME_CONFIDENCE = 0.4  # a name-based match can never claim more


# ---------------------------------------------------------------------------
# results
# ---------------------------------------------------------------------------

@dataclass
class EnrichResult:
    resolvers: list[str] = field(default_factory=list)
    pending_total: int = 0        # distinct dedupe_keys in the pending file
    examined: int = 0             # status=pending rows attempted this run
    resolved: int = 0             # anchored + appended to the ledger
    duplicates: int = 0           # resolved, but ledger already had the key
    ambiguous: int = 0            # 2+ candidate parcels — stayed pending
    unmatched: int = 0            # no resolver had anything — stayed pending
    newly_unresolvable: int = 0   # crossed MAX_ATTEMPTS this run
    skipped: int = 0              # already resolved/unresolvable
    resolver_errors: dict[str, str] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# resolver discovery (adapter-registry pattern)
# ---------------------------------------------------------------------------

_RESOLVER_PKG = "dealflow_resolvers"


def _ensure_resolver_package(resolvers_dir: Path) -> None:
    """Synthetic parent package so resolver modules can share helpers via
    `from . import _common` (adapter pattern). Unlike the adapter version,
    the dir is deliberately NOT appended to sys.path: resolvers/ has its own
    _common.py and putting it on the path would shadow the adapters' _common
    for any later bare `import _common`. The bare-import style still works
    when a resolver is executed directly (script dir is sys.path[0])."""
    pkg = sys.modules.get(_RESOLVER_PKG)
    if pkg is None:
        pkg = ModuleType(_RESOLVER_PKG)
        pkg.__path__ = []  # type: ignore[attr-defined]
        sys.modules[_RESOLVER_PKG] = pkg
    if str(resolvers_dir) not in pkg.__path__:  # type: ignore[attr-defined]
        pkg.__path__.append(str(resolvers_dir))  # type: ignore[attr-defined]


def discover_resolvers(
    resolvers_dir: str | Path = DEFAULT_RESOLVERS_DIR,
) -> list[tuple[str, ModuleType]]:
    """Import every resolvers/*.py (skipping _private) exposing a callable
    resolve(). Import errors are isolated per-module. Returns [(name, module)]
    sorted by (ORDER, name) — resolution order."""
    resolvers_dir = Path(resolvers_dir).resolve()
    found: list[tuple[str, ModuleType]] = []
    if not resolvers_dir.is_dir():
        return found
    _ensure_resolver_package(resolvers_dir)
    for path in sorted(resolvers_dir.glob("*.py")):
        if path.name.startswith("_"):
            continue
        mod_name = f"{_RESOLVER_PKG}.{path.stem}"
        try:
            spec = importlib.util.spec_from_file_location(mod_name, path)
            if spec is None or spec.loader is None:
                continue
            module = importlib.util.module_from_spec(spec)
            sys.modules[mod_name] = module
            spec.loader.exec_module(module)
        except Exception:
            print(f"[enrich] resolver {path.name} failed to import:",
                  file=sys.stderr)
            traceback.print_exc()
            continue
        if not getattr(module, "ENABLED", True):
            continue
        if callable(getattr(module, "resolve", None)):
            found.append((getattr(module, "NAME", path.stem), module))
        else:
            print(f"[enrich] resolver {path.name} has no resolve() — skipped",
                  file=sys.stderr)
    found.sort(key=lambda nm: (getattr(nm[1], "ORDER", 100), nm[0]))
    return found


# ---------------------------------------------------------------------------
# pending-file event log
# ---------------------------------------------------------------------------

def load_pending(pending_path: str | Path = DEFAULT_PENDING) -> dict[str, dict]:
    """Read the pending event log, LAST row per dedupe_key wins. Preserves
    first-appearance order; malformed lines skipped (ledger convention)."""
    import json

    pending_path = Path(pending_path)
    rows: dict[str, dict] = {}
    if not pending_path.exists():
        return rows
    with pending_path.open() as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            key = row.get("dedupe_key")
            if key:
                rows[key] = row  # later rows supersede (dict keeps 1st order)
    return rows


def _append_row(pending_path: Path, row: dict) -> None:
    pending_path.parent.mkdir(parents=True, exist_ok=True)
    _locked_append(pending_path, _dumps_row(row))


def _utcnow_iso(now: datetime | None) -> str:
    return (now or datetime.now(timezone.utc)).isoformat()


# ---------------------------------------------------------------------------
# resolution application
# ---------------------------------------------------------------------------

def _apply_resolution(sig_dict: dict, resolver_name: str, res: dict,
                      resolved_at: str) -> dict:
    """Build the enriched signal dict: same (source, id) identity, property
    block filled, confidence adjusted, provenance in evidence."""
    enriched = dict(sig_dict)
    prop = dict(sig_dict.get("property") or {})
    for k, v in (res.get("property") or {}).items():
        if v not in (None, ""):
            prop[k] = v
    enriched["property"] = prop

    evidence = dict(sig_dict.get("evidence") or {})
    evidence.update(res.get("evidence") or {})
    evidence["enriched_by"] = resolver_name
    evidence["enrichment"] = {
        "resolver": resolver_name,
        "resolved_at": resolved_at,
        "original_confidence": sig_dict.get("confidence"),
        "match_confidence": res.get("confidence"),
    }
    enriched["evidence"] = evidence

    # A name-derived anchor is capped — the resolver says how sure it is,
    # but never above MAX_NAME_CONFIDENCE.
    try:
        conf = float(res.get("confidence"))
    except (TypeError, ValueError):
        conf = 0.0
    enriched["confidence"] = min(MAX_NAME_CONFIDENCE, max(0.0, conf))
    return enriched


def _record_ambiguity(sig_dict: dict, res: dict) -> dict:
    """Never guess: park every candidate parcel in the signal's evidence so
    a human (or a better resolver) can disambiguate later."""
    updated = dict(sig_dict)
    evidence = dict(sig_dict.get("evidence") or {})
    evidence["enrichment_candidates"] = res.get("candidates") or []
    evidence["enrichment_candidates_by"] = res.get("resolver")
    updated["evidence"] = evidence
    return updated


# ---------------------------------------------------------------------------
# runner
# ---------------------------------------------------------------------------

def run_enrich(
    resolvers_dir: str | Path = DEFAULT_RESOLVERS_DIR,
    pending_path: str | Path = DEFAULT_PENDING,
    ledger_path: str | Path = DEFAULT_LEDGER,
    only: list[str] | None = None,
    max_attempts: int = MAX_ATTEMPTS,
    now: datetime | None = None,
) -> EnrichResult:
    """One enrichment pass over the pending file.

    For each status=pending row: try resolvers in ORDER; a unique match
    appends the enriched twin to the ledger (normal ingest append — the
    source:id dedupe makes this idempotent) and marks the row resolved.
    Ambiguity or no match increments the attempts counter; at max_attempts
    the row is parked as unresolvable. Rows are never deleted.
    """
    pending_path = Path(pending_path)
    result = EnrichResult()

    resolvers = discover_resolvers(resolvers_dir)
    if only:
        wanted = set(only)
        resolvers = [(n, m) for n, m in resolvers if n in wanted]
    result.resolvers = [n for n, _ in resolvers]

    rows = load_pending(pending_path)
    result.pending_total = len(rows)
    if not rows or not resolvers:
        result.skipped = sum(
            1 for r in rows.values() if r.get("status", "pending") != "pending")
        return result

    known_keys = existing_dedupe_keys(ledger_path)
    stamp = _utcnow_iso(now)

    for key, row in rows.items():
        if row.get("status", "pending") != "pending":
            result.skipped += 1
            continue
        result.examined += 1
        sig_dict = row.get("signal") or {}

        resolution: tuple[str, dict] | None = None
        ambiguity: tuple[str, dict] | None = None
        for name, module in resolvers:
            try:
                res = module.resolve(dict(sig_dict))
            except Exception as e:  # resolver isolation (adapter contract)
                result.resolver_errors[name] = f"{type(e).__name__}: {e}"
                print(f"[enrich] resolver {name} raised on {key!r}:",
                      file=sys.stderr)
                traceback.print_exc()
                continue
            if not isinstance(res, dict):
                continue
            if res.get("status") == "resolved":
                resolution = (name, res)
                break  # first definitive match wins (ORDER = trust order)
            if res.get("status") == "ambiguous" and ambiguity is None:
                ambiguity = (name, res)  # remember, but keep trying

        attempts = int(row.get("attempts") or 0) + 1
        new_row = {
            **row,
            "attempts": attempts,
            "last_attempt": stamp,
        }

        if resolution:
            name, res = resolution
            enriched = _apply_resolution(sig_dict, name, res, stamp)
            sig = Signal.from_dict(enriched)
            if sig.problems():  # defensive: a resolver returned a non-anchor
                result.resolver_errors[name] = (
                    f"resolution for {key!r} still unanchored: {sig.problems()}")
                resolution = None
            else:
                try:
                    written = append_signal(ledger_path, sig, known_keys)
                except Exception as e:
                    result.resolver_errors[name] = f"{type(e).__name__}: {e}"
                    written = False
                    resolution = None
                else:
                    if written:
                        result.resolved += 1
                    else:
                        result.duplicates += 1
                    new_row["status"] = "resolved"
                    new_row["signal"] = sig.to_dict()
                    new_row["enriched_by"] = name

        if not resolution:
            if ambiguity:
                name, res = ambiguity
                result.ambiguous += 1
                new_row["signal"] = _record_ambiguity(sig_dict, res)
            else:
                result.unmatched += 1
            if attempts >= max_attempts:
                new_row["status"] = "unresolvable"
                result.newly_unresolvable += 1
            else:
                new_row["status"] = "pending"

        _append_row(pending_path, new_row)

    return result
