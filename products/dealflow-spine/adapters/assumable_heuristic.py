"""Assumable-loan heuristic signal adapter (fixture-driven).

What this does
    Given deed-of-trust / mortgage recording records, flag FHA and VA
    loans originated 2019-01-01 .. 2021-12-31 — the low-rate cohort whose
    government-backed loans are ASSUMABLE by a qualified buyer. Computes a
    rate-delta hint: (current market 30y rate) - (estimated origination
    rate from the Freddie Mac PMMS monthly average for the origination
    month). A 3%+ delta on an assumable note is a serious acquisition
    edge.

Real data source (documented, not yet wired)
    County recorder / register-of-deeds indexes: deeds of trust record the
    lender, loan amount, and — via FHA/VA riders or case numbers — the
    loan program. Concretely:
      - FHA loans: "FHA Case No." appears on the security instrument.
      - VA loans: "VA Loan No." / VA rider.
    Very few recorders expose keyless bulk APIs; most (incl. Multnomah OR
    via MultcoRecords) are search-portals with per-document fees. Public
    HMDA LAR data (ffiec.cfpb.gov, keyless bulk CSV) gives loan_type
    (2=FHA, 3=VA) + census tract + year — usable to TARGET tracts dense
    with 2019-2021 FHA/VA originations even without parcel-level joins.
    See docs/data-sources.md.

Fixture format (fixtures/adapters/assumable_heuristic_sample.json)
    [
      {
        "instrument_id": str,        # recorder instrument number
        "recorded_date": "YYYY-MM-DD",
        "doc_type": "DEED_OF_TRUST",
        "loan_program": "FHA"|"VA"|"CONV"|"USDA",
        "loan_amount": float,
        "note_rate": float|null,     # rarely on the instrument; null ok
        "origination_date": "YYYY-MM-DD",
        "lender": str,
        "borrower": str,
        "county": str,               # optional; lifted into evidence facts
        "property": {"apn": str, "address": str, "city": str,
                     "state": str, "zip": str,
                     "lat": float|null, "lon": float|null}
      }, ...
    ]

Cadence
    Recorder indexes update daily; HMDA annually. N/A while fixture-only.

ToS notes
    Fixture-only module; no network calls. HMDA bulk files are public
    domain when this gets wired.
"""

from __future__ import annotations

from datetime import date, datetime

try:
    from . import _common
except ImportError:
    import _common

FIXTURE = "assumable_heuristic_sample.json"
SOURCE = "county_recorder_assumable_heuristic"

ASSUMABLE_PROGRAMS = {"FHA", "VA", "USDA"}  # all three are assumable
WINDOW_START = date(2019, 1, 1)
WINDOW_END = date(2021, 12, 31)

# Freddie Mac PMMS 30-year fixed, monthly averages (%). Used to estimate
# the note rate when the instrument doesn't carry one.
PMMS_30Y_MONTHLY = {
    "2019-01": 4.46, "2019-02": 4.37, "2019-03": 4.27, "2019-04": 4.14,
    "2019-05": 4.07, "2019-06": 3.80, "2019-07": 3.77, "2019-08": 3.62,
    "2019-09": 3.61, "2019-10": 3.69, "2019-11": 3.70, "2019-12": 3.72,
    "2020-01": 3.62, "2020-02": 3.47, "2020-03": 3.45, "2020-04": 3.31,
    "2020-05": 3.23, "2020-06": 3.16, "2020-07": 3.02, "2020-08": 2.94,
    "2020-09": 2.89, "2020-10": 2.83, "2020-11": 2.77, "2020-12": 2.68,
    "2021-01": 2.74, "2021-02": 2.81, "2021-03": 3.08, "2021-04": 3.06,
    "2021-05": 2.96, "2021-06": 2.98, "2021-07": 2.87, "2021-08": 2.84,
    "2021-09": 2.90, "2021-10": 3.07, "2021-11": 3.07, "2021-12": 3.10,
}
DEFAULT_CURRENT_RATE = 6.8  # override via fetch(current_rate=...)


def _parse_date(s: str) -> date | None:
    try:
        return datetime.strptime(s[:10], "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


def _estimate_rate(orig: date) -> float | None:
    return PMMS_30Y_MONTHLY.get(f"{orig.year}-{orig.month:02d}")


def _to_signal(rec: dict, current_rate: float) -> dict | None:
    program = str(rec.get("loan_program") or "").upper()
    orig = _parse_date(rec.get("origination_date") or
                       rec.get("recorded_date") or "")
    if program not in ASSUMABLE_PROGRAMS or orig is None:
        return None
    if not WINDOW_START <= orig <= WINDOW_END:
        return None

    est_rate = rec.get("note_rate") or _estimate_rate(orig)
    rate_delta = (round(current_rate - est_rate, 2)
                  if est_rate is not None else None)
    # Bigger delta => stronger signal; estimated rates cap lower than
    # instrument-stated rates.
    conf = 0.5
    if rate_delta is not None and rate_delta >= 3.0:
        conf = 0.65
    if rec.get("note_rate") is not None:
        conf += 0.15

    prop = rec.get("property") or {}
    return _common.build_signal(
        id=_common.make_id(SOURCE, rec.get("instrument_id")),
        source=SOURCE,
        signal_type="assumable_loan",
        observed_at=str(rec.get("recorded_date", "")) + "T00:00:00",
        address=str(prop.get("address") or ""),
        city=str(prop.get("city") or ""),
        state=str(prop.get("state") or ""),
        zip_code=str(prop.get("zip") or ""),
        apn=prop.get("apn"),
        lat=prop.get("lat"),
        lon=prop.get("lon"),
        owner={"name": str(rec.get("borrower") or ""),
               "mailing_address": ""} if rec.get("borrower") else None,
        evidence={
            "instrument_id": rec.get("instrument_id"),
            "doc_type": rec.get("doc_type"),
            "loan_program": program,
            "loan_amount": rec.get("loan_amount"),
            "origination_date": str(orig),
            "lender": rec.get("lender"),
            "note_rate_stated": rec.get("note_rate"),
            "estimated_origination_rate": est_rate,
            "current_market_rate": current_rate,
            "rate_delta_hint": rate_delta,
            "rate_source": ("instrument" if rec.get("note_rate") is not None
                            else "freddie_mac_pmms_monthly_avg"),
            **({"county": str(rec.get("county")).upper()}
               if rec.get("county") else {}),
        },
        source_url=None,
        confidence=min(conf, 0.9),
    )


def fetch(records: list[dict] | None = None,
          current_rate: float = DEFAULT_CURRENT_RATE,
          offline: bool = True) -> list[dict]:
    """Flag assumable low-rate FHA/VA/USDA loans from recording records.

    Args:
        records: deed/mortgage records in the documented fixture format;
                 loads the bundled fixture when None.
        current_rate: today's 30y fixed rate used for the delta hint.
        offline: always True — this adapter never hits the network.
    """
    if records is None:
        records = _common.load_fixture(FIXTURE)
    signals = []
    for rec in records:
        sig = _to_signal(rec, current_rate)
        if sig is not None:
            signals.append(sig)
    return signals


if __name__ == "__main__":
    import json
    signals = fetch()
    print(f"assumable_heuristic: {len(signals)} signals "
          f"(fixture-driven; offline by design)")
    if signals:
        print(json.dumps(signals[0], indent=2))
