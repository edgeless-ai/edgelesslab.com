#!/usr/bin/env node
// Agent-readiness gate (AgentReady.org AR-READ-07 / AR-FIND-04).
// Runs on the exported site in out/ and fails the build if:
//   - llms.txt is missing, or any internal link in it does not resolve to a built file
//   - the homepage head does not link llms.txt and the AI catalog
//   - /.well-known/ai-catalog.json is missing, invalid, or points at an internal URL that is not built
// Agents reach these files by following links, so a dead link is a file nothing fetches.
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve(process.argv[2] || "out");
const SITE = "https://edgelesslab.com";
const errors = [];

function resolves(urlPath) {
  const clean = decodeURIComponent(urlPath.split(/[?#]/)[0]);
  const p = clean.replace(/\/+$/, "");
  const candidates = [path.join(OUT, p), path.join(OUT, `${p}.html`), path.join(OUT, p, "index.html")];
  if (p === "") candidates.push(path.join(OUT, "index.html"));
  return candidates.some((c) => fs.existsSync(c) && fs.statSync(c).isFile());
}

function internalPath(href) {
  if (href.startsWith(SITE)) return href.slice(SITE.length) || "/";
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  return null;
}

const llmsPath = path.join(OUT, "llms.txt");
let linkCount = 0;
if (!fs.existsSync(llmsPath)) {
  errors.push("out/llms.txt is missing");
} else {
  const llms = fs.readFileSync(llmsPath, "utf8");
  if (!llms.startsWith("# ")) errors.push("llms.txt must start with an H1 title (llmstxt.org)");
  for (const m of llms.matchAll(/\]\(([^)\s]+)\)/g)) {
    const p = internalPath(m[1]);
    if (!p) continue;
    linkCount++;
    if (!resolves(p)) errors.push(`llms.txt links to ${m[1]}, which is not in the build`);
  }
}

const home = fs.existsSync(path.join(OUT, "index.html")) ? fs.readFileSync(path.join(OUT, "index.html"), "utf8") : "";
if (!/<link[^>]+href="\/llms\.txt"/.test(home)) errors.push("homepage head does not link /llms.txt");
if (!/<link[^>]+rel="ai-catalog"[^>]+href="\/\.well-known\/ai-catalog\.json"/.test(home))
  errors.push("homepage head does not link the AI catalog");

const catPath = path.join(OUT, ".well-known", "ai-catalog.json");
let entryCount = 0;
if (!fs.existsSync(catPath)) {
  errors.push("out/.well-known/ai-catalog.json is missing");
} else {
  try {
    const cat = JSON.parse(fs.readFileSync(catPath, "utf8"));
    if (cat.specVersion !== "1.0") errors.push("ai-catalog.json specVersion must be \"1.0\"");
    for (const e of cat.entries || []) {
      entryCount++;
      const p = internalPath(e.url || "");
      if (p && !resolves(p)) errors.push(`ai-catalog.json entry ${e.identifier} points at ${e.url}, which is not in the build`);
    }
    if (entryCount === 0) errors.push("ai-catalog.json has no entries");
  } catch (err) {
    errors.push(`ai-catalog.json is not valid JSON: ${err.message}`);
  }
}

if (errors.length) {
  console.error(`agent-readiness: ${errors.length} problem(s)`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`agent-readiness: ok (llms.txt internal links=${linkCount}, ai-catalog entries=${entryCount}, head links present)`);
