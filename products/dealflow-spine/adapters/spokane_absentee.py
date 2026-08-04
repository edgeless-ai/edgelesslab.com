"""Absentee-owner signal adapter (Spokane County WA / Spokane) — the stacking
spine of the Spokane metro. Fixtures by default, live opt-in.

What this does
    Flag Spokane residential parcels whose TAXPAYER mails out of state (the
    absentee "spine"), so an out-of-state owner STACKED with a Spokane code
    complaint on the same parcel is a hot lead. Mirrors pierce_absentee and
    ANCHORS ON APN: both this feed (PID_NUM) and spokane_code_violations
    (Parcel) carry the assessor parcel number in the "35082.4002" format, so
    the parcel merge is exact ("APN wins") with no address/zip matching.

Live path (DEALFLOW_LIVE=1 / cli.py run --live)
    gismo.spokanecounty.org Assessor/SCOUTSimple/MapServer/0 (keyless).
    Verified live 2026-08-04: 3699 out-of-state residential parcels with
    site_city SPOKANE (6289 before the residential cut). Taxpayer mailing =
    taxpayer_address1 / taxpayer_city / taxpayer_state / taxpayer_zip; situs =
    site_address (+ real site_zip, unlike Pierce). Paginated via resultOffset
    (PIN-dedupe guard; supportsPagination true).

Fixture (fixtures/adapters/spokane_absentee_sample.json)
    14 real out-of-state residential parcels pulled from the live service.

ToS / politeness
    Spokane County public GIS (the data behind their SCOUT parcel viewer),
    keyless. Shared politeness layer (descriptive UA, >=1s spacing, bounded
    retries); bounded record count.
"""

from __future__ import annotations

try:
    from . import _common
except ImportError:
    import _common

FIXTURE = "spokane_absentee_sample.json"
SOURCE = "spokane_parcel_absentee"

ARCGIS_QUERY = ("https://gismo.spokanecounty.org/arcgis/rest/services/"
                "Assessor/SCOUTSimple/MapServer/0/query")
_PAGE = 2000         # layer maxRecordCount
LIVE_LIMIT = 5000    # covers the ~3699 out-of-state residential set
# Out-of-state taxpayer, Spokane situs, residential use only. "Two-to-Four
# Unit" stays in: the buy-box takes duplex..quadplex.
_WHERE = ("taxpayer_state<>'WA' AND taxpayer_state<>'' "
          "AND site_city='SPOKANE' "
          "AND prop_use_desc IN ('Single Unit','Two-to-Four Unit',"
          "'Other Residential')")
_OUT_FIELDS = ("PID_NUM,site_address,site_city,site_state,site_zip,"
               "taxpayer_name,taxpayer_address1,taxpayer_city,taxpayer_state,"
               "taxpayer_zip,prop_use_desc")


def _norm_pin(pin) -> str | None:
    p = "".join(ch for ch in str(pin or "") if ch.isalnum())
    return p or None


def _prop_type(desc) -> str | None:
    d = str(desc or "").upper()
    if "SINGLE UNIT" in d:
        return "single_family"
    return None  # Two-to-Four / Other Residential -> unknown (buy-box lenient)


def _to_signal(rec: dict) -> dict | None:
    pin = _norm_pin(rec.get("PID_NUM"))
    if not pin:
        return None
    owner_state = str(rec.get("taxpayer_state") or "").strip().upper()
    if not owner_state or owner_state == "WA":  # defensive (WHERE excludes)
        return None
    mailing = ", ".join(x for x in (
        str(rec.get("taxpayer_address1") or "").strip(),
        str(rec.get("taxpayer_city") or "").strip(),
        owner_state,
        str(rec.get("taxpayer_zip") or "").strip()) if x)
    ptype = _prop_type(rec.get("prop_use_desc"))
    return _common.build_signal(
        id=_common.make_id(SOURCE, pin),
        source=SOURCE,
        signal_type="absentee_owner",
        observed_at=_common.now_iso(),    # standing condition, currently true
        # APN-anchored (merges exactly with spokane_code_violations on the
        # shared assessor parcel number). Situs kept for display.
        apn=pin,
        address=str(rec.get("site_address") or "").strip(),
        city="SPOKANE",
        state="WA",
        zip_code=str(rec.get("site_zip") or "").strip(),
        owner={"name": str(rec.get("taxpayer_name") or "").strip(),
               "mailing_address": mailing},
        evidence={
            "parcel_pin": pin,
            "absentee_type": "out_of_state",
            "owner_mailing_city_state": ", ".join(x for x in (
                str(rec.get("taxpayer_city") or "").strip(),
                owner_state) if x),
            "owner_state": owner_state,
            "county": "SPOKANE",           # KNOWN_FACT_KEYS
            **({"property_type": ptype} if ptype else {}),
        },
        source_url=None,
        confidence=0.65,                   # out-of-state is the strong cut
    )


def _fetch_live(limit: int = LIVE_LIMIT) -> list[dict]:
    """Out-of-state residential Spokane parcels, paginated via resultOffset up
    to `limit` total (politeness cap). Dedupes by PIN and stops on a short page
    or a no-new-rows page (guards a service that ignores resultOffset)."""
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
            "orderByFields": "PID_NUM",
            "returnGeometry": "false",
            "f": "json",
        })
        feats = data.get("features", []) if isinstance(data, dict) else []
        recs = [f.get("attributes", {}) for f in feats if f.get("attributes")]
        new = []
        for r in recs:
            pin = str(r.get("PID_NUM") or "")
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
    """Absentee-owner signals for Spokane County (out-of-state residential).

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
    mode = "LIVE (Spokane County ArcGIS)" if _common.live_enabled() else "fixture"
    print(f"spokane_absentee: {len(sigs)} signals ({mode})")
    if sigs:
        print(json.dumps(sigs[0], indent=2))
