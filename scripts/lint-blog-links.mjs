#!/usr/bin/env node
/**
 * Validate internal links in blog post content.
 *
 * Blog posts in src/lib/blog.ts use markdown-style links [text](/path)
 * inside HTML content strings. This script extracts all internal links
 * and verifies each one points to a known route.
 *
 * Checked route types:
 *   /blog/[slug]       -> slug must exist in blog.ts
 *   /products/[slug]   -> slug must exist in data.ts products array
 *   /products          -> products index (always valid)
 *   /lab/[slug]        -> slug must exist in data.ts experiments array
 *   /lab               -> lab index (always valid)
 *   /projects/[slug]   -> slug must exist in data.ts projects array
 *   /field-notes       -> static route (always valid)
 *   /about, /knowledge, /privacy, /terms -> static routes
 *   /pen-plotter/*, /tartanism/*, /total-serialism/*, /flow-viz/*
 *                      -> standalone field notes apps (always valid)
 *
 * Run: node scripts/lint-blog-links.mjs
 * Exits non-zero if any broken links are found.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const blogSrc = readFileSync(resolve(ROOT, "src/lib/blog.ts"), "utf8");
const dataSrc = readFileSync(resolve(ROOT, "src/lib/data.ts"), "utf8");

// ---------------------------------------------------------------------------
// Extract slugs from source files
// ---------------------------------------------------------------------------

/** Pull all `slug: "value"` from a source string within a named array. */
function extractSlugs(src, arrayName) {
  const marker = `export const ${arrayName}`;
  const start = src.indexOf(marker);
  if (start === -1) return new Set();

  // Grab from the marker to the closing `\n];\n` or `\n];` at EOF.
  const block = src.slice(start);
  const end = block.search(/\n\];\s*(\n|$)/);
  const body = end === -1 ? block : block.slice(0, end);

  const slugs = new Set();
  const re = /slug:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    slugs.add(m[1]);
  }
  return slugs;
}

// Blog posts: allPosts array in blog.ts
function extractBlogSlugs(src) {
  const marker = "const allPosts: BlogPost[] = [";
  const start = src.indexOf(marker);
  if (start === -1) return new Set();
  const block = src.slice(start);
  const slugs = new Set();
  const re = /slug:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    slugs.add(m[1]);
  }
  return slugs;
}

const blogSlugs = extractBlogSlugs(blogSrc);
const productSlugs = extractSlugs(dataSrc, "products");
const experimentSlugs = extractSlugs(dataSrc, "experiments");
const projectSlugs = extractSlugs(dataSrc, "projects");

// ---------------------------------------------------------------------------
// Static routes and standalone apps
// ---------------------------------------------------------------------------

const STATIC_ROUTES = new Set([
  "/about",
  "/blog",
  "/field-notes",
  "/knowledge",
  "/lab",
  "/privacy",
  "/products",
  "/projects",
  "/terms",
]);

/** Standalone field notes apps served from /public as static HTML. */
const STANDALONE_PREFIXES = [
  "/pen-plotter/",
  "/tartanism/",
  "/total-serialism/",
  "/flow-viz/",
];

// ---------------------------------------------------------------------------
// Extract internal links from blog posts and validate
// ---------------------------------------------------------------------------

/** Extract markdown links [text](/path) returning { path, slug, lineApprox }. */
function extractInternalLinks(src) {
  const links = [];
  // Match markdown links whose target starts with /
  const re = /\]\(\/([^)]*)\)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const path = "/" + m[1];
    // Approximate line number by counting newlines before match
    const lineApprox = src.slice(0, m.index).split("\n").length;
    links.push({ path, lineApprox });
  }
  return links;
}

/**
 * Walk the blog source and extract links per post.
 * Returns array of { postSlug, path, lineApprox }.
 */
function extractLinksPerPost(src) {
  const results = [];
  // Find each post by its slug declaration, then grab the content block
  const postRe = /slug:\s*"([^"]+)"[\s\S]*?content:\s*`/g;
  let pm;
  while ((pm = postRe.exec(src)) !== null) {
    const postSlug = pm[1];
    const contentStart = pm.index + pm[0].length;
    // Find the closing backtick for the template literal.
    // Walk forward, handling escaped backticks.
    let depth = 0;
    let i = contentStart;
    while (i < src.length) {
      if (src[i] === "\\" && i + 1 < src.length) {
        i += 2; // skip escaped char
        continue;
      }
      if (src[i] === "`") {
        break;
      }
      i++;
    }
    const contentBlock = src.slice(contentStart, i);
    const links = extractInternalLinks(contentBlock);
    for (const link of links) {
      results.push({ postSlug, ...link });
    }
  }
  return results;
}

function validatePath(path) {
  // Normalize trailing slash for comparison
  const clean = path.replace(/\/$/, "") || "/";

  // Homepage
  if (clean === "/") return true;

  // Static routes
  if (STATIC_ROUTES.has(clean)) return true;

  // Standalone field notes apps
  for (const prefix of STANDALONE_PREFIXES) {
    if (path.startsWith(prefix) || path === prefix.slice(0, -1)) return true;
  }

  // /blog/[slug]
  const blogMatch = clean.match(/^\/blog\/([^/]+)$/);
  if (blogMatch) return blogSlugs.has(blogMatch[1]);

  // /products/[slug]
  const prodMatch = clean.match(/^\/products\/([^/]+)$/);
  if (prodMatch) return productSlugs.has(prodMatch[1]);

  // /lab/[slug]
  const labMatch = clean.match(/^\/lab\/([^/]+)$/);
  if (labMatch) return experimentSlugs.has(labMatch[1]);

  // /projects/[slug]
  const projMatch = clean.match(/^\/projects\/([^/]+)$/);
  if (projMatch) return projectSlugs.has(projMatch[1]);

  return false;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const allLinks = extractLinksPerPost(blogSrc);
const broken = [];

for (const link of allLinks) {
  if (!validatePath(link.path)) {
    broken.push(link);
  }
}

if (broken.length === 0) {
  console.log(
    `lint-blog-links: ✓ all ${allLinks.length} internal link(s) across ` +
    `${blogSlugs.size} blog posts are valid`
  );
  process.exit(0);
}

console.error(
  `lint-blog-links: ✗ ${broken.length} broken internal link(s) found.\n`
);
for (const b of broken) {
  console.error(`  post: "${b.postSlug}"  link: ${b.path}  (near line ${b.lineApprox})`);
}

console.error(
  "\nEach link must resolve to a known route. Fix paths:\n" +
  "  - /blog/<slug>: slug must exist in allPosts array in blog.ts\n" +
  "  - /products/<slug>: slug must exist in products array in data.ts\n" +
  "  - /lab/<slug>: slug must exist in experiments array in data.ts\n" +
  "  - /projects/<slug>: slug must exist in projects array in data.ts\n"
);
process.exit(1);
