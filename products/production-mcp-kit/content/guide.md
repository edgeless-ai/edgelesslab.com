# Production MCP Server Kit: The Full Guide

## What MCP Servers Are

MCP (Model Context Protocol) is a standard for connecting AI models to external tools. An MCP server exposes tools over JSON-RPC. Claude Code discovers and calls these tools during conversations. The server runs as a subprocess; Claude sends requests, the server returns results.

Most MCP tutorials show a 20-line server that returns "hello world." Production servers handle authentication, rate limiting, health checks, error recovery, and deployment. This kit bridges that gap.

## Architecture Overview

An MCP server has three layers:

**Transport**: How the server communicates. Stdio (standard input/output) is the default for Claude Code. The server reads JSON-RPC from stdin and writes responses to stdout. Stderr is for logging.

**Protocol**: The JSON-RPC message format. Claude sends `tools/list` to discover available tools and `tools/call` to invoke them. The server responds with structured results or errors.

**Implementation**: Your business logic. This is where search queries run, APIs get called, and data gets processed. The implementation layer is where production concerns live.

## The Three Server Patterns

### Pattern 1: Knowledge Base (Effect-TS)

The knowledge-base server uses Effect-TS for type-safe dependency injection and error handling. It provides hybrid search (vector + BM25) over a document corpus.

Why Effect-TS for MCP servers:
- Tool parameters and responses are validated at the type level via Schema
- Dependencies (vector store, file system) are injected, not hardcoded
- Errors are typed and propagated cleanly through the Effect pipeline
- The Toolkit pattern groups related tools with shared dependencies

The key architectural decision: separate the service layer from the tool definitions. Tools declare what they need (KnowledgeBase service). The service implementation provides it. This means you can swap ChromaDB for Pinecone by changing one Layer, not rewriting tool handlers.

The BM25 implementation in `service.ts` is worth studying even if you do not use vector search. BM25 (Best Matching 25) is the algorithm behind Elasticsearch and most search engines. The implementation here is ~40 lines. Combined with vector search via Reciprocal Rank Fusion, it outperforms either method alone.

### Pattern 2: Message Bus (Lightweight)

The message-bus server enables real-time communication between Claude Code sessions. It uses SQLite for message persistence and a hub process for routing.

This pattern is useful when you run multiple Claude Code sessions and need them to coordinate. One session can send a message to another. The bus holds messages for offline recipients (up to 24 hours) and delivers them when the recipient connects.

The implementation is minimal: ~200 lines of TypeScript, no external dependencies beyond SQLite (which Bun bundles natively). The hub process runs separately and manages the message routing.

### Pattern 3: Template (Minimal Scaffold)

The template server is your starting point for new servers. It includes a health check tool, an echo tool, and the full scaffolding for adding more tools.

The template demonstrates the minimum viable MCP server: tool definitions, request handling, error wrapping, and stdio transport. Every production server starts from this pattern.

## Production Concerns

### Health Checks

Every MCP server should expose a `health_check` tool. Claude Code calls it to verify the server is responsive. The health check should return:
- Server name and version
- Uptime
- Backend connectivity status (database, API, file system)
- Current timestamp

If a health check fails, Claude Code knows the server is degraded and can fall back or inform the user.

### Error Handling

MCP errors come in two flavors:

**Tool errors**: The tool ran but the operation failed (e.g., search returned no results, API returned 500). Return these as `{ isError: true, content: [{ type: "text", text: "..." }] }`. Claude sees the error and can retry or adjust.

**Protocol errors**: The server itself is broken (invalid JSON, missing tool, crash). These should never happen in production. The template wraps all tool handlers in try/catch to convert unexpected exceptions into tool errors.

### Rate Limiting

If your MCP server calls external APIs, implement rate limiting in the service layer. The simplest approach: a token bucket per API endpoint.

```typescript
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  constructor(private maxTokens: number, private refillRate: number) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }
  tryConsume(): boolean {
    this.refill();
    if (this.tokens > 0) { this.tokens--; return true; }
    return false;
  }
  private refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}
```

### Subprocess Bridge

Some tools need to call Python scripts, shell commands, or other processes. The subprocess bridge pattern spawns a child process, pipes JSON to its stdin, and reads results from stdout.

This is how the knowledge-base server communicates with ChromaDB: it spawns a Python process that imports the chromadb package and executes queries. The TypeScript server handles MCP protocol; the Python process handles the vector store.

The bridge pattern is useful whenever the best library for a task is in a different language than your server.

### Graceful Degradation

When a backend is unavailable, the server should degrade, not crash. The knowledge-base server demonstrates this: if ChromaDB is down, semantic search returns an error, but BM25 keyword search (which uses a local index) still works.

Design each tool to have a fallback path. If the primary backend fails, try a secondary. If all backends fail, return a clear error message explaining what is unavailable and what alternatives exist.

## Docker Deployment

The `config/` directory includes a Dockerfile and docker-compose.yml for deploying MCP servers as containers.

For local development, you do not need Docker. MCP servers run as subprocesses of Claude Code. But for shared infrastructure (a team's knowledge base, a company's tool server), Docker provides:
- Consistent environment across machines
- Easy scaling (multiple instances behind a load balancer)
- Health check integration with orchestrators (Docker Compose, Kubernetes)

The Dockerfile uses a multi-stage build: one stage installs dependencies, the other runs the server. The final image is ~50MB for a TypeScript server.

## Configuration

### Claude Code Integration

Add your MCP server to `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "knowledge-base": {
      "command": "npx",
      "args": ["tsx", "servers/knowledge-base/index.ts"],
      "env": {
        "CHROMA_DATA_PATH": "./chroma-data",
        "DEFAULT_COLLECTION": "my-docs"
      }
    }
  }
}
```

Claude Code reads this file on startup and launches each server as a subprocess. The `env` object passes environment variables to the server process.

### Multiple Servers

You can run multiple MCP servers simultaneously. Each gets its own entry in `.mcp.json`. Claude sees all tools from all servers and routes calls to the correct one.

Name your tools to avoid collisions. Prefix with the server name: `kb_semantic_search` instead of `search`. This makes it clear to Claude which server handles which tool.

## Testing

### Health Check

```bash
bash tests/health-check.sh
```

Starts the server, sends a health check request, verifies the response, and shuts down. Exit code 0 means healthy.

### Smoke Test

```bash
npx tsx tests/smoke-test.ts
```

Sends a `tools/list` request and verifies all expected tools are present. Then calls each tool with test parameters and checks for valid responses.

### Load Test

```bash
bash tests/load-test.sh 50
```

Sends N concurrent requests to the server and measures response times. Useful for finding bottlenecks before deploying to a team.

## Common Mistakes

**Logging to stdout**: MCP uses stdout for protocol messages. All logging must go to stderr (`console.error`, not `console.log`). One `console.log` in your tool handler will corrupt the JSON-RPC stream.

**Blocking the event loop**: Long-running operations (database queries, API calls) must be async. A synchronous operation blocks the entire server, preventing it from processing other requests.

**Missing error handling**: An unhandled exception crashes the server process. Claude Code will restart it, but the user sees a tool failure. Wrap everything in try/catch.

**Hardcoded paths**: Use environment variables for all paths, URLs, and credentials. The server runs in different environments (local dev, Docker, CI). Hardcoded paths break portably.

**No health check**: Without a health check, Claude Code cannot distinguish between "server is starting" and "server is broken." Always include one.
