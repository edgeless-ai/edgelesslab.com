---
id: task-90
title: RLM Pattern Exploration - Phase 1 (Setup & Test)
epic: 6-creative
status: pending
priority: P3
depends_on: []
blocks: [task-91]
created: 2026-01-27
owner: david
estimated_effort: 1-2 hours
---

# Task 90: RLM Pattern Exploration - Phase 1

## Goal
Clone and test the Recursive Language Model (RLM) pattern from brainqub3's repo to understand hierarchical agent orchestration with persistent state.

## Context
RLM enables processing documents 2+ orders of magnitude beyond context limits by:
- Root LLM (Opus) orchestrates strategy
- Sub-LLM (Haiku) handles chunk analysis
- Persistent Python REPL maintains state

This could enhance:
- Toast crypto bot (needs persistent trading state)
- Research agent (multi-day research sessions)
- Large codebase analysis (e.g., full langfuse repo review)

## Why This Matters
You have 10+ agents but no pattern for:
1. Persistent state across sessions
2. Hierarchical orchestration (root → sub-agents)
3. Processing massive contexts (repos, logs, docs)

---

## Step-by-Step Instructions

### Step 1: Clone RLM Repository
```bash
# Create tools directory if needed
mkdir -p /Users/djm/claude-projects/tools

# Clone the repo
cd /Users/djm/claude-projects/tools
git clone https://github.com/brainqub3/claude_code_RLM.git rlm

# Verify structure
ls -la rlm/.claude/
```

### Step 2: Test RLM with Langfuse Codebase
```bash
cd /Users/djm/claude-projects/tools/rlm

# Start Claude in RLM directory
claude

# In Claude session, run:
/rlm

# When prompted:
# - Context file: /Users/djm/claude-projects/langfuse (or concatenated dump)
# - Query: "Identify all tRPC routes that handle authentication"
```

### Step 3: Document Observations
Create `/Users/djm/claude-projects/claude-vault/03-Knowledge/Research-Sessions/2026-01-27-rlm-exploration.md` with:
- How RLM chunked the codebase
- Quality of sub-agent responses
- Token usage comparison vs normal approach
- Limitations encountered

---

## Acceptance Criteria
- [ ] RLM repo cloned to `/tools/rlm/`
- [ ] Successfully ran `/rlm` skill on large context (>100k chars)
- [ ] Documented findings in Research-Sessions
- [ ] Identified 1-2 specific use cases for your workflow

---

## Verification Checklist
- [ ] Directory exists: `/Users/djm/claude-projects/tools/rlm/`
- [ ] RLM skill files present: `.claude/skills/rlm/SKILL.md`
- [ ] Research doc created with observations
- [ ] Next task (91) can start with context from this task

---

## Artifacts
- RLM repository: `/tools/rlm/`
- Research findings: `claude-vault/03-Knowledge/Research-Sessions/2026-01-27-rlm-exploration.md`

## Next Task
→ task-91: Apply RLM pattern to Toast crypto bot persistence

## Notes
- Test with langfuse repo first (you know it well)
- Don't worry about perfection - this is exploration
- Focus on understanding the pattern, not production deployment
