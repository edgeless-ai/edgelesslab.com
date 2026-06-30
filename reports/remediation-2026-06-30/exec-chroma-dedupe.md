# EXEC — ChromaDB `unified_knowledge` Dedupe (EDGA-16904)

**Date:** 2026-06-30 · **Mode:** EXECUTE (David approved "resume them all")
**Collection:** `unified_knowledge` @ `/Users/djm/claude-projects/chroma-data`
**Python:** `/Users/djm/claude-projects/.venv/bin/python` (chromadb 1.5.8)

## Outcome — DONE, verified

| Stage | Result |
|---|---|
| Backup | `chroma-data/chroma.sqlite3.bak-2026-06-30` (1367.6 MB, byte-for-byte copy) |
| Pre-delete count | **93,422** (NOT 93,400 — 22 chunks added since manifest gen) |
| Manifest re-asserted | Count ≠ 93,400 → **regenerated** manifest with the doc's discriminator logic; result **byte-identical** to the existing 21,037-id manifest (0 ids added, 0 removed) |
| Spot-check (10 ids) | **10/10 PASS** — each has no `last_modified`, a resolvable normalized path, and a readable NEW twin for the same source |
| Deletion | 21,037 ids deleted in 22 batches of 1000 (~22 s) |
| Post-delete count | **72,385** (= 93,422 − 21,037) |
| NEW cohort | **65,544** — untouched (identical to pre-delete) |
| OLD preserve set | **6,841** — exactly the doc's predicted unique-OLD count |
| EBRE note | still retrievable; canonical chunks ranked UP (see below) |
| Root cause | fixed in `scripts/vault_to_chroma_pipeline.py` + test PASS |

## Step detail

### 1. Backup
`cp chroma.sqlite3 chroma.sqlite3.bak-2026-06-30` — verified same size (1367.6 MB).
Only one sqlite under chroma-data (`chroma.sqlite3`); `events.db` is 0 B. The `.bak` is
gitignored along with the rest of `chroma-data/`, so it is local-only and restoreable.

### 2. Count guard → manifest regeneration
Asserted count == 93,400 per the plan; actual was **93,422**. Per the rails ("never delete
against a stale manifest"), I regenerated the candidate set from scratch using the exact
discriminator from `chroma-dedup.md` §4:
```
candidate IFF  "last_modified" NOT in metadata
           AND normalized_path(meta) != ""
           AND normalized_path(meta) ∈ NEW_PATHS
normalized_path strips ^/Users/djm/claude-projects/claude-vault/, ^/Users/djm/claude-projects/, ^vault/
from (file_path|source_path|filepath|path|source)
```
Regen produced **21,037** ids, a **perfect set-match** with the existing manifest
(`in old not regen: 0`, `in regen not old: 0`). The 22 extra live chunks were all NEW-cohort
additions (65,522 → 65,544) that did not change the OLD-dup candidate set. Regenerated copy
saved alongside: `chroma-dedup-candidate-ids.regen-2026-06-30.json`. Deletion ran against the
original (identical) manifest.

### 3. Spot-check
10 random candidate ids — all confirmed OLD-cohort (`last_modified=False`), normalized path
present and in the NEW set, NEW twin document readable. Examples: agent-heartbeat logs,
`03-Knowledge/RSS/...`, `04-Sessions/2026-02/...`, YouTube notes.

### 4. Deletion
`collection.delete(ids=batch)` × 22 (batch=1000). Removed exactly 21,037; count 93,422 → 72,385.

### 5. Verification
- **Cohort integrity:** NEW (`last_modified` present) = **65,544**, unchanged from pre-delete.
  OLD remaining = 72,385 − 65,544 = **6,841**, exactly the doc's predicted unique-OLD count.
  ⇒ only OLD stale dups removed; zero NEW content touched.
- **EBRE note** (`04-Sessions/2026-06-23-ebre-cmco-opportunity-engine.md`): all **7 NEW chunks**
  (`...md::chunk_0..6`, each with `last_modified` + title/tags) intact and readable
  (doc text reads "# EBRE Deal-Engine → Opportunity Engine …").
- **Retrieval, query `"EBRE opportunity engine Accordion"`:**
  - Baseline EBRE chunk ranks: **1, 3, 12, 13** (rank-1 was an OLD dup `vault::…ebre…::chunk0`, d=0.5371).
  - Post-dedup EBRE chunk ranks: **2, 10** — the *canonical NEW* chunks each moved UP
    (3→2, 13→10) once the duplicate noise was removed.
  - Honest nuance: the single best *absolute* slot slipped 1→2 because the OLD copy that
    occupied rank 1 was itself one of the deleted stale dups (it happened to be a marginally
    closer vector match for this short query but lacked title/tags). That removal is the
    intended outcome, not a regression — the note's content is fully preserved in the 7 NEW
    chunks and its canonical chunks are now higher-ranked.

### 6. Root-cause fix — `scripts/vault_to_chroma_pipeline.py`
The pipeline already upserts stable `file_path::chunk_{i}` ids (so same-shape re-runs overwrite,
not duplicate). The residual recurrence gap: when a file **shrinks or re-chunks**, upsert only
overwrites the indices it rewrites — orphan trailing chunks (`::chunk_5,6…`) survive and
re-grow the collection over time. (The original 21k bloat additionally came from *retired* legacy
pipelines under other id schemes; those are not re-run.)

**Fix:** before (re-)embedding each file, `collection.delete(where={"file_path": doc.file_path})`
so the persisted chunk set for a file is exactly the current run's output. Resume-skipped files
are left untouched; a crash between delete and the buffered upsert is recovered on the next run
(file absent from checkpoint → reprocessed). Diff is one guarded block in `process_vault`.

**Test (isolated temp vault + temp chroma):** embed a long file → 5 chunks; shrink the file →
re-run → **1 chunk, 4 orphans removed, 0 out-of-range survivors** (`delta: +-4`). Without the
fix this would stay at 5. `py_compile` PASS.

## Artifacts
- Backup: `chroma-data/chroma.sqlite3.bak-2026-06-30`
- Manifest used: `reports/remediation-2026-06-30/chroma-dedup-candidate-ids.json` (21,037 ids)
- Regen (identical) copy: `reports/remediation-2026-06-30/chroma-dedup-candidate-ids.regen-2026-06-30.json`
- Code fix: `scripts/vault_to_chroma_pipeline.py` (process_vault — stale-chunk reconciliation)

## NEEDS-DAVID / notes
- Nothing blocked. No keys touched, no cron migrated.
- The `.bak-2026-06-30` is a 1.37 GB local copy — safe to delete once retrieval is confirmed
  good over a few days. It is gitignored (not committed).
