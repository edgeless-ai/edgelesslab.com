#!/usr/bin/env node
/**
 * Lint rule discovered by the 2026-04-08 lab audit:
 *
 *   "If a lab experiment is status:Live or status:Active, it must either
 *    have an `href` field OR have a slug-specific render branch in
 *    src/app/lab/[slug]/experiment-detail.tsx."
 *
 * Without this rule, experiments can claim to be "Live" while actually
 * being plain text descriptions of features that don't exist on the page.
 * The audit found 4 violations of this pattern (strange-attractors,
 * knowledge-graph, mastra-dashboard, pen-plotter-pipeline). All 4 are
 * fixed; this script makes sure they don't come back.
 *
 * Run: node scripts/lint-experiments.mjs
 * Exits non-zero if any violations are found.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const dataPath = resolve(ROOT, "src/lib/data.ts");
const detailPath = resolve(ROOT, "src/app/lab/[slug]/experiment-detail.tsx");

const dataSrc = readFileSync(dataPath, "utf8");
const detailSrc = readFileSync(detailPath, "utf8");

// Find the experiments array bounds.
const expStart = dataSrc.indexOf("export const experiments = [");
if (expStart === -1) {
  console.error("lint-experiments: could not find experiments array in data.ts");
  process.exit(2);
}
// Find the matching closing bracket-semicolon. Naive but correct
// because the experiments array is the last export in this file.
const expBlock = dataSrc.slice(expStart);
const expEndRel = expBlock.indexOf("\n];\n");
if (expEndRel === -1) {
  console.error("lint-experiments: could not find experiments array close in data.ts");
  process.exit(2);
}
const expBody = expBlock.slice(0, expEndRel);

// Split into entries by `\n  {\n` (top-level object opens). The first
// entry begins right after the array open `[`.
const entries = expBody.split(/\n  \{\n/).slice(1);

// Discover slug-specific render branches in experiment-detail.tsx by
// matching the existing pattern `experiment.slug === "<slug>"`.
const renderedSlugs = new Set();
const renderRegex = /experiment\.slug\s*===\s*"([^"]+)"/g;
let m;
while ((m = renderRegex.exec(detailSrc)) !== null) {
  renderedSlugs.add(m[1]);
}

const violations = [];

for (const entry of entries) {
  const slugMatch = entry.match(/slug:\s*"([^"]+)"/);
  const statusMatch = entry.match(/status:\s*"([^"]+)"/);
  if (!slugMatch || !statusMatch) continue;

  const slug = slugMatch[1];
  const status = statusMatch[1];
  if (status !== "Live" && status !== "Active") continue;

  const hasHref = /\bhref:\s*["`]/.test(entry);
  const hasComponent = renderedSlugs.has(slug);

  if (!hasHref && !hasComponent) {
    violations.push({ slug, status });
  }
}

if (violations.length === 0) {
  console.log(
    `lint-experiments: ✓ all ${entries.length} experiments pass ` +
    `(every Live/Active entry has an href or a slug-specific render branch)`
  );
  process.exit(0);
}

console.error(
  `lint-experiments: ✗ ${violations.length} violation(s) found.\n\n` +
  `Lab experiments with status "Live" or "Active" must either have an\n` +
  `\`href\` field OR a slug-specific render branch in:\n` +
  `  src/app/lab/[slug]/experiment-detail.tsx\n\n` +
  `Without one of those, the page is text-only and the description\n` +
  `is making promises the live page does not deliver.\n`
);
console.error("Violations:");
for (const v of violations) {
  console.error(`  - ${v.slug} (status: ${v.status})`);
}
console.error(
  "\nFix paths:\n" +
  "  1. Add `href: \"/path/\"` to point at an actual artifact, or\n" +
  "  2. Build a custom React component and add a `experiment.slug === \"<slug>\"`\n" +
  "     branch in experiment-detail.tsx, or\n" +
  "  3. Demote the entry to `status: \"Draft\"` and soften the description.\n"
);
process.exit(1);
