#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const files = ["src/lib/blog.ts", "src/lib/blog-new-posts.ts", "src/lib/data.ts"];
const appRoutes = new Set([
  "/",
  "/about",
  "/agents",
  "/blog",
  "/knowledge",
  "/lab",
  "/privacy",
  "/products",
  "/projects",
  "/terms",
]);

function read(path) {
  return readFileSync(resolve(ROOT, path), "utf8");
}

function collectSlugs(src, exportName) {
  const marker = `export const ${exportName}`;
  const start = src.indexOf(marker);
  if (start === -1) return [];
  const section = src.slice(start);
  const slugs = [];
  const slugRegex = /slug:\s*"([^"]+)"/g;
  let match;
  while ((match = slugRegex.exec(section)) !== null) {
    slugs.push(match[1]);
  }
  return slugs;
}

function addKnownRoutes() {
  const blogSrc = read("src/lib/blog.ts");
  const dataSrc = read("src/lib/data.ts");

  for (const slug of collectSlugs(blogSrc, "posts")) {
    appRoutes.add(`/blog/${slug}`);
  }
  for (const slug of collectSlugs(dataSrc, "products")) {
    appRoutes.add(`/products/${slug}`);
  }
  for (const slug of collectSlugs(dataSrc, "projects")) {
    appRoutes.add(`/projects/${slug}`);
  }
  for (const slug of collectSlugs(dataSrc, "experiments")) {
    appRoutes.add(`/lab/${slug}`);
  }

  appRoutes.add("/blog/soul-memo");
  appRoutes.add("/blog/soul-memo/mark-cuban-effort");
}

function normalizeUrl(url) {
  if (!url.startsWith("/") || url.startsWith("//")) return null;
  const clean = url.split(/[?#]/, 1)[0].replace(/\/+$/, "");
  return clean === "" ? "/" : clean;
}

function routeExists(route) {
  if (appRoutes.has(route)) return true;
  const publicPath = resolve(ROOT, "public", route.slice(1), "index.html");
  const staticPath = resolve(ROOT, "public", route.slice(1));
  return existsSync(publicPath) || existsSync(staticPath);
}

addKnownRoutes();

const linkRegex = /\[[^\]]+\]\((\/[^)\s]+)\)|href:\s*["`]([^"`]*\/[^"`]*)["`]/g;
const failures = [];

for (const file of files) {
  const src = read(file);
  let match;
  while ((match = linkRegex.exec(src)) !== null) {
    const rawUrl = match[1] ?? match[2];
    const route = normalizeUrl(rawUrl);
    if (!route || route.startsWith("/_next") || route.startsWith("/api")) continue;
    if (!routeExists(route)) {
      failures.push({ file, url: rawUrl, route });
    }
  }
}

if (failures.length > 0) {
  console.error(`lint-blog-links: ${failures.length} broken internal link(s)`);
  for (const failure of failures) {
    console.error(`  ${failure.file}: ${failure.url} -> ${failure.route}`);
  }
  process.exit(1);
}

console.log("lint-blog-links: all internal links resolve");
