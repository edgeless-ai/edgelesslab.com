"""
review.py — the human seam over ambiguous enrichments.

THE SEAM (see enrich.py): the enrichment stage NEVER guesses between parcels.
When a resolver returns 2+ candidate parcels for one owner name, enrich parks
EVERY candidate in signal.evidence.enrichment_candidates and leaves the pending
row unresolved (status pending, or unresolvable after MAX_ATTEMPTS). Those rows
sit there forever — a human is the only thing that can say which parcel is
right. This module is that human seam:

    list_ambiguous(pending) -> the rows awaiting a pick, each with its candidates
    apply_pick(dedupe_key, choice, ...) -> resolve ONE row to its chosen parcel

A pick is re-ingested through the SAME path an automatic resolve uses
(enrich._apply_resolution -> ingest.append_signal): the enriched twin keeps the
pending row's exact (source, id) identity, so the source:id ledger dedupe makes
re-picking idempotent, and the name-match confidence cap still applies (a human
choosing among name-matched parcels is confirming WHICH parcel, not
independently verifying ownership — the anchor still rests on the name match).
Provenance (human_pick, picked_candidate) lives in evidence, never in identity.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

from .enrich import (
    DEFAULT_LEDGER,
    DEFAULT_PENDING,
    MAX_NAME_CONFIDENCE,
    _apply_resolution,
    _append_row,
    _utcnow_iso,
    load_pending,
)
from .ingest import append_signal, existing_dedupe_keys
from .schema import Signal

# PropertyRef fields a candidate may carry into the resolved anchor. Candidate
# dicts are resolver-shaped (philly_opa: apn/address/zip/owner_1/owner_2/...;
# fixture_owner_index: apn/address/city/zip/owner/...) — take only the keys
# that are real PropertyRef anchors, ignore the receipt-only fields.
_PROPERTY_KEYS = ("apn", "address", "city", "state", "zip", "lat", "lon")


@dataclass
class AmbiguousItem:
    dedupe_key: str
    source: str
    signal_type: str
    name: str          # owner/deceased name under review (for display)
    status: str        # pending | unresolvable
    attempts: int
    resolver: str      # resolver that produced the candidates
    candidates: list[dict] = field(default_factory=list)


@dataclass
class PickResult:
    ok: bool
    message: str
    dedupe_key: str = ""
    apn: str | None = None
    address: str = ""
    wrote_ledger: bool = False


def _display_name(sig: dict) -> str:
    ev = sig.get("evidence") or {}
    owner = sig.get("owner") or {}
    for cand in (ev.get("deceased_name"), owner.get("name"),
                 ev.get("owner_query")):
        if cand:
            return str(cand)
    return ""


def list_ambiguous(
    pending_path: str | Path = DEFAULT_PENDING,
) -> list[AmbiguousItem]:
    """Pending/unresolvable rows still holding enrichment_candidates — the
    ones awaiting a human pick. Resolved rows are excluded (a pick that
    landed is done). First-appearance order preserved (load_pending)."""
    items: list[AmbiguousItem] = []
    for key, row in load_pending(pending_path).items():
        if row.get("status") == "resolved":
            continue
        sig = row.get("signal") or {}
        ev = sig.get("evidence") or {}
        candidates = ev.get("enrichment_candidates")
        if not candidates:
            continue
        items.append(AmbiguousItem(
            dedupe_key=key,
            source=str(sig.get("source", "")),
            signal_type=str(sig.get("signal_type", "")),
            name=_display_name(sig),
            status=str(row.get("status", "pending")),
            attempts=int(row.get("attempts") or 0),
            resolver=str(ev.get("enrichment_candidates_by", "")),
            candidates=list(candidates),
        ))
    return items


def _pick_to_resolution(candidate: dict, resolver: str) -> dict:
    """Turn a chosen candidate parcel into a resolver-shaped 'resolved'
    dict (enrich._apply_resolution consumes property/evidence/confidence)."""
    prop = {k: candidate[k] for k in _PROPERTY_KEYS
            if candidate.get(k) not in (None, "")}
    return {
        "status": "resolved",
        "resolver": f"{resolver}:human_pick",
        "confidence": MAX_NAME_CONFIDENCE,  # capped again in _apply_resolution
        "property": prop,
        "evidence": {
            "human_pick": True,
            "picked_from_resolver": resolver,
            "picked_candidate": candidate,
        },
    }


def apply_pick(
    dedupe_key: str,
    choice: int,
    pending_path: str | Path = DEFAULT_PENDING,
    ledger_path: str | Path = DEFAULT_LEDGER,
    now: datetime | None = None,
) -> PickResult:
    """Resolve ONE ambiguous row to its chosen candidate parcel.

    `choice` is the 0-based index into the row's enrichment_candidates. The
    chosen candidate becomes a resolution and drives through the normal
    append (idempotent via source:id dedupe). The pending row is superseded
    with status=resolved + human_reviewed. Bad key / already-resolved / no
    candidates / out-of-range choice / a candidate that fails to anchor all
    return ok=False and touch nothing.
    """
    rows = load_pending(pending_path)
    row = rows.get(dedupe_key)
    if row is None:
        return PickResult(False, f"no pending row for dedupe_key {dedupe_key!r}")
    if row.get("status") == "resolved":
        return PickResult(False, f"{dedupe_key!r} is already resolved")

    sig_dict = row.get("signal") or {}
    candidates = (sig_dict.get("evidence") or {}).get("enrichment_candidates") or []
    if not candidates:
        return PickResult(False, f"{dedupe_key!r} has no candidates to pick from")
    if not isinstance(choice, int) or not (0 <= choice < len(candidates)):
        return PickResult(
            False,
            f"choice {choice!r} out of range (valid 0..{len(candidates) - 1})")

    resolver = (str((sig_dict.get("evidence") or {})
                    .get("enrichment_candidates_by") or "human"))
    res = _pick_to_resolution(candidates[choice], resolver)
    stamp = _utcnow_iso(now)
    enriched = _apply_resolution(sig_dict, f"{resolver}:human_pick", res, stamp)

    sig = Signal.from_dict(enriched)
    problems = sig.problems()
    if problems:  # defensive: a candidate with neither address nor apn
        return PickResult(
            False, f"chosen candidate does not anchor the signal: {problems}")

    known = existing_dedupe_keys(ledger_path)
    wrote = append_signal(ledger_path, sig, known)

    new_row = {
        **row,
        "attempts": int(row.get("attempts") or 0) + 1,
        "last_attempt": stamp,
        "status": "resolved",
        "signal": sig.to_dict(),
        "enriched_by": f"{resolver}:human_pick",
        "human_reviewed": True,
    }
    _append_row(Path(pending_path), new_row)

    p = sig.property
    return PickResult(
        ok=True,
        message=("re-ingested" if wrote else "already in ledger (idempotent)"),
        dedupe_key=dedupe_key,
        apn=p.apn,
        address=p.address,
        wrote_ledger=wrote,
    )
