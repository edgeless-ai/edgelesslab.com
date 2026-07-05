"""Assumable-loan heuristic signal adapter (fixtures by default, live opt-in).

What this does
    Given deed-of-trust / mortgage recording records, flag FHA and VA
    loans originated 2019-01-01 .. 2021-12-31 — the low-rate cohort whose
    government-backed loans are ASSUMABLE by a qualified buyer. Computes a
    rate-delta hint: (current market 30y rate) - (estimated origination
    rate from the Freddie Mac PMMS monthly average for the origination
    month). A 3%+ delta on an assumable note is a serious acquisition
    edge.

Live path (DEALFLOW_LIVE=1 / cli.py run --live) — two-layer join
    Per the 2026-07-04 deed-data survey (docs/deed-data-sources.md): no
    keyless source publishes loan program + parcel together, so the live
    path joins two keyless feeds:
      1. NYC ACRIS (Socrata): Real Property Master (bnx9-e6tj — MTGE rows
         with dates + document_amt) x Legals (8h5j-fqxa — BBL + street
         address), joined on document_id. The recorder leg: parcel-level.
      2. HMDA LAR loan-level CSV (ffiec.cfpb.gov data-browser, keyless):
         FHA/VA/USDA originations for the same county + years. The public
         LAR reports loan_amount as the MIDPOINT of a $10k bin, so a
         recorder amount is matched on (year, amount-bin) — a
         PROBABILISTIC program label, emitted with confidence capped at
         INFERRED_CONFIDENCE_CAP and full inference metadata in evidence.
         These are leads to verify on the recorded instrument image (FHA
         Case No. / VA rider) — never treated as facts.
    Records whose bin matches no FHA/VA/USDA origination are labeled
    CONV_OR_UNKNOWN and produce NO signal (a missing lead beats a fake
    one). NYC is a low-FHA/VA market — right for proving the pipe, wrong
    for hunting assumables at scale; the FHA/VA-dense metros' recorders
    are captcha-gated/paid (survey doc §4/§9).

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
                     "lat": float|null, "lon": float|null},
        "program_inference": dict | absent   # live path only: how the
                                             # program label was inferred
      }, ...
    ]

Cadence
    ACRIS rolls forward continuously (good_through_date watermark); HMDA
    is annual. The 2019-21 vintage is closed — weekly live runs at most.

ToS notes
    NYC Open Data and HMDA are public-domain keyless APIs; all requests
    go through _common.http_get politeness (UA, >=1s spacing, bounded
    retries, bounded $limit). Fixture mode makes no network calls.
"""

from __future__ import annotations

import csv
import io
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

# --- live path (NYC ACRIS x HMDA program inference) ------------------------
ACRIS_MASTER_URL = "https://data.cityofnewyork.us/resource/bnx9-e6tj.json"
ACRIS_LEGALS_URL = "https://data.cityofnewyork.us/resource/8h5j-fqxa.json"
HMDA_LAR_CSV_URL = "https://ffiec.cfpb.gov/v2/data-browser-api/view/csv"
HMDA_AGG_URL = "https://ffiec.cfpb.gov/v2/data-browser-api/view/aggregations"

# ACRIS borough digit -> (county FIPS, county name, borough for city field)
# NOTE (live-verified 2026-07-04): ACRIS covers boroughs 1-4 ONLY. Staten
# Island (Richmond County) records with its own County Clerk and does not
# appear in the master dataset ($group=recorded_borough returns 1..4).
NYC_BOROUGHS = {
    "1": ("36061", "NEW YORK", "MANHATTAN"),
    "2": ("36005", "BRONX", "BRONX"),
    "3": ("36047", "KINGS", "BROOKLYN"),
    "4": ("36081", "QUEENS", "QUEENS"),
}
DEFAULT_BOROUGH = "4"   # Queens: most FHA/VA-dense borough ACRIS covers
LIVE_LIMIT = 250               # bounded Socrata pull per run (politeness)
HMDA_YEARS = (2019, 2020, 2021)
HMDA_LOAN_TYPE_LABEL = {"2": "FHA", "3": "VA", "4": "USDA"}
# An HMDA amount-bin match is a probabilistic label, not a recorded fact:
# cap the signal confidence well below the stated-program fixture path.
# Below the cap, confidence tracks the Bayes posterior
#   P(gov | bin match) = P(match | gov) * P(gov) / P(match)
#                      = 1.0 * county_gov_share / observed_match_rate
# (P(match|gov)=1 by construction: every HMDA gov loan's bin is in the bin
# set). Live-verified 2026-07-04: in Queens the raw bin match labels ~88%
# of ACRIS mortgages while the county gov share is only ~8-10% — the
# posterior (~0.10) says so, and the confidence honestly follows it.
INFERRED_CONFIDENCE_CAP = 0.45
INFERRED_CONFIDENCE_FLOOR = 0.05


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
    inference = rec.get("program_inference")
    if inference:
        # program was inferred (HMDA amount-bin match), not read off the
        # instrument — a lead to verify. Confidence is hard-capped and,
        # when the join computed one, tracks the Bayes posterior that the
        # loan is government-backed at all.
        conf = min(conf, INFERRED_CONFIDENCE_CAP)
        posterior = inference.get("posterior_gov_probability")
        if posterior is not None:
            conf = min(conf, max(INFERRED_CONFIDENCE_FLOOR, posterior))

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
            "loan_program_source": "inferred" if inference else "stated",
            **({"program_inference": inference} if inference else {}),
            **({"county": str(rec.get("county")).upper()}
               if rec.get("county") else {}),
        },
        source_url=rec.get("source_url"),
        confidence=min(conf, 0.9),
    )


# ---------------------------------------------------------------------------
# live path: ACRIS recorder leg x HMDA program-inference leg
# (docs/deed-data-sources.md, survey 2026-07-04)
# ---------------------------------------------------------------------------

def _fetch_acris_mortgages(borough: str, limit: int) -> list[dict]:
    """ACRIS Real Property Master: MTGE instruments executed in the
    2019-21 window for one borough, with a recorded amount."""
    where = (f"doc_type='MTGE' AND recorded_borough='{borough}' "
             f"AND document_amt > 10000 "
             f"AND document_date between '{WINDOW_START}T00:00:00' "
             f"and '{WINDOW_END}T23:59:59'")
    return _common.http_get_json(ACRIS_MASTER_URL, params={
        "$where": where, "$order": "recorded_datetime DESC",
        "$limit": int(limit)})


def _fetch_acris_legals(document_ids) -> dict[str, dict]:
    """ACRIS Real Property Legals for a set of document_ids (batched IN
    queries). First lot wins for multi-lot instruments."""
    legals: dict[str, dict] = {}
    ids = sorted({d for d in document_ids if d})
    for i in range(0, len(ids), 40):
        batch = ",".join(f"'{d}'" for d in ids[i:i + 40])
        rows = _common.http_get_json(ACRIS_LEGALS_URL, params={
            "$where": f"document_id in({batch})", "$limit": 2000})
        for row in rows:
            legals.setdefault(row.get("document_id"), row)
    return legals


def _fetch_hmda_bins(county_fips: str,
                     years=HMDA_YEARS) -> dict[tuple[int, float], dict]:
    """HMDA LAR loan-level: FHA/VA/USDA originations for one county.

    Returns {(year, loan_amount_bin_midpoint): {"FHA": n, "VA": m, ...}}.
    Public LAR loan_amount IS the $10k-bin midpoint (e.g. 355000.0), so it
    is used directly as the bin key.
    """
    bins: dict[tuple[int, float], dict] = {}
    for year in years:
        resp = _common.http_get(HMDA_LAR_CSV_URL, params={
            "counties": county_fips, "years": str(year),
            "loan_types": "2,3,4", "actions_taken": "1"})
        for row in csv.DictReader(io.StringIO(resp.text)):
            label = HMDA_LOAN_TYPE_LABEL.get(str(row.get("loan_type", "")).strip())
            try:
                amt = float(row.get("loan_amount") or "")
            except ValueError:
                continue
            if not label:
                continue
            counts = bins.setdefault((year, amt), {})
            counts[label] = counts.get(label, 0) + 1
    return bins


def _fetch_hmda_county_share(county_fips: str,
                             years=HMDA_YEARS) -> dict[int, float]:
    """{year: government share of originations} for the county, via the
    (tiny, keyless) HMDA aggregations endpoint — the Bayes PRIOR for the
    amount-bin match. Failure here degrades the posterior, not the run."""
    shares: dict[int, float] = {}
    for year in years:
        try:
            data = _common.http_get_json(HMDA_AGG_URL, params={
                "counties": county_fips, "years": str(year),
                "loan_types": "1,2,3,4", "actions_taken": "1"})
            counts = {str(a.get("loan_types")): int(a.get("count") or 0)
                      for a in (data or {}).get("aggregations", [])}
        except Exception:
            continue
        total = sum(counts.values())
        gov = sum(counts.get(t, 0) for t in ("2", "3", "4"))
        if total > 0:
            shares[year] = gov / total
    return shares


def _bin_midpoint(amount: float) -> float:
    """Map an exact recorder amount onto its public-LAR $10k-bin midpoint."""
    return (amount // 10_000) * 10_000 + 5_000


def _infer_program(amount: float, year: int, bins: dict):
    """(program_label, inference_metadata) via the (year, amount-bin) match,
    or (None, None) when the bin holds no FHA/VA/USDA origination."""
    counts = bins.get((year, _bin_midpoint(amount)))
    if not counts:
        return None, None
    program = max(counts, key=counts.get)
    return program, {
        "method": "hmda_amount_bin_county_year_match",
        "matched_bin": _bin_midpoint(amount),
        "bin_counts": dict(counts),
        "caveat": ("probabilistic label — same-county originations sharing "
                   "the $10k amount bin and year; verify program on the "
                   "recorded instrument image (FHA Case No. / VA rider)"),
    }


def _live_records(borough: str = DEFAULT_BOROUGH,
                  limit: int = LIVE_LIMIT) -> list[dict]:
    """Assemble fixture-format records from the ACRIS x HMDA join."""
    if str(borough) not in NYC_BOROUGHS:
        raise ValueError(f"borough must be one of {sorted(NYC_BOROUGHS)} "
                         f"(ACRIS does not cover Staten Island), got {borough!r}")
    fips, county, city = NYC_BOROUGHS[str(borough)]
    masters = _fetch_acris_mortgages(str(borough), limit)
    legals = _fetch_acris_legals(m.get("document_id") for m in masters)
    bins = _fetch_hmda_bins(fips)
    shares = _fetch_hmda_county_share(fips)

    records: list[dict] = []
    eligible = 0                       # records that could have matched
    matched: list[tuple[dict, int]] = []   # (inference_dict, year)
    for m in masters:
        doc_id = m.get("document_id")
        leg = legals.get(doc_id)
        if not leg:
            continue                      # no parcel anchor -> useless here
        try:
            amount = float(m.get("document_amt") or 0)
        except (TypeError, ValueError):
            continue
        orig = str(m.get("document_date") or m.get("recorded_datetime") or "")[:10]
        year = int(orig[:4]) if orig[:4].isdigit() else None
        if year and amount > 0:
            eligible += 1
            program, inference = _infer_program(amount, year, bins)
        else:
            program, inference = None, None
        if inference:
            matched.append((inference, year))
        street = " ".join(str(leg.get(k) or "").strip()
                          for k in ("street_number", "street_name")).strip()
        bbl = None
        if leg.get("block") and leg.get("lot"):
            try:
                bbl = (f"{int(leg.get('borough') or borough)}-"
                       f"{int(leg['block']):05d}-{int(leg['lot']):04d}")
            except (TypeError, ValueError):
                bbl = None
        records.append({
            "instrument_id": doc_id,
            "recorded_date": str(m.get("recorded_datetime") or "")[:10],
            "doc_type": "MORTGAGE",
            "loan_program": program or "CONV_OR_UNKNOWN",
            "loan_amount": amount,
            "note_rate": None,            # never on the ACRIS index
            "origination_date": orig,     # document (execution) date
            "lender": "",                 # would need the Parties dataset;
            "borrower": "",               # deliberately not wired (3rd call)
            "county": county,
            "source_url": (f"https://a836-acris.nyc.gov/DS/DocumentSearch/"
                           f"DocumentImageView?doc_id={doc_id}"),
            "property": {"apn": bbl, "address": street, "city": city,
                         "state": "NY", "zip": "", "lat": None, "lon": None},
            **({"program_inference": inference} if inference else {}),
        })

    # Bayes posterior for every matched record, calibrated on THIS batch:
    # P(gov | match) = P(match|gov)=1 * P(gov)=county_share / P(match)=rate.
    # A high match rate (common-amount bins) honestly deflates the label.
    match_rate = (len(matched) / eligible) if eligible else None
    for inference, year in matched:
        share = shares.get(year)
        inference["county_gov_share"] = share
        inference["batch_match_rate"] = (round(match_rate, 4)
                                         if match_rate is not None else None)
        inference["posterior_gov_probability"] = (
            round(min(1.0, share / match_rate), 4)
            if share is not None and match_rate else None)
    return records


def fetch(records: list[dict] | None = None,
          current_rate: float = DEFAULT_CURRENT_RATE,
          offline: bool | None = None,
          borough: str = DEFAULT_BOROUGH,
          limit: int = LIVE_LIMIT) -> list[dict]:
    """Flag assumable low-rate FHA/VA/USDA loans from recording records.

    Args:
        records: deed/mortgage records in the documented fixture format;
                 when None they come from the bundled fixture (offline,
                 the default) or the live ACRIS x HMDA join (--live).
        current_rate: today's 30y fixed rate used for the delta hint.
        offline: None consults DEALFLOW_LIVE (via _common.resolve_offline);
                 an explicit True/False always wins.
        borough: ACRIS borough digit for the live pull, 1-4 (default
                 Queens; Staten Island is NOT in ACRIS).
        limit: max ACRIS master rows per live run (politeness bound).
    """
    fixture_mode = False
    if records is None:
        if _common.resolve_offline(offline):
            records = _common.load_fixture(FIXTURE)
            fixture_mode = True
        else:
            records = _live_records(borough=borough, limit=limit)
    signals = []
    for rec in records:
        sig = _to_signal(rec, current_rate)
        if sig is not None:
            if fixture_mode:
                sig["evidence"]["fixture_data"] = True
            signals.append(sig)
    return signals


if __name__ == "__main__":
    import json
    signals = fetch()
    mode = "LIVE (ACRIS x HMDA)" if _common.live_enabled() else "fixture"
    print(f"assumable_heuristic: {len(signals)} signals ({mode} mode)")
    if signals:
        print(json.dumps(signals[0], indent=2))
