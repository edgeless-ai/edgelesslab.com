# Gumroad Listing: Production MCP Server Kit

## Short Description
3 MCP server patterns (Effect-TS, message bus, template) with Docker deployment, health checks, and test suites — everything tutorials skip.

## Full Description

### The pain
Every MCP tutorial shows a 20-line server that returns "hello world." Then you need authentication, health checks, rate limiting, error recovery, and Docker deployment. The gap between tutorial and production is where servers break at 2am.

### The credential
These patterns come from running 4+ MCP servers in production across a knowledge base, inter-agent communication bus, and tool orchestration layer. The Effect-TS pattern alone handles hybrid search (vector + BM25) across 7,000+ documents.

### What's inside
- **3 complete server implementations** — from minimal template to production Effect-TS
- **Docker deployment** — Dockerfile + docker-compose.yml with health check integration
- **Test suite** — health check, smoke test, and load test scripts
- **The full guide** (~5,500 words) — architecture layers, production concerns, common mistakes, deployment strategies

### The 3 server patterns
1. **Template (Minimal Scaffold)** — the starting point for any new MCP server. Health check tool, echo tool, error wrapping, stdio transport. Fork this.
2. **Knowledge Base (Effect-TS)** — type-safe dependency injection, Schema-validated parameters, hybrid search (vector + BM25 with Reciprocal Rank Fusion). The Toolkit pattern for grouping related tools.
3. **Message Bus (Lightweight)** — real-time communication between Claude Code sessions. SQLite persistence, lease-based delivery, offline message holding. Hub + client architecture.

### Production concerns covered
- Health checks (what to return, when Claude Code calls them)
- Error handling (tool errors vs protocol errors)
- Rate limiting (token bucket implementation included)
- Subprocess bridge (calling Python from TypeScript servers)
- Graceful degradation (what to do when backends are down)
- Logging (why console.log will corrupt your JSON-RPC stream)

### Who it's for
- Developers building custom MCP servers for Claude Code
- Teams deploying shared tool infrastructure
- Anyone who's outgrown the MCP quickstart tutorial

### Who it's NOT for
- People who just want to use existing MCP servers (no need to build your own)
- Beginners who haven't used Claude Code yet

### What you get
- 3 server implementations (TypeScript, ready to run)
- Docker deployment files (Dockerfile + docker-compose.yml)
- MCP config example (.mcp.json template)
- 3 test scripts (health check, smoke test, load test)
- 1 comprehensive guide (PDF + Markdown)
- README with < 5 minute setup

## Price
$29

## Permalink
production-mcp-kit

## Category
Software & Development

## Cross-sell
- MCP Starter Kit ($24)
- Multi-Agent Orchestration Blueprint ($39)
