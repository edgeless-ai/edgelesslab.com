"""
dealflow-spine shared contract (schema).

THIS FILE IS THE INTEGRATION CONTRACT. Adapter agents (adapters/*.py) produce
Signal objects (or plain dicts shaped like Signal.to_dict()); the underwriting
layer consumes DealCandidate rows from data/candidates.jsonl.

Design rules for this module:
  - stdlib only, no side effects, no I/O.
  - `from_dict()` is FORGIVING (unknown keys ignored, missing optionals
    defaulted, bad values coerced/clamped) so third-party adapters that get
    the shape *approximately* right still flow through the pipeline.
  - `to_dict()` is STRICT and canonical — round-trips through JSON losslessly.

Lineage: Route/ScoreBreakdown vocabulary borrowed from
scripts/lib/triage_core.py (task-298), rebuilt standalone here.
"""

from __future__ import annotations

import hashlib
import math
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

# ---------------------------------------------------------------------------
# vocabulary
# ---------------------------------------------------------------------------

SIGNAL_TYPES: frozenset[str] = frozenset(
    {
        "fema_disaster",
        "code_violation",
        "tax_delinquent",
        "obituary",
        "pre_foreclosure",
        "assumable_loan",
        "absentee_owner",
        "other",
    }
)

# Fact keys that merge.py lifts from Signal.evidence into PropertyRecord.facts.
# Adapters SHOULD use these exact keys in `evidence` when they know the value —
# criteria.py evaluates the buy-box against them.
KNOWN_FACT_KEYS: frozenset[str] = frozenset(
    {
        "estimated_value",   # float USD — best available value estimate
        "assessed_value",    # float USD — county assessed value
        "list_price",        # float USD — if actively listed
        "equity_pct",        # float 0-1 — estimated owner equity fraction
        "property_type",     # str — single_family|duplex|triplex|quadplex|condo|mobile_home|land|multi_family|other
        "beds",
        "baths",
        "sqft",
        "year_built",
        "absentee_owner",    # bool — owner mailing != situs
        "county",            # str — county name, uppercase
    }
)


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_iso8601(value: str | None) -> datetime | None:
    """Parse an ISO-8601 timestamp forgivingly. Naive values assumed UTC."""
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _clamp01(value: Any, default: float = 0.5) -> float:
    try:
        f = float(value)
    except (TypeError, ValueError):
        return default
    # NaN/inf are garbage, not "maximum trust": NaN slips through
    # max(0, min(1, x)) as 1.0 because NaN comparisons are all False.
    # Distrust it entirely (0.0), don't default it (0.5).
    if not math.isfinite(f):
        return 0.0
    return max(0.0, min(1.0, f))


def _opt_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _opt_str(value: Any) -> str | None:
    if value is None:
        return None
    s = str(value).strip()
    return s or None


# ---------------------------------------------------------------------------
# PropertyRef
# ---------------------------------------------------------------------------

@dataclass
class PropertyRef:
    """A reference to a physical property (the situs, not the owner mailing)."""

    address: str
    city: str = ""
    state: str = ""
    zip: str = ""
    apn: str | None = None       # assessor parcel number, county format as-is
    lat: float | None = None
    lon: float | None = None

    def to_dict(self) -> dict:
        return {
            "apn": self.apn,
            "address": self.address,
            "city": self.city,
            "state": self.state,
            "zip": self.zip,
            "lat": self.lat,
            "lon": self.lon,
        }

    @classmethod
    def from_dict(cls, d: dict | None) -> "PropertyRef":
        d = d or {}
        return cls(
            address=str(d.get("address") or "").strip(),
            city=str(d.get("city") or "").strip(),
            state=str(d.get("state") or "").strip().upper(),
            zip=str(d.get("zip") or d.get("zipcode") or d.get("zip_code") or "").strip(),
            apn=_opt_str(d.get("apn")),
            lat=_opt_float(d.get("lat")),
            lon=_opt_float(d.get("lon")),
        )


# ---------------------------------------------------------------------------
# Owner
# ---------------------------------------------------------------------------

@dataclass
class Owner:
    name: str | None = None
    mailing_address: str | None = None

    def to_dict(self) -> dict:
        return {"name": self.name, "mailing_address": self.mailing_address}

    @classmethod
    def from_dict(cls, d: dict | None) -> "Owner | None":
        if not d:
            return None
        owner = cls(
            name=_opt_str(d.get("name")),
            mailing_address=_opt_str(d.get("mailing_address")),
        )
        if owner.name is None and owner.mailing_address is None:
            return None
        return owner


# ---------------------------------------------------------------------------
# Signal — what adapters emit
# ---------------------------------------------------------------------------

@dataclass
class Signal:
    """One 'why they might sell now' observation about one property.

    Adapters emit these (or dicts of this shape). `id` must be stable per
    source observation — re-fetching the same upstream record must yield the
    same (source, id) pair, because the ledger dedupes on it.
    """

    id: str
    source: str                  # adapter name, e.g. "fdor_lee", "openfema_nfip"
    signal_type: str             # one of SIGNAL_TYPES
    observed_at: str             # ISO-8601; when the signal became true/was seen
    property: PropertyRef
    owner: Owner | None = None
    evidence: dict = field(default_factory=dict)   # source-specific payload + KNOWN_FACT_KEYS
    source_url: str | None = None
    confidence: float = 0.5      # 0..1 — how sure the adapter is this is real

    # -- identity -----------------------------------------------------------

    @property
    def dedupe_key(self) -> str:
        """Ledger idempotency key. Stable across re-runs of the same adapter."""
        return f"{self.source}:{self.id}"

    @staticmethod
    def generate_id(source: str, signal_type: str, address: str, observed_at: str) -> str:
        """Deterministic fallback id for adapters whose upstream has no id."""
        basis = f"{source}|{signal_type}|{address.upper().strip()}|{observed_at}"
        return "gen-" + hashlib.sha1(basis.encode("utf-8")).hexdigest()[:12]

    # -- serialization ------------------------------------------------------

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "source": self.source,
            "signal_type": self.signal_type,
            "observed_at": self.observed_at,
            "property": self.property.to_dict(),
            "owner": self.owner.to_dict() if self.owner else None,
            "evidence": self.evidence,
            "source_url": self.source_url,
            "confidence": self.confidence,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Signal":
        """Forgiving constructor. Coerces near-miss adapter output into the
        contract instead of exploding:
          - unknown signal_type -> "other" (original preserved in evidence)
          - confidence coerced + clamped to [0, 1]
          - missing observed_at -> now (UTC)
          - missing id -> deterministic hash of (source, type, address, observed_at)
        """
        prop = PropertyRef.from_dict(d.get("property"))
        source = str(d.get("source") or "unknown").strip() or "unknown"

        raw_type = str(d.get("signal_type") or "other").strip().lower()
        evidence = dict(d.get("evidence") or {})
        if raw_type in SIGNAL_TYPES:
            signal_type = raw_type
        else:
            signal_type = "other"
            if raw_type:
                evidence.setdefault("_original_signal_type", raw_type)

        observed_at = _opt_str(d.get("observed_at")) or _utcnow_iso()
        if parse_iso8601(observed_at) is None:
            evidence.setdefault("_original_observed_at", observed_at)
            observed_at = _utcnow_iso()

        sig_id = _opt_str(d.get("id")) or cls.generate_id(
            source, signal_type, prop.address, observed_at
        )

        return cls(
            id=sig_id,
            source=source,
            signal_type=signal_type,
            observed_at=observed_at,
            property=prop,
            owner=Owner.from_dict(d.get("owner")),
            evidence=evidence,
            source_url=_opt_str(d.get("source_url")),
            confidence=_clamp01(d.get("confidence", 0.5)),
        )

    # -- validation ---------------------------------------------------------

    def problems(self) -> list[str]:
        """Contract violations that make the signal unusable (empty = OK)."""
        out: list[str] = []
        if not self.property.address and not self.property.apn:
            out.append("property has neither address nor apn")
        if not self.source or self.source == "unknown":
            out.append("missing source")
        if self.signal_type not in SIGNAL_TYPES:
            out.append(f"invalid signal_type {self.signal_type!r}")
        if parse_iso8601(self.observed_at) is None:
            out.append(f"unparseable observed_at {self.observed_at!r}")
        return out

    @property
    def observed_dt(self) -> datetime:
        return parse_iso8601(self.observed_at) or datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# PropertyRecord — merged view (output of merge.py)
# ---------------------------------------------------------------------------

@dataclass
class PropertyRecord:
    """One property with every signal we've seen for it, plus merged facts."""

    key: str                     # canonical property key (see merge.property_key)
    property: PropertyRef
    signals: list[Signal] = field(default_factory=list)
    owner: Owner | None = None
    facts: dict = field(default_factory=dict)   # KNOWN_FACT_KEYS lifted from evidence

    @property
    def distinct_signal_types(self) -> set[str]:
        return {s.signal_type for s in self.signals}

    @property
    def signal_count(self) -> int:
        return len(self.signals)

    @property
    def latest_observed_at(self) -> str | None:
        if not self.signals:
            return None
        return max(self.signals, key=lambda s: s.observed_dt).observed_at

    def to_dict(self) -> dict:
        return {
            "key": self.key,
            "property": self.property.to_dict(),
            "owner": self.owner.to_dict() if self.owner else None,
            "signals": [s.to_dict() for s in self.signals],
            "facts": self.facts,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "PropertyRecord":
        return cls(
            key=str(d.get("key") or ""),
            property=PropertyRef.from_dict(d.get("property")),
            owner=Owner.from_dict(d.get("owner")),
            signals=[Signal.from_dict(s) for s in (d.get("signals") or [])],
            facts=dict(d.get("facts") or {}),
        )


# ---------------------------------------------------------------------------
# ScoreBreakdown — explainability (triage_core lineage)
# ---------------------------------------------------------------------------

@dataclass
class ScoreBreakdown:
    """Explainable score: total = sum(components.values()), with a human
    reason string per component. Underwriting displays this verbatim."""

    total: float
    components: dict[str, float] = field(default_factory=dict)
    reasons: dict[str, str] = field(default_factory=dict)

    def as_dict(self) -> dict:
        return {
            "total": self.total,
            "components": self.components,
            "reasons": self.reasons,
        }

    to_dict = as_dict  # alias so every contract type serializes the same way

    @classmethod
    def from_dict(cls, d: dict | None) -> "ScoreBreakdown":
        d = d or {}
        return cls(
            total=float(d.get("total") or 0.0),
            components={k: float(v) for k, v in (d.get("components") or {}).items()},
            reasons=dict(d.get("reasons") or {}),
        )


# ---------------------------------------------------------------------------
# DealCandidate — what underwriting consumes (data/candidates.jsonl rows)
# ---------------------------------------------------------------------------

@dataclass
class DealCandidate:
    """A scored, criteria-evaluated, routed property. One JSONL row each in
    data/candidates.jsonl. The underwriting layer builds on THIS shape."""

    property_key: str
    property: PropertyRef
    signals: list[Signal]
    criteria_matches: dict          # CriteriaResult.as_dict(): matched/matches/misses/unknowns
    distress_score: float
    recommended_strategy: str
    score_breakdown: ScoreBreakdown
    route: str | None = None        # hot | warm | watch | discard (set by route.py)
    owner: Owner | None = None
    facts: dict = field(default_factory=dict)
    scored_at: str = field(default_factory=_utcnow_iso)
    # Strategy-picker verdict, attached by spine/underwrite.py for hot/warm
    # candidates: {"recommendation": str, "ranked_top3": [...], "hitl_note": str}.
    # None = not underwritten (watch/discard, or an older snapshot).
    underwriting: dict | None = None

    @property
    def distinct_signal_types(self) -> set[str]:
        return {s.signal_type for s in self.signals}

    def to_dict(self) -> dict:
        return {
            "property_key": self.property_key,
            "property": self.property.to_dict(),
            "owner": self.owner.to_dict() if self.owner else None,
            "signals": [s.to_dict() for s in self.signals],
            "facts": self.facts,
            "criteria_matches": self.criteria_matches,
            "distress_score": self.distress_score,
            "recommended_strategy": self.recommended_strategy,
            "score_breakdown": self.score_breakdown.as_dict(),
            "route": self.route,
            "scored_at": self.scored_at,
            "underwriting": self.underwriting,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "DealCandidate":
        return cls(
            property_key=str(d.get("property_key") or ""),
            property=PropertyRef.from_dict(d.get("property")),
            owner=Owner.from_dict(d.get("owner")),
            signals=[Signal.from_dict(s) for s in (d.get("signals") or [])],
            facts=dict(d.get("facts") or {}),
            criteria_matches=dict(d.get("criteria_matches") or {}),
            distress_score=float(d.get("distress_score") or 0.0),
            recommended_strategy=str(d.get("recommended_strategy") or ""),
            score_breakdown=ScoreBreakdown.from_dict(d.get("score_breakdown")),
            route=_opt_str(d.get("route")),
            scored_at=_opt_str(d.get("scored_at")) or _utcnow_iso(),
            underwriting=(d.get("underwriting")
                          if isinstance(d.get("underwriting"), dict) else None),
        )
