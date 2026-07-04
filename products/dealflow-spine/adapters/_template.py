"""
Adapter template — copy to adapters/<your_source>.py and fill in fetch().

Files starting with '_' are ignored by discovery, so this template never runs.

Rules that matter:
  1. `id` must be STABLE per upstream record. Re-fetching the same upstream
     row must produce the same id — the ledger dedupes on (source, id).
     No upstream id? Use Signal.generate_id(source, type, address, observed_at).
  2. Put buy-box facts you KNOW into evidence using the exact keys in
     spine.schema.KNOWN_FACT_KEYS (estimated_value, equity_pct,
     property_type, county, absentee_owner, ...). criteria.py reads them.
  3. confidence is YOUR certainty the signal is real + about this property
     (0-1). Be honest; scoring multiplies by it.
  4. Raise freely on failure — the runner isolates and reports adapter
     errors; never return half-fabricated signals.
  5. Network etiquette: this is an R&D pipeline on free public sources.
     Space your requests (see opportunity-engine/re-vertical for the
     patient-pacing pattern); cache locally under data/raw/<source>/ if
     you need to.
"""

# import requests   # available in the target interpreter

SOURCE = "my_source"     # canonical name; shows up in dedupe keys + digests
ENABLED = False          # flip to True when real (template ships disabled)


def fetch() -> list[dict]:
    """Return a list of Signal-shaped dicts. Called with no arguments."""
    return [
        # {
        #     "id": "<stable-upstream-id>",
        #     "source": SOURCE,                    # optional (runner stamps it)
        #     "signal_type": "tax_delinquent",     # see spine.schema.SIGNAL_TYPES
        #     "observed_at": "2026-07-01T00:00:00+00:00",
        #     "property": {
        #         "apn": None, "address": "123 Main St", "city": "Cape Coral",
        #         "state": "FL", "zip": "33990", "lat": None, "lon": None,
        #     },
        #     "owner": {"name": None, "mailing_address": None},  # or None
        #     "evidence": {"amount_due": 1234.5, "estimated_value": 250000},
        #     "source_url": "https://...",
        #     "confidence": 0.9,
        # },
    ]
