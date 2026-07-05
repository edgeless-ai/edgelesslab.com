# dealflow-spine

The **CMCO spine** for the internal real-estate opportunity engine:
**C**riteria → **M**arketing (signals) → **C**onversion (routing + underwriting) → **O**ps (ledger).

> ⚠️ **R&D / capability only.** No outreach, no deals, no paid APIs. Routes feed
> an internal underwriting review queue and nothing else (Accordion conflict gate —
> see memory `project_ebre_cmco_real_estate`).

## 60-second quickstart

Python 3.11, stdlib only, no install step, **zero network by default**:

```bash
python3.11 cli.py run            # full offline run on bundled fixtures
cat data/digest-latest.md        # the human review queue it produced
python3.11 -m pytest -q          # 183 tests, hermetic (tmp dirs, zero network, fixed clock)
```

`run` ingests every adapter (bundled fixtures unless `--live`), **enriches**
quarantined address-less signals against parcel resolvers, merges signals
per property, scores + routes them, runs the **underwriting strategy picker**
on every hot/warm candidate, and writes `data/candidates.jsonl` plus the digest.

**Reading the digest:** 🔥 **hot** means 2+ *distinct* "why they'd sell now"
signals stacked on one property AND the buy-box (`config/buybox.json`) holds —
the highest-conviction tier, first in line for a human underwriter. Every hot
row carries its distress score, the stacked signals, and the picker's verdict
(**wholesale / subto / assumption / seller_finance / pass**) with the top
reason. Warm = in the box, single signal. Watch = something's there. Discard =
out of geo or below floor.

**Live data is opt-in:** `python3.11 cli.py run --live` enables the network
adapters (openFEMA, Philly/NYC tax rolls, Seattle code violations, obituary
RSS) through the shared politeness layer in `adapters/_common.py` — descriptive
User-Agent, ≥1s self rate-limit, bounded retries. Requires `pip install
requests`; the default run never touches the network (adapters serve their
bundled fixtures).

## Architecture (one picture)

```
        adapters/*.py                  signal detectors — offline fixtures by
  fema · tax · obituaries ·            default; `run --live` (or DEALFLOW_LIVE=1)
  code-violations · assumable          enables network via the politeness layer
             │  fetch()
             ▼
  data/signals.jsonl       INGEST      append-only idempotent ledger (spine/ingest.py);
             │                         unanchored signals (no address AND no APN)
             │                         quarantine to data/signals_pending.jsonl ─┐
             │                                                                   ▼
             │                         ENRICH      resolvers/*.py match owner name →
             │◄─── resolved signals ── (spine/     parcel (Philly OPA live; fixture
             │     rejoin the ledger    enrich.py) index offline); ambiguous/unmatched
             │     via the normal                  stay pending (attempts counter,
             │     ingest append                   unresolvable after 3 passes)
             ▼
  PropertyRecord           MERGE       address normalization + APN bridging (spine/merge.py)
             │
             ▼
  score × buy-box          SCORE +     explainable distress score (spine/scoring.py)
             │             CRITERIA    declarative buy-box (spine/criteria.py)
             ▼
  hot·warm·watch·discard   ROUTE       hot = 2+ distinct signal types AND in the box
             │                         (spine/route.py)
             │ hot/warm only
             ▼
  strategy verdict         UNDERWRITE  underwriting.strategy_picker.pick() ranks
             │                         wholesale/subto/assumption/seller-finance/pass
             │                         (spine/underwrite.py — the bridge)
             ▼
  data/candidates.jsonl    OPS         review queue for a HUMAN underwriter:
  data/digest-latest.md                strategy + why, score receipts, missing facts
```

All CLI commands:

```bash
python3.11 cli.py run               # full pipeline (offline fixtures)
python3.11 cli.py run --live        # same, network adapters enabled (polite)
python3.11 cli.py ingest [--live]   # adapters → data/signals.jsonl only
python3.11 cli.py enrich [--live]   # quarantine → resolvers → ledger (offline: fixture resolver)
python3.11 cli.py score --explain   # ranked properties with score receipts (no writes)
python3.11 cli.py underwrite        # re-run the strategy picker on candidates.jsonl + digest
python3.11 cli.py digest            # re-render digest from data/candidates.jsonl
```

---

## Architecture

| Stage | Module | In → Out |
|-------|--------|----------|
| **Ingest** | `spine/ingest.py` | adapters `fetch()` → `data/signals.jsonl` (append-only ledger, idempotent by `source:id`) |
| **Enrich** | `spine/enrich.py` | `data/signals_pending.jsonl` × resolvers `resolve()` → anchored signals appended through the normal ingest path (same `source:id` — supersedes the pending twin, never duplicates) |
| **Merge** | `spine/merge.py` | signals → `PropertyRecord`s (address normalization + APN bridging; facts lifted from evidence) |
| **Criteria** | `spine/criteria.py` | `PropertyRecord` × buy-box config → `CriteriaResult` (matches/misses/unknowns) |
| **Scoring** | `spine/scoring.py` | `PropertyRecord` → distress score + explainable `ScoreBreakdown` |
| **Route** | `spine/route.py` | records → `DealCandidate`s → hot/warm/watch/discard → `data/candidates.jsonl` + digest markdown |
| **Underwrite** | `spine/underwrite.py` | hot/warm `DealCandidate` → `underwriting.strategy_picker.pick()` → `candidate.underwriting` verdict (strategy + why); shown in the digest's hot section |
| **Pipeline** | `spine/pipeline.py` | `run_pipeline()` = all of the above, one call |

### Data files (the "Ops" ledger)

| File | Semantics |
|------|-----------|
| `data/signals.jsonl` | **Append-only history.** One row per accepted signal: `{"dedupe_key": "<source>:<id>", "ingested_at": ..., "signal": {...}}`. Idempotent — re-running adapters writes 0 new rows for known signals. |
| `data/signals_pending.jsonl` | **Quarantine, consumed by the enrichment stage.** Signals that parse but are *unanchored* — no address AND no APN (e.g. an obituary that only knows city + deceased name) — can't join the merge without corrupting address grouping, so ingest parks them here instead of dropping them. `spine/enrich.py` consumes the file: resolvers match the owner/deceased name against parcel rolls; a **unique** match re-emits the signal anchored — same `source:id`, so it supersedes its pending twin and can never duplicate it — **ambiguous** matches stay pending with every candidate parcel in `evidence.enrichment_candidates` (never guess between parcels), and rows failing 3 passes are parked as `status: unresolvable`. The file is an **append-only event log**: enrich appends updated rows (`status`/`attempts`/`last_attempt`) per `dedupe_key`, readers take the last row per key, nothing is ever deleted. |
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
  "scored_at": "2026-07-04T...",
  "underwriting": {                  // hot/warm only; null otherwise
    "recommendation": "subto",       // == ranked_top3[0].strategy
    "ranked_top3": [ ...picker entries: strategy/score/applicable/reasons/... ],
    "hitl_note": "Decision support only. ... a HUMAN underwrites, offers, ..."
  }
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
| **hot** | 2+ distinct **live, classified** signal types **and** score ≥ 2.0 **and** buy-box holds (no non-signal misses) |
| **warm** | buy-box holds, score ≥ 1.0 (typically single-signal) |
| **watch** | score ≥ 0.25 but box misses (e.g. price) or weak signal |
| **discard** | out of target geo (hard disqualifier) or score below floor |

Hot's stack count only admits signal types that are *live* (positive score
contribution — a fully-decayed 2-year-old signal can't mint a hot lead; same
rule scoring uses for the stack bonus) and *classified* (the `other` bucket
still **scores**, but never counts toward the 2-list stack — otherwise one
source emitting a novel/coerced second label fakes a stack). The score floor
keeps near-zero-confidence pairs off the product surface. All thresholds live
on `RoutingConfig` (`hot_min_signals`, `hot_min_score` default 2.0,
`warm_min_score`, `watch_min_score`), overridable via
`RoutingConfig.from_dict`.

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
are reported per-adapter and never block the run. Network adapters take
`offline: bool | None = None` and resolve it via
`_common.resolve_offline()` — offline (bundled fixture) unless the process is
live (`cli.py run --live` sets `DEALFLOW_LIVE=1`). Test yours with
`python3.11 cli.py run --only <module_name>`.

## How resolvers plug in (the enrichment stage)

Mirror of the adapter registry: drop `resolvers/<name>.py` exposing
`resolve(signal: dict) -> dict | None` (full return contract in
`resolvers/_common.py`). Optional `NAME`, `ENABLED = False`, `ORDER` (lower
runs first — live resolvers outrank the offline fixture stand-in). Resolvers
are isolated like adapters: import errors and `resolve()` exceptions are
reported per-resolver and never block the pass. Shipped resolvers:

- **`philly_opa`** (live, `ORDER=10`) — owner-name search against the
  Philadelphia OPA parcel roll (`opa_properties_public`, same keyless Carto
  SQL endpoint the tax_delinquent adapter uses; live-verified sample in
  `fixtures/resolvers/philly_opa_sample.json`). Jurisdiction-gated (only
  fires for Philadelphia PA signals), exact-ish name match required, one
  parcel → resolved at confidence 0.35 (names cap at 0.4), two+ → ambiguous
  with all candidates in evidence. Live-only: returns `None` offline.
- **`fixture_owner_index`** (offline, `ORDER=90`) — same matching logic over
  `fixtures/resolvers/owner_index.json`, a bundled assessor-style owner index
  (Klamath Falls OR), so the whole enrich path runs with zero network — the
  CLI default. Live resolution stays behind `--live` / `DEALFLOW_LIVE=1`.

Test yours with `python3.11 cli.py enrich --only <name>`.

## How underwriting plugs in

Wired in: `spine/underwrite.py` maps each hot/warm candidate's facts + signal
evidence into `underwriting.strategy_picker.pick()` input (value from
estimated/assessed value, implied loan balance from `equity_pct`, loan
type/rate from assumable-loan evidence, spine signal types → picker motivation
vocabulary) and attaches the verdict as `candidate.underwriting` — see the
module docstring for every mapping decision. The underwriting library's API is
contract-locked (`underwriting/README.md`); the bridge only calls it.

Downstream consumers still read `data/candidates.jsonl` (or
`spine.route.load_candidates()`), filter `route in ("hot", "warm")`, and get
the strategy verdict for free in `underwriting`; `criteria_matches.unknowns`
is the missing-facts checklist and `score_breakdown.reasons` the
display-ready "why".

## Ops (scheduled runs)

A launchd user agent (`com.edgeless.dealflow-weekly`) runs `cli.py run --live`
every **Monday 09:00 local** and Telegrams the digest top to David — weekly
because the consumer is a human reading a digest and the upstream sources
(county tax rolls, code enforcement, FEMA) update on days-to-weeks cadence.
The `--live` dependency (`requests`) lives in the product venv at `.venv/`.
Full runbook — pause/resume, logs, schedule changes: **`ops/README.md`**.

## Layout

```
dealflow-spine/
├── cli.py                 # run [--live] | ingest [--live] | enrich [--live] | score | underwrite | digest
├── config/buybox.json     # default buy-box (Lee County FL reference market)
├── spine/                 # the engine (stdlib only)
│   ├── schema.py          #   ← THE CONTRACT
│   ├── ingest.py          #   adapter registry + idempotent ledger
│   ├── enrich.py          #   quarantine consumer: resolver registry + supersede-into-ledger
│   ├── merge.py           #   address/APN normalization + record merge
│   ├── criteria.py        #   buy-box engine
│   ├── scoring.py         #   explainable distress score
│   ├── route.py           #   hot/warm/watch/discard + digest
│   ├── underwrite.py      #   bridge: hot/warm candidates → strategy_picker verdicts
│   └── pipeline.py        #   run_pipeline() orchestrator
├── underwriting/          # deal-math + strategy picker (contract-locked; own README)
├── playbooks/             # operational manuals per strategy (worked examples)
├── adapters/              # signal detectors (drop-in; see adapters/README.md)
├── resolvers/             # enrichment resolvers (drop-in; contract in resolvers/_common.py)
├── fixtures/              # sample + per-adapter/-resolver fixtures — zero-network e2e
├── tests/                 # pytest; hermetic (underwriting/tests/ too)
├── ops/                   # weekly launchd run + Telegram digest (ops/README.md)
└── data/                  # ledger + candidates + digests (gitignored)
```
