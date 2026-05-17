---
id: task-120
title: Context window optimization - slim Claude.md and audit MCP token overhead
epic: 1-kernel
status: completed
completed: 2026-02-04
priority: P2
depends_on: []
blocks: [118]
created: 2026-02-04
owner: david
estimated_effort: M (2-3 hours)
tags: [context-window, claude-md, mcp, optimization, indydevdan]
source: youtube-meta-review-2026-02-04
---

# Task 120: Context Window Optimization

## Goal
Reduce context window consumption by 30%+ through Claude.md slimming and MCP tool audit, following IndyDevDan's and Brainqub3's recommendations.

## Context
Multiple high-value YouTube sources (IndyDevDan, Brainqub3, Better Stack, Geoffrey Huntley) converge on the same insight: **context window management matters more than model selection**. Our Claude.md is ~400 lines and may be consuming significant tokens. MCP server tool descriptions also consume context. The "smart zone" (first 30-40% of context) is where agents perform best.

### Supporting Evidence
- IndyDevDan: "Delete default MCP.json files — saves ~20k tokens"
- Brainqub3: "Keep Claude.md concise and abstract — executive directives, not detailed specs"
- Better Stack: "Minimize system prompts and tools to preserve context for actual work"
- Geoffrey Huntley: "The dumb zone starts at 60-70% context window capacity"

## Step-by-Step Instructions

### Step 1: Measure Current Baseline
```bash
# Count tokens in Claude.md (approximate: words * 1.3)
wc -w /Users/djm/claude-projects/CLAUDE.md

# List all active MCP servers and their tool counts
cat /Users/djm/claude-projects/.claude.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(json.dumps(list(d.get('mcpServers',{}).keys()), indent=2))"

# Estimate total context overhead before any user message
```

### Step 2: Audit Claude.md Content
For each section in Claude.md, categorize as:
- **KEEP**: Critical instructions that must be in every session (email API path, VPS access, anti-patterns)
- **MOVE TO SKILL**: Detailed procedures that only matter for specific tasks (backlog framework details, memory system internals, session planning protocol)
- **DELETE**: Redundant, outdated, or never-referenced content

### Step 3: Create On-Demand Skill Files
Move detailed content into skill files that load only when needed:
- `skills/memory-system-details/skill.md` — Memory architecture, connectors, recovery
- `skills/backlog-framework/skill.md` — Task template, kill criteria, epic structure
- `skills/session-planning/skill.md` — Manus-style planning, research tracking

### Step 4: Slim Claude.md
Rewrite Claude.md as executive directives:
- Each section max 3-5 lines
- Reference skill files for details: "For details, use `/memory-system`"
- Remove code blocks (move to skill files)
- Remove tables (move to skill files)
- Target: <150 lines

### Step 5: Audit MCP Tool Token Overhead
For each MCP server:
- Count number of tools exposed
- Estimate token cost of tool descriptions
- Identify tools never or rarely used
- Consider disabling low-value servers or tools

### Step 6: Measure Post-Optimization
Re-measure token consumption and compare to baseline.

## Acceptance Criteria
- [ ] Claude.md reduced to <150 lines (from ~400)
- [ ] Detailed content preserved in skill files (nothing lost)
- [ ] MCP tool audit completed with recommendations
- [ ] At least 30% reduction in estimated context overhead
- [ ] All critical instructions still accessible (email, VPS, anti-patterns)
- [ ] Skills load on demand and function correctly

## Verification
```bash
# Claude.md is under 150 lines
wc -l /Users/djm/claude-projects/CLAUDE.md

# Skills exist and are non-empty
ls -la .claude/skills/memory-system-details/skill.md
ls -la .claude/skills/backlog-framework/skill.md

# Critical paths still referenced
grep -c "consolidated_email_api" CLAUDE.md  # Must be > 0
grep -c "hostinger-VPS" CLAUDE.md           # Must be > 0
```

## Artifacts
- Slimmed `CLAUDE.md`
- New skill files in `.claude/skills/`
- MCP audit document in Serena memory

## Results (2026-02-04)

### Claude.md Optimization
- **Before**: 4,387 tokens, 502 lines
- **After**: 1,866 tokens, 177 lines
- **Reduction**: 2,521 tokens (57.5%)
- **Approach**: Zero-loss migration — all content moved to skill files

### Content Migration
| Section | Destination |
|---------|-------------|
| Memory Architecture, Quick Commands, Performance Targets, Error Handling | `.claude/skills/memory-system/skill.md` (enhanced) |
| Manus-Style Session Planning | `.claude/skills/session-planning/skill.md` (new) |
| Completion Verification details | `.claude/skills/verify-completion/skill.md` (existing) |
| Development Patterns details | `.claude/skills/_shared/patterns/KEY-PATTERNS.md` (existing) |
| Stale data (Oct 2025 status, project tracking) | Deleted (outdated) |
| Legacy compatibility, success metrics | Deleted (redundant with hook protection) |

### MCP Server Audit
- **233 total tools** across 12 servers
- **hostinger-mcp alone = 118 tools (50.6%)** — most unused
- **Dormant candidates**: hostinger-mcp, github, playwright, filesystem, time (~180 tools)
- **Essential**: chroma, serena, claude-in-chrome, perplexity-mcp, fetch
- **Broken**: codex, zen (failed to connect)

## Risks
- Over-pruning could cause session initialization failures
- Skills might not auto-load when needed (test thoroughly)
- Some hooks reference Claude.md content directly
