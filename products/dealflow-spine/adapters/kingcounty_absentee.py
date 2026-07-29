"""Absentee-owner signal adapter (King County) — fixtures by default, live opt-in.

What this does
    Flag parcels whose TAXPAYER mails from out of area — the EBRE "spine":
    absentee owners (especially out-of-state) sell disproportionately, and an
    absentee owner STACKED with a code violation on the same parcel is a hot
    lead — two distinct "why they'll sell" signals on one property.

Live path (DEALFLOW_LIVE=1 / cli.py run --live)
    King County public parcel + ownership ArcGIS FeatureServer (keyless),
    PARCEL_ADDRESS_PUB_AREA_3069 layer 0. Verified live 2026-07-29. Query:
    Seattle residential parcels whose KCTP_STATE (taxpayer mailing state) != WA
    — the strongest absentee cut — bounded resultRecordCount. The situs address
    (ADDR_FULL/CTYNAME/ZIP5) anchors the signal; the taxpayer mailing (KCTP_*)
    is the absentee evidence. No owner NAME is published (privacy), so this is a
    location signal, not a name resolver.

Fixture (fixtures/adapters/kingcounty_absentee_sample.json)
    Real ArcGIS attribute records pulled from the live service (out-of-state
    Seattle owners), so the offline default ingests true shapes.

ToS / politeness
    King County GIS open data, public/keyless. All requests go through the
    shared politeness layer (descriptive UA, >=1s spacing, bounded retries);
    bounded record count. Fixture mode makes no network calls.
"""

from __future__ import annotations

try:
    from . import _common
except ImportError:
    import _common

FIXTURE = "kingcounty_absentee_sample.json"
SOURCE = "kingcounty_parcel_absentee"

ARCGIS_QUERY = ("https://services.arcgis.com/Ej0PsM5Aw677QF1W/arcgis/rest/"
                "services/PARCEL_ADDRESS_PUB_AREA_3069/FeatureServer/0/query")
LIVE_LIMIT = 1000   # ArcGIS single-request max; absentee is a STANDING list
                    # (not a recent-event feed) so pull big — overlap with the
                    # distress feeds is where hot stacks come from. Full
                    # coverage (all out-of-state Seattle owners) = paginate via
                    # resultOffset; 1000 is the practical single-call bound.
_OUT_FIELDS = ("PIN,ADDR_FULL,CTYNAME,ZIP5,LAT,LON,KCTP_ATTN,KCTP_ADDR,"
               "KCTP_CTYST,KCTP_STATE,KCTP_ZIP,APPRLNDVAL,APPR_IMPR,PREUSE_DESC")

# KC PREUSE_DESC -> spine property_type (KNOWN_FACT_KEYS)
_PROP_TYPE = (
    ("single family", "single_family"), ("townhouse", "single_family"),
    ("duplex", "duplex"), ("triplex", "triplex"),
    ("4-plex", "quadplex"), ("fourplex", "quadplex"),
    ("apartment", "multi_family"), ("condominium", "other"),
    ("vacant", "land"), ("mobile home", "mobile_home"),
)


def _prop_type(desc) -> str | None:
    d = str(desc or "").lower()
    for key, val in _PROP_TYPE:
        if key in d:
            return val
    return None


def _fetch_live(limit: int) -> list[dict]:
    """Seattle residential parcels whose taxpayer mails out of state."""
    data = _common.http_get_json(ARCGIS_QUERY, params={
        "where": ("KCTP_STATE<>'WA' AND CTYNAME='SEATTLE' "
                  "AND ADDR_FULL IS NOT NULL AND PROPTYPE='R'"),
        "outFields": _OUT_FIELDS,
        "resultRecordCount": int(limit),
        "orderByFields": "PIN",
        "f": "json",
    })
    feats = data.get("features", []) if isinstance(data, dict) else []
    return [f.get("attributes", {}) for f in feats if f.get("attributes")]


def _to_signal(rec: dict) -> dict | None:
    addr = str(rec.get("ADDR_FULL") or "").strip()
    if not addr:
        return None
    owner_state = str(rec.get("KCTP_STATE") or "").strip().upper()
    out_of_state = bool(owner_state) and owner_state != "WA"
    confidence = 0.65 if out_of_state else 0.45  # out-of-state is the strong cut
    val = (rec.get("APPRLNDVAL") or 0) + (rec.get("APPR_IMPR") or 0)
    owner_loc = str(rec.get("KCTP_CTYST") or "").strip()
    mailing = ", ".join(x for x in (
        str(rec.get("KCTP_ADDR") or "").strip(), owner_loc,
        str(rec.get("KCTP_ZIP") or "").strip()) if x)
    ptype = _prop_type(rec.get("PREUSE_DESC"))
    return _common.build_signal(
        id=_common.make_id(SOURCE, rec.get("PIN")),
        source=SOURCE,
        signal_type="absentee_owner",
        observed_at=_common.now_iso(),   # standing condition, currently true
        address=addr,
        city=str(rec.get("CTYNAME") or "SEATTLE"),
        state="WA",
        zip_code=str(rec.get("ZIP5") or ""),
        # NB: intentionally NO property.apn — the merge keys on APN when present
        # ("APN wins"), but the Seattle code-violation feed is address-only, so
        # anchoring absentee on APN would split the same property into two keys
        # and never stack. Key on address (like code violations); PIN kept in
        # evidence for reference / a future apn↔address reconciliation.
        lat=rec.get("LAT"),
        lon=rec.get("LON"),
        owner={"name": str(rec.get("KCTP_ATTN") or "").strip(),
               "mailing_address": mailing},
        evidence={
            "parcel_pin": str(rec.get("PIN") or "") or None,
            "absentee_type": "out_of_state" if out_of_state else "in_state",
            "owner_mailing_city_state": owner_loc,
            "owner_state": owner_state,
            "county": "KING",                      # KNOWN_FACT_KEYS
            "assessed_value": val or None,         # KNOWN_FACT_KEYS
            **({"property_type": ptype} if ptype else {}),
        },
        source_url=("https://blue.kingcounty.com/Assessor/eRealProperty/"
                    f"Dashboard.aspx?ParcelNbr={rec.get('PIN')}"),
        confidence=confidence,
    )


def fetch(offline: bool | None = None, limit: int = LIVE_LIMIT) -> list[dict]:
    """Absentee-owner signals for Seattle (King County).

    Args:
        offline: None consults DEALFLOW_LIVE (via _common.resolve_offline);
                 an explicit True/False always wins. Default = offline/fixture.
        limit: max ArcGIS records per live run (politeness bound).
    """
    if _common.resolve_offline(offline):
        records = _common.load_fixture(FIXTURE)
        fixture_mode = True
    else:
        records = _fetch_live(limit)
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
    mode = "LIVE (KC ArcGIS)" if _common.live_enabled() else "fixture"
    print(f"kingcounty_absentee: {len(sigs)} signals ({mode})")
    if sigs:
        print(json.dumps(sigs[0], indent=2))
