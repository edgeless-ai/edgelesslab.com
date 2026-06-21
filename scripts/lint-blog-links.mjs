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

  for (const slug of collectSlugs(blogSrc, "posts")) {
    appRoutes.add(`/blog/${slug}`);
  }
  for (const slug of collectSlugs(blogNewPostsSrc, "newPosts")) {
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

  // Service route: /services/private-ai-systems (only one sub-route present)
  appRoutes.add("/services/private-ai-systems");
}

const appRoutes = new Set();

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
