"""Absentee-owner signal adapter (Pierce County WA / Tacoma) — the stacking
spine of the Tacoma metro. Fixtures by default, live opt-in.

What this does
    Flag Pierce County residential parcels whose TAXPAYER mails out of state
    (the absentee "spine"), so an out-of-state owner STACKED with a Tacoma code
    violation on the same parcel is a hot lead. Mirrors kingcounty_absentee, but
    ANCHORS ON APN: both this feed and tacoma_code_violations carry the same
    10-digit Pierce assessor parcel number, so the parcel merge is exact ("APN
    wins") with no address/zip matching.

Live path (DEALFLOW_LIVE=1 / cli.py run --live)
    services2.arcgis.com/1UvBaQ5y1ubjUPmd Tax_Parcels/FeatureServer/0 (keyless).
    Verified live 2026-07-31: 8299 out-of-state residential parcels. Situs =
    Site_Address; taxpayer mailing = Delivery_Address / City_State / Zipcode;
    parcel = TaxParcelNumber. Paginated via resultOffset (PIN-dedupe guard).

Fixture (fixtures/adapters/pierce_absentee_sample.json)
    14 real out-of-state residential parcels pulled from the live service.

ToS / politeness
    Pierce County open GIS, public/keyless. Shared politeness layer (descriptive
    UA, >=1s spacing, bounded retries); bounded record count.
"""

from __future__ import annotations

try:
    from . import _common
except ImportError:
    import _common

FIXTURE = "pierce_absentee_sample.json"
SOURCE = "pierce_parcel_absentee"

ARCGIS_QUERY = ("https://services2.arcgis.com/1UvBaQ5y1ubjUPmd/arcgis/rest/"
                "services/Tax_Parcels/FeatureServer/0/query")
_PAGE = 1000         # ArcGIS single-request max
LIVE_LIMIT = 9000    # covers the ~8299 out-of-state residential set (paginated)
# Out-of-state = the taxpayer City_State does not end in ", WA". Residential
# only (single family / other residential), situs present.
_WHERE = ("City_State NOT LIKE '%, WA' AND City_State IS NOT NULL "
          "AND Site_Address IS NOT NULL "
          "AND (Landuse_Description LIKE '%SINGLE FAMILY%' "
          "OR Landuse_Description LIKE '%RESIDENTIAL%')")
_OUT_FIELDS = ("TaxParcelNumber,Site_Address,Delivery_Address,City_State,"
               "Zipcode,Landuse_Description")


def _norm_pin(pin) -> str | None:
    p = "".join(ch for ch in str(pin or "") if ch.isalnum())
    return p or None


def _prop_type(desc) -> str | None:
    d = str(desc or "").upper()
    if "SINGLE FAMILY" in d:
        return "single_family"
    return None  # OTHER RESIDENTIAL -> leave unknown (buy-box lenient)


def _owner_state(city_state: str) -> str:
    parts = str(city_state or "").rsplit(",", 1)
    return parts[-1].strip().upper() if len(parts) == 2 else ""


def _to_signal(rec: dict) -> dict | None:
    pin = _norm_pin(rec.get("TaxParcelNumber"))
    if not pin:
        return None
    owner_state = _owner_state(rec.get("City_State"))
    if owner_state == "WA":               # defensive (WHERE already excludes)
        return None
    mailing = ", ".join(x for x in (
        str(rec.get("Delivery_Address") or "").strip(),
        str(rec.get("City_State") or "").strip(),
        str(rec.get("Zipcode") or "").strip()) if x)
    ptype = _prop_type(rec.get("Landuse_Description"))
    return _common.build_signal(
        id=_common.make_id(SOURCE, pin),
        source=SOURCE,
        signal_type="absentee_owner",
        observed_at=_common.now_iso(),    # standing condition, currently true
        # APN-anchored (merges exactly with tacoma_code_violations on the shared
        # 10-digit Pierce parcel number). Situs street kept for display.
        apn=pin,
        address=str(rec.get("Site_Address") or "").strip(),
        city="",                           # situs city not published; APN merges
        state="WA",
        zip_code="",
        owner={"name": "", "mailing_address": mailing},
        evidence={
            "parcel_pin": pin,
            "absentee_type": "out_of_state",
            "owner_mailing_city_state": str(rec.get("City_State") or "").strip(),
            "owner_state": owner_state,
            "county": "PIERCE",            # KNOWN_FACT_KEYS
            **({"property_type": ptype} if ptype else {}),
        },
        source_url=None,
        confidence=0.65,                   # out-of-state is the strong cut
    )


def _fetch_live(limit: int = LIVE_LIMIT) -> list[dict]:
    """Out-of-state residential Pierce parcels, paginated via resultOffset up to
    `limit` total (politeness cap). Dedupes by PIN and stops on a short page or
    a no-new-rows page (guards a service that ignores resultOffset)."""
    out: list[dict] = []
    seen: set[str] = set()
    offset = 0
    while len(out) < limit:
        page_size = min(_PAGE, limit - len(out))
        data = _common.http_get_json(ARCGIS_QUERY, params={
            "where": _WHERE,
            "outFields": _OUT_FIELDS,
            "resultOffset": offset,
            "resultRecordCount": int(page_size),
            "orderByFields": "TaxParcelNumber",
            "f": "json",
        })
        feats = data.get("features", []) if isinstance(data, dict) else []
        recs = [f.get("attributes", {}) for f in feats if f.get("attributes")]
        new = []
        for r in recs:
            pin = str(r.get("TaxParcelNumber") or "")
            if pin and pin in seen:
                continue
            if pin:
                seen.add(pin)
            new.append(r)
        out.extend(new)
        more = isinstance(data, dict) and data.get("exceededTransferLimit")
        if len(recs) < page_size or not more or not new:
            break
        offset += len(recs)
    return out[:limit]


def fetch(offline: bool | None = None, limit: int = LIVE_LIMIT) -> list[dict]:
    """Absentee-owner signals for Pierce County (out-of-state residential).

    Args:
        offline: None consults DEALFLOW_LIVE; explicit True/False wins.
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
    mode = "LIVE (Pierce ArcGIS)" if _common.live_enabled() else "fixture"
    print(f"pierce_absentee: {len(sigs)} signals ({mode})")
    if sigs:
        print(json.dumps(sigs[0], indent=2))
