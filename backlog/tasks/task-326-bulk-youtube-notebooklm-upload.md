---
id: 326
title: Bulk YouTube channel upload to NotebookLM pipeline
epic: knowledge-tools
priority: P2
status: completed
depends_on: []
blocks: []
source: content-intelligence-pipeline (yt:KRpZSvtMiTI - Artem Zhutov)
created: 2026-05-02
---

# Task 326: Bulk YouTube Channel Upload to NotebookLM Pipeline

## Problem
We have 1,029 processed YouTube videos with KB articles but no bulk upload to NotebookLM. Currently manual source-by-source addition. Extends task-310.

## Solution
Build a skill that filters a YouTube channel's processed KB articles by topic and bulk-uploads them to NotebookLM notebooks. Uses existing `notebooklm-py` CLI.

## Acceptance Criteria
- [x] Script reads `claude-vault/03-Knowledge/YouTube/<channel>/` for KB articles
- [x] Topic filtering based on frontmatter tags
- [x] Bulk upload to NotebookLM via `notebooklm-py` API
- [x] Idempotent — skip already-uploaded sources
- [x] Rate limiting to respect NotebookLM API limits
- [ ] Test with ColeMedin channel (highest density, ~30 KB articles) — dry-run validated, real upload needs `notebooklm login`

## Notes
- `notebooklm login` required for live test. Run in terminal, then re-run with `--channel ColeMedin --notebook <id>`.
- 87 articles found for ColeMedin; topic filter `ai-coding` yields 4, no filter hits 50-source cap.

## Related
- `notebooklm-py` v0.3.3 — CLI tool
- `docs/notebooklm-sources.md` — current source reference
- task-310 — NotebookLM content pipeline (P1)
- task-233 — YouTube transcripts NotebookLM enrichment
