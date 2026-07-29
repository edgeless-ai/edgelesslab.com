# Dealflow Spine — Deed / Mortgage Recording Data Sources (Assumable-Loan Heuristic)

R&D survey, live-probed 2026-07-04. Public/free sources only; keyless required.
Every probe below was run with `curl` + UA
`dealflow-spine-rnd/0.1 (internal R&D; contact: ops@edgelesslab.com)`, ≥1s between
requests per host. Raw samples saved to `fixtures/adapters/probes/`.

## What the assumable heuristic needs

`adapters/assumable_heuristic.py` wants recorded deed-of-trust / mortgage records with:

| # | Field | Why |
|---|---|---|
| a | **loan program** (FHA/VA/USDA vs conventional) | only gov-backed loans are assumable |
| b | **origination/recording date** (2019-01-01..2021-12-31) | the low-rate cohort |
| c | **loan amount** | deal sizing + rate-delta economics |
| d | **parcel-level location** (address or APN) | it's an acquisition signal, not a market stat |

**The headline finding, stated plainly: no keyless source delivers (a)+(d) together.**
The FHA/VA program marker lives in riders and case numbers **on the document
images**, never in recorder *indexes*. Every structured index we probed (NYC,
Philly, Denton TX) has doc types like MTGE / MORTGAGE / DEED OF TRUST with zero
program breakdown. The program signal exists keylessly only in federal loan-level
datasets (HMDA, HUD, Ginnie Mae) which stop at census-tract / ZIP / state
geography. So the adapter's live path is necessarily a **join**: recorder index
(parcel + date + amount) × federal program data (program density / program-certain
loans at tract/ZIP level).

## Verdict table

| Source | Coverage | Program field? | Parcel-level? | Loan amount? | Keyless? | Verdict |
|---|---|---|---|---|---|---|
| NYC ACRIS (Socrata) | NYC 5 boroughs, 1966→now | ❌ (doc types only) | ✅ BBL + street addr (Legals join) | ✅ `document_amt` | ✅ | **usable-now** (program must be inferred) |
| Philadelphia Carto `rtt_summary` | Philadelphia, 1999→now | ❌ | ✅ OPA # + addr + geom | ❌ (null/0 on mortgages) | ✅ | **partial** |
| Cook County IL recorder (Socrata) | 2011 – Mar 2015 only | ❌ | — | ✅ (2011-15 only) | ✅ | **dead-end** (no 2019-21 coverage) |
| publicsearch.us portals (Denton TX probed) | many TX/OK/+ counties | ❌ (doc-type vocab has none) | ✅ in UI | ❌ in index | ⚠️ captcha-gated API | **dead-end** (bot-gated) |
| HMDA data-browser API / LAR (ffiec.cfpb.gov) | national, 2018→now | ✅ `loan_type` 2=FHA 3=VA 4=USDA | ❌ census tract | ✅ + **interest_rate** | ✅ | **partial** (no parcel — the program-inference layer) |
| HUD FHA SF Portfolio Snapshot | national FHA, monthly | ✅ (FHA by definition) | ❌ ZIP/city/county | ✅ + **interest rate** | ✅ | **partial** (no parcel; FHA only) |
| Ginnie Mae loan-level disclosure | national FHA/VA/RD MBS | ✅ agency flag F/V/R | ❌ state/MSA | ✅ + rate | ❌ free-registration login | **key-gated** |
| Franklin County OH auditor FTP | Franklin Co, daily | ❌ | ✅ parcel + addr | sale price (not loan) | ✅ | **partial** (no financing-type field) |
| Wake County NC data files | Wake Co | ❌ | ✅ | sale price (not loan) | ✅ | **partial** (no financing-type field) |
| Miami-Dade / Broward / Maricopa recorders | — | ❌ | — | — | ❌ search-portal / 403 / paid bulk | **dead-end / paid** |

---

## 1. NYC ACRIS (Socrata) — LIVE-VERIFIED ✅ (keyless) — best structured recorder index found

**Real Property Master** (`bnx9-e6tj`) + **Real Property Legals** (`8h5j-fqxa`), joined on `document_id`.

- **Sample queries (reproducible):**
  ```
  curl -s -H "User-Agent: dealflow-spine-rnd/0.1 (...)" \
    "https://data.cityofnewyork.us/resource/bnx9-e6tj.json?\$where=doc_type='MTGE' AND recorded_datetime between '2020-06-01T00:00:00' and '2020-06-03T00:00:00'&\$limit=3"
  curl -s "https://data.cityofnewyork.us/resource/8h5j-fqxa.json?document_id=2020050400526001"
  ```
- **Master fields observed:** `document_id, crfn, recorded_borough, doc_type, document_date, document_amt, recorded_datetime, good_through_date` — ✅ date, ✅ amount.
- **Legals fields observed:** `document_id, borough, block, lot` (= BBL, joins to PLUTO), `property_type, street_number, street_name` — ✅ parcel-level.
- **Program check (honest negative):** enumerated all live doc types via
  `$select=doc_type,count(*)&$group=doc_type` — 4.2M `MTGE`, 3.6M `DEED`, plus SAT/ASST/AGMT/etc. **Nothing FHA/VA-specific** (`VAC` = vacate order, not VA). The doc-type control-codes dataset (`7isb-wh4c`) currently publishes **blank `doc__type`/`doc__type_description` columns** (verified via CSV export) — only class descriptions survive, none program-related.
- **Cadence:** rolling updates; rows carry `good_through_date` (monthly refresh watermark).
- **Extras:** ACRIS Parties (`636b-3b5g`) gives borrower/lender names per document — lender-name priors (e.g., known FHA-heavy originators) are a weak secondary program hint.
- **Caveats:** NYC is a low-FHA/VA market by national standards, and NY uses mortgages (not deeds of trust). Fine for proving the live adapter path; wrong market to hunt assumables at scale.
- **Coverage correction (live-verified during integration, 2026-07-04):** ACRIS covers **boroughs 1-4 only** — `$select=recorded_borough,count(*)&$group=recorded_borough` on MTGE rows returns 1..4. Staten Island (Richmond County) records with its own County Clerk and is absent, so "NYC 5 boroughs" above overstates it. The adapter defaults to Queens (borough 4), the most FHA/VA-dense borough ACRIS actually has.
- **Verdict: usable-now** — the only keyless source probed that feeds the adapter's fixture shape (instrument id, recorded date, amount, parcel) from a live API. `loan_program` must be inferred (see recommendation).

Samples: `fixtures/adapters/probes/acris_master_2020_sample.json`, `acris_legals_sample.json`, `acris_doc_type_counts.json`, `acris_doc_codes.csv`.

## 2. Philadelphia Carto `rtt_summary` — LIVE-VERIFIED ✅ (keyless) — parcel yes, amount no

- **Sample queries:**
  ```
  curl -s "https://phl.carto.com/api/v2/sql" --data-urlencode \
    "q=SELECT DISTINCT document_type FROM rtt_summary ORDER BY document_type"
  curl -s "https://phl.carto.com/api/v2/sql" --data-urlencode \
    "q=SELECT * FROM rtt_summary WHERE document_type='MORTGAGE' AND recording_date BETWEEN '2020-06-01' AND '2020-06-30' LIMIT 3"
  ```
- **Doc types (36 total):** MORTGAGE, DEED, SHERIFF'S DEED, ASSIGNMENT OF MORTGAGE, SATISFACTION, … — **no FHA/VA variant**.
- **Fields observed on MORTGAGE rows:** `recording_date, street_address, zip_code, opa_account_num` (parcel), `the_geom` (point), `grantors` (borrower), `grantees` (**lender name**), `document_id, record_id`.
- **⚠ Loan amount is effectively absent:** `total_consideration`/`cash_consideration` are populated on ~90% of 2019-21 MORTGAGE rows **but the value is 0** — only **15 of 154,227** mortgages in the window have a nonzero amount (verified by count query). RTT consideration fields are for taxable transfers; mortgages aren't RTT-taxed.
- **Volume check:** 154,227 MORTGAGE recordings 2019-01-01..2021-12-31 — a real vintage corpus.
- **Verdict: partial** — keyless, parcel-level, dated, lender-named, but no amount and no program. Usable as a *candidate-parcel* feed if amount is sourced elsewhere (HMDA match).

Samples: `probes/phl_rtt_doctypes.json`, `phl_rtt_mortgage_sample.json`, `phl_rtt_mortgage_amounts.json`.

## 3. Cook County IL recorder (Socrata) — dead-end for the vintage ❌

- **Sample query:**
  `curl -s "https://api.us.socrata.com/api/catalog/v1?domains=datacatalog.cookcountyil.gov&q=mortgage&limit=10"`
- **Finding:** all recorder datasets are historical dumps — "Mortgages 2011 Complete", "2012 Jan–Nov", "Foreclosures, Mortgages, and Quit Claim Deeds — 2013 through **March 27, 2015**". The recorder's open-data feed died in 2015 (office later merged into the County Clerk). Nothing covers 2019-2021.
- **Verdict: dead-end** (keyless but a decade stale). The clerk's live search (crs.cookcountyclerkil.gov) is a per-document search portal, not an API.

Samples: `probes/cook_catalog_mortgage.json`, `cook_catalog_deed.json`.

## 4. publicsearch.us county portals (Denton TX probed) — bot-gated ❌

- **Probes:** `GET /api/docTypes` and `GET /api/search?...` → **404** (guessed SPA routes don't exist server-side). `GET /results?department=RP&searchType=quickSearch&...` → 200 but returns the app shell: doc-type vocabulary is embedded, **actual search results are fetched client-side behind a `captcha-site-key`** (reCAPTCHA token required). Not keyless-scriptable without solving captchas — which we don't do.
- **Doc-type vocabulary (from the embedded config, useful intel):** DEED OF TRUST, C C DEED OF TRUST, EQUITY DEED OF TRUST, MASTER DEED OF TRUST … — **no FHA/VA doc type**. Notable: **"DEED OF TRUST WITH ASSUMPTION"** exists as a doc type — that's *actual assumptions being recorded*, a downstream validation signal, but still image-bound for details.
- **Verdict: dead-end** for polite automation (2 counties' worth of probing budget spent on one; pattern is platform-wide since it's one vendor, GovOS).

## 5. HMDA data browser API + LAR — LIVE-VERIFIED ✅ (keyless) — the program layer

This came back **stronger than expected**: the data-browser CSV endpoint is **loan-level**, not just aggregations.

- **Sample queries:**
  ```
  # aggregation — note loan_types must be NUMERIC (FHA→2); 'FHA' errors out
  curl -s --compressed "https://ffiec.cfpb.gov/v2/data-browser-api/view/aggregations?states=FL&years=2020&loan_types=2"
  # → {"aggregations":[{"count":285464,"sum":63781960000.0,"loan_types":"2"}]}

  # loan-level CSV — one county, FHA, originated (action_taken=1)
  curl -s --compressed "https://ffiec.cfpb.gov/v2/data-browser-api/view/csv?counties=12086&years=2020&loan_types=2&actions_taken=1"
  # → 10,097 LAR rows for Miami-Dade FHA 2020
  ```
- **Fields observed (LAR CSV):** `activity_year, lei` (lender), `state_code, county_code, census_tract`, `loan_type` (1=conv **2=FHA 3=VA 4=USDA/RHS**), `loan_purpose, lien_status, loan_amount, interest_rate` (!), `rate_spread, loan_term, property_value, total_units, occupancy_type, income, debt_to_income_ratio`, …
- **Geography ceiling:** census tract. No address, no parcel — by design (privacy).
- **Cadence:** annual (LAR published each spring for prior year); API serves 2018+.
- **Verdict: partial** standalone — but as the **program-inference layer** it's the best thing in this survey: per-tract FHA/VA origination counts, amounts, and *actual interest-rate distributions* for the exact 2019-21 window, replacing the adapter's PMMS monthly-average estimate with observed local rates.

Sample: `probes/hmda_lar_miamidade_fha_2020_sample.csv` (first 20 rows), `hmda_aggregations_fl_fha.json`.

## 6. HUD FHA Single Family Portfolio Snapshot — LIVE-VERIFIED ✅ (keyless)

- **Landing page:** https://www.hud.gov/stat/sfh/fha-sf-portfolio-snapshot (old `/program_offices/.../sfsnap` URL is now a shell). Monthly xlsx archive back to 2010.
- **Sample file (HEAD + one download, verified):**
  ```
  curl -sI "https://www.hud.gov/sites/dfiles/Housing/documents/FHA_SFSnapshot_Apr2020.xlsx"
  # → 200, content-length 11706020 (~11.7MB/month), no auth
  ```
- **Fields observed (Purchase/Refinance Data sheets, verified from the Apr-2020 file):** `Property State, Property City, Property County, Property Zip, Originating Mortgagee (+Number), Sponsor Name/Number, Down Payment Source, Non Profit Number, Product Type (Fixed/ARM), Loan Purpose, Property Type, Interest Rate, Original Mortgage Amount`, endorsement year + month.
- **So: yes interest rate, yes ZIP/city/county, yes amount, yes endorsement month.** No borrower name, no address, no case number in this file. FHA only (VA equivalent does not exist publicly at loan level outside Ginnie).
- **Cadence:** monthly ("report generator is updated every month").
- **Verdict: partial** — ZIP-level, program-certain, rate-carrying. Ideal for calibrating the heuristic's rate model (actual FHA note rates by ZIP × month beats PMMS) and for sizing target ZIPs; cannot point at a parcel.

## 7. Ginnie Mae loan-level disclosure — key-gated ❌ (free registration)

- **Probe:** `https://bulk.ginniemae.gov/protectedfiledownload.aspx?dlfile=llmon1/llmon1_202006.zip` → 302-bounces to `ginniemae.gov/pages/profile.aspx` (login/registration wall). History-files pages do the same. **Not keyless.** Registration is free but violates the no-key/no-registration rail.
- **Fields (from the PUBLIC layout + sample at `.../LayoutsAndSamples/Attachments/107/llmon1_sample.txt`, saved to probes/):** monthly loan-level records incl. **loan type flag F/V/R (FHA/VA/RD)**, first payment date, interest rate, OPB/UPB, loan age, credit score, MSA, **state** — geography stops at state/MSA.
- **Verdict: key-gated**, and even unlocked it adds little over HMDA+HUD for this heuristic (coarser geography). Documented for later.

Sample: `probes/ginnie_llmon1_sample.txt` (first 30 lines of the public sample file).

## 8. Assessor sales files with "financing type" — probed, honest negatives

The hoped-for angle: some assessors capture financing (FHA/VA/cash/conv) from
sales-verification questionnaires. Neither probed county exposes it:

- **Franklin County OH auditor** — genuinely good keyless FTP (`https://apps.franklincountyauditor.com/` → `Daily_Conveyances/`, `Parcel_CSV/`, `Outside_User_Files/`). Daily conveyance xlsx columns (verified from `DailyConveyances_20260302.xlsx`): `ISEXEMPT, CONVEYNUMBER, PARCELNUMBER, SALEDATE, SALETYPE, SALESPRICE, PARCELCOUNT, OWNERNAME1/2, OWNERADDRESS1/2, PRIOROWNERNAME1/2, LUC, LANDUSE, SITEADDRESS, INSTRUMENTTYPE` — parcel-level, daily, **no financing field**. (Worth remembering for *other* spine signals: daily ownership-change feed with owner mailing address.)
- **Wake County NC** — keyless extracts at `services.wake.gov/realdata_extracts/`; the Record Layout PDF (fetched, grepped) has Land/Total Sale Price + Date, Deed Book/Page — **no financing field**.
- **Verdict: partial** as generic transfer feeds; **negative** for the program field. Some smaller CAMA counties do publish a financing code, but neither of these flagships does — treat "financing-type in assessor sales" as county-by-county luck, not a strategy.

## 9. Miami-Dade / Broward / Maricopa — gates, plainly

| Portal | Probe result | Gate |
|---|---|---|
| Miami-Dade Clerk official records (`onlineservices.miamidadeclerk.gov/officialrecords/`) | 200 | ASP.NET search portal, no bulk/JSON API; images per-doc |
| Broward (`officialrecords.broward.org/AcclaimWeb/`) | **403** to CLI | bot-blocked search portal |
| Maricopa recorder (`recorder.maricopa.gov/recdocdata/`) | **403** to CLI | bot-blocked; bulk recorded-document data is a **paid subscription** product |

**Verdict: dead-end / paid** for keyless R&D.

---

## Recommendation for the adapter

**Yes, a live fetch path exists today — but only as a two-layer join, and program is
always inferred, never read.**

1. **Live recorder leg (usable-now): NYC ACRIS.** Master (`bnx9-e6tj`,
   `doc_type='MTGE'`, `recorded_datetime` in 2019-21, `document_amt`) joined to
   Legals (`8h5j-fqxa`) on `document_id` for BBL + street address. This populates
   every fixture field the adapter documents **except `loan_program` and
   `note_rate`**. Keyless Socrata (shared throttle pool — keep `$limit` bounded,
   daily cadence max).
2. **Program-inference leg: HMDA LAR via the data-browser CSV endpoint.** For each
   recorder record: geocode/join to census tract (NYC: BBL→tract via PLUTO, also
   keyless), then look up the tract's 2019-21 FHA/VA origination share and the
   loan-amount distribution by program. Emit `loan_program="FHA"|"VA"` only as a
   *probabilistic* label: `confidence ∝ P(program | tract, year, amount-band)`,
   and lower the adapter's confidence cap accordingly (these are leads to verify
   on the document image, not facts). An exact-match variant (year + county +
   amount rounded to $1k + lender-LEI-name match) is the published "HMDA-deed
   match" technique and uniquely resolves roughly half to two-thirds of records.
3. **Rate model upgrade (free, immediate): HUD FHA Snapshot.** Replace/augment the
   embedded PMMS monthly averages with observed FHA note rates by ZIP × endorsement
   month for 2019-21 — one 11.7MB xlsx per month, keyless. Also HMDA
   `interest_rate` gives per-tract rate distributions for both FHA and VA.
4. **Where the model *should* eventually run** (FHA/VA-dense metros: TX, FL, AZ,
   NV, GA…), the recorder indexes are captcha-gated (publicsearch.us), bot-blocked
   (Broward, Maricopa), or paid — so the honest posture there is: HMDA+HUD pick
   target tracts/ZIPs, and parcel resolution needs either a per-county negotiated
   feed, a paid aggregator, or manual pulls. Do not pretend otherwise.

**Single best pick if choosing one:** wire **ACRIS master+legals** as the live
recorder feed (it exercises the real fetch path end-to-end with real instruments,
dates, amounts, parcels), with **HMDA tract-density join** supplying the inferred
`loan_program`. Keep the fixture path as the contract; the parent session owns the
adapter code.

### Implemented (2026-07-04, same day)

`adapters/assumable_heuristic.py` now carries this live path behind
`DEALFLOW_LIVE` (fixture default unchanged): ACRIS Master (`doc_type='MTGE'`,
2019-21 window, bounded `$limit`) x Legals (BBL + street address) x HMDA LAR
loan-level CSV (county FHA/VA/USDA amount-bins, `(year, $10k-bin-midpoint)`
match). Two calibration facts from the first real run (Queens, 120 instruments,
saved to `fixtures/adapters/assumable_heuristic_live_sample.json`):

1. **The raw bin match over-selects ~10x** — it labeled 88% of ACRIS mortgages
   FHA/VA while Queens' true government share (HMDA aggregations endpoint,
   keyless) is only ~8-10%.
2. The adapter therefore prices each label with the Bayes posterior
   `P(gov | match) = county_gov_share / batch_match_rate` (P(match|gov)=1 by
   construction) and sets signal confidence to it (floor 0.05, cap 0.45). In
   Queens that lands at **~0.10 confidence** — honestly weak. In a gov-dense
   county (El Paso-class, share 40%+) the identical code yields materially
   confident labels; the blocker there is the recorder leg (§4/§9), not this
   adapter.

Per-record inference provenance (`matched_bin`, `bin_counts`,
`county_gov_share`, `batch_match_rate`, `posterior_gov_probability`, caveat)
ships in `evidence.program_inference`; `evidence.loan_program_source` is
`"inferred"` vs the fixture path's `"stated"`.

### Aimed at gov-dense boroughs (2026-07-25)

The 2026-07-04 note left the live adapter defaulting to Queens (borough 4), the
"most FHA/VA-dense borough ACRIS covers" — but that was an assumption, not a
measurement. Live-probed the HMDA aggregations endpoint (keyless,
`loan_types=1,2,3,4 & actions_taken=1`) for all four ACRIS boroughs, 2020:

| Borough | County FIPS | Total orig. | Gov (FHA+VA+USDA) | **Gov share** |
|---|---|---|---|---|
| **Bronx** | 36005 | 7,182 | 1,105 | **15.4%** |
| Queens | 36081 | 25,817 | 2,196 | 8.5% |
| Brooklyn | 36047 | 25,066 | 1,219 | 4.9% |
| Manhattan | 36061 | 16,688 | 12 | 0.1% |

**Bronx is ~2× Queens; Brooklyn is BELOW Queens.** Because the adapter's
confidence is the Bayes posterior `county_gov_share / batch_match_rate`, aiming
at Bronx materially lifts label confidence, while adding Brooklyn would *lower*
the average (bigger match denominator, same-or-thinner prior). So the adapter's
default aim is now `DEFAULT_BOROUGHS = (Bronx, Queens)` — Brooklyn and Manhattan
are deliberately excluded, correcting the "Bronx/Brooklyn" hunch with the data.
`fetch(borough=...)` / `fetch(boroughs=[...])` still target any borough(s)
explicitly; `limit` is per-borough. The recorder-leg ceiling is unchanged
(§4/§9): no keyless source pairs program with parcel, so labels stay inferred
and image-verifiable, never read.

## Surprises worth remembering

1. **HMDA's data-browser `/view/csv` endpoint is loan-level and keyless** — 10k
   Miami-Dade FHA-2020 rows with interest rates in one polite GET. Most people
   assume you need the giant annual bulk files.
2. **The HUD FHA Snapshot carries per-loan interest rates and ZIPs** — a
   program-certain, keyless rate corpus that quietly obsoletes PMMS estimation for
   FHA.
3. **ACRIS's own doc-type control-codes dataset currently publishes blank doc-type
   columns** — enumerate live values with `$group=doc_type` instead of trusting the
   reference dataset.
4. **Denton County records "DEED OF TRUST WITH ASSUMPTION" as a doc type** — recorded
   assumptions are their own observable event, even though the search API is
   captcha-gated.
5. **Philly's mortgage rows have consideration columns that are populated-but-zero**
   (15 nonzero of 154k) — another "check the values, not the schema" trap, same
   family as the 2022-06 Carto freeze in `data-sources.md`.
