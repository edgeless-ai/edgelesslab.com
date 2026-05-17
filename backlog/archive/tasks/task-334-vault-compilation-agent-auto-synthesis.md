---
id: 334
title: Implement vault compilation agent for auto-synthesis
epic: knowledge-tools
priority: P2
status: completed
depends_on: []
blocks: []
source: content-intelligence-pipeline
created: 2026-05-03
---

# Task 334: Implement Vault Compilation Agent for Auto-Synthesis

## Problem
Vault notes are write-once with no auto-synthesis. We have 7000+ files, ChromaDB with 17K embeddings, and MOC (Maps of Content) pages, but no automated process that reads across sources and generates browsable synthesis documents. Notes accumulate without cross-referencing or contradiction detection.

## Solution
Implement a scheduled agent (inspired by Nate B Jones, yt:dxq7WtWxi44) that reads ChromaDB + vault notes and generates synthesis pages: MOC updates, cross-reference maps, and contradiction flags. Hybrid wiki+DB approach: ChromaDB remains source of truth, vault gets periodically compiled synthesis.

## Acceptance Criteria
- [ ] Agent script at `scripts/vault-compilation-agent.py`
- [ ] Reads from ChromaDB collections and vault markdown files in a target directory
- [ ] Generates at least one new MOC page per run covering a knowledge domain (e.g., "Multi-Agent Patterns" from scattered vault notes)
- [ ] Detects at least one contradiction or stale reference across vault notes
- [ ] Output written to `claude-vault/03-Knowledge/Synthesis/` (new canonical location)
- [ ] Idempotent: re-running doesn't duplicate content
- [ ] Runs successfully as cron job (dry-run mode by default, APPLY=1 to mutate)

## Related
- `claude-vault/` -- 7000+ vault files
- `chroma-data/` -- 17K embeddings
- Task 307: Post-triage MOC hook (related but different -- 307 is per-item, this is bulk synthesis)
- `scripts/lib/content_intelligence.py` -- LLM extraction patterns to reuse
