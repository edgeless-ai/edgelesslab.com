---
id: task-97
title: Document VPS access information in Claude memory system
epic: 1-kernel
status: completed
priority: P2
depends_on: []
blocks: [task-96]
created: 2026-01-28
owner: claude
estimated_effort: 30 minutes
---

# Task 97: Document VPS Access in Memory System

## Goal
Persist VPS access information (hostinger-VPS, IP, SSH config, paths) into Claude's memory system so it stops being forgotten across sessions.

## Context
VPS access has been provided multiple times but keeps getting lost:
- SSH alias: `hostinger-VPS`
- IP: `62.72.32.53`
- Used for: Pamela bot (Polymarket requires non-US IP)
- Bot location: `~/pamela-agent` (or similar)

This information exists in task-96 but isn't in the persistent memory system.

## Why This Matters
- **Recurring friction**: User has to re-explain VPS access repeatedly
- **Blocks task-96**: Need VPS access to debug Pamela redemption
- **Meta-improvement**: Better session continuity

---

## Step-by-Step Instructions

### Step 1: Gather All VPS Information
Collect from existing sources:
- SSH config (`~/.ssh/config`)
- Task-96 documentation
- Any existing memory/vault references

Information needed:
- Hostname/alias
- IP address
- SSH port (if non-standard)
- Username
- Key location
- What runs on the VPS (Pamela bot, etc.)
- Directory structure

### Step 2: Store in ChromaDB
```python
# Add to unified_knowledge collection
document = """
## VPS Access - Hostinger

**SSH Connection:**
- Alias: hostinger-VPS
- IP: 62.72.32.53
- Command: `ssh hostinger-VPS`

**Purpose:**
- Runs Pamela bot (Polymarket trading)
- Non-US IP required for Polymarket API access

**Directory Structure:**
- Pamela bot: ~/pamela-agent/
- Logs: ~/pamela-agent/logs/

**Services Running:**
- Pamela Polymarket trading bot
- (other services TBD)
"""

# Use ChromaDB MCP to add
```

### Step 3: Add to Serena Memory
```bash
# Create Serena memory file
# Location: .serena/memories/vps-access.md
```

### Step 4: Update CLAUDE.md
Add VPS quick reference section to CLAUDE.md so it's always in context.

### Step 5: Verify Memory Retrieval
Test that memory system can retrieve VPS info:
```python
# Query ChromaDB for "VPS" or "hostinger"
# Should return access information
```

---

## Acceptance Criteria
- [x] VPS access info stored in ChromaDB unified_knowledge
- [x] Serena memory file created (updated existing: hostinger-vps-ssh-access.md)
- [x] CLAUDE.md updated with VPS quick reference
- [x] Memory retrieval test passes
- [x] Next session can access VPS info without user re-explaining

---

## Verification Checklist
- [x] `ssh hostinger-VPS` command documented
- [x] IP address stored (62.72.32.53)
- [x] Pamela bot path documented (~pamela-agent/)
- [x] ChromaDB query returns VPS info (id: vps-access-hostinger-2026-01)
- [x] Serena memory file exists and is readable

---

## Artifacts
- ChromaDB document: `vps-access-hostinger`
- Serena memory: `.serena/memories/vps-access.md`
- CLAUDE.md section: "VPS Access Quick Reference"

## Priority Justification
**P2** because:
- Recurring friction (user has mentioned "multiple times")
- Blocks P1 task (task-96 needs VPS access)
- Quick fix (30 min)
- Improves future session continuity
