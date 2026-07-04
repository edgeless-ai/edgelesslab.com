# dealflow-spine

The **CMCO spine** for the internal real-estate opportunity engine:
**C**riteria → **M**arketing (signals) → **C**onversion (routing) → **O**ps (ledger).

The reusable pattern underneath (from the EBRE deal-engine analysis):

```
spine + signal-detectors  →  stack-score  →  qualify (buy-box)  →  route  →  ops ledger
     adapters/*.py            scoring.py       criteria.py        route.py    data/*.jsonl
```

> ⚠️ **R&D / capability only.** No outreach, no deals, no paid APIs. Routes feed
> an internal underwriting review queue and nothing else (Accordion conflict gate —
> see memory `project_ebre_cmco_real_estate`).

Python 3.11, stdlib-only core (adapters may use `requests`). No install step:

```bash
python3.11 cli.py run       # full pipeline: ingest all adapters → merge → score → route → digest
python3.11 cli.py ingest    # adapters → data/signals.jsonl only
python3.11 cli.py score --explain   # ranked properties with score receipts (no writes)
python3.11 cli.py digest    # re-render digest from data/candidates.jsonl
python3.11 -m pytest tests/ # 62 tests, hermetic (tmp dirs, zero network, fixed clock)
```

Runs end-to-end with **zero network** out of the box: `adapters/sample_fixtures.py`
serves `fixtures/sample_signals.json` (13 signals, 8 properties, all 7 signal types).

---

## Architecture

| Stage | Module | In → Out |
|-------|--------|----------|
| **Ingest** | `spine/ingest.py` | adapters `fetch()` → `data/signals.jsonl` (append-only ledger, idempotent by `source:id`) |
| **Merge** | `spine/merge.py` | signals → `PropertyRecord`s (address normalization + APN bridging; facts lifted from evidence) |
| **Criteria** | `spine/criteria.py` | `PropertyRecord` × buy-box config → `CriteriaResult` (matches/misses/unknowns) |
| **Scoring** | `spine/scoring.py` | `PropertyRecord` → distress score + explainable `ScoreBreakdown` |
| **Route** | `spine/route.py` | records → `DealCandidate`s → hot/warm/watch/discard → `data/candidates.jsonl` + digest markdown |
| **Pipeline** | `spine/pipeline.py` | `run_pipeline()` = all of the above, one call |

### Data files (the "Ops" ledger)

| File | Semantics |
|------|-----------|
| `data/signals.jsonl` | **Append-only history.** One row per accepted signal: `{"dedupe_key": "<source>:<id>", "ingested_at": ..., "signal": {...}}`. Idempotent — re-running adapters writes 0 new rows for known signals. |
| `data/signals_pending.jsonl` | **Quarantine** (same idempotent row shape + `"problems": [...]`). Signals that parse but are *unanchored* — no address AND no APN (e.g. an obituary that only knows city + deceased name). They can't join the merge without corrupting address grouping; an enrichment pass can resolve them against a parcel spine and re-emit them anchored. |
| `data/candidates.jsonl` | **Snapshot, rewritten each run** (scores/routes legitimately change as signals age and land). One `DealCandidate` per line, sorted hot→discard, score desc. **This is what underwriting reads.** |
| `data/digest-latest.md` + `data/digests/digest-YYYY-MM-DD.md` | Human review queue: route counts, hot/warm tables, score receipts for hot candidates, facts still missing. |

---

## The schema contract (`spine/schema.py`)

Other agents build to this **exactly**. Serialization rule: `to_dict()` is strict
and canonical; `from_dict()` is forgiving (unknown keys ignored, unknown
`signal_type` → `"other"` with the original preserved in evidence, confidence
clamped to [0,1], missing `id`/`observed_at` derived deterministically).

### Signal — what adapters emit

```jsonc
{
  "id": "td-2026-088231",            // STABLE per upstream record — ledger dedupes on source:id
  "source": "lee_tax_collector",
  "signal_type": "tax_delinquent",   // fema_disaster | code_violation | tax_delinquent |
                                     // obituary | pre_foreclosure | assumable_loan | other
  "observed_at": "2026-06-12T09:30:00+00:00",   // ISO-8601
  "property": {
    "apn": "13-44-24-C3-00542.0010", // or null; any county format (normalized internally)
    "address": "1417 SE 12th Ter", "city": "Cape Coral", "state": "FL", "zip": "33990",
    "lat": 26.64, "lon": -81.94      // or null
  },
  "owner": {"name": "...", "mailing_address": "..."},   // or null
  "evidence": {...},                 // source payload + KNOWN_FACT_KEYS (below)
  "source_url": "https://...",       // or null
  "confidence": 0.95                 // 0-1, adapter's honest certainty
}
```

**Facts:** put buy-box facts you know into `evidence` under the exact keys in
`schema.KNOWN_FACT_KEYS` — `estimated_value`, `assessed_value`, `list_price`,
`equity_pct` (0-1), `property_type`, `beds`, `baths`, `sqft`, `year_built`,
`absentee_owner`, `county`. `merge.py` lifts them into `PropertyRecord.facts`,
where the buy-box evaluates them. Missing facts don't break anything (lenient
policy reports them as `unknowns` for underwriting to chase).

### PropertyRecord — merged view (internal, also imports cleanly)

`{key, property, owner, signals: [Signal], facts: {...}}` — one per physical
property. Grouping: normalized address (`"902 Palm Avenue."` ≡ `"902 PALM AVE"`)
plus **APN bridging** (two different address strings sharing a normalized APN
merge into one record). Key: `apn:<STATE>:<normalized-apn>` when any signal knew
the APN, else `addr:<STATE>:<zip>:<normalized-address>`.

### DealCandidate — what underwriting consumes (rows of `data/candidates.jsonl`)

```jsonc
{
  "property_key": "apn:FL:134424C3005420010",
  "property": { ...PropertyRef... },
  "owner": { ... } | null,
  "signals": [ ...full Signal objects, oldest first... ],
  "facts": { ...merged KNOWN_FACT_KEYS... },
  "criteria_matches": {"matched": true, "matches": [...], "misses": [...], "unknowns": [...]},
  "distress_score": 9.81,
  "recommended_strategy": "stacked distress (3 signals): tax-delinquency cash offer; ...",
  "score_breakdown": {"total": 9.81, "components": {"signal:...": 2.19, "stack_bonus": 4.0},
                       "reasons": {"signal:...": "human-readable why", ...}},
  "route": "hot",                    // hot | warm | watch | discard
  "scored_at": "2026-07-04T..."
}
```

Guarantees underwriting can rely on:
- `distress_score == sum(score_breakdown.components.values())`, every component has a reason string
- sorted hot→warm→watch→discard, then score desc
- parse rows with `spine.schema.DealCandidate.from_dict(json.loads(line))` — lossless
- or read the JSON directly from any language; the file is the contract

---

## Scoring model (`spine/scoring.py`)

```
score = Σ  weight(type) × confidence × 0.5^(age_days/180) × 0.5^(same-type repeat #)
      + 2.0 × (distinct_live_types − 1)          # stacking bonus — the "2+ list" rule
```

- **Stacking is the thesis**: 2+ *distinct* "why they'll sell now" signals = highest
  conviction. Two distinct types always outscore two copies of one type
  (same-type repeats are corroboration, dampened ×0.5 each).
- Signals older than 730 days contribute 0 and don't unlock the stack bonus.
- Type weights (`scoring.DEFAULT_WEIGHTS`): pre_foreclosure 3.0 > tax_delinquent =
  obituary 2.5 > fema_disaster = code_violation 2.0 > assumable_loan 1.5 > other 1.0.
- Everything configurable via `ScoringConfig.from_dict({...})`.

## Buy-box (`spine/criteria.py`, `config/buybox.json`)

Declarative JSON (YAML too, if PyYAML is installed). Every block optional —
omit a block to stop filtering on it. Default box: Lee County FL
(states=FL, zips=`339*` glob, price 60k–600k, equity ≥ 20 %, residential types,
2+ distinct signals, `unknown_policy: lenient`).

## Routing (`spine/route.py`)

| Route | Rule |
|-------|------|
| **hot** | 2+ distinct signal types **and** buy-box holds (no non-signal misses) |
| **warm** | buy-box holds, score ≥ 1.0 (typically single-signal) |
| **watch** | score ≥ 0.25 but box misses (e.g. price) or weak signal |
| **discard** | out of target geo (hard disqualifier) or score below floor |

The box's own `min_signal_count` criterion is excluded from routing's box-fit
check — routing owns the stacking rule (`RoutingConfig.hot_min_signals`), so a
single-signal fit can still be warm under a "2+" box.

---

## How adapters plug in (for the adapter agents)

Full contract: **`adapters/README.md`**. Short version: drop
`adapters/<source>.py` exposing zero-arg `fetch() -> list[dict]` (Signal-shaped
dicts). Optional `SOURCE = "canonical_name"`, `ENABLED = False`. Shared helpers
in `adapters/_common.py` work with either `from . import _common` or
`import _common`. Adapters are isolated: import errors and fetch() exceptions
are reported per-adapter and never block the run. Test yours with
`python3.11 cli.py run --only <module_name>`.

## How underwriting plugs in (for the underwriting agent)

Read `data/candidates.jsonl` (or `spine.route.load_candidates()`), filter
`route in ("hot", "warm")`, use `criteria_matches.unknowns` as the
missing-facts checklist and `score_breakdown.reasons` as the display-ready
"why". Emit whatever you want downstream — this package doesn't care.

## Layout

```
dealflow-spine/
├── cli.py                 # run | ingest | score | digest
├── config/buybox.json     # default buy-box (Lee County FL reference market)
├── spine/                 # the engine (stdlib only)
│   ├── schema.py          #   ← THE CONTRACT
│   ├── ingest.py          #   adapter registry + idempotent ledger
│   ├── merge.py           #   address/APN normalization + record merge
│   ├── criteria.py        #   buy-box engine
│   ├── scoring.py         #   explainable distress score
│   ├── route.py           #   hot/warm/watch/discard + digest
│   └── pipeline.py        #   run_pipeline() orchestrator
├── adapters/              # signal detectors (drop-in; see adapters/README.md)
├── fixtures/              # 13 sample signals — zero-network e2e
├── tests/                 # pytest; hermetic
└── data/                  # ledger + candidates + digests (gitignored)
```
