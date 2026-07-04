"""FEMA disaster-declaration signal adapter (openFEMA).

Source
    openFEMA Disaster Declarations Summaries v2 (keyless, official API):
    https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries
    OData-style query params ($filter/$orderby/$top). No API key, no auth.

Signal
    One ``fema_disaster`` signal per (declaration x designated county area).
    These are COUNTY-level signals: `property.address` carries the designated
    area name and `property.state` the state; street-level fields are empty
    and `evidence` carries the county FIPS for downstream geo-joins.
    Insurance-gap play: counties with Individual Assistance (IA/IH) declared
    get a confidence bump — those are households with verified damage.

Cadence
    FEMA refreshes this dataset continuously; daily polling is plenty.
    Full dataset ~68k rows; we filter server-side by declarationDate.

ToS / politeness
    openFEMA is public domain (US Gov). Documented guidance: identify your
    app via User-Agent, keep result sets bounded ($top), no key required.
    Terms: https://www.fema.gov/about/openfema/terms-conditions
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

try:
    from . import _common
except ImportError:  # running as a script
    import _common

API_URL = "https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries"
FIXTURE = "fema_disasters_sample.json"
SOURCE = "openfema_disaster_declarations_v2"


def _fetch_raw(state: str | None, days: int, limit: int) -> list[dict]:
    since = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    filt = f"declarationDate ge '{since}'"
    if state:
        filt += f" and state eq '{state.upper()}'"
    params = {
        "$filter": filt,
        "$orderby": "declarationDate desc",
        "$top": str(limit),
        "$format": "json",
    }
    data = _common.http_get_json(API_URL, params)
    return data.get("DisasterDeclarationsSummaries", [])


def _to_signal(rec: dict) -> dict:
    ia = bool(rec.get("iaProgramDeclared")) or bool(rec.get("ihProgramDeclared"))
    fips = f"{rec.get('fipsStateCode', '')}{rec.get('fipsCountyCode', '')}"
    confidence = 0.8 if ia else 0.6  # county-level, authoritative source
    # "Baker (County)" -> "BAKER" — KNOWN_FACT_KEYS county fact
    county = str(rec.get("designatedArea") or "")
    county = county.split("(")[0].strip().upper()
    return _common.build_signal(
        id=_common.make_id(SOURCE, rec.get("femaDeclarationString"),
                           fips, rec.get("designatedArea")),
        source=SOURCE,
        signal_type="fema_disaster",
        observed_at=str(rec.get("declarationDate") or _common.now_iso()),
        address=str(rec.get("designatedArea") or ""),
        state=str(rec.get("state") or ""),
        evidence={
            "disaster_number": rec.get("disasterNumber"),
            "declaration_string": rec.get("femaDeclarationString"),
            "declaration_type": rec.get("declarationType"),  # DR/EM/FM
            "declaration_title": rec.get("declarationTitle"),
            "incident_type": rec.get("incidentType"),
            "incident_begin": rec.get("incidentBeginDate"),
            "incident_end": rec.get("incidentEndDate"),
            "county_fips": fips,
            "county": county,  # KNOWN_FACT_KEYS
            "designated_area": rec.get("designatedArea"),
            "ia_program_declared": rec.get("iaProgramDeclared"),
            "ih_program_declared": rec.get("ihProgramDeclared"),
            "pa_program_declared": rec.get("paProgramDeclared"),
            "hm_program_declared": rec.get("hmProgramDeclared"),
        },
        source_url=f"https://www.fema.gov/disaster/{rec.get('disasterNumber')}",
        confidence=confidence,
    )


def fetch(state: str | None = None, days: int = 120, limit: int = 500,
          offline: bool | None = None) -> list[dict]:
    """Fetch recent disaster declarations as county-level signals.

    Args:
        state: optional 2-letter state filter (e.g. "OR").
        days: lookback window on declarationDate.
        limit: max records requested from the API.
        offline: skip the network and use the bundled fixture. Default None
            = offline unless the run is live (`cli.py run --live` /
            DEALFLOW_LIVE=1).
    """
    offline = _common.resolve_offline(offline)
    records: list[dict] = []
    from_fixture = False
    if not offline:
        try:
            records = _fetch_raw(state, days, limit)
        except Exception:
            records = []
    if not records:
        records = _common.load_fixture(FIXTURE)
        from_fixture = True
        if state:
            records = [r for r in records if r.get("state") == state.upper()]
    signals = [_to_signal(r) for r in records]
    if from_fixture:
        for s in signals:
            s["evidence"]["fixture_data"] = True
    return signals


if __name__ == "__main__":
    import sys
    offline = "--offline" in sys.argv
    signals = fetch(days=90, limit=200, offline=offline)
    ia = sum(1 for s in signals if s["evidence"].get("ia_program_declared"))
    print(f"fema_disasters: {len(signals)} signals "
          f"({ia} with Individual Assistance) offline={offline}")
    if signals:
        import json
        print(json.dumps(signals[0], indent=2))
