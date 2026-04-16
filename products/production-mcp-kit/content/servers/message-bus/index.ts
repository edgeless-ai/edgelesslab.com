/**
 * Message Bus MCP Server — Client
 *
 * Connects Claude Code sessions to the message bus hub. Each session
 * registers with the hub and polls for incoming messages. Other sessions
 * can send targeted or broadcast messages.
 *
 * This pattern is useful when you run multiple Claude Code sessions and
 * need them to coordinate — one session can delegate work to another,
 * share results, or broadcast status updates.
 *
 * Usage:
 *   bun run index.ts
 *
 * Environment:
 *   AGENT_BUS_NAME     — Session name (default: session-<pid>)
 *   AGENT_BUS_HUB      — Hub URL (default: http://127.0.0.1:9800)
 *   AGENT_BUS_POLL_MS  — Poll interval (default: 2000)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

// ─── Configuration ───

function resolveSessionName(): string {
  if (process.env.AGENT_BUS_NAME) return process.env.AGENT_BUS_NAME;
  const nameFile = path.join(homedir(), ".claude-session-name");
  if (existsSync(nameFile)) {
    const name = readFileSync(nameFile, "utf-8").trim();
    if (name) return name;
  }
  return `session-${process.pid}`;
}

let sessionName = resolveSessionName();
const HUB_URL = process.env.AGENT_BUS_HUB ?? "http://127.0.0.1:9800";
const POLL_MS = parseInt(process.env.AGENT_BUS_POLL_MS ?? "2000");

let connectionId = "";

// ─── Hub Communication ───

async function hubFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${HUB_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
}

async function registerWithHub() {
  const result = await hubFetch("/register", {
    method: "POST",
    body: JSON.stringify({ name: sessionName }),
  });
  connectionId = result.connection_id ?? "";
  console.error(
    `[message-bus] registered as "${sessionName}" (${result.pending} pending)`
  );
  return result;
}

async function ackMessages(ids: string[]) {
  if (ids.length === 0) return;
  await hubFetch("/ack", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

// ─── MCP Server ───

const server = new McpServer({
  name: "message-bus",
  version: "1.0.0",
});

server.tool(
  "bus_send",
  "Send a message to another Claude Code session by name. Works even if the recipient is offline — messages are held for 24 hours.",
  {
    to: z.string().describe("Recipient session name"),
    message: z.string().describe("Message content"),
    type: z
      .enum(["info", "request", "response", "alert"])
      .default("info")
      .describe("Message type"),
  },
  async ({ to, message, type }) => {
    try {
      const result = await hubFetch("/send", {
        method: "POST",
        body: JSON.stringify({ to, from: sessionName, message, type }),
      });
      const status = result.recipient_online ? "online" : "offline (held)";
      return {
        content: [
          {
            type: "text" as const,
            text: `Sent to ${to} [${status}]. ID: ${result.id}`,
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `Send failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "bus_broadcast",
  "Send a message to all connected Claude Code sessions.",
  {
    message: z.string().describe("Message to broadcast"),
  },
  async ({ message }) => {
    try {
      const result = await hubFetch("/broadcast", {
        method: "POST",
        body: JSON.stringify({ from: sessionName, message }),
      });
      return {
        content: [
          {
            type: "text" as const,
            text: `Broadcast sent to ${result.sent} session(s).`,
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `Broadcast failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "bus_list",
  "List all currently connected Claude Code sessions.",
  {},
  async () => {
    try {
      const result = await hubFetch("/sessions");
      const sessions = result.sessions ?? [];
      if (sessions.length === 0) {
        return {
          content: [{ type: "text" as const, text: "No sessions online." }],
        };
      }
      const lines = sessions.map(
        (s: any) => `  ${s.name} (since ${s.connected_at})`
      );
      return {
        content: [
          {
            type: "text" as const,
            text: `Online sessions:\n${lines.join("\n")}`,
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `List failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "bus_status",
  "Check message bus hub health and connectivity.",
  {},
  async () => {
    try {
      const result = await hubFetch("/health");
      return {
        content: [
          {
            type: "text" as const,
            text: [
              `Hub: ${result.status}`,
              `Uptime: ${result.uptime_seconds}s`,
              `Sessions online: ${result.sessions_online}`,
              `Messages: ${JSON.stringify(result.message_stats)}`,
            ].join("\n"),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `Hub unreachable: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "bus_set_name",
  "Change this session's name on the message bus.",
  {
    name: z.string().describe("New session name"),
  },
  async ({ name }) => {
    const oldName = sessionName;
    sessionName = name;
    try {
      await registerWithHub();
      return {
        content: [
          {
            type: "text" as const,
            text: `Renamed: ${oldName} -> ${name}`,
          },
        ],
      };
    } catch (error) {
      sessionName = oldName;
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `Rename failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

// ─── Polling Loop ───

async function pollMessages() {
  try {
    const result = await hubFetch(
      `/poll/${encodeURIComponent(sessionName)}?connection_id=${connectionId}`
    );

    if (result.error === "not registered") {
      console.error("[message-bus] presence expired, re-registering...");
      await registerWithHub();
      return;
    }

    const messages = result.messages ?? [];
    if (messages.length === 0) return;

    const ids: string[] = [];
    for (const msg of messages) {
      ids.push(msg.id);
      // In production, you'd forward these to Claude Code via notifications.
      // For this reference implementation, we log them.
      console.error(
        `[message-bus] from=${msg.from} type=${msg.type}: ${msg.message}`
      );
    }

    await ackMessages(ids);
  } catch {
    // Hub unreachable — will retry next poll
  }
}

// ─── Startup ───

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[message-bus] MCP server started as "${sessionName}"`);

  try {
    await registerWithHub();
  } catch {
    console.error("[message-bus] hub not available — tools will retry on use");
  }

  setInterval(pollMessages, POLL_MS);
}

main().catch((err) => {
  console.error("[message-bus] fatal:", err);
  process.exit(1);
});
