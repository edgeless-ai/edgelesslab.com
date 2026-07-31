"""West Sacramento code-enforcement signal adapter — a West Coast (CA/Yolo)
distress feed. Fixtures by default, live opt-in.

What this does
    The City of West Sacramento publishes its code-enforcement caseload as a
    keyless ArcGIS FeatureServer (15k+ cases) with a situs address, an opened
    date, a case status, and the parcel. Emits `code_violation` signals anchored
    on ADDRESS so a future second West-Sac signal could stack. Unlike Seattle /
    Denver, the feed carries NO complaint description (Type is uniformly
    "ENFORCEMENT"), so there is no owner-distress classifier here and no 🚩 flag
    (we do not invent distress detail the source does not provide); the
    case Status is the only quality lever.

Live path (DEALFLOW_LIVE=1 / cli.py run --live)
    gis.cityofwestsacramento.org code_enforcement/FeatureServer/0. Verified live
    2026-07-31 (15107 records). Most-recent-first, bounded resultRecordCount.

Fixture (fixtures/adapters/westsac_code_enforcement_sample.json)
    14 real recent case records pulled from the live service.

ToS / politeness
    West Sacramento open GIS, public/keyless. Requests go through the shared
    politeness layer (descriptive UA, >=1s spacing, bounded retries); bounded
    record count.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone

try:
    from . import _common
except ImportError:
    import _common

# Disabled in the DEFAULT pipeline (discover_adapters skips ENABLED=False).
# Built + verified live 2026-07-31, but the feed produces only WATCH-tier leads:
# it is single-signal (no West-Sac stacking partner exists keyless, so it can
# never mint a hot stack) AND low-signal (Type has no complaint detail, and its
# "open" cases are long-running so recency decay pushes even active enforcement
# below the warm floor — max live score ~0.30 vs Denver's 0.6 warm leads). It
# does not clear the actionable-leads bar Denver does. Kept (code + 6 tests) as
# a ready drop-in: flip to True if West Sac ever gains a second signal type, or
# if a lower warm floor / a recent-case filter makes it earn its place.
ENABLED = False

FIXTURE = "westsac_code_enforcement_sample.json"
SOURCE = "westsac_code_enforcement"

ARCGIS_QUERY = ("https://gis.cityofwestsacramento.org/server/rest/services/"
                "code_enforcement/FeatureServer/0/query")
_OUT_FIELDS = "CaseNumber,Parcel,Address,Type,DateOpened,Status,StatusDate"
_ZIP_RE = re.compile(r"\b(\d{5})(?:-\d{4})?\b\s*$")

# Case Status is the only quality lever the feed offers. An open enforcement
# stage is a stronger "owner has an unresolved problem" signal than a closed
# case or an unverified fresh complaint.
_STATUS_CONFIDENCE = {
    "ENFORCEMENT": 0.6,        # active enforcement — real, unresolved
    "INSPECTIONS": 0.5,        # under inspection
    "COMPLAINT RECEIVED": 0.4, # filed, not yet substantiated
    "CLOSED": 0.35,            # resolved (kept, low weight — history)
}


def _confidence(status) -> float:
    return _STATUS_CONFIDENCE.get(str(status or "").strip().upper(), 0.4)


def _parse_address(full: str) -> tuple[str, str]:
    """(street, zip) from a West Sac full address. Street is the base line; zip
    is lifted from the tail when present."""
    parts = [p.strip() for p in str(full or "").split(",") if p.strip()]
    street = parts[0] if parts else ""
    m = _ZIP_RE.search(str(full or ""))
    return street, (m.group(1) if m else "")


def _epoch_to_iso(ms) -> str | None:
    try:
        return datetime.fromtimestamp(int(ms) / 1000, tz=timezone.utc).isoformat(
            timespec="seconds")
    except (TypeError, ValueError):
        return None


def _to_signal(rec: dict) -> dict | None:
    street, zip_code = _parse_address(rec.get("Address"))
    if not street:
        return None
    observed = _epoch_to_iso(rec.get("DateOpened")) or _common.now_iso()
    status = str(rec.get("Status") or "").strip()
    return _common.build_signal(
        id=_common.make_id(SOURCE, rec.get("CaseNumber")),
        source=SOURCE,
        signal_type="code_violation",
        observed_at=observed,
        address=street,                 # anchor on address (no apn)
        city="WEST SACRAMENTO",
        state="CA",
        zip_code=zip_code,
        evidence={
            "case_number": rec.get("CaseNumber"),
            "parcel": rec.get("Parcel"),
            "category": "Code Enforcement",
            "status": status,
            "distress_tier": "code_enforcement",
            "distress_hint": False,     # no complaint detail -> no honest flag
            "county": "YOLO",           # KNOWN_FACT_KEYS (West Sac is in Yolo)
        },
        source_url=None,
        confidence=_confidence(status),
    )


def _fetch_live(days: int, limit: int) -> list[dict]:
    """Most-recent West Sac enforcement cases (all statuses; Status drives
    confidence). `days` is advisory — the feed is small so we order by opened
    date and cap."""
    # Only UNRESOLVED cases are live distress — a CLOSED case is a fixed problem,
    # not a sell signal. Filtering to open stages also lifts the feed's average
    # confidence (closed cases would otherwise dominate the recent window).
    data = _common.http_get_json(ARCGIS_QUERY, params={
        "where": "Address IS NOT NULL AND Status <> 'CLOSED'",
        "outFields": _OUT_FIELDS,
        "orderByFields": "DateOpened DESC",
        "resultRecordCount": int(limit),
        "f": "json",
    })
    feats = data.get("features", []) if isinstance(data, dict) else []
    return [f.get("attributes", {}) for f in feats if f.get("attributes")]


def fetch(days: int = 365, limit: int = 600,
          offline: bool | None = None) -> list[dict]:
    """West Sacramento code-enforcement signals.

    Args:
        days: advisory lookback (live mode).
        limit: max ArcGIS records per live run (politeness bound).
        offline: None consults DEALFLOW_LIVE; explicit True/False wins.
    """
    if _common.resolve_offline(offline):
        records = _common.load_fixture(FIXTURE)
        fixture_mode = True
    else:
        try:
            records = _fetch_live(days, limit)
        except Exception:
            records = _common.load_fixture(FIXTURE)
            fixture_mode = True
        else:
            fixture_mode = False
    signals = []
    for rec in records:
        sig = _to_signal(rec)
        if sig is not None:
            if fixture_mode:
                sig["evidence"]["fixture_data"] = True
            signals.append(sig)
    return signals


if __name__ == "__main__":
    import json
    sigs = fetch()
    mode = "LIVE (West Sac ArcGIS)" if _common.live_enabled() else "fixture"
    print(f"westsac_code_enforcement: {len(sigs)} signals ({mode})")
    if sigs:
        print(json.dumps(sigs[0], indent=2))
