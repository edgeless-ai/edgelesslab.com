"""Tacoma (Pierce County WA) code-violation signal adapter — the distress half
of a second hot-producing metro. Fixtures by default, live opt-in.

Why this metro
    Tacoma pairs two KEYLESS feeds that stack into hot leads the same way
    Seattle does:
      1. this feed - City of Tacoma NCS "Code Violations" (ArcGIS, 23k+ dated
         cases: Derelict/Substandard Building, Nuisance, Health & Sanitation),
      2. Pierce County Tax Parcels (taxpayer mailing -> out-of-state absentee).
    BOTH carry the 10-digit Pierce assessor parcel number, so unlike Seattle
    (address-anchored), this metro anchors on APN -> a clean parcel merge with
    the Pierce absentee feed (no zip/city matching needed).

Live path (DEALFLOW_LIVE=1 / cli.py run --live)
    services3.arcgis.com/SCwJH1pD8WSn5T5y Code Violations/FeatureServer/0.
    Verified live 2026-07-31 (23137 records). Most-recent-first, bounded.

Fixture (fixtures/adapters/tacoma_code_violations_sample.json)
    14 real recent case records pulled from the live service.

ToS / politeness
    Tacoma open GIS, public/keyless. Shared politeness layer (descriptive UA,
    >=1s spacing, bounded retries); bounded record count.
"""

from __future__ import annotations

from datetime import datetime, timezone

try:
    from . import _common
except ImportError:
    import _common

FIXTURE = "tacoma_code_violations_sample.json"
SOURCE = "tacoma_ncs_code_violations"

ARCGIS_QUERY = ("https://services3.arcgis.com/SCwJH1pD8WSn5T5y/arcgis/rest/"
                "services/Code%20Violations/FeatureServer/0/query")
_OUT_FIELDS = ("casenumber,opendate,description,parcelnumber,address,casetype,"
               "currentstatus,casestatus,latitude,longitude,citycouncildistrict")

# Owner-side distress in Tacoma's casetype vocabulary (the structure is failing
# or unfit). Only these raise the 🚩 flag; a graffiti/noise/junk-vehicle case is
# a real code violation but a weak sell signal.
_OWNER_DISTRESS = (
    "derelict", "substandard", "vacant", "abandon", "condemn", "unfit",
    "uninhabit", "dangerous", "collapse", "fire", "boarded",
)


def _classify(text: str) -> tuple[str, float, bool]:
    """(tier, confidence, distress_flag) from casetype + description."""
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
    addr = str(rec.get("address") or "").strip()
    pin = _norm_pin(rec.get("parcelnumber"))
    if not addr and not pin:
        return None
    casetype = str(rec.get("casetype") or "").strip()
    tier, confidence, distress = _classify(
        casetype + " " + str(rec.get("description") or ""))
    observed = _epoch_to_iso(rec.get("opendate")) or _common.now_iso()
    return _common.build_signal(
        id=_common.make_id(SOURCE, rec.get("casenumber")),
        source=SOURCE,
        signal_type="code_violation",
        observed_at=observed,
        # APN-anchored: both this feed and Pierce absentee carry the 10-digit
        # Pierce parcel number, so the parcel merge is exact ("APN wins").
        apn=pin,
        address=addr,
        city="TACOMA",
        state="WA",
        zip_code="",
        lat=rec.get("latitude"),
        lon=rec.get("longitude"),
        evidence={
            "case_number": rec.get("casenumber"),
            "category": casetype,
            "description": rec.get("description"),
            "status": rec.get("currentstatus"),
            "case_status": rec.get("casestatus"),
            "distress_tier": tier,
            "distress_hint": distress,
            "county": "PIERCE",  # KNOWN_FACT_KEYS
        },
        source_url=None,
        confidence=confidence,
    )


def _fetch_live(days: int, limit: int) -> list[dict]:
    """Most-recent Tacoma code cases (all types; casetype drives distress).
    `days` is advisory; ordered by opendate DESC and capped for politeness."""
    data = _common.http_get_json(ARCGIS_QUERY, params={
        "where": "address IS NOT NULL",
        "outFields": _OUT_FIELDS,
        "orderByFields": "opendate DESC",
        "resultRecordCount": int(limit),
        "f": "json",
    })
    feats = data.get("features", []) if isinstance(data, dict) else []
    return [f.get("attributes", {}) for f in feats if f.get("attributes")]


def fetch(days: int = 180, limit: int = 2000,
          offline: bool | None = None) -> list[dict]:
    """Tacoma code-violation signals.

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
    mode = "LIVE (Tacoma ArcGIS)" if _common.live_enabled() else "fixture"
    print(f"tacoma_code_violations: {len(sigs)} signals ({mode})")
    if sigs:
        print(json.dumps(sigs[0], indent=2))
