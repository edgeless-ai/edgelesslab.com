#!/usr/bin/env node
/** Static export metadata and reference checks. No network, dependencies, or recurring jobs. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SITE = "https://edgelesslab.com";
const DEFAULT_IMAGE = `${SITE}/og-image.webp`;
const errorPaths = new Set(["/404.html", "/404/", "/_not-found/"]);
const developmentPaths = new Set([
  "/total-serialism/app/index-dev.html",
  "/total-serialism/app/pen-plotter/index-dev.html",
  "/total-serialism/app/templates/algorithm-template.html",
]);
const fixturePaths = new Set([...errorPaths, ...developmentPaths]);
export function routeFor(file) {
  let route = "/" + file.split(path.sep).join("/");
  if (route.endsWith("/index.html")) route = route.slice(0, -10);
  return route;
}
function decode(value = "") {
  const entities = {
    amp: "&",
    quot: '"',
    apos: "'",
    lt: "<",
    gt: ">",
    nbsp: " ",
    middot: "·",
    mdash: "—",
    ndash: "–",
  };
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (all, key) => {
    if (key[0] === "#") {
      const n = Number.parseInt(
        key.slice(key[1].toLowerCase() === "x" ? 2 : 1),
        key[1].toLowerCase() === "x" ? 16 : 10,
      );
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : all;
    }
    return entities[key] ?? all;
  });
}
function escape(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function plain(value = "") {
  return decode(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}
function attrs(tag) {
  const result = {};
  for (const m of tag.matchAll(
    /([^\s=<>/]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g,
  ))
    result[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4]);
  return result;
}
export function headMetadata(html) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
  const meta = new Map();
  const links = [];
  for (const m of head.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    meta.set((a.name ?? a.property ?? "").toLowerCase(), a.content ?? "");
  }
  for (const m of head.matchAll(/<link\b[^>]*>/gi)) links.push(attrs(m[0]));
  return {
    title: plain(head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]),
    meta,
    links,
  };
}
export function exclusionFor(route, html) {
  if (
    /^\/google[a-z\d]+\.html$/i.test(route) &&
    /^google-site-verification:/i.test(html.trim())
  )
    return "Google ownership verification token file";
  if (errorPaths.has(route))
    return "Error document; requires explicit noindex and omitted from sitemap";
  if (developmentPaths.has(route))
    return "Development/template fixture; requires explicit noindex and omitted from sitemap";
  if (/\bnoindex\b/i.test(headMetadata(html).meta.get("robots") ?? ""))
    return "Existing explicit noindex document (redirect/private tool/search fixture)";
  return null;
}
export function existingFieldNoteDescriptions(source = "") {
  // Read only existing quoted descriptions from the canonical typed data module; never eval source.
  const result = new Map();
  for (const object of source.matchAll(
    /\{\s*slug:\s*("(?:[^"\\]|\\.)*")[\s\S]*?description:\s*("(?:[^"\\]|\\.)*")/g,
  )) {
    try {
      result.set(JSON.parse(object[1]), JSON.parse(object[2]));
    } catch {
      /* fallback uses existing HTML only */
    }
  }
  return result;
}
export function repairMetadata(html, route, descriptions = new Map()) {
  const reason = exclusionFor(route, html);
  if (reason) {
    // Only exact error/development fixtures get an indexing correction. Other authored robots remain untouched.
    const head = html.match(/<head\b[^>]*>[\s\S]*?<\/head>/i)?.[0] ?? "";
    const robots = [...head.matchAll(/<meta\b[^>]*>/gi)].filter(
      (m) => attrs(m[0]).name?.toLowerCase() === "robots",
    );
    if (
      fixturePaths.has(route) &&
      (!robots.length || robots.some((m) => !/\bnoindex\b/i.test(attrs(m[0]).content ?? ""))) &&
      /<\/head>/i.test(html)
    ) {
      const tag = '<meta name="robots" content="noindex,follow">';
      html = robots.length
        ? html.replace(head, head.replace(/<meta\b[^>]*>/gi, (m) => attrs(m).name?.toLowerCase() === "robots" ? tag : m))
        : html.replace(/<\/head>/i, tag + "\n</head>");
      return {
        html,
        changes: ["robots:noindex,follow (explicit error/development fixture)"],
        excluded: reason,
      };
    }
    return { html, changes: [], excluded: reason };
  }
  if (!/<\/head>/i.test(html))
    return { html, changes: [], error: "Missing closing head" };
  const current = headMetadata(html);
  const changes = [];
  const title =
    current.title || plain(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);
  if (!title)
    return {
      html,
      changes,
      error: "No existing title or H1 to reuse; editorial title required",
    };
  const slug = route.match(/^\/creative-demos\/([^/]+)\/$/)?.[1];
  const paragraphs = Array.from(
    html
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
      .matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi),
    (m) => plain(m[1]),
  );
  const description =
    current.meta.get("description") ||
    descriptions.get(slug) ||
    paragraphs.find((v) => v.length >= 40 && v.length <= 280) ||
    title;
  const append = [];
  if (!current.title) {
    append.push(`<title>${escape(title)}</title>`);
    changes.push("title: existing H1");
  }
  const addMeta = (key, value, property = false) => {
    if (!current.meta.has(key)) {
      append.push(
        `<meta ${property ? "property" : "name"}="${key}" content="${escape(value)}">`,
      );
      changes.push(key);
    }
  };
  addMeta("description", description);
  if (!current.links.some((x) => x.rel?.split(/\s+/).includes("canonical"))) {
    append.push(`<link rel="canonical" href="${SITE}${escape(route)}">`);
    changes.push("canonical");
  }
  if (!current.links.some((x) => x.rel?.split(/\s+/).includes("icon"))) {
    append.push('<link rel="icon" href="/favicon.svg" type="image/svg+xml">');
    changes.push("icon");
  }
  addMeta("og:title", current.meta.get("og:title") || title, true);
  addMeta("og:description", description, true);
  addMeta("og:url", SITE + route, true);
  addMeta("og:type", "website", true);
  addMeta("og:image", DEFAULT_IMAGE, true);
  addMeta("twitter:card", "summary_large_image");
  addMeta("twitter:title", title);
  addMeta("twitter:description", description);
  addMeta("twitter:image", current.meta.get("og:image") || DEFAULT_IMAGE);
  if (append.length)
    html = html.replace(/<\/head>/i, `${append.join("\n")}\n</head>`);
  return { html, changes, excluded: null };
}
function walk(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const file = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...walk(file));
    else if (entry.isFile()) files.push(file);
  }
  return files;
}
function localPath(root, url) {
  const pathname = decodeURIComponent(url.pathname);
  const full = path.resolve(root, "." + pathname);
  if (full !== root && !full.startsWith(root + path.sep)) return null;
  if (fs.existsSync(full) && fs.statSync(full).isFile()) return full;
  if (fs.existsSync(path.join(full, "index.html")))
    return path.join(full, "index.html");
  if (!path.extname(full) && fs.existsSync(full + ".html"))
    return full + ".html";
  return null;
}
export function internalReferences(html, route) {
  const refs = new Map();
  const add = (value, kind) => {
    if (!value || /^(data:|javascript:|mailto:|tel:|#)/i.test(value)) return;
    try {
      const u = new URL(value, SITE + route);
      if (u.origin !== SITE) return;
      u.hash = "";
      u.search = "";
      refs.set(u.href, { url: u.href, kind });
    } catch {
      /* malformed reference is separately visible in document */
    }
  };
  const staticHtml = html
    .replace(/<!--([\s\S]*?)-->/g, "")
    .replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi, "$1</script>");
  for (const match of staticHtml.matchAll(
    /<(a|link|img|script|source|iframe|video|audio)\b[^>]*>/gi,
  )) {
    const a = attrs(match[0]);
    const tag = match[1].toLowerCase();
    add(a.href, tag === "a" ? "anchor" : "asset");
    add(a.src, "asset");
    add(a.poster, "asset");
    if (a.srcset && !a.srcset.trim().startsWith("data:"))
      for (const src of a.srcset.split(","))
        add(src.trim().split(/\s+/)[0], "asset");
  }
  const meta = headMetadata(html);
  add(meta.meta.get("og:image"), "social");
  add(meta.meta.get("twitter:image"), "social");
  const cssContent = decode(staticHtml).replace(
    /url\(\s*(["'])data:[\s\S]*?\1\s*\)/gi,
    "",
  );
  for (const match of cssContent.matchAll(
    /url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/gi,
  ))
    add(match[2], "style");
  return [...refs.values()];
}
export function auditExport(
  root,
  { repair = false, descriptions = new Map(), knownMissing = new Set() } = {},
) {
  root = path.resolve(root);
  const files = walk(root).filter((x) => x.endsWith(".html"));
  const documents = [];
  const failures = [];
  const blocked = [];
  const missing = [];
  const routes = new Set();
  for (const file of files) {
    const relative = path.relative(root, file);
    const route = routeFor(relative);
    routes.add(route);
    let html = fs.readFileSync(file, "utf8");
    const result = repairMetadata(html, route, descriptions);
    if (repair && result.html !== html) {
      fs.writeFileSync(file, result.html);
      html = result.html;
    }
    const reason = exclusionFor(route, html);
    const head = headMetadata(html);
    const issues = [];
    if (route === "/maison/") {
      // Critters sees only the initial DOM; the dialog/status rules must survive
      // export even though their active classes are applied later by JavaScript.
      const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");
      const required = [
        /\.modal\.on\s*\{[^}]*opacity\s*:\s*1\s*[;}]/,
        /\.modal\.on\s*\{[^}]*pointer-events\s*:\s*auto\s*[;}]/,
        /\.modal\.on\s+\.sheet\s*\{[^}]*transform\s*:\s*none\s*[;}]/,
        /\.status\.open\s+\.dot\s*\{/,
      ];
      if (required.some((rule) => !rule.test(styles)))
        failures.push({ route, kind: "missing-interactive-styles" });
    }
    if (
      fixturePaths.has(route) &&
      !/\bnoindex\b/i.test(head.meta.get("robots") ?? "")
    )
      failures.push({ route, kind: "fixture-missing-noindex" });
    if (!reason) {
      if (!head.title) issues.push("title");
      for (const key of [
        "description",
        "og:title",
        "og:description",
        "og:image",
        "twitter:card",
        "twitter:image",
      ])
        if (!head.meta.get(key)) issues.push(key);
      if (!head.links.some((x) => x.rel?.split(/\s+/).includes("canonical")))
        issues.push("canonical");
      if (!head.links.some((x) => x.rel?.split(/\s+/).includes("icon")))
        issues.push("icon");
      if (issues.length)
        failures.push({ route, kind: "metadata", missing: issues });
    }
    documents.push({
      route,
      file: relative,
      exclusion: reason,
      metadataIssues: issues,
      changes: repair ? result.changes : [],
    });
    // Fixture references have literal build tokens/dev-server URLs and are not product navigation.
    if (!fixturePaths.has(route))
      for (const ref of internalReferences(html, route)) {
        const u = new URL(ref.url);
        if (localPath(root, u)) continue;
        const record = { source: route, ...ref };
        missing.push(record);
        const key = `${route}\t${u.pathname}`;
        if (knownMissing.has(key))
          blocked.push({
            ...record,
            reason:
              "Audited archive capture asset absent; requires original asset restoration. Still broken, not a pass.",
          });
        else failures.push({ ...record, kind: "missing-reference" });
      }
  }
  const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
  const raw = Array.from(
    sitemap.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g),
    (x) => new URL(decode(x[1])),
  );
  const sitemapRoutes = raw.map((u) =>
    routeFor(
      decodeURIComponent(u.pathname)
        .replace(/^\//, "")
        .replace(/\/$/, "/index.html"),
    ).replace("//", "/"),
  );
  const sitemapUnique = new Set(sitemapRoutes);
  if (sitemapUnique.size !== raw.length)
    failures.push({
      kind: "duplicate-sitemap-routes",
      count: raw.length - sitemapUnique.size,
    });
  for (const u of raw)
    if (u.origin !== SITE || !localPath(root, u))
      failures.push({ kind: "missing-sitemap-target", url: u.href });
  for (const doc of documents)
    if (doc.exclusion && sitemapUnique.has(doc.route))
      failures.push({
        kind: "excluded-document-in-sitemap",
        route: doc.route,
        reason: doc.exclusion,
      });
  const exclusions = documents
    .filter((x) => !sitemapUnique.has(x.route))
    .map((doc) => {
      const category = errorPaths.has(doc.route)
        ? "error-document"
        : developmentPaths.has(doc.route)
          ? "development-template"
          : doc.exclusion?.startsWith("Google")
            ? "verification-token"
            : doc.exclusion
              ? "explicit-noindex"
              : /^\/creative-demos\/(ditto|site-studies)\/[^/]+\.html$/.test(
                    doc.route,
                  )
                ? "archive-capture-child"
                : "standalone-unsitemapped";
      const rationale =
        doc.exclusion ??
        (category === "archive-capture-child"
          ? "Linked child archive capture with documented missing original assets; exclusion does not hide or repair it."
          : "Exported standalone/archive/tool route. No intentional indexing exclusion proved; content-owner indexing review pending.");
      return { route: doc.route, category, rationale };
    });
  const counts = {};
  for (const entry of exclusions)
    counts[entry.category] = (counts[entry.category] ?? 0) + 1;
  const summary = {
    status: failures.length
      ? "failed"
      : blocked.length
        ? "structural-checks-pass-with-unresolved-archive-blockers"
        : "passed",
    htmlFiles: files.length,
    uniqueRoutes: routes.size,
    sitemapRaw: raw.length,
    sitemapUnique: sitemapUnique.size,
    metadataExclusions: documents.filter((x) => x.exclusion).length,
    changedFiles: documents.filter((x) => x.changes.length).length,
    missingReferenceInstances: missing.length,
    knownBlockedInstances: blocked.length,
    failures: failures.length,
  };
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    scope:
      "All exported HTML metadata and declarative internal HTML/style/social references. No external requests, JavaScript-generated URL discovery, runtime interactions, or legal-content approval.",
    summary,
    documents,
    sitemapExclusions: { counts, routes: exclusions },
    exportedNotSitemap: [...routes].filter((x) => !sitemapUnique.has(x)).sort(),
    failures,
    blocked,
  };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const arg = process.argv.slice(2);
  const value = (name) =>
    arg.includes(name) ? arg[arg.indexOf(name) + 1] : undefined;
  const root = value("--export") ?? "out";
  const output = value("--report");
  const mapFile = value("--known-blockers");
  const source = value("--field-notes") ?? "src/lib/creative-demos.ts";
  const known = mapFile
    ? JSON.parse(fs.readFileSync(mapFile, "utf8")).missingReferences.map(
        (x) => `${x.source}\t${x.targetPath}`,
      )
    : [];
  const result = auditExport(root, {
    repair: arg.includes("--repair"),
    descriptions: existingFieldNoteDescriptions(
      fs.existsSync(source) ? fs.readFileSync(source, "utf8") : "",
    ),
    knownMissing: new Set(known),
  });
  if (output) fs.writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result.summary));
  if (result.failures.length) {
    for (const failure of result.failures.slice(0, 20))
      console.error(JSON.stringify(failure));
    process.exitCode = 1;
  }
}
