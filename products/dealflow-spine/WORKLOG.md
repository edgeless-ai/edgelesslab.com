# dealflow-spine — Worklog

The traceable record of what we build, why, and how it was verified. One entry
per work session, newest first. Commit hashes make each change findable no
matter what the branches are doing. Product state lives here; cross-session
memory lives in `project_ebre_cmco_real_estate` (auto-memory).

**What this product is:** the CMCO real-estate opportunity engine (Criteria →
Marketing/signals → Conversion/underwriting → Ops). Internal R&D, keyless/free
data only, no outreach, human-in-the-loop at money/legal acts. Runs offline on
fixtures by default; `cli.py run --live` enables the polite network path.

**How to verify the product at any time:**
```bash
python -m pytest -q          # full hermetic suite (offline, socket-guarded)
python cli.py run            # offline pipeline on fixtures -> data/digests/
python cli.py review         # ambiguous enrichments awaiting a human pick
```

---

## 2026-07-30 (overnight) — Denver/Mountain leg: first keyless distress feed
**Commit:** (this session) new `adapters/denver_health_complaints.py` +
`fixtures/adapters/denver_health_complaints_sample.json` +
`tests/test_denver_health.py` (+7)
**Why:** roadmap item #2 — the Mountain leg had geography (FEMA fires in CO) but
no per-property distress signal. The 2026-07-28 note concluded Denver needs a
real ArcGIS build (no Socrata). This is that build.
**Data hunt (≤3 probes, honest):** Denver AGOL org = `The City and County of
Denver` (services1.arcgis.com/zdB7qR0BtYrg0Xpl). Found + verified keyless
**Residential Health Complaints** FeatureServer (DDPHE) — 6956 per-property
habitability complaints with FULL_ADDRESS, INCIDENT_DATE, COMPLAINT_OUTCOME
(Founded/Unsubstantiated), status, OWNER_ENTITY_NAME, and an Accela case link.
**NEGATIVE logged:** Denver `ODC_PROP_PARCELS_A` exposes NO owner/mailing fields
publicly → no keyless Denver *absentee* signal (privacy), so Denver has no
stacking partner yet. Denver leads are WARM (single signal), not hot — expected.
**What (TDD — 7 tests first):** new `code_violation` adapter, anchored on ADDRESS
(no apn — same lesson as Seattle absentee) so a future 2nd Denver signal can
stack. Confidence by outcome (Founded 0.6 / Unsubstantiated 0.3 / else 0.45);
`_classify` flags owner-distress terms (vacant/mold/no heat/structural…) 🚩 vs
routine health_complaint. Address parser drops UNIT parts (units merge to one
building) and lifts the zip. Fixture = 14 real Founded records.
**Verified end-to-end (live):** reset + live run (Seattle code + KC absentee +
Denver) ingested 600 Denver signals → **90 warm CO leads** (Founded habitability
distress, real Denver addresses: 8000 E 12TH AVE, 1750 S FEDERAL BLVD…), 377
watch. Totals: 5223 candidates, 4 hot / 201 warm (was 111). 230 tests green (+7).
**Next lever for Denver HOT:** find a second distinct-typed Denver signal
(tax/foreclosure/absentee) — none keyless yet; parked.

---

## 2026-07-30 (overnight) — absentee pagination → full Seattle coverage, 1→4 hot
**Commit:** (this session) `adapters/kingcounty_absentee.py` `_fetch_live`
pagination + `tests/test_kingcounty_absentee.py` (+2)
**Why:** roadmap item #1. Absentee was a single 1000-row ArcGIS window, so most
out-of-state Seattle owners never entered the ledger and hot stacks were luck —
only 1 surfaced per bounded run despite 5 known code∩absentee overlaps.
**What (TDD — red first):** `_fetch_live` now walks `resultOffset` in 1000-row
pages up to an 8000-record politeness cap (`LIVE_LIMIT`), stopping on a short
page or when the service stops signalling `exceededTransferLimit`. Two new tests
pin the pagination walk (pages [0,1000,2000] → stop on short page) and the total
cap (stops at `limit` even when the service says more exist).
**Verified end-to-end (live):** paginated pull = **4234** out-of-state Seattle
owners (was 1000; top states CA 1601 / OR 252 / TX 235 / NY 156). Reset ledger +
live run (`--config config/buybox-west-mountain.json --only
portland_code_violations kingcounty_absentee`): **4 HOT stacks** (was 1), top =
5956 41ST AVE SW ("suspect house is vacant" + absentee, 4.38, 🚩) and 100 NE 58TH
ST ("house empty during construction" + absentee). 223 tests green (+2).
**Note:** overlap is now bounded by the code-violation side (600/run), not
absentee. Next levers: widen code-violation window, add a second West metro, and
the Denver/Mountain leg. Minor cosmetic: violation description concatenation can
mash ("vacantREFERENCE:") — clean in a later digest pass.

---

## 2026-07-29 — absentee-owner signal → FIRST HOT STACKS
**Commits:** (this session) new `adapters/kingcounty_absentee.py` + registration
across `_common.py` / `schema.py` / `scoring.py` + fixture + tests
**Why:** roadmap #2 — the engine only produced single-signal *warm* leads. The
EBRE thesis needs STACKING: 2+ reasons one owner sells. Absentee ownership is
the classic "spine."
**Data hunt:** King County publishes on ArcGIS (not Socrata). Verified keyless
layer `PARCEL_ADDRESS_PUB_AREA_3069` — situs address (ADDR_*) + taxpayer mailing
(KCTP_*). No owner NAME (privacy), so it's a location signal, not a name
resolver — which is *better* (no probate detour). Tax-delinquency (the other
path) is NOT keyless (behind the eReal Property search app).
**What:** new `absentee_owner` signal — Seattle residential parcels whose
taxpayer mails out of state (KCTP_STATE≠WA, conf 0.65). Fixture = 12 real
records. Weight 1.3. Stacks with `code_violation` on the same parcel → hot.
**Two integration bugs found + fixed (this is why you verify end-to-end):**
1. `absentee_owner` coerced to "other" — `schema.py` has its OWN `SIGNAL_TYPES`
   set separate from the adapter's `VALID_SIGNAL_TYPES`; registered in BOTH now
   (+ scoring weights = 3 places a new type must be added).
2. Feeds never merged: absentee keyed on `apn:` (PIN), code-violations on
   `addr:` — "APN wins" split the same property into 2 keys. Fixed: absentee
   anchors on ADDRESS (PIN → evidence), matching the address-only code feed.
   Also widened code-violation defaults (30d/200 → 90d/600) so a single run has
   enough addresses to overlap.
**Verified:** 221 tests (+5 absentee, +count updates). Cross-reference proved 5
Seattle properties are BOTH code-violation AND absentee-owned (owners in
Portland/Sunnyvale/Boynton Beach/Honolulu/Newark). Live pipeline surfaced the
**first 🔥 HOT stack: 6555 25TH AVE NE, Seattle** (code violation + owner in
Boynton Beach FL, score 3.80). More accrue as the weekly ledger accumulates.
**Note:** absentee is a STANDING list (LIVE_LIMIT 1000, ArcGIS single-call max);
full coverage = paginate resultOffset (future). (roadmap #2 done)

---

## 2026-07-29 — distress scoring: owner-distress vs tenant disputes
**Commit:** (this session) `adapters/portland_code_violations.py` + `tests/test_code_violations.py`
**Why:** the 🚩 was meaningless — a naive keyword match flagged "Emergency,
LandLord/Tenant — 3 day notice" (a tenant gripe) as owner distress, because the
Seattle record-type vocab ("Emergency"/"Housing") over-fires.
**What:** `_classify(desc)` → 3 tiers: **owner_distress** (vacant/fire/flood/
condemned/derelict/structural/boarded → conf 0.8, 🚩), **tenant_dispute**
(landlord/tenant/lease/rent/eviction/notice → conf 0.4, no flag), **other**
(→ 0.5). Owner-distress checked first so "vacant building with a tenant" is
distress. Since score = weight × confidence × decay, owner-distress now ranks
~2× a tenant dispute. `evidence.distress_tier` added for transparency.
**Verified:** 216 tests (+11 classifier). Fresh live run: owner_distress 36 /
tenant_dispute 61 / other 103; warm list now leads with vacant buildings,
severe structural faults, flooding — not "3 day notice."
**⚠ Operational gotcha (learned here):** the signal ledger
(`data/signals.jsonl`) is append-only + idempotent by `source:id`, so **changing
classification logic does NOT reclassify already-ledgered signals** — same
`recordnum` → same id → dedupe skips the re-write. To apply a logic change you
must rebuild the ledger (`mv data/signals.jsonl{,.bak}` then `cli.py run`).
Candidate count drops after a rebuild (single run vs accumulated) — expected.
**Follow-through:** added `cli.py reset` — backs up + clears ledger/pending so
`run` rebuilds and reclassifies in one command (no manual mv). (roadmap #1 done)

---

## 2026-07-28 — actionable digest (readable output)
**Commit:** (this session) `spine/route.py` render_digest rewrite
**Why:** the digest was 617 near-identical "code_violation | as-is cash offer"
rows — a wall, not something to act on. It threw away the fields that make a
lead real: violation category, description, status, stacked-complaint count,
and the case link.
**What:** each row now shows the actual complaint (category — description
(status)), a 🚩 flag when any signal is real distress (vacant/unfit/fire/etc.),
the stacked-complaint count, and links the address to its Seattle case. Rows
sort distress-first; warm/watch/discard capped (40/20/15) so a live run stays
scannable. Header shows the distress-flagged count.
**Verified:** 205 tests still pass. Live West run: 617 warm, **189
distress-flagged**, surfacing real leads — vacant buildings, fire/water damage,
"waiting for sale escrow to new owner", "sold about a year ago". Pipe/newline
sanitized so complaint text can't break the table.
**Nuance for later:** many warm rows are landlord/tenant *complaints* (a tenant
griping), not owner-sell distress. Vacant/condemned/fire/damage are the real
owner-distress signals; a future scoring pass should weight those above tenant
disputes. Recorded, not yet done.

---

## 2026-07-28 — enrichment follow-ons + West/Mountain pivot
**Commits:** `da0aa52b9` (adapter + review flow), `13214f2cf` (West buy-box)
**Branch:** `dealflow/enrichment-followons` (local; not merged — trace is by hash, not branch)

- **Assumable adapter aimed at gov-dense boroughs.** Was Queens-only (~0.10
  confidence). Live-probed 2020 HMDA gov-loan shares: Bronx 15.4% > Queens 8.5%
  > Brooklyn 4.9% > Manhattan 0.1%. New default = Bronx + Queens
  (`DEFAULT_BOROUGHS`). Brooklyn excluded — it's *below* the old default, so it
  would deflate the posterior, not sharpen it (corrects the task's hunch).
- **Ambiguous-review flow** (`spine/review.py` + `cli.py review`). Ambiguous
  enrichments used to park candidate parcels and sit forever. Now: list → pick
  → re-ingest through the same append an auto-resolve uses (idempotent,
  name-match cap held, `human_pick` provenance).
- **West Coast + Mountain buy-box** (`config/buybox-west-mountain.json`):
  Portland OR + Seattle WA + Denver CO.

**Verified:** 205 tests pass (+11). Bounded `--live` West run surfaced ~818
WA candidates (real Seattle SDCI code violations + FEMA), routed warm/watch.

**Signal readiness (West/Mountain):**
- ✅ **Seattle** — live NOW, keyless (`portland_code_violations.py` defaults to
  SDCI Socrata `ez4a-iug7`). No build needed; already producing candidates.
- ✅ **FEMA** — national, in-box (wildfire/flood).
- ⏳ **Portland** — needs the free PortlandMaps API key (a login → David's
  signup; kanban `t_fe8ddebb`). Drop-in fixture until then.
- ❌ **Mountain distress signal** — decided after a time-boxed Socrata sweep:
  NO Mountain metro exposes a clean keyless per-property distress feed. Denver,
  Boulder, Albuquerque are ArcGIS (no Socrata catalog); Utah's catalog only
  leaked federated Seattle datasets. So the Mountain leg's *second* signal
  requires building an **ArcGIS code-violation adapter** (a real build, not a
  probe). Meanwhile FEMA already fires in Mountain states nationally (wildfire
  is heavy in CO/UT/AZ/NM), so the geography isn't dark — it just lacks a
  stacking partner. Open decision below.

**Decision / next increment (2026-07-28):** the West buy-box produces ~818
single-signal *warm* Seattle leads but few *hot* (2+ stacked) ones, because West
Coast has ~1.x usable signals. Highest product value = a **second signal in the
target geo** so properties stack to high-conviction: options are (1) a King
County / WA tax-delinquency or foreclosure feed for Seattle, (2) an ArcGIS
code-violation adapter for Denver (Mountain unlock), (3) making the current warm
output into a readable digest David can act on. Awaiting direction.

**Kanban:** `t_4814d24b` DONE. Parked/David-gated: `t_fe8ddebb` (Portland key),
`t_c824060b` (metro choice → answered: West/Mountain).

---

## 2026-07-04 — Phase 1 + 2 (pre-worklog; reconstructed from git + memory)
**Commits:** `c414014c` (CMCO engine: spine + adapters + underwriting, 150 tests),
`ff22f77c` (integration + adversarial review + hardening), `fda30124`
(enrichment stage + review closeout + weekly ops, 194 tests).

Signals (FEMA / tax-delinquent / obituary / assumable / code-violation) →
idempotent ledger → merge → buy-box (2+ signal rule) → explainable scoring →
hot/warm/watch/discard → 24-rule strategy picker → daily digest. Enrichment
stage resolves address-less signals against parcel resolvers. Weekly ops loop:
launchd `com.edgeless.dealflow-weekly` Mon 09:00 → live run → Telegram digest.
Deed-data survey (`docs/deed-data-sources.md`): no keyless source pairs loan
program with parcel; ACRIS × HMDA join is the live assumable path.
