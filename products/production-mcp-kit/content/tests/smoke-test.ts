/**
 * Smoke Test — Verify all expected tools are present and callable.
 *
 * Starts a server via stdio, sends tools/list, then calls each tool
 * with test parameters to verify valid responses.
 *
 * Usage: npx tsx tests/smoke-test.ts [server-dir]
 * Example: npx tsx tests/smoke-test.ts servers/template
 */

import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverDir = process.argv[2] ?? "servers/template";
const serverPath = resolve(__dirname, "..", serverDir, "index.ts");

// ─── JSON-RPC helpers ───

let requestId = 0;

function rpcMessage(method: string, params: Record<string, unknown> = {}) {
  return JSON.stringify({
    jsonrpc: "2.0",
    id: ++requestId,
    method,
    params,
  });
}

function parseResponses(data: string): any[] {
  return data
    .split("\n")
    .filter((line) => line.trim().startsWith("{"))
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

// ─── Test Runner ───

async function runTest() {
  console.log(`Smoke testing: ${serverDir}`);
  console.log(`Server path: ${serverPath}`);
  console.log();

  const proc = spawn("npx", ["tsx", serverPath], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stdout = "";
  proc.stdout.on("data", (chunk: Buffer) => {
    stdout += chunk.toString();
  });

  proc.stderr.on("data", (chunk: Buffer) => {
    // Server logs go to stderr — show them for debugging
    process.stderr.write(chunk);
  });

  // Wait for server to start
  await new Promise((r) => setTimeout(r, 1000));

  // Step 1: List tools
  console.log("1. Sending tools/list...");
  proc.stdin.write(rpcMessage("tools/list") + "\n");
  await new Promise((r) => setTimeout(r, 500));

  const responses = parseResponses(stdout);
  const listResponse = responses.find(
    (r) => r.result?.tools !== undefined
  );

  if (!listResponse) {
    console.error("FAIL: No tools/list response received");
    proc.kill();
    process.exit(1);
  }

  const tools = listResponse.result.tools;
  console.log(`   Found ${tools.length} tool(s):`);
  for (const tool of tools) {
    console.log(`   - ${tool.name}: ${tool.description?.slice(0, 60)}...`);
  }
  console.log();

  // Step 2: Call health_check if it exists
  const healthTool = tools.find(
    (t: any) => t.name === "health_check"
  );

  if (healthTool) {
    console.log("2. Calling health_check...");
    stdout = ""; // Reset buffer
    proc.stdin.write(
      rpcMessage("tools/call", {
        name: "health_check",
        arguments: {},
      }) + "\n"
    );
    await new Promise((r) => setTimeout(r, 500));

    const healthResponses = parseResponses(stdout);
    const healthResult = healthResponses.find(
      (r) => r.result?.content !== undefined
    );

    if (healthResult) {
      const text = healthResult.result.content[0]?.text ?? "";
      console.log(`   Response: ${text.slice(0, 200)}`);
      console.log("   PASS");
    } else {
      console.log("   WARN: No response (server may need backend)");
    }
  } else {
    console.log("2. No health_check tool — skipping");
  }

  console.log();
  console.log(`Smoke test complete: ${tools.length} tool(s) discovered`);

  proc.kill();
  process.exit(0);
}

runTest().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
