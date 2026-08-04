"""Spokane (Spokane County WA) code-complaint signal adapter — the distress
half of a THIRD hot-producing metro. Fixtures by default, live opt-in.

Why this metro
    Spokane pairs two KEYLESS feeds that stack into hot leads via the Tacoma
    APN-merge template:
      1. this feed - City of Spokane code-enforcement complaints (Accela via
         the city's own ArcGIS server, 61k+ dated cases: Substandard Building,
         Fire Hazard, Illegal Dumps, Junk Vehicles, Zoning Violation, ...),
      2. Spokane County Assessor SCOUTSimple parcels (taxpayer mailing ->
         out-of-state absentee, spokane_absentee.py).
    BOTH carry the assessor parcel number ("35082.4002" <-> PID_NUM), so the
    metro anchors on APN -> an exact parcel merge, no address/zip matching.

Live path (DEALFLOW_LIVE=1 / cli.py run --live)
    services.spokanegis.org BDS/Accela_WM_Dynamic/MapServer/47 (Code
    Complaint). Verified live 2026-08-04: 61844 records total, 3566 opened in
    the trailing 180d, 958 of those parcel-anchored distress types. Dated
    (RecordOpenDate, epoch ms), paginated (supportsPagination true).

Fixture (fixtures/adapters/spokane_code_violations_sample.json)
    14 real case records pulled from the live service (4 Substandard Building
    + Illegal Dumps / Zoning Violation).

ToS / politeness
    City of Spokane public GIS, keyless. Shared politeness layer (descriptive
    UA, >=1s spacing, bounded retries); bounded record count.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

try:
    from . import _common
except ImportError:
    import _common

FIXTURE = "spokane_code_violations_sample.json"
SOURCE = "spokane_accela_code_complaints"

ARCGIS_QUERY = ("https://services.spokanegis.org/arcgis/rest/services/BDS/"
                "Accela_WM_Dynamic/MapServer/47/query")
_OUT_FIELDS = ("RecordId,RecordOpenDate,RecordStatus,DateClosed,Parcel,"
               "Address,ComplaintType,ComplaintStatus")
_PAGE = 2000         # layer maxRecordCount
LIVE_LIMIT = 6000    # covers the ~3.6k trailing-180d window with headroom

# Owner-side distress in Spokane's ComplaintType vocabulary (the structure is
# failing or unfit). Bare "fire" is deliberately NOT here: Spokane's "Fire
# Hazard" complaints are overgrown weeds / combustible material, not a failing
# structure, so they classify "other" (still a real, stackable violation).
_OWNER_DISTRESS = (
    "derelict", "substandard", "vacant", "abandon", "condemn", "unfit",
    "uninhabit", "dangerous", "collapse", "boarded",
)


def _classify(text: str) -> tuple[str, float, bool]:
    """(tier, confidence, distress_flag) from ComplaintType."""
    t = text.lower()
    if any(term in t for term in _OWNER_DISTRESS):
        return "owner_distress", 0.8, True
    return "other", 0.5, False


def _epoch_to_iso(ms) -> str | None:
    try:
        return datetime.fromtimestamp(int(ms) / 1000, tz=timezone.utc).isoformat(
            timespec="seconds")
    except (TypeError, ValueError):
        return None


def _norm_pin(pin) -> str | None:
    p = "".join(ch for ch in str(pin or "") if ch.isalnum())
    return p or None


def _to_signal(rec: dict) -> dict | None:
    # The city inspected and found nothing — not a violation, no signal.
    if str(rec.get("ComplaintStatus") or "").strip().lower() == "no violation":
        return None
    addr = str(rec.get("Address") or "").strip()
    pin = _norm_pin(rec.get("Parcel"))
    if not addr and not pin:
        return None
    ctype = str(rec.get("ComplaintType") or "").strip()
    tier, confidence, distress = _classify(ctype)
    observed = _epoch_to_iso(rec.get("RecordOpenDate")) or _common.now_iso()
    return _common.build_signal(
        id=_common.make_id(SOURCE, rec.get("RecordId")),
        source=SOURCE,
        signal_type="code_violation",
        observed_at=observed,
        # APN-anchored: this feed's Parcel and the assessor's PID_NUM share the
        # "35082.4002" format, so the parcel merge with spokane_absentee is
        # exact ("APN wins").
        apn=pin,
        address=addr,
        city="SPOKANE",
        state="WA",
        zip_code="",
        evidence={
            "case_number": rec.get("RecordId"),
            "category": ctype,
            "status": rec.get("RecordStatus"),
            "complaint_status": rec.get("ComplaintStatus"),
            "distress_tier": tier,
            "distress_hint": distress,
            "county": "SPOKANE",  # KNOWN_FACT_KEYS
        },
        source_url=None,
        confidence=confidence,
    )


def _fetch_live(days: int, limit: int) -> list[dict]:
    """Spokane code complaints opened in the trailing `days`, most-recent
    first, paginated via resultOffset up to `limit` (politeness cap). Dedupes
    by RecordId and stops on a short page or a no-new-rows page (guards a
    service that ignores resultOffset)."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).strftime(
        "%Y-%m-%d")
    where = f"RecordOpenDate >= TIMESTAMP '{cutoff} 00:00:00'"
    out: list[dict] = []
    seen: set[str] = set()
    offset = 0
    while len(out) < limit:
        page_size = min(_PAGE, limit - len(out))
        data = _common.http_get_json(ARCGIS_QUERY, params={
            "where": where,
            "outFields": _OUT_FIELDS,
            "orderByFields": "RecordOpenDate DESC",
            "resultOffset": offset,
            "resultRecordCount": int(page_size),
            "returnGeometry": "false",
            "f": "json",
        })
        feats = data.get("features", []) if isinstance(data, dict) else []
        recs = [f.get("attributes", {}) for f in feats if f.get("attributes")]
        new = []
        for r in recs:
            rid = str(r.get("RecordId") or "")
            if rid and rid in seen:
                continue
            if rid:
                seen.add(rid)
            new.append(r)
        out.extend(new)
        more = isinstance(data, dict) and data.get("exceededTransferLimit")
        if len(recs) < page_size or not more or not new:
            break
        offset += len(recs)
    return out[:limit]


def fetch(days: int = 180, limit: int = LIVE_LIMIT,
          offline: bool | None = None) -> list[dict]:
    """Spokane code-complaint signals.

    Args:
        days: lookback window (live mode; RecordOpenDate is a real dated field).
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
    mode = "LIVE (Spokane ArcGIS)" if _common.live_enabled() else "fixture"
    print(f"spokane_code_violations: {len(sigs)} signals ({mode})")
    if sigs:
        print(json.dumps(sigs[0], indent=2))
