---
id: 329
title: Evaluate Graphify and GitNexus for codebase knowledge graphs
epic: knowledge-tools
priority: P2
status: completed
depends_on: []
blocks: []
source: content-intelligence-pipeline
created: 2026-05-03
---

# Task 329: Evaluate Graphify and GitNexus for Codebase Knowledge Graphs

## Problem
Our monorepo (75+ skills, 7000+ vault files, 17K ChromaDB embeddings) has high context costs. Tree-sitter-based knowledge graph tools claim 70x token reduction by exposing structural relationships instead of raw file content.

## Candidates
1. **Graphify** (yt:WNru_PFycT8): Builds knowledge graphs from codebases using tree-sitter + LLM. Claims 70x token reduction. Outputs graph as markdown.
2. **GitNexus** (yt:O6t94PrYimI, 30K stars): 16 MCP tools including blast radius analysis and cross-repo impact queries. NOTE: Polyform non-commercial license -- cannot use in commercial Edgeless products without enterprise license.

## Acceptance Criteria
- [ ] Both tools installed and tested against `claude-projects` monorepo
- [ ] Side-by-side comparison: token count for answering 5 representative queries (e.g., "what calls triage_core.route()?", "what files does task creation touch?")
- [ ] Compare answer quality vs our current ChromaDB RAG + grep approach
- [ ] License assessment: confirm GitNexus Polyform restriction applies to our use case
- [ ] Decision documented: adopt one, adopt neither, or hybrid approach
- [ ] If adopting, integration plan drafted (MCP server? CLI tool? Cron-built index?)

## Related
- `chroma-data/` -- existing ChromaDB with 17K embeddings
- `.mcp.json` -- MCP server config (GitNexus would add here)
- `qmd` -- existing markdown semantic search


## Completion
- Completed by agent **** on 2026-05-05
- Paperclip issue: EDGA-1049
- QA review: Approved by Ombudsman
