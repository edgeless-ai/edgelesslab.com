"""Code-violation / property-complaint signal adapter (Portland-first).

Honest source finding (2026-07, verified by live probing):
    Portland, OR does NOT publish code-enforcement / property-compliance
    cases on any keyless open-data endpoint. All of the following were
    enumerated and contain NO enforcement dataset:
      - gis-pdx.opendata.arcgis.com (full DCAT catalog, 354 datasets)
      - www.portlandmaps.com/arcgis/rest/services (Public folder, ~220 svcs)
      - www.portlandmaps.com/od/rest/services (COP_OpenData_* services)
      - data.portlandoregon.gov (CKAN portal is DEAD/retired)
    Portland BDS "Property Compliance" cases ARE available via the
    PortlandMaps API (https://www.portlandmaps.com/development/), but that
    requires registering for an API key (a login), which is out of scope
    for this R&D pass. Documented in docs/data-sources.md for later.

Modes
    city="seattle" (default): LIVE + keyless. Default so that the spine's
        zero-arg discovery runs ingest only REAL data. Seattle SDCI "Code
        Violations" on Socrata (dataset ez4a-iug7, data.seattle.gov).
        Complaints and Violations" on Socrata (dataset ez4a-iug7,
        data.seattle.gov). Live-verifies this adapter's machinery
        end-to-end as a real per-property complaint feed.
        https://data.seattle.gov/resource/ez4a-iug7.json
    city="portland": fixture-driven, EXPLICIT OPT-IN ONLY. The fixture
        mirrors the shape of PortlandMaps/BDS AMANDA case records so a
        future key-based integration is a drop-in. Records are clearly
        marked synthetic (evidence.synthetic_fixture, confidence 0.3) and
        never surface in a default discovery run.

Cadence
    Seattle dataset refreshes daily. Daily polling is appropriate.

ToS / politeness
    Socrata SODA endpoints are public/keyless but throttled without an app
    token — keep $limit small and poll no more than daily. Seattle open
    data terms: https://data.seattle.gov/stories/s/Data-Policy/6ukr-wvup
"""

from __future__ import annotations

try:
    from . import _common
except ImportError:
    import _common

SEATTLE_URL = "https://data.seattle.gov/resource/ez4a-iug7.json"
FIXTURE_SEATTLE = "portland_code_violations_sample.json"   # real Seattle sample
FIXTURE_PORTLAND = "portland_code_violations_portland_fixture.json"  # synthetic

# Signal-quality classifier for a code complaint. Seattle's record-type vocab
# ("Emergency", "Housing", "LandLord/Tenant") over-fires on distress under a
# naive keyword match — a tenant's "Emergency, LandLord/Tenant — 3 day notice"
# is NOT an owner-sell signal. So separate REAL owner-side distress (the
# structure is failing or empty — a genuine "the owner may unload this") from
# tenant/landlord disputes (a tenant complaining about a landlord).
_OWNER_DISTRESS = (
    "vacant", "abandon", "derelict", "condemn", "unfit", "uninhabit",
    "demolition", "demolish", "collapse", "fire", "burned", "flood",
    "water damage", "structural", "boarded", "unsafe building",
    "unsafe structure", "hoard",
)
_TENANT_DISPUTE = (
    "landlord", "tenant", "lease", "rent increase", "rent ", "eviction",
    "deposit", "just cause", "notice to vacate", "3 day notice",
)


def _classify(desc: str) -> tuple[str, float, bool]:
    """(tier, confidence, distress_flag) for a complaint description.

    Owner-distress ranks ~2x a tenant dispute in the score
    (weight * confidence * decay), and ONLY owner-distress raises the digest's
    🚩 flag — so vacant/fire/damage rise above tenant gripes. Owner-distress is
    checked first so 'vacant building with a tenant' classifies as distress.
    """
    d = desc.lower()
    if any(t in d for t in _OWNER_DISTRESS):
        return "owner_distress", 0.8, True
    if any(t in d for t in _TENANT_DISPUTE):
        return "tenant_dispute", 0.4, False
    return "other", 0.5, False


def _fetch_seattle_raw(days: int, limit: int) -> list[dict]:
    from datetime import datetime, timedelta, timezone
    since = (datetime.now(timezone.utc) - timedelta(days=days)).strftime(
        "%Y-%m-%dT00:00:00")
    params = {
        "$where": f"opendate >= '{since}'",
        "$order": "opendate DESC",
        "$limit": str(limit),
    }
    data = _common.http_get_json(SEATTLE_URL, params)
    return data if isinstance(data, list) else []


def _seattle_to_signal(rec: dict) -> dict:
    desc = " ".join(str(rec.get(k) or "") for k in
                    ("recordtypedesc", "description")).lower()
    tier, confidence, distress = _classify(desc)
    link = (rec.get("link") or {}).get("url") if isinstance(
        rec.get("link"), dict) else rec.get("link")
    return _common.build_signal(
        id=_common.make_id("seattle_sdci", rec.get("recordnum")),
        source="seattle_sdci_code_complaints",
        signal_type="code_violation",
        observed_at=str(rec.get("opendate") or _common.now_iso()),
        address=str(rec.get("originaladdress1") or ""),
        city=str(rec.get("originalcity") or "SEATTLE"),
        state=str(rec.get("originalstate") or "WA"),
        zip_code=str(rec.get("originalzip") or ""),
        lat=float(rec["latitude"]) if rec.get("latitude") else None,
        lon=float(rec["longitude"]) if rec.get("longitude") else None,
        evidence={
            "record_number": rec.get("recordnum"),
            "record_type": rec.get("recordtype"),
            "category": rec.get("recordtypedesc"),
            "description": rec.get("description"),
            "status": rec.get("statuscurrent"),
            "last_inspection_date": rec.get("lastinspdate"),
            "last_inspection_result": rec.get("lastinspresult"),
            "distress_tier": tier,
            "distress_hint": distress,
            "county": "KING",  # KNOWN_FACT_KEYS
        },
        source_url=link,
        confidence=confidence,
    )


def _portland_to_signal(rec: dict) -> dict:
    return _common.build_signal(
        id=_common.make_id("portland_bds", rec.get("case_number")),
        source="portland_bds_property_compliance",
        signal_type="code_violation",
        observed_at=str(rec.get("case_opened") or _common.now_iso()),
        address=str(rec.get("address") or ""),
        city="PORTLAND",
        state="OR",
        zip_code=str(rec.get("zip") or ""),
        apn=rec.get("state_id"),  # Multnomah R-number / state tax lot id
        lat=rec.get("lat"),
        lon=rec.get("lon"),
        evidence={
            "case_number": rec.get("case_number"),
            "case_type": rec.get("case_type"),
            "description": rec.get("description"),
            "status": rec.get("status"),
            "synthetic_fixture": bool(rec.get("_synthetic")),
            "county": "MULTNOMAH",  # KNOWN_FACT_KEYS
        },
        source_url=rec.get("url"),
        # fixture data / key-gated source not yet live => low confidence
        confidence=0.3 if rec.get("_synthetic") else 0.7,
    )


def fetch(city: str = "seattle", days: int = 90, limit: int = 8000,
          offline: bool | None = None) -> list[dict]:
    """Fetch code-violation signals.

    Args:
        city: "seattle" (live, keyless Socrata — default) or "portland"
              (synthetic fixture until an API-key integration lands).
        days: lookback window on case-open date (seattle live mode only).
        limit: max records (seattle live mode only).
        offline: skip the network and use bundled fixtures. Default None =
            offline unless the run is live (`cli.py run --live` /
            DEALFLOW_LIVE=1).
    """
    offline = _common.resolve_offline(offline)
    city = city.lower()
    if city == "seattle":
        records: list[dict] = []
        from_fixture = False
        if not offline:
            try:
                records = _fetch_seattle_raw(days, limit)
            except Exception:
                records = []
        if not records:
            records = _common.load_fixture(FIXTURE_SEATTLE)
            from_fixture = True
        signals = [_seattle_to_signal(r) for r in records]
        if from_fixture:
            for s in signals:
                s["evidence"]["fixture_data"] = True
        return signals
    if city == "portland":
        # No keyless live endpoint exists (see module docstring).
        records = _common.load_fixture(FIXTURE_PORTLAND)
        return [_portland_to_signal(r) for r in records]
    raise ValueError(f"unsupported city: {city!r} (portland|seattle)")


if __name__ == "__main__":
    import sys
    offline = "--offline" in sys.argv
    sea = fetch(city="seattle", days=30, limit=100, offline=offline)
    pdx = fetch(city="portland")
    print(f"portland_code_violations: seattle(live)={len(sea)} signals, "
          f"portland(fixture)={len(pdx)} signals offline={offline}")
    if sea:
        import json
        print(json.dumps(sea[0], indent=2))
