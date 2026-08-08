#!/usr/bin/env node
/**
 * run-critters.mjs — Inline critical CSS into edgelesslab.com's static export.
 *
 * Runs after `next build` over every HTML file in out/. For each page:
 *   - Extracts the CSS rules actually used by that page's DOM (critical CSS)
 *   - Inlines them into a single <style> tag in <head>
 *   - Lazy-loads the remainder of each stylesheet (media="print" swap + noscript
 *     fallback) so nothing render-blocking remains
 *   - Prunes the inlined rules from the external stylesheet files (payload
 *     reduction) and deletes stylesheets that become empty
 *
 * This replaces the broken `pnpm exec critters out -d out` postbuild step:
 * the critters npm package ships NO CLI binary, so that command always failed
 * (silently swallowed by the trailing `&& true`). The correct interface is the
 * JS API used here.
 */
import Critters from "critters";
import { readdir, readFile, writeFile, unlink, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../out");

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (entry.name.endsWith(".html")) {
      files.push(full);
    }
  }
  return files;
}

// Merge all css files per page into the critical extraction, and let the
// remaining CSS be pruned so the external files shrink.
const critters = new Critters({
  path: OUT_DIR,
  publicPath: "/",
  preload: "media", // media="print" onload swap — async, not render-blocking
  noscriptFallback: true, // <noscript><link rel=stylesheet></noscript>
  pruneSource: true, // remove inlined rules from external files
  reduceInlineStyles: true,
  mergeStylesheets: true, // one <style> per page
  inlineThreshold: 0,
  minimumExternalSize: 0,
  preloadFonts: true,
  fonts: false,
  logLevel: "warn",
});

const htmlFiles = await walk(OUT_DIR);
console.log(`critters: found ${htmlFiles.length} html files`);

let changed = 0;
let skipped = 0;
const failures = [];

for (const file of htmlFiles) {
  try {
    const html = await readFile(file, "utf8");
    const before = html.length;
    const result = await critters.process(html);
    if (result !== html) {
      await writeFile(file, result);
      changed++;
      const delta = before - result.length;
      if (delta !== 0) {
        console.log(
          `  ${path.relative(OUT_DIR, file)}: html ${(before / 1024).toFixed(1)}KB -> ${(result.length / 1024).toFixed(1)}KB`
        );
      }
    } else {
      skipped++;
    }
  } catch (err) {
    failures.push(`${path.relative(OUT_DIR, file)}: ${err.message}`);
  }
}

// Remove external stylesheets that became empty after pruning (no below-fold CSS left).
const cssFiles = await walkCSS(OUT_DIR);
let removed = 0;
for (const css of cssFiles) {
  try {
    const s = await stat(css);
    if (s.size === 0) {
      await unlink(css);
      removed++;
    }
  } catch {}
}

console.log(
  `critters: ${changed} files inlined, ${skipped} unchanged, ${removed} empty css removed, ${failures.length} failures`
);
if (failures.length) {
  for (const f of failures.slice(0, 20)) console.error(`  FAIL ${f}`);
  process.exit(1);
}

async function walkCSS(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkCSS(full)));
    } else if (entry.name.endsWith(".css")) {
      files.push(full);
    }
  }
  return files;
}
