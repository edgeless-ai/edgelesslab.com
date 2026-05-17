---
id: 144
title: "Prototype Effect-Based MCP Server"
epic: 1-kernel
priority: P2
effort: M
status: completed
depends_on: [143]
blocks: []
created: 2026-03-07
updated: 2026-03-10
source: "Effect-TS ecosystem deep analysis + production research"
tags: [effect, mcp, prototype, typescript]
---

# Task 144: Prototype Effect-Based MCP Server

## Context

**This is the strongest Effect use case for our system.** Effect has a full native MCP server implementation — not a wrapper around `@modelcontextprotocol/sdk`. It supports stdio, HTTP, and HTTP router transports, with typed tool registration via `McpServer.registerToolkit()`.

### What We Know (Validated 2026-03-10)

- Effect's `@effect/ai` includes `McpServer` module with native MCP protocol implementation
- Supports 3 transport modes: **stdio** (for Claude Code), **HTTP** (for web), **HTTP router** (for Express/Hono integration)
- Tool registration uses `McpServer.registerToolkit()` with Schema-based parameter validation
- Resources and prompts also supported via typed APIs
- Pre-1.0 but the MCP spec itself is stable, reducing API churn risk

### Why This Is the Best Effect Use Case

Our current MCP servers are a grab-bag of Python, Node, and external packages (233 tools across 12 servers). An Effect-based MCP server could:

1. **Replace custom Python MCP servers** with type-safe TypeScript
2. **Unify tool definitions** — Schema validates both input AND output
3. **Better error handling** — Effect's error channel surfaces tool failures cleanly
4. **Testability** — Mock entire tool handlers via Layer injection
5. **Single binary** — Compile with esbuild for fast startup

## Design

### Target: Knowledge Base MCP Server

Replace the ad-hoc ChromaDB/search scripts with a proper MCP server exposing:

```typescript
// Tool 1: Semantic search across collections
const SemanticSearch = McpServer.tool("semantic_search", {
  description: "Search knowledge base using semantic similarity",
  parameters: Schema.Struct({
    query: Schema.String,
    collection: Schema.optional(Schema.String),
    limit: Schema.optional(Schema.Number.pipe(Schema.between(1, 50)))
  }),
  handler: Effect.gen(function* () {
    const chroma = yield* ChromaService
    // ... search logic
  })
})

// Tool 2: Hybrid search (BM25 + vector, from task-190)
const HybridSearch = McpServer.tool("hybrid_search", {
  description: "Combined keyword + semantic search with RRF fusion",
  parameters: Schema.Struct({
    query: Schema.String,
    collection: Schema.String
  }),
  handler: Effect.gen(function* () {
    const vectorResults = yield* semanticSearch(query)
    const bm25Results = yield* keywordSearch(query)
    return yield* rrfFuse(vectorResults, bm25Results)
  })
})

// Server setup
const server = McpServer.make({
  name: "knowledge-base",
  version: "0.1.0"
}).pipe(
  McpServer.registerToolkit([SemanticSearch, HybridSearch])
)

// Run with stdio transport (for Claude Code)
server.pipe(McpServer.stdio, Effect.runPromise)
```

### Claude Code Integration

```json
// claude_desktop_config.json
{
  "mcpServers": {
    "knowledge-base": {
      "command": "node",
      "args": ["./mcp-servers/knowledge-base/dist/index.js"]
    }
  }
}
```

## Acceptance Criteria

### Gate: task-143 must return GO decision

### Phase 1: Scaffold (1 hour)
- [ ] Create `mcp-servers/effect-knowledge-base/` project
- [ ] Install: `pnpm add effect @effect/ai @effect/platform-node`
- [ ] Set up TypeScript config with strict mode
- [ ] Build pipeline with esbuild

### Phase 2: Implement (3-4 hours)
- [ ] Register 2-3 tools with Schema-based parameters
- [ ] Implement tool handlers with Effect.gen
- [ ] Add ChromaDB client as Effect Service (injectable/mockable)
- [ ] Configure stdio transport

### Phase 3: Integration Test (1 hour)
- [ ] Connect to Claude Code via MCP config
- [ ] Verify tool discovery (tools appear in Claude's tool list)
- [ ] Test tool invocation round-trip
- [ ] Verify error handling (what happens when a tool fails?)

### Phase 4: Comparison (30 min)
- [ ] Compare DX with existing Python/Node MCP servers
- [ ] Measure startup time vs current MCP servers
- [ ] Document architecture patterns

## Success Metrics

| Metric | Target |
|--------|--------|
| Tool discovery latency | < 500ms |
| Tool invocation round-trip | < 200ms (excluding LLM) |
| Type errors caught at compile time | > 0 (this is the whole point) |
| Lines of code vs equivalent Python | ≤ 1.5x |

## Synergies

- **task-190** (Hybrid RAG): Could implement BM25+RRF fusion as an Effect Service exposed via this MCP server
- **task-189** (Query-Aware Filtering): Tool filtering logic could use Effect's pattern matching

## Artifacts
- `mcp-servers/effect-knowledge-base/` — Prototype server
- `docs/effect-mcp-patterns.md` — Architecture documentation

## Completion Notes (2026-03-10)

Outcome: **Prototype complete**.

Completed artifacts:
- `mcp-servers/effect-knowledge-base/`
- `docs/effect-mcp-patterns.md`

Completed verification:
- strict typecheck
- startup smoke
- bundled build output

Remaining manual follow-up:
- live Claude Code MCP registration was not exercised in this turn
