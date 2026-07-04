# Adversarial Review — dealflow-spine

- **Date**: 2026-07-04
- **Commit**: c414014c (`feat(dealflow-spine): CMCO opportunity engine`)
- **Baseline**: `python3.11 -m pytest -q` → **118 passed in 0.09s** (clean at review start; this review modified no code)
- **Reviewer stance**: adversarial — every finding below was reproduced with running code (python3.11). Repro snippets are inline; run them from the repo root.

> **Concurrent-edit note**: while this review was running, another session landed uncommitted changes in the working tree (new `spine/underwrite.py`, `tests/test_live_flag.py`, `tests/test_underwrite.py`; edits to `adapters/*`, `cli.py`, `spine/route.py`, `spine/schema.py`, `spine/pipeline.py`). By review end the suite reads **2 failed, 128 passed** — both failures are in the concurrent session's new `tests/test_live_flag.py` (adapters failing to import, i.e. finding M7 below), **not** caused by this review. The concurrent diffs to route.py/schema.py only touch digest rendering and a new `DealCandidate.underwriting` field; every finding below was re-verified against the current tree (H2 and M3 explicitly re-run) and all still reproduce.

## Verdict

**No CRITICAL findings.** The math core is correct (all three hand-verifications matched to the penny), the ledger is idempotent in the single-process happy path, and the playbooks are legally careful — better than most material in this genre. But the pipeline has **four HIGH findings**: a poisoned signal kills an entire ingest run in violation of the adapter-isolation contract; the HOT route can be reached by near-zero-confidence and even fully-decayed (score-0) signals; an unknown loan balance is silently treated as *zero debt*, producing a "Free and clear" seller-finance recommendation for a property the caller said is 90% levered; and APN-based merging collides across counties. Plus a cluster of MEDIUMs around concurrency, NaN handling, and rate-convention mismatches.

---

## Part 1 — Hand verifications (all three MATCHED)

### 1a. `wholesale.mao(300_000, 40_000, margin=0.30, wholesale_fee=10_000)` — MATCH

Formula in code (`underwriting/wholesale.py:32`): `arv * (1 - margin) - repairs - wholesale_fee`

Independent arithmetic:

```
300,000 × (1 − 0.30) = 300,000 × 0.70 = 210,000
210,000 − 40,000 (repairs)           = 170,000
170,000 − 10,000 (fee)               = 160,000
```

Code returns `160000.0`. **Hand = code = $160,000.** The docstring example and the wholesale playbook worked example agree.

```bash
python3.11 -c "import sys; sys.path.insert(0,'.'); from underwriting import wholesale; print(wholesale.mao(300_000,40_000,margin=0.30,wholesale_fee=10_000))"
```

### 1b. Monthly payment, balance=310k, rate=2.75%, 360 mo — MATCH

Standard amortization: `M = P·r / (1 − (1+r)^−n)`, `r = 0.0275/12`.

Independent arithmetic (50-digit Decimal):

```
r          = 0.0275 / 12       = 0.0022916667
(1+r)^−360                     = 0.4386488249
numerator  = 310,000 × r       = 710.416667
M          = 710.416667 / (1 − 0.4386488249)
           = 710.416667 / 0.5613511751
           = 1,265.547661
```

`finance.monthly_payment(310_000, 0.0275, 360)` = **1265.547661** (diff 3e−11, pure float noise). The `subto` path (`wrap_exit` with `wrap_rate=2.75`, exercising `_norm_rate`'s percent→decimal conversion) returns the identical number. **Hand = code = $1,265.55/mo.**

I also re-derived every number in both playbook worked examples: subto (P&I 1218.58≈1218.59, cf $220, DSCR 1.1333, equity capture $44,000, CoC 16.5%, paydown $460.26, yr-1 $8,163, wrap P&I $2,306.74, spread $656.74, flip profit $20,200) and assumption (cur $1,845.24, mkt $2,827.12, savings $981.87, NPV $52,030.16, gap 13.04%). **All match the published playbooks.**

### 1c. Scoring invariant: same-type pair vs distinct-type pair — MATCH (with one boundary caveat, see L1)

Formula (`spine/scoring.py`): `Σ weight·confidence·decay·dampen + stack_bonus·(distinct_live_types − 1)`, dampen = 0.5^nth-of-same-type, defaults: pre_foreclosure w=3.0, code_violation w=2.0, stack_bonus=2.0.

Two **same-type** signals (pre_foreclosure ×2, confidence 0.8, age 0 → decay 1.0):

```
1st: 3.0 × 0.8 × 1.0 × 0.5⁰ = 2.4
2nd: 3.0 × 0.8 × 1.0 × 0.5¹ = 1.2
stack bonus: 1 distinct type → none
total (hand) = 3.6
```

Two **distinct-type** signals (pre_foreclosure + code_violation, same confidence/recency):

```
pre_foreclosure: 3.0 × 0.8 = 2.4
code_violation:  2.0 × 0.8 = 1.6
stack bonus: 2 distinct types → 2.0 × (2−1) = 2.0
total (hand) = 6.0
```

Code returns **3.6** and **6.0** exactly, component-by-component. 6.0 > 3.6 → invariant holds for the like-for-like case. **Hand = code.**

```bash
python3.11 - <<'EOF'
import sys; sys.path.insert(0,'.')
from datetime import datetime, timezone
from spine.scoring import score_record
from spine.schema import PropertyRecord, PropertyRef, Signal
NOW = datetime(2026,7,4,tzinfo=timezone.utc); OBS="2026-07-04T00:00:00+00:00"
S=lambda i,t,c=0.8: Signal(id=i,source="t",signal_type=t,observed_at=OBS,property=PropertyRef(address="1 X ST"),confidence=c)
R=lambda *s: PropertyRecord(key="k",property=PropertyRef(address="1 X ST"),signals=list(s))
print(score_record(R(S("a","pre_foreclosure"),S("b","pre_foreclosure")),now=NOW)[0])  # 3.6
print(score_record(R(S("a","pre_foreclosure"),S("b","code_violation")),now=NOW)[0])   # 6.0
EOF
```

**Boundary caveat (finding L1 below):** the docstring claims distinct types *always beat* two copies of one type. Cross-type at confidence=1.0 it's a tie, not a beat: dup(pre_foreclosure×2)=3.0+1.5=**4.5** vs distinct(other 1.0 + assumable 1.5 + bonus 2.0)=**4.5**. General form: dup ≤ distinct always under default weights (dup−distinct = (0.5·wX − wY)·cd − 2 ≤ 0 for wX≤3, wY≥1, cd≤1), with equality exactly at cd=1 for the (pre_foreclosure×2 vs other+assumable) pair. Custom `weights`/`stack_bonus` via `ScoringConfig.from_dict` can break it outright (e.g. stack_bonus=0.1, one type weighted 10).

---

## Part 2 — Ranked findings

### HIGH

#### H1. One poisoned signal kills the ENTIRE ingest run — violates the documented adapter-isolation contract

`spine/ingest.py:299` wraps only `module.fetch()` in try/except ("Raise freely — a crashing adapter is isolated"). But `append_signal` (line 311) is **not** wrapped. `Signal.from_dict` happily preserves any `evidence` dict — including one with a non-string-able key — and `json.dumps(..., default=str)` cannot serialize tuple/bytes **keys** (`default` only applies to values). The exception propagates out of `run_ingest`, aborting the loop: adapters that already ran keep their rows; adapters later in alphabetical order never run at all. Repro (verified: run raises `TypeError: keys must be str...`, third adapter never executed):

```bash
python3.11 - <<'EOF'
import sys, tempfile; sys.path.insert(0,'.')
from pathlib import Path
from spine.ingest import run_ingest
tmp = Path(tempfile.mkdtemp()); adir = tmp/"adapters"; adir.mkdir()
mk=lambda n,extra="": (adir/n).write_text(
 "def fetch():\n return [{'id':'x','signal_type':'obituary','observed_at':'2026-07-01T00:00:00+00:00',"
 "'property':{'address':'1 A St','state':'OR','zip':'1'}%s}]\n" % extra)
mk("good_one.py"); mk("poison.py", ", 'evidence': {(1,2): 'tuple key'}"); mk("zz_after.py")
run_ingest(adir, tmp/"signals.jsonl")   # raises TypeError; zz_after never runs
EOF
```

**Fix**: wrap the per-signal append (or the whole per-adapter block) in try/except and count it under `report.invalid`; or sanitize evidence keys in `Signal.from_dict` (`{str(k): v ...}`).

#### H2. HOT routing ignores confidence, score, and recency-decay — dead and near-zero signals mint hot leads

`route_record` (`spine/route.py:122`): `if distinct >= hot_min_signals and fit: return Route.HOT` — no score term at all, and `distinct` counts **all** signals via `record.distinct_signal_types`, including signals older than `max_age_days` (730d) that scoring deliberately zeroes. scoring.py even has explicit logic ("a fully-decayed 3-year-old signal shouldn't unlock the [stack] bonus") — routing does not mirror it. Verified: a fresh 0.2-confidence obituary + a 2.5-year-old code violation (score contribution **0.0**) routes **HOT** with total score 0.4981 — below even the WATCH floor semantics:

```bash
python3.11 - <<'EOF'
import sys; sys.path.insert(0,'.')
from datetime import datetime, timezone
from spine.merge import merge_signals
from spine.schema import Signal, PropertyRef
from spine.scoring import score_record
from spine.criteria import BuyBox
from spine.route import route_record, RoutingConfig
NOW = datetime(2026,7,4,tzinfo=timezone.utc)
P = PropertyRef(address="6 Fir St", state="OR", zip="97601")
obit  = Signal(id="ob1", source="obits", signal_type="obituary", observed_at="2026-07-03T00:00:00+00:00", property=P, confidence=0.2)
stale = Signal(id="cv",  source="code",  signal_type="code_violation", observed_at="2024-01-01T00:00:00+00:00", property=P, confidence=0.9)
rec = merge_signals([obit, stale])[0]
score, bd = score_record(rec, now=NOW)
print(score, bd.components, route_record(rec, BuyBox().evaluate(rec), score).value)
# -> 0.4981 {'signal:obituary:ob1': 0.4981, 'signal:code_violation:cv': 0.0} hot
EOF
```

**Fix**: count only *live* types (contribution > 0) toward `hot_min_signals`, and/or add a `hot_min_score` gate.

#### H3. Unknown loan balance conflated with ZERO balance — picker recommends "Free and clear" seller finance on a 90%-levered property

`strategy_picker.derive_facts` (line 228): `balance = ... or 0.0`, and line 233: whenever `value` is present, `equity_pct = (value − balance)/value` — **silently overriding a caller-supplied `equity_pct`**. Input where the balance is simply *unknown* but the caller states 10% equity:

```bash
python3.11 -c "
import sys; sys.path.insert(0,'.')
from underwriting import strategy_picker
out = strategy_picker.pick({'value': 400_000, 'equity_pct': 0.10, 'signals': ['probate','arrears']})
print(out['recommendation'], out['derived']['equity_pct'], out['derived']['loan_balance'])
print([r['why'][:45] for r in out['ranked'][0]['reasons']])"
```

Verified output: recommendation **seller_finance**, derived equity_pct **1.0**, with ranked reasons **"Equity >=70%…"** (F1) and **"Free and clear: cleanest possible carryback — no underlying lien"** (F2) — flatly contradicting the caller's stated 10% equity. Sub-to is simultaneously DQ'd with "No existing debt." The docstring promises the caller-supplied `equity_pct` is "used when value and balance can't derive it," but a present `value` + *missing* balance is exactly the case where they can't — and it derives garbage anyway. Missing ≠ zero. **Fix**: track `balance_known`; when balance is missing and caller supplied `equity_pct`, prefer the caller's number; make F2/S-DQ1 require a *known* zero balance.

#### H4. APN merge key collides across counties — two different properties fuse into one record

`merge.property_key` (line 93): `f"apn:{state}:{apn}"`. APNs are **county-scoped** identifiers; many states (FL section-township-range format being the canonical example) have numerically identical APNs in different counties. `KNOWN_FACT_KEYS` even carries `county` — it's just not used in the key. Verified: a Lee County tax-delinquency and a Collier County code violation with the same digit string fuse into one PropertyRecord, which then has 2 distinct signal types → **HOT** (per H2) for a property that doesn't exist:

```bash
python3.11 -c "
import sys; sys.path.insert(0,'.')
from spine.merge import property_key
from spine.schema import PropertyRef
lee = PropertyRef(address='11 Beach Rd', city='Fort Myers', state='FL', zip='33901', apn='01-44-24-P2-00600.0010')
col = PropertyRef(address='99 Swamp Ln', city='Naples',     state='FL', zip='34102', apn='0144 24P2 006000010')
print(property_key(lee)); print(property_key(col)); print(property_key(lee)==property_key(col))"
# apn:FL:014424P2006000010 twice -> True
```

Note the APN *bridging* pass (`apn_to_keys`) then unions their address groups too, so all signals from both addresses land on one record. **Fix**: include county in the APN key when available (`apn:{state}:{county}:{apn}`), falling back to address key when county is unknown.

### MEDIUM

#### M1. Address key omits city — same street address in different cities false-merges when zip is missing

`_address_key` = `addr:{state}:{zip}:{normalized address}`. City is never part of the key. Adapters that don't know the zip (realistic: obituary/probate and FEMA-declaration sources) produce zip="" — then "100 Main St, Springfield IL" and "100 Main St, Chicago IL" are **one property**. Verified: both keys = `addr:IL::100 MAIN ST`; `merge_signals` returns 1 record with 2 signal types (again → HOT via H2). "Main St" recurs in nearly every municipality, so this is a systematic false-merge generator, not a corner case.

```bash
python3.11 -c "
import sys; sys.path.insert(0,'.')
from spine.merge import _address_key
from spine.schema import PropertyRef
print(_address_key(PropertyRef(address='100 Main St', city='Springfield', state='IL', zip='')))
print(_address_key(PropertyRef(address='100 Main St', city='Chicago',    state='IL', zip='')))"
```

Related normalizer ambiguity, same mechanism: `normalize_address("1421 North St") == normalize_address("1421 N St") == "1421 N ST"` — a street *named* North Street collapses onto a lettered N Street (both exist in cities with alphabet grids, e.g. Sacramento's "N St"). Directional-vs-name is undecidable without a parser, but combined with a missing zip it merges two distinct situses. **Fix**: include city in the address key when zip is empty; treat "no zip AND no city" as unanchored (quarantine), like the no-address case already is.

#### M2. No concurrency control on the ledger — duplicate rows, which then HALVE the property's score

Two ingest processes (cron overlap, manual + cron) both snapshot `existing_dedupe_keys()` before either writes → both append the same signal. Verified: dedupe violated (2 rows, 1 upstream record). The nasty part is the downstream interaction: `score_record` keys components as `signal:{type}:{id}`, so the duplicate **overwrites** the first component with its dampened (×0.5) value — the merged record scores **1.2316 vs 2.4633** for the identical single signal. A duplicate makes a lead look *half* as distressed. Same collision fires for any adapter bug reusing an id within one record. Additionally, appends are buffered-file writes with no lock; rows larger than a pipe buffer can interleave across processes.

```bash
python3.11 - <<'EOF'
import sys, tempfile; sys.path.insert(0,'.')
from pathlib import Path
from spine.ingest import append_signal, load_ledger_signals, existing_dedupe_keys
from spine.schema import Signal
from spine.merge import merge_signals
from spine.scoring import score_record
led = Path(tempfile.mkdtemp())/"l.jsonl"
d = {"id":"obit-1","source":"obits","signal_type":"obituary","observed_at":"2026-07-01T00:00:00+00:00",
     "property":{"address":"4 Pine St","state":"OR","zip":"97601"},"confidence":1.0}
ka, kb = existing_dedupe_keys(led), existing_dedupe_keys(led)   # two processes snapshot
append_signal(led, Signal.from_dict(d), ka); append_signal(led, Signal.from_dict(d), kb)
sigs = load_ledger_signals(led)
print(len(sigs), score_record(merge_signals(sigs)[0])[0], score_record(merge_signals(sigs[:1])[0])[0])
# -> 2 1.2316 2.4633
EOF
```

**Fix**: `fcntl.flock` around append (single-host is fine here); de-dupe by `dedupe_key` inside `load_ledger_signals`; in scoring, skip (or key-uniquify) signals whose component key already exists.

#### M3. NaN confidence is clamped to 1.0 — maximum trust for garbage input

`schema._clamp01`: `max(0.0, min(1.0, nan))` → `min(1.0, nan)` returns `1.0` (NaN comparisons are False), so `max(0.0, 1.0)` = **1.0**. A malformed adapter emitting `confidence: NaN` (easy via `float("nan")` from a broken upstream parse — note `_common.build_signal`'s range check `not 0.0 <= confidence <= 1.0` also passes NaN through... no wait, NaN fails `0.0 <= nan` so build_signal raises; but raw-dict adapters bypass build_signal entirely) gets the **highest possible confidence** instead of the intended 0.5 default. Verified: `Signal.from_dict({... 'confidence': float('nan')}).confidence == 1.0`. Related: NaN/Infinity in `evidence` values serialize as `NaN`/`Infinity` in signals.jsonl — valid for Python's `json` but **invalid RFC-8259 JSON** (verified with `parse_constant`), so any non-Python consumer (jq, DuckDB, another agent) chokes on those rows. **Fix**: `if f != f: return default` in `_clamp01`; `json.dumps(..., allow_nan=False)` with a per-signal try/except (pairs with H1).

#### M4. Crash mid-append fuses two ledger rows into one unparseable line, silently losing a signal

`append_signal` writes `row + "\n"` in one buffered call; a crash (or full disk) can leave a partial line without a trailing newline. The **next** append then concatenates onto it: verified the file ends up with `{"dedupe_key": "src:g2", "ingested_at": "2026-07-01T00:0{"dedupe_key": "src:g3", ...}` on one line; `append_signal` returned True for g3 but `load_ledger_signals` recovers neither g2 nor g3, and both readers skip the fused line **silently** (by design). Self-heal is partial: both keys are absent so the next run re-appends *if upstream still serves them* — for rolling-window sources (RSS obituaries, l≤25) the crashed row can be permanently lost while the garbage line lingers forever. **Fix**: before appending, check the file's last byte and prepend `"\n"` if it isn't a newline (one `seek(-1, 2)`/read); optionally log a counter for skipped malformed rows instead of dropping them silently.

#### M5. Rate-convention mismatch between strategy_picker and subto at the 1.0 boundary; sub-1% rates parse as 90%+

`strategy_picker._rate_pct` treats values `< 1.0` as decimals (`0.0325 → 3.25%`), so `1.0 → 1.0%`. `subto._norm_rate`/`assumption._norm_rate` treat values `> 1.0` as percents, so **`1.0 → 100% annual`** and **`0.9` (a 0.9% teaser/ARM floor) → 90% annual**. Verified: for `loan_rate=1.0` the picker derives `rate_delta = 6.0` (deep below market → recommends sub-to and its `next_action` says "Run subto.analyze()"), and subto.analyze on the same dict computes a wrap P&I of **$24,166.67/mo** on a $290k note — the two modules read the same field with opposite conventions at the boundary the picker's own docstring advertises ("rates as 3.25, 0.0325"). **Fix**: extract one shared `_norm_rate` (finance.py is the natural home) with an explicit dead zone (reject/warn on 0.25–1.0) and identical boundary semantics everywhere.

#### M6. Underwater loans: assumption ranked #1 with a "bridgeable gap" reason that contradicts the numbers

`derive_facts` computes `equity_gap_pct = max(0, value − balance)/value`, so a **negative-equity** deal (value 300k, balance 350k → equity −16.7%) yields gap_pct = 0.0, and rule A2 fires: *"Equity gap <=15% of value: bridgeable with a normal down payment."* Verified: `pick({'value':300000,'loan_balance':350000,'loan_type':'va','loan_rate':2.5,'signals':['divorce']})` → recommendation **assumption**, score 8, reasons A1+A2+A3+A4 — no rule anywhere notes the assumer would be paying $50k above value to take the note. The rate delta might genuinely offset that (NPV question), but A2's stated reason is false as written and there's no negative-equity flag on the assumption path (subto at least has `over_leveraged_entry`). **Fix**: add an assumption DQ or warning rule for `equity_pct < 0`, and make A2 require `equity_pct >= 0`.

#### M7. In this repo's own environment, every real adapter silently fails to import — `cli.py run` "succeeds" on fixture data only

`adapters/_common.py` imports `requests`; `python3.11` here has no `requests` (verified: `ModuleNotFoundError`). `discover_adapters` swallows import errors per-module (stderr only) and the ingest summary simply omits the broken adapters rather than reporting them as errored — so `python3.11 cli.py run` exits 0 having ingested only `sample_fixtures`. Verified: `discover_adapters(...)` returns `['sample_fixtures']`. The 118-test suite never imports the real adapters, so it can't catch this. **Fix**: list import-failed adapters in `IngestResult` (name + error) so the summary shows them; pin a venv or vendor a stdlib `urllib` fallback in `_common.http_get`.

### LOW

#### L1. Scoring docstring overclaims: "two DISTINCT signal types always beat two copies of one type"

True like-for-like and true as `≥` under default weights, but cross-type it's a tie at the boundary: dup(pre_foreclosure×2, conf 1.0, fresh) = **4.5** = distinct(other + assumable_loan, conf 1.0, fresh) = 4.5 (verified). And `ScoringConfig.from_dict` accepts arbitrary weights/stack_bonus with no validation, under which the claim inverts. Reword the comment ("never loses to") or enforce `stack_bonus > max_weight × same_type_dampening` in `from_dict`.

#### L2. Subto playbook: "deed transfer (often to a land trust)" — keep, but add the Garn–St Germain caveat

The playbooks are legally careful overall (verified claims: FHA assumable-with-review post-Dec-1989 ✓ HUD 4000.1; VA 0.5% assumption funding fee ✓; entitlement tied up unless substituted by a veteran buyer ✓; due-on-sale framed as "lender MAY call" ✓; TCPA/DNC framing ✓; every doc carries a not-legal-advice banner ✓). One soft spot: step 3 of `playbooks/subto.md` mentions land trusts without noting that the 12 U.S.C. §1701j-3(d)(8) inter-vivos-trust exemption does **not** cover the investor sub-to pattern (it requires the borrower to remain beneficiary/occupant) — the land-trust "DOS workaround" is a common industry misconception, and an unqualified mention invites it. The module-level docstring's "virtually every post-1982 mortgage has a due-on-sale clause (Garn–St Germain)" is also slightly off (the Act made existing clauses *enforceable* by preempting state limits; it didn't put clauses into notes). Wording fixes only; severity low because the DOS risk flag is unconditional and correct.

#### L3. Obituary signals are 100% quarantined as shipped — the enrichment path they depend on doesn't exist yet

Verified: all 15 fixture obituary signals fail `problems()` ("property has neither address nor apn") and land in signals_pending.jsonl. This is documented and correct behavior, but nothing in the repo consumes the quarantine file, so the obituary adapter currently contributes zero signal at a cost of a daily fetch. Worth a README note or an `ENABLED = False` until the probate/assessor join exists.

---

## Part 3 — Direct answers to the six attack questions

1. **Hand-verify 3 computations**: all three **MATCHED** (Part 1). MAO = $160,000 exactly; amortization payment = $1,265.547661 matches the textbook formula to 3e−11; scoring components match hand arithmetic exactly (3.6 vs 6.0), invariant holds with a tie-not-beat boundary case (L1).

2. **Dedupe/ledger**: a malformed adapter cannot structurally corrupt existing rows (append-only, per-item try/except in `normalize_fetched` catches non-dicts and explosive payloads) — but it **can kill the rest of the run** via unserializable evidence keys (H1), and NaN/Infinity evidence produces non-standard JSON rows (M3). Concurrent runs violate dedupe and the resulting duplicate **halves** the score via a component-key collision (M2). Crash mid-append fuses two rows into one silently-skipped line; recovery depends on upstream still serving the record (M4).

3. **Address normalizer false-merges**: demonstrated two — same street/number in **different cities with missing zip** collapse to one key because city is never in the key (`addr:IL::100 MAIN ST`, M1), and **"1421 North St" ≡ "1421 N St"** (name-vs-lettered-street). Bonus: APN keys collide **across counties** in the same state (H4) — arguably the worse merge bug because APN wins over address. (The unit-number direction produces false *splits*, not merges: "APT 1" vs "# 1" get different keys.)

4. **Scoring gameability**: pure same-type obituaries at 0.2 can never reach WARM — the geometric dampening caps them at 2·(2.5·0.2) → sup 1.0, never attained (verified: 50 fresh obits = 0.9999 < 1.0 warm threshold; good design). **But** one low-quality source *can* mint HOT leads two ways, both verified: (a) emit a second, unknown signal_type (coerced to "other") — one source, two "distinct types," route=HOT at score 2.70; (b) piggyback on any stale signal already on the record — a fresh 0.2 obit + a score-0.0 2.5-year-old violation routes HOT at score 0.4981 (H2). Should it? No — hot is the product; it should require live, independently-sourced types and a score floor.

5. **strategy_picker contradiction**: found two. Missing `loan_balance` + caller-stated 10% equity → derived equity 100%, recommendation seller_finance, reason literally **"Free and clear … no underlying lien"** (H3). Underwater VA loan (equity −16.7%) → recommendation assumption with reason **"gap … bridgeable with a normal down payment"** (M6). Plus the cross-module rate-convention trap: picker reads `loan_rate=1.0` as 1% (rate_delta 6.0 → "run subto.analyze()"), subto reads the same value as 100% annual (M5).

6. **Playbooks**: no legally *wrong* claims found — FHA/VA/USDA assumption mechanics, funding fee, entitlement, DOS characterization, and timeline claims all check out, and the worked-example numbers reproduce exactly from the calculators. Two wording-level flags at LOW (L2): the unqualified land-trust mention (invites the DOS-workaround misconception) and the "post-1982 mortgages have DOS because Garn–St Germain" phrasing.

---

## Suggested fix order

1. H1 (per-signal try/except + evidence-key sanitization) — one poisoned upstream record must never kill a run.
2. H2 (live-types + score floor for HOT) — protects the product surface.
3. H3/M6 (balance_known; honor caller equity_pct; negative-equity rule) — stops actively-wrong recommendations.
4. H4/M1 (county in APN key; city in address key when zip missing) — merge integrity.
5. M2/M4 (flock + load-time dedupe + newline check) — ledger robustness.
6. M3/M5, then the LOW wording items.

*Review artifacts (attack scripts) live in the session scratchpad; every repro above is self-contained and runnable from the repo root with python3.11.*
