"""
merge.py — Signals -> PropertyRecords.

Groups raw signals into one record per physical property using:
  1. a simple deterministic address normalizer (USPS-ish suffix/directional
     abbreviation, punctuation strip, whitespace collapse), then
  2. APN bridging: if two address-groups share an APN (one adapter knew the
     parcel number, another only the street address with a slightly different
     spelling), they merge into one record.

Also lifts KNOWN_FACT_KEYS out of Signal.evidence into PropertyRecord.facts
(most-recent signal wins on conflicts) so criteria.py has one flat dict to
evaluate against.

Deterministic, stdlib-only, no I/O.
"""

from __future__ import annotations

import re

from .schema import KNOWN_FACT_KEYS, Owner, PropertyRecord, PropertyRef, Signal

# ---------------------------------------------------------------------------
# address normalization
# ---------------------------------------------------------------------------

# USPS C1 street-suffix abbreviations (the common subset; extend as needed).
_SUFFIXES = {
    "ALLEY": "ALY", "AVENUE": "AVE", "AV": "AVE", "BOULEVARD": "BLVD",
    "CIRCLE": "CIR", "COURT": "CT", "COVE": "CV", "CRESCENT": "CRES",
    "DRIVE": "DR", "EXPRESSWAY": "EXPY", "FREEWAY": "FWY", "HIGHWAY": "HWY",
    "LANE": "LN", "LOOP": "LOOP", "PARKWAY": "PKWY", "PIKE": "PIKE",
    "PLACE": "PL", "PLAZA": "PLZ", "POINT": "PT", "ROAD": "RD",
    "SQUARE": "SQ", "STREET": "ST", "STR": "ST", "TERRACE": "TER",
    "TRAIL": "TRL", "TURNPIKE": "TPKE", "WAY": "WAY",
}

_DIRECTIONALS = {
    "NORTH": "N", "SOUTH": "S", "EAST": "E", "WEST": "W",
    "NORTHEAST": "NE", "NORTHWEST": "NW", "SOUTHEAST": "SE", "SOUTHWEST": "SW",
    "NO": "N", "SO": "S",
}

_UNIT_WORDS = {"APT": "APT", "APARTMENT": "APT", "UNIT": "UNIT", "STE": "STE",
               "SUITE": "STE", "LOT": "LOT", "TRLR": "TRLR", "#": "#"}

_PUNCT_RE = re.compile(r"[^\w#\s]")
_WS_RE = re.compile(r"\s+")


def normalize_address(address: str) -> str:
    """Deterministic street-address normalizer.

    "123 South Palm Avenue." -> "123 S PALM AVE"
    Not a full CASS engine — just enough that the same situs written two ways
    by two adapters collapses to one key.
    """
    if not address:
        return ""
    s = _PUNCT_RE.sub(" ", address.upper())
    s = _WS_RE.sub(" ", s).strip()
    tokens = s.split(" ")
    out: list[str] = []
    for tok in tokens:
        if tok in _UNIT_WORDS:
            out.append(_UNIT_WORDS[tok])
        elif tok in _DIRECTIONALS:
            out.append(_DIRECTIONALS[tok])
        elif tok in _SUFFIXES:
            out.append(_SUFFIXES[tok])
        else:
            out.append(tok)
    return " ".join(out)


def normalize_apn(apn: str | None) -> str | None:
    """Strip APN formatting (dashes, dots, spaces) so '12-44-24-C3' == '12 44 24 C3'."""
    if not apn:
        return None
    n = re.sub(r"[^A-Za-z0-9]", "", apn).upper()
    return n or None


def _norm_county(county) -> str | None:
    """Uppercase/strip a county name from facts/evidence; None if unknown."""
    if county is None:
        return None
    c = str(county).strip().upper()
    return c or None


def property_key(prop: PropertyRef, county: str | None = None) -> str:
    """Canonical grouping key for a property.

    APN wins when present (county parcel identity beats string address) —
    but APNs are COUNTY-scoped identifiers, so the county is part of the key
    when known ('apn:FL:LEE:...'): the same digit string legitimately exists
    in two Florida counties. County comes from facts/evidence (it is not on
    PropertyRef); with no county the key degrades to the old state-scoped
    form. Address fallback: state + zip + normalized address, with the CITY
    standing in when the adapter didn't know the zip ('100 Main St' exists in
    nearly every municipality — without zip or city it would false-merge
    across the whole state).
    """
    apn = normalize_apn(prop.apn)
    if apn:
        c = _norm_county(county)
        if c:
            return f"apn:{prop.state.upper()}:{c}:{apn}"
        return f"apn:{prop.state.upper()}:{apn}"
    return _address_key(prop)


def _address_key(prop: PropertyRef) -> str:
    """Address-only key (ignores APN) — used for the first grouping pass.
    Locality anchor is the zip, or the city when zip is missing (M1)."""
    locality = prop.zip.strip() or prop.city.strip().upper()
    return f"addr:{prop.state.upper()}:{locality}:{normalize_address(prop.address)}"


# ---------------------------------------------------------------------------
# merging
# ---------------------------------------------------------------------------

def _merge_property(signals: list[Signal]) -> PropertyRef:
    """Merge PropertyRefs across signals: most recent signal is the base,
    older signals fill in anything it's missing (APN, lat/lon, city...)."""
    ordered = sorted(signals, key=lambda s: s.observed_dt, reverse=True)
    base = ordered[0].property
    merged = PropertyRef(
        address=base.address, city=base.city, state=base.state,
        zip=base.zip, apn=base.apn, lat=base.lat, lon=base.lon,
    )
    for sig in ordered[1:]:
        p = sig.property
        merged.address = merged.address or p.address
        merged.city = merged.city or p.city
        merged.state = merged.state or p.state
        merged.zip = merged.zip or p.zip
        merged.apn = merged.apn or p.apn
        merged.lat = merged.lat if merged.lat is not None else p.lat
        merged.lon = merged.lon if merged.lon is not None else p.lon
    return merged


def _merge_owner(signals: list[Signal]) -> Owner | None:
    """Most recent signal that knows the owner's name wins; mailing address
    backfilled from any signal that has it."""
    ordered = sorted(signals, key=lambda s: s.observed_dt, reverse=True)
    name = None
    mailing = None
    for sig in ordered:
        if sig.owner:
            if name is None and sig.owner.name:
                name = sig.owner.name
            if mailing is None and sig.owner.mailing_address:
                mailing = sig.owner.mailing_address
        if name and mailing:
            break
    if name is None and mailing is None:
        return None
    return Owner(name=name, mailing_address=mailing)


def _lift_facts(signals: list[Signal]) -> dict:
    """Pull KNOWN_FACT_KEYS out of evidence. Oldest first, so the most
    recently observed signal's value wins on conflict."""
    facts: dict = {}
    for sig in sorted(signals, key=lambda s: s.observed_dt):
        for k in KNOWN_FACT_KEYS:
            if k in sig.evidence and sig.evidence[k] is not None:
                facts[k] = sig.evidence[k]
    return facts


def merge_signals(signals: list[Signal]) -> list[PropertyRecord]:
    """Group signals into PropertyRecords (address pass + APN bridging).

    Deterministic: output records sorted by key; signals inside a record
    sorted oldest-first.
    """
    # pass 1: group by address-only key
    groups: dict[str, list[Signal]] = {}
    for sig in signals:
        groups.setdefault(_address_key(sig.property), []).append(sig)

    # pass 2: bridge groups that share a normalized APN. APNs are
    # COUNTY-scoped, so bucket per (state, apn) and partition each bucket by
    # the county each signal reported (evidence["county"], None = unknown):
    #   - 0 or 1 distinct KNOWN counties -> unambiguous, union everything
    #     (unknown-county signals join the known county)
    #   - 2+ distinct known counties -> the same digit string in different
    #     counties (H4); union only within each county and leave
    #     unknown-county groups alone (a false split beats a false merge)
    apn_buckets: dict[tuple[str, str], dict[str | None, list[str]]] = {}
    for key, sigs in groups.items():
        for sig in sigs:
            apn = normalize_apn(sig.property.apn)
            if apn:
                county = _norm_county(sig.evidence.get("county"))
                bucket = apn_buckets.setdefault(
                    (sig.property.state.upper(), apn), {})
                keys = bucket.setdefault(county, [])
                if key not in keys:
                    keys.append(key)

    # union groups sharing an APN (small-N union-find via canonical map)
    canon: dict[str, str] = {k: k for k in groups}

    def find(k: str) -> str:
        while canon[k] != k:
            canon[k] = canon[canon[k]]
            k = canon[k]
        return k

    def union(keys: list[str]) -> None:
        root = find(keys[0])
        for k in keys[1:]:
            canon[find(k)] = root

    for bucket in apn_buckets.values():
        known_counties = [c for c in bucket if c is not None]
        if len(known_counties) <= 1:
            union([k for keys in bucket.values() for k in keys])
        else:
            for county, keys in bucket.items():
                if county is not None:
                    union(keys)

    merged_groups: dict[str, list[Signal]] = {}
    for key, sigs in groups.items():
        merged_groups.setdefault(find(key), []).extend(sigs)

    # build records
    records: list[PropertyRecord] = []
    for sigs in merged_groups.values():
        sigs_sorted = sorted(sigs, key=lambda s: (s.observed_dt, s.dedupe_key))
        prop = _merge_property(sigs_sorted)
        facts = _lift_facts(sigs_sorted)
        records.append(
            PropertyRecord(
                key=property_key(prop, county=facts.get("county")),
                property=prop,
                signals=sigs_sorted,
                owner=_merge_owner(sigs_sorted),
                facts=facts,
            )
        )
    records.sort(key=lambda r: r.key)
    return records
