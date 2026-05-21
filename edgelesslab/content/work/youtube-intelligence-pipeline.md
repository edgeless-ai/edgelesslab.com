---
title: "Case Study: YouTube Intelligence Pipeline"
date: 2026-05-15T09:00:00-07:00
description: "Building a 7-track enrichment system that turns 1,172 YouTube liked videos into searchable knowledge — 0% to 21.2% in one session."
author: "Edgeless Lab"
tags: ["youtube", "enrichment", "knowledge-base", "chromadb", "notebooklm"]
image: "/og/default.webp"
draft: false
---

**Case Study #2** | Project: YouTube Intelligence Pipeline | Status: Active (21.2% enriched)

---

## Problem

The Edgeless system collects YouTube liked videos from a personal account — hundreds of hours of AI, coding, and creative content. Raw transcripts stored in ChromaDB are searchable but not *understandable*. The comparison problem:

- **Before:** YouTube liked videos sit as raw text in CSV form, searchable only by keyword. Zero context, zero linkage, zero prioritization.
- **After:** 7-track enrichment turns each video into categorized, cross-linked, scored knowledge — usable by any agent in the swarm.

Target: 20% fully enriched by June 2026. Hit in one session: **21.2% (248/1,172 notes).**

---

## Source: 3,000+ Hours of Signal

Daily likes across 12 channels:

| Channel | Hours/y |
|---|---|
| 3Blue1Brown | ~150 |
| AI Andy | ~280 |
| AI Foundations | ~120 |
| Claude Code deep dives | ~200 |
| Various research/tutorial | ~2,250 |

Videos import via Paperclip triage → ChromaDB ingest → enrichment pipeline.

---

## The Pipeline: 3 Stages + 7 Tracks

### Stage 1: Extraction (Transcript Retrieval)

YouTube transcripts fetched by Hermes cron, stored in ChromaDB `youtube_transcripts` collection (~10,000 docs). Basic metadata: title, channel, duration, publish date, `snippet_500_char`.

**Reality check:** Extraction = 76% coverage (videos without transcripts dropped). Enrichment = 5% (curation quality).

---

### Stage 2: Enrichment — 7 Tracks Per Video

Multi-track schema chosen after design boundary decision: **extraction ≠ enrichment.** One system fetches and stores; a second system annotates and links.

```yaml
# Universal fields (5)
enrichment_tier: 2       # 0-3 scale
context: "Why this matters"
one_liner: "Tweet-length summary"
summary: "Already extracted from transcript"
vault_connections: [[linked_note_1]]

# Track-specific payloads (one or more)
track_tags: ["knowledge", "tool_workflow", "trading_intel", ...]
```

| Track | Target Collection | Agent | What It Catches |
|---|---|---|---|
| `knowledge` | unified_knowledge | Scribe | Concepts, research, analysis |
| `tool_workflow` | toolkit | Kilo/Beau | Tools, install guides, commands |
| `people` | network_graph | Curator | People, orgs, context |
| `trading_intel` | trading_patterns | Pamela | Market signals, strategy |
| `creative_seeds` | generative_art | Critic/Specimen | Art prompts, style cues |
| `code_patterns` | code_snippets | Kilo | Libraries, API patterns |
| `opportunity` | business_pipeline | Builder | Product ideas, monetization |

**Pattern discovery:** Tool-focused content dominates. ~80% of enriched notes triggered `tool_workflow`. Auto-routed to Kilo install review queue. Each track with payload = +1 bonus point (score can exceed 5/5).

---

### Stage 3: Cluster & Upload (NotebookLM)

Low-scoring notes (triage score ≤2 after enrichment) get routing to an ingest cluster. The cluster summary is uploaded to NotebookLM as a topic-slotted document. Manifest tracking per document upload prevents duplicates.

```yaml
manifest entry per upload:
  - notebooklm_doc_id: "abc123"
  - source: cluster-XX
  - vault_path: 03-Knowledge/YouTube/NotebookLM-Clusters/cluster-XX/
  - uploaded_at: timestamp
  - status: uploaded | failed | pending
```

The tracking script at `scripts/youtube_intelligence/track_enrichment_history.py` writes a 7-day delta JSONL. Backfill script (`nightly_enrichment_backfill.py`) creates Paperclip issues for low-scored notes that need re-enrichment.

---

## Backfill Campaign Results

| Phase | Notes Changed | From → To |
|---|---|---|
| Target batch | 105 notes | 0% → 35.2% enriched |
| Missed tracks | ~40 | Creative seeds, opportunity, people |
| Full cycle | 1,172 → 248 enriched | 0% → 21.2% |

---

## Design Boundary (Critical)

The system was built around a key decision: extraction ≠ enrichment.

- **Extraction:** Verified transcript retrieval, ChromaDB storage, metadata integrity (forwarded instruction).
- **Enrichment:** Context addition by track/subject — requires curation, not just technical setup.

Adding enrichment without this separation would have conflated two very different problems and made quality unmeasurable. By keeping input and output fields in separate layers, the system can now measure: *what got extracted vs. what got enriched* — and track delta over time.

---

## Changes Brought In

The YouTube intelligence system has created several new workflows and elevated others:

- **Score/delta tracking** — `yt-enrichment-stats.json`, 7-day delta JSONL
- **Nightly backfill cron** — auto-creates Paperclip issues for low-scored notes
- **Before/after metrics** — turned background maintenance into visible progress
- **Track → Cluster alignment** — enrichment tier feeds ChromaDB collections, not just vault files
- **ID collision flagging** — Couplets TXT → document ID mapping surfaced before commit

---

## Growth of 7-Day Enrichment Delta

| Day | Notes enriched | Delta | Target hit? |
|---|---|---|---|
| Session start (baseline) | 0 | — | No |
| After bulk session | 248 | +248 | **Yes (21.2%)** |
| Full cycle total | 1,172 | 248/1,172 | Target 20% exceeded |

Target 20% was exceeded in the session that created this pipeline. Delta tracking is now in place for future sessions.

---

## For New Clients

Edgeless recommends the YouTube enrichment pipeline as part of a **content strategy audit**:

- Auto-triage script: `scripts/youtube_intelligence/score_enrichment.py`
- Randomized notes inspection → AI-reviewed → KB article path
- Payload gated on extraction score alone, not just theme agreement
- Design for adaptability: track-to-CLUSTER mapping changeable at runtime, not hardcoded
