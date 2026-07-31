# Dealflow overnight build-out — 2026-07-30 → 2026-07-31

Autonomous ~3.5-hour run on `products/dealflow-spine` (branch
`dealflow/enrichment-followons`, local only, never pushed). Bilevel decision
discipline + TDD + telemetry. Every increment was live-verified end-to-end, not
just unit-tested.

## Headline

**Verified hot-deal flow: 4 → 116 hot stacks, across TWO hot-producing metros.**
A "hot" lead is one property carrying two distinct stacked distress signals in
the buy-box (a code violation AND an out-of-state absentee owner) above the score
floor: the highest-conviction "this owner is likely to sell" leads.

- **Seattle (King County): 98 hot** — SDCI code violations x King absentee owners.
- **Tacoma (Pierce County): 18 hot** — Tacoma code violations x Pierce absentee.
- 1953 warm (single-signal, in-box), 20496 evaluated, 255 tests green.
- Eyeball the leads: `open products/dealflow-spine/data/digest-latest.html`
  (distress-first tables, owner mailing shown, live case links).

Top leads are textbook: 6621 FAUNTLEROY WAY SW Seattle (vacant building + owner
in VA, 5.44); 2401 66TH AVE NE Tacoma (Substandard Building + owner in AZ, 4.81).

## What shipped (each live-verified, committed by hash)

| # | Increment | Hot | Commit |
|---|-----------|----:|--------|
| 1 | Absentee pagination -> full Seattle out-of-state coverage (1000 -> 4234) | 4 | `563e330bb` |
| 2 | Denver / Mountain leg -> keyless residential-health distress feed (90 warm) | 4 | `a6549e932` |
| 3 | Widen Seattle code window (600 -> 5991) | 66 | `a193af1ce` |
| 4 | Local HTML digest (eyeball view) | 66 | `7fa3f768f` |
| 5 | Adversarial review + hardening (validated 66 hot real; PIN-dedupe; un-glue) | 66 | `b606ccfc7` |
| 6 | Seattle 180d window (measured overlap 99->142 first) | 98 | `12dfd6538` |
| 7 | West Sacramento probe -> built, verified watch-tier, SHELVED | 98 | `bdcb51446` |
| 8 | Tacoma metro pt.1 -> keyless dated code feed (99 warm) | 98 | `c8183a4b5` |
| 9 | Tacoma metro pt.2 -> Pierce absentee, SECOND hot metro | 116 | `5b9c93008` |

## New / changed adapters (all keyless, R&D only)

- `kingcounty_absentee.py` — paginated (resultOffset + PIN-dedupe guard), 4234
  out-of-state Seattle owners.
- `denver_health_complaints.py` — Denver DDPHE residential-health complaints
  (ArcGIS, keyless), 90 warm CO leads.
- `portland_code_violations.py` (Seattle default) — window widened to 180d /
  limit 12000 (half-life 180d makes these still score).
- `tacoma_code_violations.py` — Tacoma NCS code violations (ArcGIS), APN-anchored.
- `pierce_absentee.py` — Pierce County out-of-state residential owners, APN-anchored, paginated.
- `westsac_code_enforcement.py` — built + tested but `ENABLED=False` (watch-tier only).

## Two reusable templates

1. **Address-anchor** (Seattle): the code feed is address-only, so absentee drops
   its APN and both anchor on `addr:STATE:zip:street`. Requires matching zips.
2. **APN-merge** (Tacoma): both feeds carry the same parcel number, so both anchor
   on `apn:STATE:COUNTY:pin` — an exact merge, no address/zip matching. This is
   the cleaner pattern and the template for any new metro where a parcel-numbered
   code feed meets a taxpayer-mailing parcel layer. WA counties reliably publish
   taxpayer mailing (King + Pierce both did).

## Honest negatives (logged, not forced)

- **SF (DataSF)** — catalog lists Building Violations / DOB Complaints but the
  SODA endpoints are dead (`{"error":true,"message":"Not found"}`).
- **Out-of-county absentee (King)** — no clean keyless King County boundary; live
  data disproved the naive zip/city heuristic (Duvall/Skykomish/Bothell edges).
- **Probate via parcel** — owner names are not published; the KCTP_ATTN care-of
  line is 3% populated and "%ESTATE%" is dominated by "REAL ESTATE" company noise.
- **West Sacramento** — real keyless feed but single-signal + no complaint detail
  and long-running cases decay below the warm floor (watch-tier). Shelved.
- **Snohomish / Everett (3rd metro)** — no keyless code-enforcement feed exists;
  statewide parcel layer has situs only (no mailing). Both halves failed.

## Guardrails held all night

Keyless/public data only; keyless verified with a live probe before every build;
no source stubbed or faked; no outreach; commits to the local branch only, never
pushed to the public origin; the ledger rebuilt (`cli.py reset`) after every
classification change; a new signal type registered in all three registries.

## DAVID-GATED / next steps (not done autonomously)

- **Portland** — needs the free PortlandMaps API key (a login, kanban
  `t_fe8ddebb`). Drop-in fixture is in place; flip to live once the key exists.
- **More metros via the APN template** — repeat Tacoma for any county with a
  parcel-numbered keyless code feed + taxpayer-mailing parcel layer. WA counties
  are the best bet; Snohomish lacks the code feed (see negatives).
- **Push / PR** — all work is local on `dealflow/enrichment-followons`; your call
  whether/when to push (origin is the PUBLIC repo, so probably keep it local or
  route to the private ops remote).

## How to run / verify

```bash
cd products/dealflow-spine
python -m pytest -q                                              # 255 tests, offline
python cli.py --config config/buybox-west-mountain.json reset    # rebuild ledger
DEALFLOW_LIVE=1 python cli.py --config config/buybox-west-mountain.json run --live
open data/digest-latest.html                                     # eyeball the leads
```

Trace: `WORKLOG.md` (reasoning + verification per increment, newest first) and
`telemetry/overnight-2026-07-30.jsonl` (metrics per checkpoint).
