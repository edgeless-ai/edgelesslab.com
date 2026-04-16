/**
 * Task Dispatcher
 *
 * Routes work to specialized agents based on task type.
 * Each task type maps to an agent config that defines the system prompt,
 * allowed tools, and resource limits. Agents run as subprocesses.
 */

import { spawn } from "node:child_process";
import { TaskQueue } from "./task-queue.js";
import type {
  AgentConfig,
  AgentRegistry,
  DispatchResult,
  TaskRecord,
} from "./types.js";

// --- Agent Registry ---
// Maps task types to agent configurations.
// In production, load this from agent-config.yaml instead.

const registry: AgentRegistry = {
  "code-review": {
    name: "reviewer",
    systemPrompt:
      "You are a code reviewer. Analyze the provided code for bugs, security issues, and style problems. Output a structured JSON review.",
    allowedTools: ["Read", "Glob", "Grep"],
    maxTurns: 10,
    timeoutMs: 120_000,
  },
  research: {
    name: "researcher",
    systemPrompt:
      "You are a research agent. Gather information about the topic described in the task. Summarize findings as structured JSON.",
    allowedTools: ["WebSearch", "WebFetch", "Read"],
    maxTurns: 15,
    timeoutMs: 180_000,
  },
  implementation: {
    name: "implementer",
    systemPrompt:
      "You are an implementation agent. Write code according to the specification in the task payload. Follow existing patterns in the codebase.",
    allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
    maxTurns: 25,
    model: "claude-sonnet-4-20250514",
    timeoutMs: 300_000,
  },
  test: {
    name: "tester",
    systemPrompt:
      "You are a test agent. Write and run tests for the code specified in the task. Report pass/fail status and coverage gaps.",
    allowedTools: ["Read", "Write", "Bash", "Glob", "Grep"],
    maxTurns: 20,
    timeoutMs: 240_000,
  },
};

// --- Agent Spawner ---

function spawnAgent(
  config: AgentConfig,
  task: TaskRecord
): Promise<DispatchResult> {
  const startTime = Date.now();

  const prompt = [
    `Task: ${task.title}`,
    `Description: ${task.description}`,
    `Payload: ${task.payload}`,
    "",
    "Respond with a JSON object containing your results.",
  ].join("\n");

  // Build the claude CLI command
  const args = [
    "-p", prompt,
    "--output-format", "json",
    "--max-turns", String(config.maxTurns),
  ];

  // Add tool allowlist
  for (const tool of config.allowedTools) {
    args.push("--allowedTools", tool);
  }

  // Add model override if specified
  if (config.model) {
    args.push("--model", config.model);
  }

  return new Promise((resolve) => {
    const child = spawn("claude", args, {
      cwd: config.workingDirectory || process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    // Timeout handling
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      // Give it 5 seconds to clean up, then force kill
      setTimeout(() => child.kill("SIGKILL"), 5_000);
    }, config.timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timer);
      const durationMs = Date.now() - startTime;

      if (code === 0) {
        resolve({
          taskId: task.id,
          agentName: config.name,
          status: "COMPLETED",
          output: stdout.trim(),
          error: null,
          durationMs,
          attempts: task.attempts + 1,
        });
      } else if (code === null) {
        // Process was killed (timeout)
        resolve({
          taskId: task.id,
          agentName: config.name,
          status: "TIMEOUT",
          output: stdout.trim() || null,
          error: `Agent timed out after ${config.timeoutMs}ms`,
          durationMs,
          attempts: task.attempts + 1,
        });
      } else {
        resolve({
          taskId: task.id,
          agentName: config.name,
          status: "FAILED",
          output: null,
          error: stderr.trim() || `Agent exited with code ${code}`,
          durationMs,
          attempts: task.attempts + 1,
        });
      }
    });
  });
}

// --- Dispatcher Loop ---

export class Dispatcher {
  private queue: TaskQueue;
  private running = false;
  private activeTasks = new Map<string, Promise<DispatchResult>>();
  private maxConcurrent: number;

  constructor(dbPath?: string, maxConcurrent = 4) {
    this.queue = new TaskQueue(dbPath);
    this.maxConcurrent = maxConcurrent;
  }

  async start(): Promise<void> {
    this.running = true;
    console.log(
      `[dispatcher] started, max concurrent: ${this.maxConcurrent}`
    );

    while (this.running) {
      // Fill up to maxConcurrent slots
      while (this.activeTasks.size < this.maxConcurrent) {
        const task = this.queue.claim("dispatcher");
        if (!task) break;

        const config = registry[task.type];
        if (!config) {
          console.warn(`[dispatcher] no agent registered for type: ${task.type}`);
          this.queue.fail(task.id, `Unknown task type: ${task.type}`);
          continue;
        }

        console.log(
          `[dispatcher] dispatching task ${task.id} (${task.type}) to ${config.name}`
        );
        this.queue.markRunning(task.id);

        const promise = spawnAgent(config, task).then((result) => {
          this.activeTasks.delete(task.id);

          if (result.status === "COMPLETED") {
            this.queue.complete(task.id, result.output);
            console.log(
              `[dispatcher] task ${task.id} completed in ${result.durationMs}ms`
            );
          } else {
            this.queue.fail(
              task.id,
              result.error || "Unknown failure"
            );
            console.warn(
              `[dispatcher] task ${task.id} failed: ${result.error}`
            );
          }

          return result;
        });

        this.activeTasks.set(task.id, promise);
      }

      // Wait for at least one task to finish before checking for more
      if (this.activeTasks.size > 0) {
        await Promise.race(this.activeTasks.values());
      } else {
        // No tasks available, poll after a short delay
        await new Promise((r) => setTimeout(r, 2_000));
      }
    }
  }

  stop(): void {
    this.running = false;
    console.log("[dispatcher] stopping...");
  }

  stats() {
    return {
      queue: this.queue.stats(),
      activeAgents: this.activeTasks.size,
    };
  }
}

// --- CLI Entry Point ---

if (import.meta.url === `file://${process.argv[1]}`) {
  const dispatcher = new Dispatcher();

  process.on("SIGINT", () => {
    dispatcher.stop();
  });

  dispatcher.start().catch(console.error);
}
