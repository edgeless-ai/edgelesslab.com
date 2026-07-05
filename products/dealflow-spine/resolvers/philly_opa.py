"""Philadelphia OPA owner-name property resolver (LIVE, keyless, polite).

Resolves unanchored signals (owner/deceased name + city/state, no address,
no APN) against the Philadelphia Office of Property Assessment parcel roll —
the same public Carto SQL endpoint family adapters/tax_delinquent.py already
uses for the delinquency table.

    Endpoint:  https://phl.carto.com/api/v2/sql
    Table:     opa_properties_public (one row per OPA account / parcel)
    Query:     SELECT parcel_number, location, ... FROM opa_properties_public
               WHERE owner_1 LIKE '<LAST FIRST>%' OR owner_2 LIKE '<LAST FIRST>%'
               LIMIT 25

LIVE-VERIFIED 2026-07-04 (real responses saved to
fixtures/resolvers/philly_opa_sample.json):
    - 'SMITH JOHN FRED%'  -> 1 row  (parcel 361285400, 2235 LATONA ST) — the
      unique exact-ish match this resolver anchors on
    - 'SMITH JOHN%'       -> 25 rows — the ambiguity case: NEVER guess,
      return every plausible candidate instead

Names are ambiguous BY DESIGN, so this resolver is deliberately paranoid:
  - jurisdiction gate first (city/state must say Philadelphia PA) — no
    network call for signals from anywhere else
  - exact-ish owner match required (_common.owner_name_matches): last+first
    exact, extra tokens must be prefix-compatible middle names
  - exactly ONE surviving parcel -> resolved at confidence 0.35 (<= 0.4 cap:
    a name match alone is never better than that)
  - two+ surviving parcels -> "ambiguous" with ALL candidates in evidence
  - live-only: in an offline run (the default) it returns None and the
    fixture resolver (fixtures/resolvers/owner_index.json) covers the path

ToS: Carto SQL API is public/keyless per OpenDataPhilly's open license;
bounded LIMIT, one query per signal, through the shared politeness layer.
"""

from __future__ import annotations

try:
    from . import _common
except ImportError:
    import _common

NAME = "philly_opa"
ORDER = 10  # live resolver outranks the offline fixture stand-in (ORDER=90)

OPA_SQL_URL = "https://phl.carto.com/api/v2/sql"
MAX_CANDIDATES = 10
_LIMIT = 25

_FIELDS = (
    "parcel_number, location, unit, zip_code, owner_1, owner_2, "
    "market_value, category_code_description, year_built, "
    "mailing_street, mailing_city_state, "
    "ST_Y(the_geom) AS lat, ST_X(the_geom) AS lon"
)

# OPA category_code_description -> spine property_type (KNOWN_FACT_KEYS)
_PROP_TYPE = {
    "single family": "single_family",
    "multi family": "multi_family",
    "mixed use": "multi_family",
    "apartments  > 4 units": "multi_family",
    "vacant land": "land",
    "commercial": "other",
    "industrial": "other",
}

SOURCE_URL = "https://opendataphilly.org/datasets/property-assessments/"


def _in_jurisdiction(signal: dict) -> bool:
    prop = signal.get("property") or {}
    ev = signal.get("evidence") or {}
    state = str(prop.get("state") or "").strip().upper()
    city = str(prop.get("city") or "").strip().upper()
    county = str(ev.get("county") or "").strip().upper()
    return state == "PA" and "PHILADELPHIA" in (city, county)


def _person_name(signal: dict) -> str | None:
    """The name to search for: deceased (obituary) or owner-of-record."""
    ev = signal.get("evidence") or {}
    owner = signal.get("owner") or {}
    for cand in (ev.get("deceased_name"), owner.get("name")):
        if _common.person_tokens(cand):
            return str(cand)
    return None


def _query_rows(query_name: str) -> list[dict]:
    safe = (query_name.replace("'", "''")
            .replace("%", "").replace("_", " ").strip())
    sql = (f"SELECT {_FIELDS} FROM opa_properties_public "
           f"WHERE owner_1 LIKE '{safe}%' OR owner_2 LIKE '{safe}%' "
           f"LIMIT {_LIMIT}")
    data = _common.http_get_json(OPA_SQL_URL, {"q": sql})
    return data.get("rows", []) if isinstance(data, dict) else []


def _row_property(row: dict) -> dict:
    return {
        "apn": str(row.get("parcel_number") or "") or None,
        "address": str(row.get("location") or ""),
        "city": "PHILADELPHIA",
        "state": "PA",
        "zip": str(row.get("zip_code") or "")[:5],
        "lat": row.get("lat"),
        "lon": row.get("lon"),
    }


def _row_candidate(row: dict) -> dict:
    """Compact candidate receipt for evidence (ambiguous case)."""
    return {
        "apn": row.get("parcel_number"),
        "address": row.get("location"),
        "zip": row.get("zip_code"),
        "owner_1": row.get("owner_1"),
        "owner_2": row.get("owner_2"),
        "market_value": row.get("market_value"),
    }


def evaluate_rows(person_name: str, rows: list[dict]) -> dict | None:
    """Pure match logic (unit-testable offline against the saved sample).

    Filters query rows to exact-ish owner matches, then: 0 -> None,
    1 -> resolved, 2+ -> ambiguous with all candidates.
    """
    matches = [
        r for r in rows
        if _common.owner_name_matches(person_name, r.get("owner_1"))
        or _common.owner_name_matches(person_name, r.get("owner_2"))
    ]
    if not matches:
        return None
    if len(matches) > 1:
        return {
            "status": "ambiguous",
            "resolver": NAME,
            "candidates": [_row_candidate(r) for r in matches[:MAX_CANDIDATES]],
            "evidence": {
                "owner_query": _common.assessor_query_name(person_name),
                "match_count": len(matches),
                "source_url": SOURCE_URL,
            },
        }
    row = matches[0]
    prop_type = _PROP_TYPE.get(
        str(row.get("category_code_description") or "").strip().lower())
    matched_owner = (row.get("owner_1")
                     if _common.owner_name_matches(person_name, row.get("owner_1"))
                     else row.get("owner_2"))
    evidence = {
        "owner_query": _common.assessor_query_name(person_name),
        "matched_owner": matched_owner,
        "opa_parcel_number": row.get("parcel_number"),
        "owner_mailing": " ".join(
            str(row.get(k) or "") for k in
            ("mailing_street", "mailing_city_state")).strip() or None,
        "source_url": SOURCE_URL,
        # KNOWN_FACT_KEYS — lifted into PropertyRecord.facts by merge.py
        "county": "PHILADELPHIA",
        "assessed_value": row.get("market_value"),
        **({"property_type": prop_type} if prop_type else {}),
        **({"year_built": row.get("year_built")} if row.get("year_built") else {}),
    }
    return {
        "status": "resolved",
        "resolver": NAME,
        "confidence": _common.NAME_MATCH_CONFIDENCE,
        "property": _row_property(row),
        "evidence": evidence,
    }


def resolve(signal: dict) -> dict | None:
    """Resolver entry point (contract in resolvers/_common.py docstring)."""
    if not _in_jurisdiction(signal):
        return None
    person = _person_name(signal)
    if not person:
        return None
    if _common.resolve_offline(None):
        return None  # live-only; offline runs are the fixture resolver's job
    query = _common.assessor_query_name(person)
    rows = _query_rows(query)
    return evaluate_rows(person, rows)


if __name__ == "__main__":
    import json
    import sys

    sample = _common.load_fixture("philly_opa_sample.json")
    for section in ("unique_match", "ambiguous_match"):
        person = "John Fred Smith"
        out = evaluate_rows(person, sample[section]["rows"])
        print(f"{section}: {out['status'] if out else None}")
    if "--live" in sys.argv:
        sig = {"property": {"city": "PHILADELPHIA", "state": "PA"},
               "evidence": {"deceased_name": "John Fred Smith"}}
        import os
        os.environ["DEALFLOW_LIVE"] = "1"
        print(json.dumps(resolve(sig), indent=2))
