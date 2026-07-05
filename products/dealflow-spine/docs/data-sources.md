# Dealflow Spine — Verified Signal Data Sources

R&D catalog, live-probed 2026-07-04. Public/free sources only; keyless preferred.
Every "LIVE-VERIFIED" entry below was called from the adapter code and a real
sample saved to `fixtures/adapters/`.

## Politeness baseline (all adapters)

- User-Agent: `dealflow-spine-rnd/0.1 (internal R&D; polite; contact: ops@edgelesslab.com)`
- Self-imposed >= 1s between requests, bounded result sets, bounded retries
- Poll cadence matched to source refresh (daily max anywhere)

---

## 1. openFEMA Disaster Declarations — LIVE-VERIFIED ✅ (keyless)

**Adapter:** `adapters/fema_disasters.py` · signal_type `fema_disaster`

- **Endpoint:** `https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries`
- **Sample query:**
  `?$filter=declarationDate ge '2026-04-01' and state eq 'OR'&$orderby=declarationDate desc&$top=100&$format=json`
- **Fields:** `femaDeclarationString, disasterNumber, state, declarationType (DR/EM/FM), declarationDate, incidentType, declarationTitle, iaProgramDeclared, ihProgramDeclared, paProgramDeclared, hmProgramDeclared, fipsStateCode, fipsCountyCode, designatedArea, incidentBeginDate/EndDate`
- **Granularity:** one row per declaration x designated county — county-level signal; `evidence.county_fips` carries the 5-digit FIPS for downstream joins.
- **Rate limits:** none published; keyless; US-Gov public domain. Terms: https://www.fema.gov/about/openfema/terms-conditions
- **Play:** counties with IA/IH declared = households with verified damage → insurance-gap targeting (the EBRE openFEMA play). Pair with `IndividualAssistanceHousingRegistrantsLargeDisasters` (also keyless, zip-level) for depth — documented below as follow-on.
- **Bonus endpoints (same API, keyless, verified reachable):** `HousingAssistanceOwners` (zip-level $ approved), `IndividualsAndHouseholdsProgramValidRegistrations` (county/zip aggregates).

## 2. Code violations / property complaints

### Portland, OR — NO KEYLESS SOURCE EXISTS (honest negative finding) ❌

Probed exhaustively 2026-07-04:

| Endpoint | Result |
|---|---|
| `gis-pdx.opendata.arcgis.com` DCAT catalog (354 datasets enumerated) | no enforcement/complaint dataset |
| `www.portlandmaps.com/arcgis/rest/services` (Public folder, ~220 services incl. all BDS_* layers) | permits/zoning/hazards only |
| `www.portlandmaps.com/od/rest/services` (COP_OpenData_*) | no enforcement layers |
| `data.portlandoregon.gov` (legacy CKAN) | DEAD — portal retired |
| Gresham / Multnomah County / Vancouver WA ArcGIS hubs | nothing |

**Key-gated path for later:** Portland BDS "Property Compliance" cases are served
by the **PortlandMaps API** (https://www.portlandmaps.com/development/) — free but
requires registering for an API key. Adapter is shaped so this drops in
(fixture mirrors the AMANDA case-record shape).

### Seattle, WA — LIVE-VERIFIED ✅ (keyless) — proves the adapter machinery

**Adapter:** `adapters/portland_code_violations.py` (`city="seattle"`) · signal_type `code_violation`

- **Endpoint:** `https://data.seattle.gov/resource/ez4a-iug7.json` (SDCI Code Complaints and Violations, Socrata SODA)
- **Sample query:** `?$where=opendate >= '2026-06-01T00:00:00'&$order=opendate DESC&$limit=100`
- **Fields:** `recordnum, recordtype, recordtypedesc, description, opendate, statuscurrent, lastinspdate, lastinspresult, originaladdress1/city/state/zip, latitude, longitude, link.url`
- **Rate limits:** Socrata throttles keyless clients (shared pool); keep `$limit` small, poll daily max. Free app token raises limits if ever needed.
- **Quirk:** some `opendate` values are in the future (source data-entry noise) — don't trust it as a hard event timestamp.

## 3. Delinquent property taxes

### Philadelphia, PA — LIVE-VERIFIED ✅ (keyless) — best published roll in the US

**Adapter:** `adapters/tax_delinquent.py` (default) · signal_type `tax_delinquent`

- **Endpoint:** `https://phl.carto.com/api/v2/sql?q=<SQL>` — table `real_estate_tax_delinquencies` (54,401 rows)
- **Sample query:** `SELECT opa_number, street_address, owner, mailing_address, mailing_city, total_due, num_years_owed, ST_Y(the_geom) AS lat, ST_X(the_geom) AS lon FROM real_estate_tax_delinquencies WHERE total_due >= 5000 ORDER BY total_due DESC LIMIT 50`
- **Fields:** parcel (OPA number), street address, zip, **owner + co-owner names**, **owner mailing address** (→ absentee-owner detection), principal/penalty/interest/total due, years owed, payment-agreement/bankruptcy/sheriff-sale flags, building category, assessment, geometry.
- **⚠ Vintage:** `year_month` = `202206` across all rows — the Carto snapshot froze at 2022-06. Still real parcels/owners/debts; treat as a stale-but-rich training corpus, and check opendataphilly.org for a refreshed distribution before production use.
- **Rate limits:** Carto SQL API is keyless/public; keep LIMIT bounded. License: open (OpenDataPhilly).

### NYC — LIVE-VERIFIED ✅ (keyless)

**Adapter:** `adapters/tax_delinquent.py` (`county="nyc"`)

- **Endpoint:** `https://data.cityofnewyork.us/resource/9rz4-mjek.json` (DOF Tax Lien Sale Lists)
- **Sample query:** `?$order=month DESC&$limit=100`
- **Fields:** `month, cycle (90/60/30/10-day notice), borough, block, lot, tax_class_code, building_class, house_number, street_name, zip_code, water_debt_only`
- **Notes:** notice-list = properties at risk of lien sale (pre-foreclosure-adjacent). No owner name; BBL joins cleanly to PLUTO (also keyless) for owner/units/value enrichment.

### Multnomah County, OR — documented, not usable keylessly ❌

Annual tax-foreclosure list is published only as a PDF exhibit to the circuit-court
foreclosure filing (multco.us → DART). General delinquency status is per-parcel on
multcoproptax.com (search portal, no bulk/API). Many US counties are like this;
counties that DO publish rolls: Philadelphia (above), Detroit/Wayne via
data.detroitmi.gov, Cook County IL (Scavenger Sale lists, Socrata).

## 4. Obituaries — LIVE-VERIFIED ✅ (RSS, keyless)

**Adapter:** `adapters/obituaries.py` · signal_type `obituary`

- **Working pattern:** TownNews/BLOX CMS papers expose search RSS:
  `https://<paper>/search/?f=rss&t=article&c=obituaries&l=25`
- **Verified feed:** Herald & News, Klamath Falls OR — `https://www.heraldandnews.com/search/?f=rss&t=article&c=obituaries&l=10` → real names + pub dates.
- **Negative findings:** Legacy.com hosts most metro obits (Oregonian, Lee papers like gazettetimes.com/democratherald.com now redirect there) — HTML only, ToS prohibits scraping → NOT used. `columbian.com` (Vancouver WA) WP feed exists but returns 0 items. `eastoregonian.com` (WordPress) has no obituaries feed.
- **Signal design:** name + metro only, confidence 0.2; spine merge layer owns probate/assessor enrichment.

## 5. Assumable loans — fixtures by default, live NYC path wired ✅ (2026-07-04)

**Adapter:** `adapters/assumable_heuristic.py` · signal_type `assumable_loan`

- **Logic:** flag FHA/VA/USDA deeds of trust originated 2019-01-01..2021-12-31; rate-delta hint = current 30y rate − (stated note rate, else Freddie Mac PMMS monthly average embedded in the module).
- **Live path (`--live`):** NYC ACRIS Master×Legals (keyless Socrata; boroughs 1-4 only — Staten Island is NOT in ACRIS) joined to HMDA LAR loan-level CSV for the program label. The label is PROBABILISTIC (year + $10k amount-bin match) and signal confidence tracks the Bayes posterior `county_gov_share / batch_match_rate` — live-verified ~0.10 in Queens (weak market, honestly priced). Full survey, probes, and verdict table: **`docs/deed-data-sources.md`**. Real sample: `fixtures/adapters/assumable_heuristic_live_sample.json`.
- **Recorder reality (survey headline):** no keyless source publishes loan program + parcel together; FHA case numbers / VA riders live on document images. FHA/VA-dense metros' recorders are captcha-gated/paid — there, HMDA+HUD can target tracts/ZIPs but parcel resolution needs a negotiated/paid feed.
- **Fixture format:** documented in the module docstring (fixture path emits `loan_program_source: "stated"`, live path `"inferred"` + `program_inference` provenance).

## 6. Property resolution (ENRICHMENT stage) — owner-name → parcel

### Philadelphia OPA property assessments — LIVE-VERIFIED ✅ (keyless)

**Resolver:** `resolvers/philly_opa.py` (consumed by `spine/enrich.py`) — anchors
quarantined signals (owner/deceased name + city/state, no address/APN) to parcels.

- **Endpoint:** `https://phl.carto.com/api/v2/sql?q=<SQL>` — table
  `opa_properties_public` (~580k rows, one per OPA account/parcel) — the same
  keyless Carto SQL family as the tax-delinquency adapter (§3).
- **Sample query (live-run 2026-07-04, responses saved to
  `fixtures/resolvers/philly_opa_sample.json`):**
  `SELECT parcel_number, location, unit, zip_code, owner_1, owner_2, market_value, category_code_description, year_built, mailing_street, mailing_city_state, ST_Y(the_geom) AS lat, ST_X(the_geom) AS lon FROM opa_properties_public WHERE owner_1 LIKE 'SMITH JOHN%' OR owner_2 LIKE 'SMITH JOHN%' LIMIT 25`
- **Verification results:** `'SMITH JOHN FRED%'` → exactly 1 parcel
  (361285400, 2235 LATONA ST — the unique-match path); `'SMITH JOHN%'` → 25
  parcels (the ambiguity path — resolver refuses to guess and returns every
  candidate); owner_2 matches work (Cheryl Lynne McGovern → 1434 S NEWKIRK ST
  via `owner_2`, live-verified through the resolver's own query builder).
- **Owner-name format:** `LAST FIRST [MIDDLE] [JR/TR/...]` — the resolver
  queries the `LAST FIRST%` prefix, then applies an exact-ish token match
  (last+first exact; extra owner tokens must be prefix-compatible middle
  names). Names are ambiguous by design → resolved matches carry
  **confidence 0.35** (capped ≤ 0.4).
- **Rate limits:** Carto SQL API keyless/public (OpenDataPhilly open license);
  one bounded query (`LIMIT 25`) per pending signal, through the shared
  politeness layer. Jurisdiction gate means only Philadelphia PA signals ever
  query it.
- **Fit note:** the bundled obituary feed is Klamath Falls OR, so this
  resolver mostly demonstrates the machinery until a Philly-metro obituary or
  probate feed lands; it DOES fire for degraded Philadelphia assessor rows
  that arrive address-less.

### Offline stand-in — `resolvers/fixture_owner_index.py` 📦

`fixtures/resolvers/owner_index.json` — synthetic assessor-style owner index
(Klamath Falls OR) matched to the bundled obituary fixture, so the entire
enrich path (pending file → resolution → supersede-into-ledger) runs with zero
network. Live resolution stays behind `cli.py enrich --live` / `DEALFLOW_LIVE=1`.

### Klamath County OR (the obituary metro) — documented, not usable keylessly ❌

Klamath County assessment data is published via a per-parcel search portal
(assessor.klamathcounty.org) with no bulk/API access; Oregon's ORMAP serves
parcel *geometry* only (no owner names). Same story as Multnomah (§3): most
counties gate owner indexes behind search portals or paid extracts. Counties
with keyless owner-indexed rolls that could become resolvers: Philadelphia
(above), NYC (PLUTO `ownername`, Socrata `64uk-42ks`), Cook County IL
(Socrata assessor extracts).

---

## Promising sources needing keys/registration (documented for later, NOT used)

| Source | What | Gate |
|---|---|---|
| PortlandMaps API | Portland BDS property-compliance cases, permits, assessor detail | free API key (registration) |
| Socrata app tokens (Seattle/NYC) | same data, higher rate limits | free token (registration) |
| ATTOM / CoreLogic / DataTree | national pre-foreclosure + lien data | paid |
| PropertyRadar / ForeclosureRadar | NOD/NTS feeds (OR/WA/CA) | paid |
| Legacy.com | national obituary firehose | ToS prohibits scraping; partner API is commercial |
| county recorder e-recording vendors (Simplifile/CSC) | deed-of-trust metadata at scale | commercial |
| US Bankruptcy Court PACER | Ch. 7/13 filings (distress signal) | $0.10/page, account required |

## Surprises worth remembering

1. **Philadelphia publishes owner mailing addresses** on its delinquency roll — instant absentee-owner detection, no assessor join needed.
2. **Portland — a transparency-proud city — publishes zero code-enforcement data** keylessly; 354 open datasets and none are enforcement.
3. **The TownNews `search/?f=rss` pattern** survives on small-metro papers even as Legacy.com swallowed big-metro obits.
4. **Philly's Carto table silently froze in 2022-06** while remaining fully queryable — always check vintage columns, not just HTTP 200s.
