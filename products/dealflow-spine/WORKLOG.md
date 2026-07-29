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
