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

## 2026-07-31 (overnight) — item #6d: Tacoma metro pt.2 → SECOND hot metro (+18 hot)
**Commit:** (this session) new `adapters/pierce_absentee.py` + fixture +
`tests/test_pierce_absentee.py` (7).
**Why:** the payoff for pt.1 — add the absentee spine so Tacoma parcels stack
into hot leads (Seattle's pattern, replicated).
**What (TDD, 7 tests):** Pierce County absentee adapter, `absentee_owner`,
**APN-anchored** on the 10-digit TaxParcelNumber (so it merges EXACTLY with the
APN-anchored tacoma_code_violations — no address/zip matching). Out-of-state
residential only (City_State not ending ", WA"; SINGLE FAMILY / OTHER
RESIDENTIAL). Paginated via resultOffset with the PIN-dedupe guard (same as
King). confidence 0.65.
**Verified end-to-end (live) — IT WORKS:** ingested 8298 out-of-state Pierce
owners; reset + live run → total HOT **98 → 116 (+18 Tacoma stacks)**, all clean
2-type `code_violation+absentee_owner` on `apn:WA:PIERCE:*`, 0 malformed. Top
Tacoma hot: 2401 66TH AVE NE (Substandard Building + owner in AZ, 4.81); also
Derelict Building + owner in TN, Nuisance + CA/AZ. 255 tests green (+7).
**This is a SECOND hot-producing metro.** Engine now surfaces 116 hot leads
across Seattle (98) + Tacoma (18), all real distress + out-of-state-owner stacks.
The APN-merge design (vs Seattle's address-anchoring) is the reusable template
for any county publishing both a parcel-numbered code feed and taxpayer mailing.
As the weekly ledger accumulates more Tacoma code cases, Tacoma hot grows.

---

## 2026-07-31 (overnight) — item #6c: Tacoma metro pt.1 → distress feed (99 warm)
**Commit:** (this session) new `adapters/tacoma_code_violations.py` + fixture +
`tests/test_tacoma_code.py` (7) + buy-box adds TACOMA/PIERCE.
**Why:** the ONE high-value Option-A shot — a SECOND hot-producing metro. Tacoma
is the target because it pairs two keyless feeds that stack like Seattle's:
1. City of Tacoma NCS "Code Violations" (this feed — ArcGIS, 23137 dated cases:
   Derelict/Substandard Building, Nuisance, Health & Sanitation),
2. Pierce County Tax Parcels (taxpayer mailing — 16994 out-of-state absentee
   owners, verified live). Built next cycle.
**Both verified keyless in-budget, AND both carry the SAME 10-digit Pierce
parcel number** (code `parcelnumber` 4715012641 ↔ parcel `TaxParcelNumber`
0019012000), so this metro anchors on **APN** (not address like Seattle) — an
exact parcel merge with the absentee feed, no zip/city matching.
**What (TDD, 7 tests):** Tacoma `code_violation` adapter, APN-anchored,
casetype classifier (Derelict/Substandard/vacant → owner_distress 0.8 🚩; else
0.5). Recent-first (opendate DESC). county=PIERCE, city=TACOMA. Buy-box gains
TACOMA/PIERCE.
**Verified end-to-end (live):** ingested 1000 recent Tacoma cases → **99 WARM
leads** (Derelict Building distress, real Tacoma addresses, top 2.82) + 808
watch. Clears the actionable bar West Sac failed (recent-dated + distress
granularity + weight-2.0). Hot unchanged at 98 (absentee is next cycle). 248
tests green (+7).
**Note:** ArcGIS single-request cap = 1000, so live pull is the 1000 most-recent
(not the 2000 default); paginate later if fuller coverage is wanted.
**NEXT (pt.2):** Pierce absentee adapter (APN-anchored, out-of-state, paginated)
→ Tacoma hot stacks (Derelict Building + out-of-state owner).

---

## 2026-07-31 (overnight) — item #6b: West Sacramento probe → built, shelved
**Commit:** (this session) new `adapters/westsac_code_enforcement.py` (ENABLED=
False) + fixture + `tests/test_westsac_code.py` (7). Buy-box unchanged (CA add
reverted).
**Why:** roadmap item #6 — probe one more keyless West Coast metro. Sacramento
proper isn't cleanly keyless (ArcGIS Hub, no clear city code feed), but West
Sacramento publishes Code Enforcement on a keyless ArcGIS FeatureServer (15107
records, verified live: CaseNumber/Address/Type/DateOpened/Status/Parcel).
**Built it (TDD, 7 tests) — then VERIFIED it doesn't earn a place, honestly:**
live end-to-end, West Sac produced **0 warm / 0 hot** — only 63 watch + 129
discard. Two structural reasons, both real (not fixable without dishonesty):
1. Single-signal — no keyless West-Sac stacking partner exists, so it can never
   mint a hot stack.
2. Low-signal — `Type` is uniformly "ENFORCEMENT" (no complaint detail → no
   honest distress flag), and its "open" cases are long-running, so recency
   decay pushes even active enforcement below the warm floor (max live score
   ~0.30 vs Denver's 0.6 warm leads). Filtering to non-CLOSED didn't rescue it.
**Decision:** it fails the actionable-leads bar Denver clears (90 warm), so it's
`ENABLED=False` — kept as a ready drop-in (code + tests + fixture) but excluded
from the default pipeline (a test pins this). No pipeline change: still 98 hot.
The lesson for future metros: a warm-producing feed needs recent-dated events
(Seattle/Denver) or a second signal; a bare long-running case list is watch-tier.
**Verified:** 241 tests green (+7); `discover_adapters` confirms West Sac is
excluded; hot/warm unchanged (98/1848).

---

## 2026-07-31 (overnight) — item #6a: 180d Seattle window → 66→98 HOT
**Commit:** (this session) `adapters/portland_code_violations.py` defaults
(days 90→180, limit 8000→12000) + `tests/test_code_violations.py` guard
**Why:** roadmap item #6, highest reliable hot-flow lever. Scoring half-life is
180d and max-age 730d, so a 180-day violation still scores (decay ~0.5), and the
absentee set (4234) already covers all out-of-state owners — more violation
history = more overlap = more hot.
**Grounded the decision in live data first (not a guess):** measured
absentee∩violation address overlap at 90d = 99 vs 180d = **142** (+43%), so the
wider window was worth the permanent volume.
**What (TDD — red first):** Seattle `fetch` defaults now days=180, limit=12000
(covers the ~10.5k violations in 180d in one polite Socrata request/day). Guard
test locks days>=180 and limit>=10000.
**Verified end-to-end (live):** reset + live run ingested **10551** violations
(was 5991) + 4234 absentee → **98 HOT stacks (was 66)**, all
`absentee_owner+code_violation`, 0 malformed. Warm 1267→1848. 234 tests green.
**TWO extension NEGATIVES logged (KC parcel layer, ≤3 probes each):**
- *out-of-COUNTY absentee tier* deferred: no clean keyless King County boundary.
  Live data disproved the naive heuristic ("DUVALL WA"/98019 looks out-of-Seattle
  but IS King County; Snohomish 982xx zips straddle the range). Deriving the zip
  set from the parcel layer truncated at 21 (capped scan), not the full ~80.
  Needs an authoritative KC zip/boundary source before it's trustworthy.
- *probate via KCTP_ATTN* dead: owner names aren't published (KCTP_ATTN is a 3%-
  populated care-of line). "%ESTATE%" returns 15 rows, ~14 are "REAL ESTATE"
  company care-of noise; exactly 1 true "ESTATE OF". Not a signal.

---

## 2026-07-30 (overnight) — item #5: adversarial review + hardening
**Commit:** (this session) `adapters/kingcounty_absentee.py` (pagination dedupe
guard) + `spine/route.py` (`_lead_detail` un-glue) + tests (+2)
**Why:** roadmap item #5 — before extending, harden what's live and prove the 66
hot stacks are real, not a merge/scoring artifact.
**Validated the 66 hot stacks (read-only):** all 66 carry BOTH an
`absentee_owner` and a `code_violation` signal, all address-keyed, 0 with an
in-state owner. Spot-checks confirmed genuine same-address merges with real
out-of-state owners: 6621 FAUNTLEROY WAY SW = Vacant Building + owner in VA;
2657 39TH AVE SW = Vacant Building + owner in PR; 901 SW HOLDEN ST + owner in NC.
Not inflated.
**Two hardening fixes (TDD — red first):**
1. **Absentee pagination dedupe guard.** Some ArcGIS layers silently ignore
   `resultOffset` and re-serve the same window every page — that would inflate
   the ledger with duplicate PINs and loop to the cap. `_fetch_live` now dedupes
   by PIN and stops once a page adds nothing new. (KC honors offset — live
   dupes=0 — so this is belt-and-suspenders against a future service change.)
2. **Digest un-glue.** Seattle SDCI descriptions sometimes mash two words
   ("...vacantREFERENCE:"). `_lead_detail` now inserts a space at a
   lowercase→UPPERCASE-run boundary (won't split normal CamelCase).
**Verified end-to-end (live):** reset + live run unchanged where it should be —
absentee still 4234 (dupes 0), 66 hot / 1267 warm; digest now reads "vacant
REFERENCE". 234 tests green (+2).

---

## 2026-07-30 (overnight) — HTML digest (eyeball view for David)
**Commit:** (this session) `spine/route.py` (`render_digest_html` +
`_lead_detail` shared helper + `write_digest` emits HTML) +
`tests/test_route.py` (+2)
**Why:** roadmap item #4 — David asked for a way to *eyeball* leads, not read a
617-row markdown wall. Now that there are 66 real hot stacks, a scannable view
earns its keep.
**What (TDD):** `write_digest` now also emits `data/digest-latest.html` — a
self-contained, theme-aware (light/dark) single-file HTML: count pills, then
Hot / Warm / Watch tables sorted distress-first, each row = score · 🚩 · address
(→ live case link) · why · **owner + mailing** (the absentee tell, e.g. "owner
in Boynton Beach FL") · stacked cases · underwrite verdict (hot). Factored the
markdown renderer's lead-extraction into a shared `_lead_detail` (DRY, byte-for-
byte identical markdown output). All output HTML-escaped (a `<script>` in a
complaint description renders as text, tested).
**LOCAL ONLY — not published:** these are real property/owner leads (R&D), so
the HTML is a local file, never an Artifact. `data/` is gitignored (regenerated
each run); the renderer is the committed artifact.
**Verified:** 232 tests green (+2, incl. an escaping test). Regenerated from the
live 66-hot candidate set → 100 KB, 66 hot rows, valid doctype. Open with
`open products/dealflow-spine/data/digest-latest.html`.

---

## 2026-07-30 (overnight) — widen Seattle code window → 4→66 HOT stacks
**Commit:** (this session) `adapters/portland_code_violations.py` default limit
600→8000 + `tests/test_code_violations.py` limit-threading guard (+1)
**Why:** the north star is HOT flow, and hot = stacking. Seattle is the only
metro with two stacking signals (code_violation + absentee_owner). Absentee was
already full (4234), but the code side was capped at **600 of ~5991** Seattle
violations/90d — so we saw only ~10% of the possible overlap. This cap was the
binding constraint on hot flow.
**What (TDD — red first):** raised the Seattle `fetch` default limit to 8000
(covers the full 90-day window; single polite Socrata request, daily poll). New
guard test pins that the window+limit thread into the `$where`/`$limit` params
and that the default stays hot-flow-sized (>=6000), so it can't silently
regress to a tiny cap.
**Verified end-to-end (live):** reset + live run ingested **5991** Seattle
violations (was 600) + 4234 absentee. Result: **66 HOT stacks (was 4)** —
100% `absentee_owner + code_violation`, 0 malformed, top 5.38 (6621 FAUNTLEROY
WAY SW / 2657 39TH AVE SW / 901 SW HOLDEN ST). Warm 201→1267. 231 tests green.
**SF NEGATIVE logged (item #3, ≤3 probes):** DataSF catalog lists Building
Violations (`22u3-xenr`) + DOB Complaints (`eabe-havv`) but both SODA endpoints
return `{"error":true,"message":"Not found"}` — migrated/retired. Skipped per
the no-rabbit-hole rail. Sacramento/Oakland not probed (same dead-endpoint risk);
the higher-value move was maximizing Seattle's existing two-signal stack.

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
