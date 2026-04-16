# Production MCP Server Kit

Three MCP server templates that handle the things tutorials skip: authentication, rate limiting, health checks, subprocess management, graceful degradation, and Docker deployment.

## What's Inside

```
content/
├── README.md              ← you are here
├── CHANGELOG.md
├── guide.md               ← full architecture + deployment guide (5,500 words)
├── servers/
│   ├── knowledge-base/    ← Effect-TS MCP server with vector search + BM25 hybrid
│   │   ├── index.ts
│   │   ├── service.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── message-bus/       ← Real-time agent communication MCP server
│   │   ├── index.ts
│   │   ├── hub.ts
│   │   ├── package.json
│   │   └── start.sh
│   └── template/          ← Minimal MCP server scaffold
│       ├── index.ts
│       ├── package.json
│       └── tsconfig.json
├── config/
│   ├── mcp-config-example.json  ← Claude Code MCP configuration
│   ├── Dockerfile               ← Production Docker image
│   └── docker-compose.yml       ← Multi-server orchestration
├── tests/
│   ├── health-check.sh          ← Verify server is responding
│   ├── smoke-test.ts            ← Basic tool call verification
│   └── load-test.sh             ← Simple concurrency test
```

## Prerequisites

- Node.js 20+ or Bun 1.0+
- TypeScript 5+
- For the knowledge-base server: ChromaDB running locally (or any vector store)
- 15 minutes

## Quick Start

```bash
# Start with the template server
cd servers/template
npm install
npx tsx index.ts

# Test it
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | npx tsx index.ts
```

## The Three Servers

| Server | Purpose | Dependencies |
|--------|---------|-------------|
| Knowledge Base | Hybrid search (vector + BM25) over a document corpus | ChromaDB or any vector store |
| Message Bus | Real-time communication between Claude Code sessions | SQLite (bundled) |
| Template | Minimal scaffold to build your own | None |

## Support

Built from servers running in production since January 2026. See guide.md for the full architecture, deployment patterns, and troubleshooting.
