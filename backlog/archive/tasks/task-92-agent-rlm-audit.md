---
id: task-92
title: Audit Existing Agents for RLM Orchestration Patterns
epic: 6-creative
status: pending
priority: P3
depends_on: [task-90]
blocks: []
created: 2026-01-27
owner: david
estimated_effort: 2 hours
---

# Task 92: Agent RLM Pattern Audit

## Goal
Evaluate which existing agents (research, quality, capture, etc.) would benefit from RLM hierarchical orchestration and persistent state patterns.

## Context
You have 10+ agents in `/claude-projects/.claude/agents/` but no systematic way to:
- Orchestrate sub-agent calls hierarchically
- Maintain state across multi-day sessions
- Process contexts too large for single agent

RLM provides both patterns. Need to identify which agents benefit most.

---

## Agents to Evaluate

### Primary Candidates
1. **research agent** (`research.md`)
   - **Current**: Does deep research in one conversation
   - **RLM potential**: Orchestrate per-source sub-research (academic, technical, code)
   - **Persistent state**: Research findings, source credibility scores

2. **quality agent** (`quality.md`)
   - **Current**: Reviews code for production issues
   - **RLM potential**: Orchestrate per-file review sub-agents
   - **Persistent state**: Tracked issues, false positives, review history

3. **capture agent** (`capture.md`)
   - **Current**: Takes screenshots, tracks clipboard
   - **RLM potential**: Less relevant
   - **Persistent state**: Session continuity, screenshot context

4. **architect agent** (`architect.md`)
   - **Current**: System design and planning
   - **RLM potential**: Could orchestrate per-component design reviews
   - **Persistent state**: Design decisions, trade-offs evaluated

### Secondary Candidates
5. **orphan_hygiene agent** - Probably not (works fine as-is)
6. **developer agent** - Maybe (for multi-file refactors)
7. **builder agent** - Maybe (for large feature implementations)

---

## Step-by-Step Instructions

### Step 1: Read All Agent Definitions
```bash
cd /Users/djm/claude-projects/.claude/agents
ls -la *.md

# Read each agent file, note:
# - What it does
# - Whether it needs sub-calls
# - Whether it needs persistent state
```

### Step 2: Create Evaluation Matrix
For each agent, score (0-3):
- **Orchestration value**: Would sub-agent calls improve it?
- **State value**: Would persistent state help?
- **Complexity**: How hard to implement?

### Step 3: Prioritize by ROI
Rank agents by: (Orchestration + State) / Complexity

### Step 4: Design Enhancements
For top 2-3 agents, sketch:
- What sub-agents would they spawn?
- What state would persist?
- What's the integration path?

---

## Acceptance Criteria
- [ ] All 10+ agents evaluated
- [ ] Evaluation matrix created
- [ ] Top 3 agents identified for RLM enhancement
- [ ] Enhancement designs documented

---

## Deliverables
Create: `/claude-vault/03-Knowledge/Research-Sessions/2026-01-27-agent-rlm-audit.md`

Include:
```markdown
# Agent RLM Pattern Audit

## Evaluation Matrix
| Agent | Orchestration | State | Complexity | Priority |
|-------|---------------|-------|------------|----------|
| research | 3 | 3 | 2 | HIGH |
| quality | 2 | 2 | 2 | MEDIUM |
| ...

## Top 3 Recommendations

### 1. Research Agent + RLM
**Enhancement**: Orchestrate per-source research
**Sub-agents**: academic-researcher, code-analyzer, doc-reader
**Persistent state**: findings_db, source_credibility, research_plan
**Estimated effort**: 3-4 hours

### 2. Quality Agent + RLM
...

## Implementation Roadmap
1. Phase 1: Research agent (task-93)
2. Phase 2: Quality agent (task-94)
3. Phase 3: Consider others based on Phase 1-2 learnings
```

---

## Verification Checklist
- [ ] Research doc created with full evaluation
- [ ] Matrix includes all existing agents
- [ ] Top 3 have detailed enhancement designs
- [ ] Roadmap provides clear next steps

---

## Artifacts
- Audit document: `claude-vault/03-Knowledge/Research-Sessions/2026-01-27-agent-rlm-audit.md`
- Updated agent docs with RLM enhancement notes (optional)

## Follow-Up Tasks
Based on audit results, create implementation tasks for top 1-2 agents.

## Notes
- Don't over-engineer - focus on agents you actually use frequently
- Persistent state is probably more valuable than orchestration for most
- Research agent is likely the biggest win
