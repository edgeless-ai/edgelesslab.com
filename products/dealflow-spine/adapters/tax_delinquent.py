"""Delinquent property-tax signal adapter.

Sources (both LIVE-verified, keyless, official open data)
    county="philadelphia" (default):
        Philadelphia Dept. of Revenue "Real Estate Tax Delinquencies" via
        the OpenDataPhilly Carto SQL API. Per-parcel rows with owner name,
        MAILING ADDRESS (absentee-owner detection!), amounts due, years
        owed, bankruptcy/sheriff-sale flags. This is the gold standard of
        published delinquency rolls.
        https://phl.carto.com/api/v2/sql?q=SELECT ... FROM real_estate_tax_delinquencies
        Dataset docs: https://opendataphilly.org/datasets/property-tax-delinquencies/

    county="nyc":
        NYC Dept. of Finance "Tax Lien Sale Lists" (Socrata 9rz4-mjek) —
        properties noticed for the annual lien sale (90/60/30/10-day
        notices). Borough/Block/Lot + house number + street. No owner name.
        https://data.cityofnewyork.us/resource/9rz4-mjek.json

Multnomah County / Oregon note
    Multnomah County publishes its annual tax-foreclosure list only as a
    PDF attached to circuit-court filings, and general delinquency rolls
    are not published keylessly. Documented in docs/data-sources.md.

Cadence
    Philly refreshes monthly; NYC lien lists are event-driven (annual sale
    cycle with periodic notice files). Weekly polling is more than enough.

ToS / politeness
    Carto SQL API is public/keyless per OpenDataPhilly terms (ODbL-style
    open license); keep LIMIT bounded. NYC Open Data is public/keyless,
    throttled without an app token — small $limit, low frequency.
"""

from __future__ import annotations

try:
    from . import _common
except ImportError:
    import _common

PHILLY_SQL_URL = "https://phl.carto.com/api/v2/sql"
NYC_URL = "https://data.cityofnewyork.us/resource/9rz4-mjek.json"
FIXTURE_PHILLY = "tax_delinquent_sample.json"
FIXTURE_NYC = "tax_delinquent_nyc_sample.json"

_PHILLY_FIELDS = (
    "opa_number, street_address, zip_code, unit_num, owner, co_owner, "
    "mailing_address, mailing_city, mailing_state, mailing_zip, "
    "principal_due, total_due, num_years_owed, most_recent_year_owed, "
    "oldest_year_owed, is_actionable, payment_agreement, bankruptcy, "
    "sheriff_sale, building_category, total_assessment, year_month, "
    "ST_Y(the_geom) AS lat, ST_X(the_geom) AS lon"
)

_NYC_BOROUGH = {"1": "MANHATTAN", "2": "BRONX", "3": "BROOKLYN",
                "4": "QUEENS", "5": "STATEN ISLAND"}
_NYC_COUNTY = {"1": "NEW YORK", "2": "BRONX", "3": "KINGS",
               "4": "QUEENS", "5": "RICHMOND"}

# Philly building_category -> spine property_type (KNOWN_FACT_KEYS)
_PHILLY_PROP_TYPE = {
    "residential": "single_family",
    "hotels and apartments": "multi_family",
    "store with dwelling": "multi_family",
    "mixed use": "multi_family",
    "vacant land": "land",
    "commercial": "other",
    "industrial": "other",
}


def _fetch_philly_raw(min_total_due: float, limit: int) -> list[dict]:
    sql = (f"SELECT {_PHILLY_FIELDS} FROM real_estate_tax_delinquencies "
           f"WHERE total_due >= {float(min_total_due)} "
           f"ORDER BY total_due DESC LIMIT {int(limit)}")
    data = _common.http_get_json(PHILLY_SQL_URL, {"q": sql})
    return data.get("rows", [])


def _philly_to_signal(rec: dict) -> dict:
    mailing = ", ".join(str(rec.get(k)) for k in
                        ("mailing_address", "mailing_city", "mailing_state",
                         "mailing_zip") if rec.get(k))
    owner = {"name": str(rec.get("owner") or ""), "mailing_address": mailing}
    # Actionable + no payment agreement + multi-year = strongest signals.
    conf = 0.7
    if str(rec.get("is_actionable")).lower() == "true":
        conf += 0.1
    if int(rec.get("num_years_owed") or 0) >= 3:
        conf += 0.1
    if str(rec.get("payment_agreement")).lower() == "true":
        conf -= 0.2
    observed = str(rec.get("year_month") or "")
    observed_iso = (f"{observed[:4]}-{observed[4:6]}-01T00:00:00"
                    if len(observed) == 6 else _common.now_iso())
    absentee = bool(
        rec.get("mailing_address")
        and str(rec.get("mailing_city") or "").upper() != "PHILADELPHIA")
    prop_type = _PHILLY_PROP_TYPE.get(
        str(rec.get("building_category") or "").lower())
    return _common.build_signal(
        id=_common.make_id("philly_delinq", rec.get("opa_number")),
        source="philadelphia_revenue_re_tax_delinquencies",
        signal_type="tax_delinquent",
        observed_at=observed_iso,
        address=str(rec.get("street_address") or ""),
        city="PHILADELPHIA",
        state="PA",
        zip_code=str(rec.get("zip_code") or ""),
        apn=str(rec.get("opa_number") or "") or None,
        lat=rec.get("lat"),
        lon=rec.get("lon"),
        owner=owner if owner["name"] else None,
        evidence={
            "principal_due": rec.get("principal_due"),
            "total_due": rec.get("total_due"),
            "num_years_owed": rec.get("num_years_owed"),
            "oldest_year_owed": rec.get("oldest_year_owed"),
            "most_recent_year_owed": rec.get("most_recent_year_owed"),
            "is_actionable": rec.get("is_actionable"),
            "payment_agreement": rec.get("payment_agreement"),
            "bankruptcy": rec.get("bankruptcy"),
            "sheriff_sale": rec.get("sheriff_sale"),
            "building_category": rec.get("building_category"),
            "data_vintage_year_month": rec.get("year_month"),
            # KNOWN_FACT_KEYS — lifted into PropertyRecord.facts by merge.py
            "county": "PHILADELPHIA",
            "assessed_value": rec.get("total_assessment"),
            "absentee_owner": absentee,
            **({"property_type": prop_type} if prop_type else {}),
        },
        source_url=("https://opendataphilly.org/datasets/"
                    "property-tax-delinquencies/"),
        confidence=min(conf, 0.95),
    )


def _fetch_nyc_raw(limit: int) -> list[dict]:
    params = {"$order": "month DESC", "$limit": str(limit)}
    data = _common.http_get_json(NYC_URL, params)
    return data if isinstance(data, list) else []


def _nyc_to_signal(rec: dict) -> dict:
    bbl = (f"{rec.get('borough', '')}-{rec.get('block', '')}-"
           f"{rec.get('lot', '')}")
    address = " ".join(str(rec.get(k) or "") for k in
                       ("house_number", "street_name")).strip()
    return _common.build_signal(
        id=_common.make_id("nyc_lien", bbl, rec.get("month"),
                           rec.get("cycle")),
        source="nyc_dof_tax_lien_sale_list",
        signal_type="tax_delinquent",
        observed_at=str(rec.get("month") or _common.now_iso()),
        address=address,
        city=_NYC_BOROUGH.get(str(rec.get("borough")), "NEW YORK"),
        state="NY",
        zip_code=str(rec.get("zip_code") or ""),
        apn=bbl,
        evidence={
            "bbl": bbl,
            "notice_cycle": rec.get("cycle"),
            "tax_class_code": rec.get("tax_class_code"),
            "building_class": rec.get("building_class"),
            "water_debt_only": rec.get("water_debt_only"),
            "county": _NYC_COUNTY.get(str(rec.get("borough")), ""),
        },
        source_url=("https://data.cityofnewyork.us/City-Government/"
                    "Tax-Lien-Sale-Lists/9rz4-mjek"),
        confidence=0.75,
    )


def fetch(county: str = "philadelphia", min_total_due: float = 1000.0,
          limit: int = 200, offline: bool | None = None) -> list[dict]:
    """Fetch delinquent-property-tax signals.

    Args:
        county: "philadelphia" (per-parcel roll w/ owner+mailing addr) or
                "nyc" (lien-sale notice list).
        min_total_due: philadelphia only — minimum total due filter.
        limit: max records.
        offline: skip the network and use bundled fixtures. Default None =
            offline unless the run is live (`cli.py run --live` /
            DEALFLOW_LIVE=1).
    """
    offline = _common.resolve_offline(offline)
    county = county.lower()
    if county == "philadelphia":
        records: list[dict] = []
        from_fixture = False
        if not offline:
            try:
                records = _fetch_philly_raw(min_total_due, limit)
            except Exception:
                records = []
        if not records:
            records = _common.load_fixture(FIXTURE_PHILLY)
            from_fixture = True
        signals = [_philly_to_signal(r) for r in records]
        if from_fixture:
            for s in signals:
                s["evidence"]["fixture_data"] = True
        return signals
    if county == "nyc":
        records = []
        from_fixture = False
        if not offline:
            try:
                records = _fetch_nyc_raw(limit)
            except Exception:
                records = []
        if not records:
            records = _common.load_fixture(FIXTURE_NYC)
            from_fixture = True
        signals = [_nyc_to_signal(r) for r in records]
        if from_fixture:
            for s in signals:
                s["evidence"]["fixture_data"] = True
        return signals
    raise ValueError(f"unsupported county: {county!r} (philadelphia|nyc)")


if __name__ == "__main__":
    import sys
    offline = "--offline" in sys.argv
    phl = fetch(county="philadelphia", min_total_due=5000, limit=50,
                offline=offline)
    nyc = fetch(county="nyc", limit=50, offline=offline)
    absentee = sum(1 for s in phl if s["evidence"].get("absentee_owner"))
    print(f"tax_delinquent: philadelphia={len(phl)} signals "
          f"({absentee} absentee-owner hints), nyc={len(nyc)} signals "
          f"offline={offline}")
    if phl:
        import json
        print(json.dumps(phl[0], indent=2))
