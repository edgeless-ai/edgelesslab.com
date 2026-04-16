/**
 * Inbox Coordinator
 *
 * Distributes work to agents via their inboxes and collects results.
 * Handles timeouts when agents fail to respond within a deadline.
 * Supports both scatter-gather (parallel) and sequential workflows.
 */

import { spawn } from "node:child_process";
import { Inbox, type InboxMessage } from "./inbox.js";

interface WorkItem {
  agent: string;
  subject: string;
  body: unknown;
  timeoutMs: number;
}

interface WorkResult {
  agent: string;
  messageId: string;
  status: "completed" | "timeout" | "error";
  response: unknown | null;
  durationMs: number;
}

interface AgentProcess {
  agent: string;
  messageId: string;
  startTime: number;
  timeoutMs: number;
}

export class Coordinator {
  private inbox: Inbox;
  private agentProcesses: Map<string, AgentProcess> = new Map();
  private pollIntervalMs: number;

  constructor(
    coordinatorName = "coordinator",
    inboxDir = "inboxes",
    pollIntervalMs = 1_000
  ) {
    this.inbox = new Inbox(coordinatorName, inboxDir);
    this.pollIntervalMs = pollIntervalMs;
  }

  /**
   * Scatter-gather: send work to multiple agents in parallel,
   * wait for all responses (or timeouts).
   */
  async scatterGather(items: WorkItem[]): Promise<WorkResult[]> {
    const pending = new Map<string, { item: WorkItem; messageId: string; startTime: number }>();

    // Send all work items
    for (const item of items) {
      const messageId = this.inbox.send(item.agent, item.subject, item.body);
      pending.set(messageId, {
        item,
        messageId,
        startTime: Date.now(),
      });

      console.log(
        `[coordinator] sent "${item.subject}" to ${item.agent} (${messageId})`
      );
    }

    // Spawn agent processes
    for (const item of items) {
      this.spawnAgentWorker(item.agent);
    }

    // Poll for responses
    const results: WorkResult[] = [];

    while (pending.size > 0) {
      const messages = this.inbox.readUnread();

      for (const msg of messages) {
        if (msg.type !== "response" || !msg.replyTo) continue;

        const entry = pending.get(msg.replyTo);
        if (!entry) continue;

        results.push({
          agent: msg.from,
          messageId: msg.replyTo,
          status: "completed",
          response: msg.body,
          durationMs: Date.now() - entry.startTime,
        });

        this.inbox.markRead([msg.id]);
        pending.delete(msg.replyTo);

        console.log(
          `[coordinator] received response from ${msg.from} for ${msg.replyTo}`
        );
      }

      // Check for timeouts
      const now = Date.now();
      for (const [msgId, entry] of pending) {
        if (now - entry.startTime > entry.item.timeoutMs) {
          results.push({
            agent: entry.item.agent,
            messageId: msgId,
            status: "timeout",
            response: null,
            durationMs: now - entry.startTime,
          });
          pending.delete(msgId);

          console.warn(
            `[coordinator] timeout waiting for ${entry.item.agent} (${msgId})`
          );
        }
      }

      if (pending.size > 0) {
        await sleep(this.pollIntervalMs);
      }
    }

    return results;
  }

  /**
   * Sequential pipeline: send work through agents in order.
   * Each agent's output becomes the next agent's input.
   */
  async pipeline(
    agents: string[],
    initialSubject: string,
    initialBody: unknown,
    timeoutMs = 120_000
  ): Promise<WorkResult[]> {
    const results: WorkResult[] = [];
    let currentBody = initialBody;
    let currentSubject = initialSubject;

    for (const agent of agents) {
      const result = await this.scatterGather([
        {
          agent,
          subject: currentSubject,
          body: currentBody,
          timeoutMs,
        },
      ]);

      const r = result[0];
      results.push(r);

      if (r.status !== "completed") {
        console.warn(`[coordinator] pipeline halted at ${agent}: ${r.status}`);
        break;
      }

      // Pass output to next agent
      currentBody = r.response;
      currentSubject = `Pipeline continuation from ${agent}`;
    }

    return results;
  }

  /**
   * Spawn a Claude Code agent that monitors its inbox and processes messages.
   * The agent runs as a subprocess with a system prompt that instructs it
   * to read from its inbox file, do the work, and write a response.
   */
  private spawnAgentWorker(agentName: string): void {
    const prompt = [
      `You are agent "${agentName}".`,
      `Read your inbox at inboxes/${agentName}.json.`,
      `Process any unread messages. For each message:`,
      `1. Read the subject and body to understand the task.`,
      `2. Do the work described.`,
      `3. Write your response to the coordinator's inbox at inboxes/coordinator.json.`,
      `Use the same JSON format: add a message with type "response" and set replyTo to the original message ID.`,
    ].join("\n");

    const child = spawn("claude", ["-p", prompt, "--max-turns", "10"], {
      stdio: "pipe",
      cwd: process.cwd(),
    });

    child.on("close", (code) => {
      if (code !== 0) {
        console.warn(`[coordinator] agent ${agentName} exited with code ${code}`);
      }
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- CLI Entry Point ---

if (import.meta.url === `file://${process.argv[1]}`) {
  const coordinator = new Coordinator();

  // Example: scatter-gather to 3 agents
  coordinator
    .scatterGather([
      {
        agent: "researcher",
        subject: "Research WebSocket libraries",
        body: { query: "Best WebSocket libraries for Node.js in 2026" },
        timeoutMs: 60_000,
      },
      {
        agent: "analyst",
        subject: "Analyze current dependencies",
        body: { file: "package.json" },
        timeoutMs: 30_000,
      },
    ])
    .then((results) => {
      console.log("[coordinator] all results:", JSON.stringify(results, null, 2));
    })
    .catch(console.error);
}
