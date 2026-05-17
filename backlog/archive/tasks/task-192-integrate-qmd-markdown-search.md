---
id: task-192
title: Integrate qmd local markdown search engine with MCP
epic: 4-knowledge
status: done
priority: P1
depends_on: []
blocks: []
created: 2026-03-10
owner: david
estimated_effort: M (2-3 hours)
tags: [qmd, search, mcp, knowledge-base, local-first, markdown]
source: https://github.com/tobi/qmd
---

# Task 192: Integrate qmd Local Markdown Search Engine

## Goal
Install and configure qmd (by Tobi Lutke/Shopify CEO) as an MCP server for semantic search across our markdown knowledge bases. This gives Claude natural language search over the vault, backlog, docs, and skills.

## Why This Matters
- **Local-first**: All inference runs on-device (GGUF models via node-llama-cpp), no cloud APIs
- **Triple search**: BM25 full-text + vector embeddings + LLM reranking
- **MCP native**: Built-in MCP server (stdio + HTTP) integrates directly with Claude Code
- **14K stars, SAFE security audit**: Clean codebase, MIT license, trusted maintainer

## Step-by-Step

### Step 1: Install qmd
```bash
# Option A: npm
npm install -g @tobi/qmd

# Option B: bun (faster)
bun install -g @tobi/qmd
```

### Step 2: Index Knowledge Bases
```bash
# Index the vault
qmd index ~/claude-projects/claude-vault/

# Index skills
qmd index ~/claude-projects/.claude/skills/

# Index backlog
qmd index ~/claude-projects/backlog/

# Index docs
qmd index ~/claude-projects/docs/
```

### Step 3: Configure as MCP Server
Add to `.claude/settings.json` or Claude Desktop config:
```json
{
  "mcpServers": {
    "qmd": {
      "command": "qmd",
      "args": ["mcp"]
    }
  }
}
```

### Step 4: Test Search
```bash
qmd search "how do hooks work in claude code"
qmd search "pamela trading bot configuration"
qmd search "skill creator template"
```

### Step 5: Configure Auto-Reindex
Set up periodic reindexing (cron or hook) to keep the index fresh as vault content changes.

## Acceptance Criteria
- [ ] qmd installed and running locally
- [ ] GGUF models downloaded (~1-2GB first run)
- [ ] claude-vault/, skills/, backlog/, docs/ all indexed
- [ ] MCP server configured and accessible from Claude Code
- [ ] Search returns relevant results for test queries
- [ ] Reindex strategy documented

## Security Audit
Completed 2026-03-10: **SAFE**
- Zero obfuscation, clean TypeScript
- Only outbound: HEAD to HuggingFace for model freshness
- 8 runtime deps, all well-known
- Tobi Lutke (Shopify CEO) is primary author
