"""Offline fixture resolver — a bundled stand-in for a real parcel spine.

Resolves unanchored signals against fixtures/resolvers/owner_index.json, a
county-assessor-style owner index (jurisdiction -> [{owner, apn, address,
facts...}]). Exists so the ENTIRE enrich path — pending file, resolver
registry, supersede-into-ledger — runs with zero network, which is the CLI
default. Live runs put resolvers like philly_opa (ORDER=10) in front of it.

Same paranoia as the live resolvers:
  - jurisdiction gate (signal city/state must match an index jurisdiction)
  - exact-ish owner-name match (_common.owner_name_matches)
  - one parcel -> resolved at confidence 0.35; two+ -> ambiguous with every
    candidate in evidence; zero -> None
"""

from __future__ import annotations

try:
    from . import _common
except ImportError:
    import _common

NAME = "fixture_owner_index"
ORDER = 90  # offline stand-in runs after any live resolver
FIXTURE = "owner_index.json"

_cache: dict | None = None


def _index() -> dict:
    global _cache
    if _cache is None:
        _cache = _common.load_fixture(FIXTURE)
    return _cache


def _person_name(signal: dict) -> str | None:
    ev = signal.get("evidence") or {}
    owner = signal.get("owner") or {}
    for cand in (ev.get("deceased_name"), owner.get("name")):
        if _common.person_tokens(cand):
            return str(cand)
    return None


def _matching_jurisdictions(signal: dict) -> list[dict]:
    prop = signal.get("property") or {}
    ev = signal.get("evidence") or {}
    city = str(prop.get("city") or "").strip().upper()
    state = str(prop.get("state") or "").strip().upper()
    county = str(ev.get("county") or "").strip().upper()
    out = []
    for juris in _index().get("jurisdictions", []):
        j = juris.get("jurisdiction") or {}
        if state != str(j.get("state") or "").upper():
            continue
        if city == str(j.get("city") or "").upper() or (
                county and county == str(j.get("county") or "").upper()):
            out.append(juris)
    return out


def _candidate(rec: dict) -> dict:
    return {"apn": rec.get("apn"), "address": rec.get("address"),
            "city": rec.get("city"), "zip": rec.get("zip"),
            "owner": rec.get("owner"),
            "assessed_value": rec.get("assessed_value")}


def resolve(signal: dict) -> dict | None:
    """Resolver entry point (contract in resolvers/_common.py docstring)."""
    jurisdictions = _matching_jurisdictions(signal)
    if not jurisdictions:
        return None
    person = _person_name(signal)
    if not person:
        return None

    matches: list[tuple[dict, dict]] = []  # (record, jurisdiction)
    for juris in jurisdictions:
        j = juris.get("jurisdiction") or {}
        for rec in juris.get("records", []):
            if _common.owner_name_matches(person, rec.get("owner")):
                matches.append((rec, j))
    if not matches:
        return None

    query = _common.assessor_query_name(person)
    if len(matches) > 1:
        return {
            "status": "ambiguous",
            "resolver": NAME,
            "candidates": [_candidate(r) for r, _ in matches],
            "evidence": {"owner_query": query,
                         "match_count": len(matches),
                         "fixture_data": True},
        }

    rec, juris = matches[0]
    evidence = {
        "owner_query": query,
        "matched_owner": rec.get("owner"),
        "fixture_data": True,
        # KNOWN_FACT_KEYS — lifted into PropertyRecord.facts by merge.py
        "county": str(juris.get("county") or "").upper() or None,
    }
    for fact in ("assessed_value", "property_type", "year_built"):
        if rec.get(fact) is not None:
            evidence[fact] = rec[fact]
    return {
        "status": "resolved",
        "resolver": NAME,
        "confidence": _common.NAME_MATCH_CONFIDENCE,
        "property": {
            "apn": rec.get("apn"),
            "address": str(rec.get("address") or ""),
            "city": str(rec.get("city") or "").upper(),
            "state": str(rec.get("state") or "").upper(),
            "zip": str(rec.get("zip") or ""),
            "lat": rec.get("lat"),
            "lon": rec.get("lon"),
        },
        "evidence": evidence,
    }
