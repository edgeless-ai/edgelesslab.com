#!/usr/bin/env npx tsx
/**
 * MCP Server Template — Production Scaffold
 *
 * A minimal but production-ready MCP server with:
 * - Health check tool (verify the server is alive)
 * - Error handling with structured responses
 * - Stdio transport (standard for Claude Code)
 * - TypeScript strict mode
 *
 * Usage:
 *   npx tsx index.ts
 *
 * Add to Claude Code:
 *   Add to .mcp.json: { "mcpServers": { "my-server": { "command": "npx", "args": ["tsx", "index.ts"] } } }
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";

const SERVER_NAME = "my-mcp-server";
const SERVER_VERSION = "1.0.0";

// ─── Tool Definitions ───

const tools: Tool[] = [
  {
    name: "health_check",
    description: "Verify the server is running and responsive.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "echo",
    description: "Echo back the input. Useful for testing.",
    inputSchema: {
      type: "object" as const,
      properties: {
        message: {
          type: "string",
          description: "The message to echo back.",
        },
      },
      required: ["message"],
    },
  },
  // Add your tools here. Each tool needs:
  // - name: unique identifier (snake_case)
  // - description: what the tool does (Claude reads this to decide when to use it)
  // - inputSchema: JSON Schema for the parameters
];

// ─── Tool Handlers ───

async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  switch (name) {
    case "health_check":
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "ok",
              server: SERVER_NAME,
              version: SERVER_VERSION,
              uptime: process.uptime(),
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };

    case "echo":
      return {
        content: [
          {
            type: "text",
            text: String(args.message ?? ""),
          },
        ],
      };

    // Add your tool handlers here.

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── Server Setup ───

const server = new Server(
  { name: SERVER_NAME, version: SERVER_VERSION },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    return await handleToolCall(name, args ?? {});
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text" as const, text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// ─── Start ───

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${SERVER_NAME} v${SERVER_VERSION} running on stdio`);
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});
