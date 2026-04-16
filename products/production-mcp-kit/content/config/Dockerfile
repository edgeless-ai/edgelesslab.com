# Multi-stage Dockerfile for MCP servers
# Build: docker build -t mcp-server --build-arg SERVER=template .
# Run:   docker run -i mcp-server

ARG SERVER=template

# ─── Stage 1: Install ───
FROM oven/bun:1 AS install
WORKDIR /app

# Copy the target server
ARG SERVER
COPY servers/${SERVER}/package.json ./
RUN bun install --frozen-lockfile || bun install

# ─── Stage 2: Runtime ───
FROM oven/bun:1-slim AS runtime
WORKDIR /app

COPY --from=install /app/node_modules ./node_modules
ARG SERVER
COPY servers/${SERVER}/ ./

# MCP servers communicate via stdio
# No port exposed unless running the hub
ENTRYPOINT ["bun", "run", "index.ts"]
