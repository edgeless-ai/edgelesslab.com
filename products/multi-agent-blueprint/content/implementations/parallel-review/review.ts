/**
 * Parallel Code Review
 *
 * Spawns 3 specialist agents (security, performance, style) to review
 * a file simultaneously. Collects all reviews and synthesizes a combined report.
 *
 * Usage: npx tsx review.ts <file-to-review>
 */

import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { ALL_REVIEWERS, type ReviewAgent } from "./agents.js";

interface ReviewOutput {
  agent: string;
  status: "completed" | "failed" | "timeout";
  result: unknown | null;
  durationMs: number;
}

interface CombinedReport {
  file: string;
  timestamp: string;
  reviews: ReviewOutput[];
  synthesis: {
    totalFindings: number;
    criticalCount: number;
    highCount: number;
    topIssues: string[];
  };
}

/**
 * Run a single reviewer agent as a subprocess.
 */
function runReviewer(
  agent: ReviewAgent,
  filePath: string,
  fileContent: string,
  timeoutMs = 120_000
): Promise<ReviewOutput> {
  const startTime = Date.now();

  const prompt = [
    agent.systemPrompt,
    "",
    `## File to review: ${filePath}`,
    "",
    "```",
    fileContent,
    "```",
    "",
    "Respond with ONLY the JSON object described in your instructions. No markdown fences, no preamble.",
  ].join("\n");

  const args = [
    "-p", prompt,
    "--output-format", "json",
    "--max-turns", String(agent.maxTurns),
  ];

  for (const tool of agent.allowedTools) {
    args.push("--allowedTools", tool);
  }

  return new Promise((resolve) => {
    const child = spawn("claude", args, {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: process.cwd(),
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 5_000);
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timer);
      const durationMs = Date.now() - startTime;

      if (code === 0 && stdout.trim()) {
        let parsed: unknown = null;
        try {
          // Claude's JSON output format wraps the result
          const envelope = JSON.parse(stdout.trim());
          parsed = typeof envelope.result === "string"
            ? JSON.parse(envelope.result)
            : envelope.result;
        } catch {
          // Try parsing stdout directly
          try {
            parsed = JSON.parse(stdout.trim());
          } catch {
            parsed = { raw: stdout.trim() };
          }
        }

        resolve({
          agent: agent.name,
          status: "completed",
          result: parsed,
          durationMs,
        });
      } else if (code === null) {
        resolve({
          agent: agent.name,
          status: "timeout",
          result: null,
          durationMs,
        });
      } else {
        resolve({
          agent: agent.name,
          status: "failed",
          result: { error: stderr.trim() || `Exit code ${code}` },
          durationMs,
        });
      }
    });
  });
}

/**
 * Synthesize individual reviews into a combined report.
 */
function synthesize(reviews: ReviewOutput[]): CombinedReport["synthesis"] {
  let totalFindings = 0;
  let criticalCount = 0;
  let highCount = 0;
  const topIssues: string[] = [];

  for (const review of reviews) {
    if (review.status !== "completed" || !review.result) continue;

    const result = review.result as Record<string, unknown>;
    const findings = (result.findings as Array<Record<string, string>>) || [];

    totalFindings += findings.length;

    for (const finding of findings) {
      const severity =
        finding.severity || finding.impact || finding.importance || "";

      if (severity === "critical") criticalCount++;
      if (severity === "high") highCount++;

      if (severity === "critical" || severity === "high") {
        topIssues.push(`[${review.agent}] ${finding.issue}`);
      }
    }
  }

  return { totalFindings, criticalCount, highCount, topIssues };
}

/**
 * Run all reviewers in parallel and produce a combined report.
 */
async function parallelReview(filePath: string): Promise<CombinedReport> {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const fileContent = readFileSync(filePath, "utf-8");
  console.log(`[review] starting parallel review of ${filePath}`);
  console.log(`[review] spawning ${ALL_REVIEWERS.length} reviewers...`);

  // Launch all reviewers simultaneously
  const reviewPromises = ALL_REVIEWERS.map((agent) =>
    runReviewer(agent, filePath, fileContent)
  );

  const reviews = await Promise.all(reviewPromises);

  for (const r of reviews) {
    const icon = r.status === "completed" ? "OK" : "FAIL";
    console.log(`[review] ${icon} ${r.agent} (${r.durationMs}ms)`);
  }

  const report: CombinedReport = {
    file: filePath,
    timestamp: new Date().toISOString(),
    reviews,
    synthesis: synthesize(reviews),
  };

  return report;
}

// --- CLI Entry Point ---

if (import.meta.url === `file://${process.argv[1]}`) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npx tsx review.ts <file-to-review>");
    process.exit(1);
  }

  parallelReview(filePath)
    .then((report) => {
      console.log("\n" + "=".repeat(60));
      console.log("COMBINED REVIEW REPORT");
      console.log("=".repeat(60));
      console.log(JSON.stringify(report, null, 2));
    })
    .catch((err) => {
      console.error("Review failed:", err);
      process.exit(1);
    });
}
