#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const files = ["src/lib/blog.ts", "src/lib/blog-new-posts.ts", "src/lib/data.ts"];

function read(path) {
  return readFileSync(resolve(ROOT, path), "utf8");
}

function getVariableArrayContent(src, varName) {
  // Look for: const varName or export const varName
  let pos = src.indexOf(`const ${varName}`);
  if (pos === -1) {
    pos = src.indexOf(`export const ${varName}`);
  }
  if (pos === -1) {
    // console.log(`Variable ${varName} not found`);
    return null;
  }
  // Find the '=' after the variable declaration (skip type annotations)
  let equalsPos = src.indexOf('=', pos);
  if (equalsPos === -1) {
    // console.log(`No '=' found for ${varName}`);
    return null;
  }
  // Find the first '[' after the '='
  let bracketStart = src.indexOf('[', equalsPos);
  if (bracketStart === -1) {
    // console.log(`No opening bracket found for ${varName}`);
    return null;
  }
  // Now find the matching closing bracket
  let depth = 0;
  let i = bracketStart;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '[') depth++;
    else if (ch === ']') depth--;
    if (depth === 0) {
      // Found matching closing bracket
      return src.slice(bracketStart + 1, i); // exclude the brackets
    }
    i++;
  }
  // console.log(`Could not find matching closing bracket for ${varName}`);
  return null;
}
function getSlugsFromVariableArray(arrayContent) {
  if (arrayContent === null) return [];
  const slugRegex = /slug:\s*"([^"]+)"/g;
  let match;
  const slugs = [];
  while ((match = slugRegex.exec(arrayContent)) !== null) {
    slugs.push(match[1]);
  }
  return slugs;
}

function isAppRouteDir(name) {
  // Skip non-route artifacts in src/app/
  if (name.startsWith(".")) return false;
  if (name.startsWith("_")) return false; // _components, _lib internals
  if (name.endsWith(".tsx") || name.endsWith(".ts") || name.endsWith(".css") || name.endsWith(".ico") || name.endsWith(".bak")) {
    return false;
  }
  return true;
}

function discoverAppRoutes() {
  const appDir = resolve(ROOT, "src/app");
  const routes = new Set(["/"]);
  if (!existsSync(appDir)) return routes;
  for (const entry of readdirSync(appDir)) {
    if (!isAppRouteDir(entry)) continue;
    const full = join(appDir, entry);
    const st = statSync(full);
    if (!st.isDirectory()) continue;
    // A directory is a route if it contains page.tsx (top-level) OR is a dynamic param route
    const hasPage = existsSync(resolve(full, "page.tsx"));
    if (hasPage) {
      routes.add(`/${entry}`);
    }
  }
  return routes;
}

function discoverPublicRoutes() {
  // Treat anything under public/ as a static file/href root.
  // We add directories as routes (so /creative-demos/* resolves) and
  // static files too (so a direct link to /agent-kit.html resolves).
  const publicDir = resolve(ROOT, "public");
  const routes = new Set();
  if (!existsSync(publicDir)) return routes;
  for (const entry of readdirSync(publicDir)) {
    if (entry.startsWith(".")) continue;
    const full = join(publicDir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      routes.add(`/${entry}`);
      // Also accept deep paths: /creative-demos/foo resolves via index.html under it
      for (const sub of readdirSync(full)) {
        if (sub.startsWith(".")) continue;
        const subFull = join(full, sub);
        let subPath = `/${entry}/${sub}`;
        // Trim .html / .webp etc only for the leaf file
        const dotIdx = sub.lastIndexOf(".");
        if (dotIdx > 0) subPath = subPath.slice(0, dotIdx);
        routes.add(subPath);
      }
    } else {
      let p = `/${entry}`;
      const dotIdx = entry.lastIndexOf(".");
      if (dotIdx > 0) p = p.slice(0, dotIdx);
      else p = p.replace(/\/$/, "");
      routes.add(p);
    }
  }
  return routes;
}

function addKnownRoutes() {
  const blogSrc = read("src/lib/blog.ts");
  const blogNewPostsSrc = read("src/lib/blog-new-posts.ts");
  const dataSrc = read("src/lib/data.ts");

  for (const route of discoverAppRoutes()) {
    appRoutes.add(route);
  }
  for (const route of discoverPublicRoutes()) {
    appRoutes.add(route);
  }

  // blog.ts: use allPosts
  const blogArray = getVariableArrayContent(blogSrc, "allPosts");
  for (const slug of getSlugsFromVariableArray(blogArray)) {
    appRoutes.add(`/blog/${slug}`);
  }
  // blog-new-posts.ts: use newPosts
  const blogNewPostsArray = getVariableArrayContent(blogNewPostsSrc, "newPosts");
  for (const slug of getSlugsFromVariableArray(blogNewPostsArray)) {
    appRoutes.add(`/blog/${slug}`);
  }
  // data.ts: use products, projects, experiments
  const productsArray = getVariableArrayContent(dataSrc, "products");
  for (const slug of getSlugsFromVariableArray(productsArray)) {
    appRoutes.add(`/products/${slug}`);
  }
  const projectsArray = getVariableArrayContent(dataSrc, "projects");
  for (const slug of getSlugsFromVariableArray(projectsArray)) {
    appRoutes.add(`/projects/${slug}`);
  }
  const experimentsArray = getVariableArrayContent(dataSrc, "experiments");
  for (const slug of getSlugsFromVariableArray(experimentsArray)) {
    appRoutes.add(`/lab/${slug}`);
  }

  appRoutes.add("/blog/soul-memo");
  appRoutes.add("/blog/soul-memo/mark-cuban-effort");

  // Service route: /services/private-ai-systems (only one sub-route present)
  appRoutes.add("/services/private-ai-systems");
}

const appRoutes = new Set();
addKnownRoutes();

console.log("=== Collected slugs from blog.ts allPosts ===");
console.log(getSlugsFromVariableArray(getVariableArrayContent(read("src/lib/blog.ts"), "allPosts")));
console.log("=== Collected slugs from blog-new-posts.ts newPosts ===");
console.log(getSlugsFromVariableArray(getVariableArrayContent(read("src/lib/blog-new-posts.ts"), "newPosts")));
console.log("=== Collected slugs from data.ts products ===");
console.log(getSlugsFromVariableArray(getVariableArrayContent(read("src/lib/data.ts"), "products")));
console.log("=== Collected slugs from data.ts projects ===");
console.log(getSlugsFromVariableArray(getVariableArrayContent(read("src/lib/data.ts"), "projects")));
console.log("=== Collected slugs from data.ts experiments ===");
console.log(getSlugsFromVariableArray(getVariableArrayContent(read("src/lib/data.ts"), "experiments")));
console.log("=== Number of appRoutes ===");
console.log(appRoutes.size);
console.log("=== First 20 appRoutes ===");
console.log([...appRoutes].slice(0, 20));

// Check specific routes
const targetSlugs = [
  "youtube-mining-ai-agents",
  "self-healing-ai-infrastructure",
  "how-claude-code-memory-works",
  "the-hook-that-saved-my-codebase",
  "12-dollar-ai-operations-team",
  "agents-that-talk-to-each-other",
  "building-ai-agent-infrastructure-solo"
];
console.log("=== Checking target slugs ===");
for (const slug of targetSlugs) {
  const route = `/blog/${slug}`;
  console.log(`${route}: ${appRoutes.has(route)}`);
}

const linkRegex = /\\[[^\]]+]\((\/[^\s]+)\)|href:\s*["`]([^"`]*\/[^"`]*)["`]/g;
const failures = [];

for (const file of files) {
  const src = read(file);
  let match;
  while ((match = linkRegex.exec(src)) !== null) {
    const rawUrl = match[1] ?? match[2];
    // console.log(`Found link: ${rawUrl}`);
    const route = normalizeUrl(rawUrl);
    if (!route || route.startsWith("/_next") || route.startsWith("/api")) continue;
    if (!routeExists(route)) {
      failures.push({ file, url: rawUrl, route });
    }
  }
}

function normalizeUrl(url) {
  if (!url.startsWith("/") || url.startsWith("//")) return null;
  const clean = url.split(/[?#]/, 1)[0].replace(/\/+$/, "");
  return clean === "" ? "/" : clean;
}

function routeExists(route) {
  if (appRoutes.has(route)) return true;
  // Static export fallback: file under public/
  const publicPath = resolve(ROOT, "public", route.slice(1), "index.html");
  const staticPath = resolve(ROOT, "public", route.slice(1));
  return existsSync(publicPath) || existsSync(staticPath);
}

if (failures.length > 0) {
  console.error(`lint-blog-links: ${failures.length} broken internal link(s)`);
  for (const failure of failures) {
    console.error(`  ${failure.file}: ${failure.url} -> ${failure.route}`);
  }
  process.exit(1);
}

console.log("lint-blog-links: all internal links resolve");