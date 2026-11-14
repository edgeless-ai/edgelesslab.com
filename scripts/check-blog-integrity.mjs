#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

function requireLocal(root, name) {
  // The only runtime dependencies of the blog route are these two registries.
  if (name !== './blog-new-posts') throw new Error(`Unexpected blog registry import: ${name}`);
  return evaluateRegistry(root, 'src/lib/blog-new-posts.ts');
}

export function evaluateRegistry(root, relativePath) {
  const ts = require('typescript');
  const source = readFileSync(join(root, relativePath), 'utf8');
  if (relativePath === 'src/lib/blog.ts' && !/const allPosts\s*:/.test(source)) {
    throw new Error('Cannot inspect raw blog registry: allPosts declaration changed');
  }
  const output = ts.transpileModule(source, {
    fileName: relativePath,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  const errors = output.diagnostics?.filter((d) => d.category === ts.DiagnosticCategory.Error) ?? [];
  if (errors.length) throw new Error(`Cannot transpile ${relativePath}: ${errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('; ')}`);
  const module = { exports: {} };
  const code = output.outputText + (relativePath === 'src/lib/blog.ts' ? '\nmodule.exports.__allPosts = allPosts;' : '');
  runInNewContext(code, { module, exports: module.exports, require: (name) => requireLocal(root, name), Date, Set }, { filename: relativePath, timeout: 5000 });
  return module.exports;
}

function assertRouteSources(root, route) {
  const ts = require('typescript');
  const tree = ts.createSourceFile(route, readFileSync(join(root, route), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  // A new route dependency must be inspected before it can introduce another registry.
  const helpers = new Set([
    '@/lib/blog-types', '@/lib/metadata', '@/lib/data',
    '@/components/nav', '@/components/footer', '@/components/blog-client',
    '@/components/json-ld', '@/components/blog-article', '@/components/related-posts',
    '@/components/etsy-callout', 'next/image', 'next/navigation', 'next/link',
  ]);
  let readsPosts = false;
  function visit(node) {
    if (ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly) {
      const name = node.moduleSpecifier.text;
      const bindings = node.importClause?.namedBindings;
      if (name === '@/lib/blog' && bindings && ts.isNamedImports(bindings) &&
          bindings.elements.some((e) => !e.isTypeOnly && e.name.text === 'posts' && (e.propertyName?.text ?? e.name.text) === 'posts')) {
        readsPosts = true;
      } else if (!helpers.has(name)) {
        throw new Error(`${route}: uninspected renderer import ${name}; update registry coverage`);
      }
    }
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(tree) === 'require')) {
      throw new Error(`${route}: uninspected dynamic renderer import; update registry coverage`);
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  if (!readsPosts) throw new Error(`${route} no longer reads @/lib/blog posts; update this checker to cover the new renderer`);
}

export function loadRegistries(root = ROOT) {
  // Fail closed if the actual blog index or detail route changes its content sources.
  for (const route of ['src/app/blog/page.tsx', 'src/app/blog/[slug]/page.tsx']) assertRouteSources(root, route);
  const { posts, __allPosts: allPosts } = evaluateRegistry(root, 'src/lib/blog.ts');
  const { newPosts } = evaluateRegistry(root, 'src/lib/blog-new-posts.ts');
  if (!Array.isArray(posts) || !Array.isArray(allPosts) || !Array.isArray(newPosts)) throw new Error('Blog registry shape changed');
  if (!newPosts.every((p) => allPosts.some((entry) => entry.slug === p.slug && entry.content === p.content))) {
    throw new Error('newPosts is not included in the rendered blog registry');
  }
  const firstBySlug = new Map();
  for (const post of allPosts) if (!firstBySlug.has(post.slug)) firstBySlug.set(post.slug, post);
  const unique = [...firstBySlug.keys()];
  if (posts.length !== unique.length || posts.some((p, i) => p.slug !== unique[i] || JSON.stringify(p) !== JSON.stringify(firstBySlug.get(p.slug)))) {
    throw new Error('Rendered posts differ from raw registry inventory');
  }
  return { posts, allPosts };
}

export function parseMarkdown(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error('Missing or malformed Markdown frontmatter');
  return {
    frontmatter: match[1],
    body: match[2].trim(),
    slug: match[1].match(/^slug:\s*['"]?([^'"\s]+)['"]?\s*$/m)?.[1],
  };
}

const AGENTS = 'Scribe|Hive|Kilo|Virgil|Beau|Atlas|Critic|Verifier|Hermes';
const AGENT_NAME = new RegExp(`\\b(?:${AGENTS})\\b`, 'i');
const AGENT_BYLINE = new RegExp(`\\b(?:written|authored|drafted|edited)\\s+by\\s*[:—-]?\\s*@?(?:${AGENTS})\\b|^\\s*(?:by|author|written by)\\s*[:—-]?\\s*@?(?:${AGENTS})\\b`, 'im');

function hasAgentByline(text) {
  const plain = text.replace(/<[^>]*>/g, ' ').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`~]/g, '');
  return AGENT_BYLINE.test(plain);
}

function hasMarkdownAuthor(frontmatter) {
  const fields = frontmatter.matchAll(/^(?:author|authors|byline|writtenBy)\s*:[^\n]*(?:\n[ \t]+[^\n]*)*/gim);
  return [...fields].some(([field]) => AGENT_NAME.test(field));
}

function checkDate(post, now, errors) {
  const date = post.date;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ||
      new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
    errors.push(`${post.slug}: date is not a valid ISO calendar date (${String(date)})`);
  } else if (date > now.toISOString().slice(0, 10)) {
    errors.push(`${post.slug}: date ${date} is after build date ${now.toISOString().slice(0, 10)}`);
  }
}

export function validate({ posts, allPosts, markdownFiles, exceptions, patterns, now = new Date() }) {
  const errors = [];
  const seen = new Set();
  const files = new Map(Object.entries(markdownFiles));
  const missing = new Set(exceptions);
  if (missing.size !== exceptions.length) errors.push('Exception allowlist contains duplicate slugs');
  if (!Array.isArray(patterns) || !patterns.length) errors.push('Voice bans are empty');
  const rules = patterns.map(({ name, regex }) => {
    if (!name || !regex) throw new Error('Malformed voice ban');
    return [name, new RegExp(regex, 'im')];
  });
  for (const post of allPosts) {
    if (typeof post.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug)) {
      errors.push(`Invalid registry slug: ${String(post.slug)}`);
      continue;
    }
    if (seen.has(post.slug)) errors.push(`${post.slug}: duplicate registry slug (even if renderer deduplicates it)`);
    seen.add(post.slug);
    checkDate(post, now, errors);
    if (typeof post.content !== 'string' || !post.content.trim()) errors.push(`${post.slug}: empty/non-string registry body`);
    const text = Object.values(post).flat().filter((v) => typeof v === 'string').join('\n');
    if (hasAgentByline(text) || Object.entries(post).some(([key, value]) => /^(author|authors|byline|writtenBy)$/i.test(key) && AGENT_NAME.test(JSON.stringify(value) ?? ''))) {
      errors.push(`${post.slug}: agent authorship/byline`);
    }
    for (const [name, rule] of rules) if (rule.test(text)) errors.push(`${post.slug}: banned voice pattern (${name})`);
    if (!files.has(post.slug)) {
      if (!missing.has(post.slug)) errors.push(`${post.slug}: missing Markdown copy (not allowlisted)`);
    } else {
      if (missing.has(post.slug)) errors.push(`${post.slug}: stale missing-Markdown exception; copy now exists`);
      const { frontmatter, body, slug } = files.get(post.slug);
      if (slug !== post.slug) errors.push(`${post.slug}: Markdown frontmatter slug differs (${String(slug)})`);
      if (body !== post.content.trim()) errors.push(`${post.slug}: registry/Markdown bodies differ`);
      if (hasMarkdownAuthor(frontmatter) || hasAgentByline(body)) errors.push(`${post.slug}: Markdown agent authorship/byline`);
      for (const [name, rule] of rules) if (rule.test(body)) errors.push(`${post.slug}: Markdown banned voice pattern (${name})`);
    }
  }
  for (const slug of missing) if (!seen.has(slug)) errors.push(`${slug}: exception does not name a rendered post`);
  for (const slug of files.keys()) if (!seen.has(slug)) errors.push(`${slug}: orphan Markdown file (not in rendered registry)`);
  if (posts.length !== seen.size) errors.push(`Rendered count ${posts.length} differs from unique registry count ${seen.size}`);
  return errors;
}

function indexLinks(html, baseUrl) {
  const links = new Set();
  const visible = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|textarea|title|template|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  // Tokenize entire tags (including quoted attributes), so text in another
  // element's attribute cannot impersonate an anchor.
  for (const [tag, name] of visible.matchAll(/<([a-z][\w:-]*)\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi)) {
    if (name.toLowerCase() !== 'a') continue;
    const attrs = tag.slice(name.length + 1, -1);
    for (const attr of attrs.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
      if (attr[1].toLowerCase() !== 'href') continue;
      try {
        const url = new URL(attr[2] ?? attr[3] ?? attr[4] ?? '', baseUrl);
        if (url.origin === new URL(baseUrl).origin) links.add(url.pathname.replace(/\/$/, ''));
      } catch { /* malformed href is not publication evidence */ }
    }
  }
  return links;
}

export async function checkLive(posts, { baseUrl = 'https://edgelesslab.com', fetcher = fetch } = {}) {
  const errors = [];
  async function get(url) {
    const response = await fetcher(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(15000) });
    if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
    return response.text();
  }
  let links;
  try { links = indexLinks(await get(`${baseUrl}/blog/`), baseUrl); }
  catch (error) { errors.push(`/blog/: ${error.message}`); }
  for (const post of posts) {
    const path = `/blog/${encodeURIComponent(post.slug)}/`;
    if (links && !links.has(path.slice(0, -1))) errors.push(`${post.slug}: absent from /blog/ index links`);
    try { await get(`${baseUrl}${path}`); }
    catch (error) { errors.push(`${post.slug}: live GET failed (${error.message})`); }
  }
  return errors;
}

export async function run({ root = ROOT, rulesRoot = ROOT, live = false, now = new Date(), fetcher } = {}) {
  const { posts, allPosts } = loadRegistries(root);
  const contentDir = join(root, 'content/blog');
  const markdownFiles = {};
  for (const filename of readdirSync(contentDir).filter((f) => f.endsWith('.md'))) {
    const slug = filename.slice(0, -3);
    try { markdownFiles[slug] = parseMarkdown(readFileSync(join(contentDir, filename), 'utf8')); }
    catch (error) { throw new Error(`content/blog/${filename}: ${error.message}`); }
  }
  const exceptions = JSON.parse(readFileSync(join(rulesRoot, 'scripts/blog-integrity-exceptions.json'), 'utf8')).withoutMarkdown;
  const patterns = JSON.parse(readFileSync(join(rulesRoot, 'docs/blog-integrity-rules.json'), 'utf8')).bannedPatterns;
  if (!Array.isArray(exceptions)) throw new Error('Missing withoutMarkdown allowlist');
  const errors = validate({ posts, allPosts, markdownFiles, exceptions, patterns, now });
  console.log(`Blog integrity: ${posts.length} rendered posts, ${allPosts.length} raw entries, ${Object.keys(markdownFiles).length} Markdown copies, ${exceptions.length} named exceptions`);
  if (live) {
    const liveErrors = await checkLive(posts, { fetcher });
    console.log(`Live GET/index: checked ${posts.length} slugs against https://edgelesslab.com/blog/; ${liveErrors.length} errors`);
    errors.push(...liveErrors);
  }
  for (const error of errors) console.error(`FAIL ${error}`);
  console.log(`Blog integrity: ${errors.length} error(s)`);
  return errors.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.slice(2).some((a) => a !== '--live')) {
    console.error('Usage: npm run check:blog-integrity [-- --live]');
    process.exitCode = 2;
  } else {
    run({ live: process.argv.includes('--live') }).then((exit) => { process.exitCode = exit; }).catch((error) => {
      console.error(`Blog integrity cannot run: ${error.stack ?? error}`);
      process.exitCode = 2;
    });
  }
}
