# Vault Harmonization Architecture
## Paperclip "Done" Outputs → ChromaDB + Obsidian Sync

**Issue:** EDGA-828  
**Owner Agent:** Scribe (7f8aa3c8-73db-465e-9f25-e2de8cf10802)  
**Status:** IN_PROGRESS → PENDING_IMPLEMENTATION  
**Created:** 2026-04-29

---

## 1. Responsibility Assignment

| Agent | Role | Harmonization Responsibility |
|-------|------|------------------------------|
| **Scribe** | Knowledge Lead - Vault & Enrichment | **PRIMARY OWNER** - All Paperclip outputs → ChromaDB/Obsidian sync |
| Verifier | QA & Regression Reviewer | Validates sync completeness, spots missing backups |
| Beau | Chief of Staff | Monitors sync health in daily audits |

---

## 2. Data Flow Architecture

```
Paperclip Issue COMPLETED
         │
         ▼
┌─────────────────────────────────────────┐
│  Webhook: issue.status == "done"       │
│  POST /vault-sync/webhook              │
└─────────────────────────────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐  ┌─────────────┐
│ChromaDB│  │Obsidian Vault│
│Vector  │  │Markdown KB   │
│Store   │  │              │
└────────┘  └─────────────┘
    │            │
    └────┬───────┘
         ▼
┌─────────────────┐
│ Cross-reference │
│ index (UUID)    │
└─────────────────┘
```

---

## 3. Sync Targets

### 3.1 ChromaDB (Vector Store)
**Path:** `/Users/djm/claude-projects/chroma-data/`

| Collection | Content | Embedding Model |
|------------|---------|-----------------|
| `paperclip_issues` | Issue title + description + comments | text-embedding-3-small |
| `paperclip_comments` | Agent work products, resolution notes | text-embedding-3-small |
| `paperclip_knowledge` | Extracted KB articles, learnings | text-embedding-3-large |

**Metadata stored:**
- `paperclip_id`: Issue identifier (EDGA-XXX)
- `agent_id`: Agent who resolved
- `project_id`: Project context
- `timestamp`: Completion time
- `vault_path`: Link to Obsidian note (if exists)

### 3.2 Obsidian Vault
**Path:** `claude-vault/02-Agents/Paperclip-Outputs/`

**Structure:**
```
claude-vault/
└── 02-Agents/
    └── Paperclip-Outputs/
        ├── YYYY-MM/
        │   ├── EDGA-XXX--brief-title.md
        │   └── EDGA-XXX--brief-title/
        │       ├── work-product-1.md
        │       └── attachments/
        └── _index.md (sync status dashboard)
```

**Note format:**
```yaml
---
paperclip_id: EDGA-XXX
agent: Scribe
status: done
completed: 2026-04-29T12:00:00Z
vault_harmonized: true
chroma_synced: true
topics: [tag1, tag2]
source_url: http://127.0.0.1:3100/api/issues/EDGA-XXX
---

# EDGA-XXX: Title

## Summary
[Extracted from issue description]

## Work Products
- [Links to artifacts]

## Learnings
[Key knowledge extracted]

## Cross-References
- [[Related vault notes]]
```

---

## 4. Implementation Components

### 4.1 Webhook Receiver (Scribe responsibility)
- Endpoint: POST /vault-sync/webhook
- Trigger: issue.status == "done"
- Actions: sync_to_chroma(), sync_to_obsidian(), update_cross_reference()

### 4.2 Paperclip API Polling (Backup method)
- Hourly poll for issues completed since last sync
- Query: /issues?status=done&completedAfter={cutoff}
- Skip if already synced (idempotent)

### 4.3 ChromaDB Sync Module
- Collection: paperclip_issues
- Document: title + description
- Metadata: paperclip_id, agent_id, completed_at, vault_path

### 4.4 Obsidian Sync Module
- Generate markdown from issue data
- Frontmatter with paperclip metadata
- Cross-link to related vault notes

---

## 5. Sync Status Dashboard

**Location:** `claude-vault/02-Agents/Paperclip-Outputs/_index.md`

Tracks:
- Last sync timestamp
- Today's syncs (issue, agent, chroma status, vault status)
- Backlog (pending sync)
- Health: ChromaDB, Obsidian, Webhook status

---

## 6. Verification & QA

Verifier agent runs daily check:
- All done issues from last 24h have vault notes
- All vault notes have ChromaDB embeddings
- Cross-reference UUIDs match
- No orphaned embeddings or notes

---

## 7. Integration with Existing Pipelines

### 7.1 Scribe's Current Enrichment Flow
Scribe's enrichment issues (EDGA-145, EDGA-310, etc.) will:
1. Complete Paperclip issue (status: done)
2. Trigger vault harmonization webhook
3. Auto-generate vault note from work products
4. Cross-link to NotebookLM KB articles

### 7.2 Cron Schedule
```
*/15 * * * *  Scribe  vault-sync/poll_recently_completed.py
0 2 * * *    Verifier vault-sync/verify_sync_completeness.py
```

---

## 8. Open Questions

1. Honcho integration - Issue mentions Honho; need to clarify scope
2. Real-time vs batch - Webhook preferred, polling as MVP backup
3. Conflict resolution - If vault note manually edited, preserve or overwrite?

---

## 9. Next Steps

1. Create `scripts/vault_harmonization/` directory structure
2. Implement Paperclip API client with issue fetch
3. Implement ChromaDB sync module
4. Implement Obsidian sync module
5. Add webhook receiver (or polling as MVP)
6. Add to Scribe's cron jobs
7. Verifier adds sync health check

**Assigned to:** Scribe  
**Review by:** Edgeless CC (architecture), Verifier (QA)  
**ETA:** 2026-05-02
