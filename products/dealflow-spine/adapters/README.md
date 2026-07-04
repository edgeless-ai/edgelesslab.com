# adapters/ — signal detectors

Drop a `.py` file in this directory and it IS an adapter. No registration,
no imports elsewhere. `spine/ingest.py` discovers every `adapters/*.py`
(files starting with `_` are skipped) that exposes a callable `fetch()`.

## The contract

```python
SOURCE = "lee_tax_collector"   # optional: canonical source name (default: module name)
ENABLED = True                 # optional: False = skipped by runs (default: True)

def fetch() -> list[dict]:     # required, zero-argument
    ...
```

`fetch()` returns a list of **Signal-shaped dicts** (see
`spine/schema.py::Signal.to_dict()` — that shape exactly) or
`spine.schema.Signal` instances. Dicts go through the forgiving
`Signal.from_dict`: unknown keys ignored, unknown `signal_type` coerced to
`"other"`, confidence clamped, missing `id` derived deterministically.

```python
{
    "id": "td-2026-088231",              # STABLE per upstream record (ledger dedupes on source:id)
    "source": "lee_tax_collector",
    "signal_type": "tax_delinquent",     # fema_disaster | code_violation | tax_delinquent |
                                         # obituary | pre_foreclosure | assumable_loan | other
    "observed_at": "2026-06-12T09:30:00+00:00",   # ISO-8601
    "property": {"apn": ..., "address": ..., "city": ..., "state": ..., "zip": ...,
                 "lat": ..., "lon": ...},
    "owner": {"name": ..., "mailing_address": ...},   # or null
    "evidence": {...},                   # source payload + KNOWN_FACT_KEYS facts
    "source_url": "https://...",
    "confidence": 0.9,                   # 0-1, your honest certainty
}
```

## What makes an adapter GOOD

- **Stable ids.** Re-run = same ids = zero new ledger rows. That's the whole
  idempotency story. Use `Signal.generate_id(...)` if upstream has no id.
- **Facts in evidence.** If you know `estimated_value`, `equity_pct`,
  `property_type`, `county`, `absentee_owner` (full list:
  `spine.schema.KNOWN_FACT_KEYS`) put them in `evidence` under those exact
  keys — `merge.py` lifts them into `PropertyRecord.facts` and the buy-box
  evaluates against them. No facts = the record routes on signals alone and
  the digest lists the facts underwriting still needs to chase.
- **Crash loudly.** Exceptions are isolated per adapter and reported in the
  run summary. Never return guessed/fabricated signals.
- **Anchor your signals.** A signal needs `property.address` or `property.apn`
  to join the merge. Signals without either (e.g. an obituary that only knows
  the city + deceased name) are NOT dropped — they're quarantined to
  `data/signals_pending.jsonl` with their problem list, awaiting an enrichment
  pass that resolves them against a parcel spine. If that's your source's
  nature, it still pays to emit them — just know they won't score until anchored.
- **Patient pacing** on free public endpoints (they throttle; see the FDOR
  lesson in `opportunity-engine/re-vertical/`). Cache raw pulls under
  `data/raw/<source>/` if useful.

## Testing your adapter

```bash
python cli.py run --only <your_module_name>   # ingest just yours + full pipeline
python cli.py score                            # see merged/scored records
cat data/digest-latest.md
```

`adapters/sample_fixtures.py` is the living reference implementation.
