"""Denver residential-health-complaint signal adapter — the Mountain leg's
first keyless distress feed. Fixtures by default, live opt-in.

What this does
    Denver (City & County of Denver) publishes DDPHE "Residential Health
    Complaints" as a keyless ArcGIS FeatureServer — per-property habitability
    complaints (mold, no heat/water, pests, sanitation) with an outcome
    (Founded / Unsubstantiated), a status, the owner entity, a case link, and
    a situs address. A FOUNDED habitability complaint is a real owner/landlord
    distress signal, so this is the West-buy-box Mountain analogue of the
    Seattle SDCI code-violation feed. Emits `code_violation` signals anchored
    on ADDRESS (so a future second Denver signal can stack into a hot lead).

Live path (DEALFLOW_LIVE=1 / cli.py run --live)
    services1.arcgis.com/zdB7qR0BtYrg0Xpl (org: The City and County of Denver),
    Residential_Health_Complaints/FeatureServer/0. Verified live 2026-07-30
    (6956 records). Most-recent-first, bounded resultRecordCount.

Fixture (fixtures/adapters/denver_health_complaints_sample.json)
    14 real FOUNDED complaint records pulled from the live service.

ToS / politeness
    Denver open GIS, public/keyless. Requests go through the shared politeness
    layer (descriptive UA, >=1s spacing, bounded retries); bounded record count.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone

try:
    from . import _common
except ImportError:
    import _common

FIXTURE = "denver_health_complaints_sample.json"
SOURCE = "denver_ddphe_residential_health"

ARCGIS_QUERY = ("https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/"
                "services/Residential_Health_Complaints/FeatureServer/0/query")
_OUT_FIELDS = ("RECORD_ID,RECORD_NAME,COMPLAINT_OUTCOME,COMPLAINT_STATUS,"
               "INCIDENT_DATE,RECORD_OPEN_DATE,OWNER_ENTITY_NAME,FULL_ADDRESS,"
               "LATITUDE,LONGITUDE,NEIGHBORHOOD,COUNCIL_DISTRICT,DOCUMENT_LINK")

# Habitability distress that reads as OWNER-side (the structure is failing or
# empty), vs a routine health complaint. Only owner-distress raises the 🚩 flag,
# matching the Seattle classifier's honesty (don't over-flag tenant gripes).
_OWNER_DISTRESS = (
    "vacant", "abandon", "derelict", "condemn", "unfit", "uninhabit",
    "demolition", "demolish", "collapse", "fire", "flood", "water damage",
    "structural", "boarded", "sewage", "mold", "no heat", "no water",
    "infestation", "hoard",
)
_ZIP_RE = re.compile(r"\b(\d{5})(?:-\d{4})?\b\s*$")


def _classify(text: str) -> tuple[str, bool]:
    """(distress_tier, distress_flag) for a complaint's record name."""
    t = text.lower()
    if any(term in t for term in _OWNER_DISTRESS):
        return "owner_distress", True
    return "health_complaint", False


def _confidence(outcome: str) -> float:
    """A substantiated (Founded) habitability complaint is a strong signal; an
    unsubstantiated one is weak but still a filed complaint."""
    o = (outcome or "").strip().lower()
    if o == "founded":
        return 0.6
    if o in ("unsubstantiated", "unfounded", "no violation"):
        return 0.3
    return 0.45


def _parse_address(full: str) -> tuple[str, str]:
    """(street, zip) from a Denver FULL_ADDRESS. Street is the base street line
    (a UNIT part is dropped so units in one building merge to one property);
    zip is lifted from the tail when present."""
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
    street, zip_code = _parse_address(rec.get("FULL_ADDRESS"))
    if not street:
        return None
    tier, distress = _classify(str(rec.get("RECORD_NAME") or ""))
    observed = (_epoch_to_iso(rec.get("INCIDENT_DATE"))
                or _epoch_to_iso(rec.get("RECORD_OPEN_DATE")) or _common.now_iso())
    owner = str(rec.get("OWNER_ENTITY_NAME") or "").strip()
    return _common.build_signal(
        id=_common.make_id(SOURCE, rec.get("RECORD_ID")),
        source=SOURCE,
        signal_type="code_violation",
        observed_at=observed,
        # NB: anchors on ADDRESS (no apn) so it merges with any future
        # address-keyed Denver signal — the Seattle absentee lesson.
        address=street,
        city="DENVER",
        state="CO",
        zip_code=zip_code,
        lat=rec.get("LATITUDE"),
        lon=rec.get("LONGITUDE"),
        owner={"name": owner} if owner else None,
        evidence={
            "record_id": rec.get("RECORD_ID"),
            "category": "Residential Health Complaint",
            "description": rec.get("RECORD_NAME"),
            "outcome": rec.get("COMPLAINT_OUTCOME"),
            "status": rec.get("COMPLAINT_STATUS"),
            "neighborhood": rec.get("NEIGHBORHOOD"),
            "council_district": rec.get("COUNCIL_DISTRICT"),
            "distress_tier": tier,
            "distress_hint": distress,
            "county": "DENVER",  # KNOWN_FACT_KEYS (Denver is a city-county)
        },
        source_url=rec.get("DOCUMENT_LINK"),
        confidence=_confidence(str(rec.get("COMPLAINT_OUTCOME") or "")),
    )


def _fetch_live(days: int, limit: int) -> list[dict]:
    """Most-recent Denver residential-health complaints (all outcomes; the
    outcome drives confidence). `days` is advisory — the service is small
    (~7k rows) so we order by open date and cap; a date filter isn't needed."""
    data = _common.http_get_json(ARCGIS_QUERY, params={
        "where": "FULL_ADDRESS IS NOT NULL",
        "outFields": _OUT_FIELDS,
        "orderByFields": "RECORD_OPEN_DATE DESC",
        "resultRecordCount": int(limit),
        "f": "json",
    })
    feats = data.get("features", []) if isinstance(data, dict) else []
    return [f.get("attributes", {}) for f in feats if f.get("attributes")]


def fetch(days: int = 365, limit: int = 600,
          offline: bool | None = None) -> list[dict]:
    """Denver residential-health-complaint signals.

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
    mode = "LIVE (Denver ArcGIS)" if _common.live_enabled() else "fixture"
    print(f"denver_health_complaints: {len(sigs)} signals ({mode})")
    if sigs:
        print(json.dumps(sigs[0], indent=2))
