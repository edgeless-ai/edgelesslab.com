import fs from "node:fs";
import path from "node:path";
import type { BlogPost } from "./blog-types";

// js-yaml is present in node_modules but not typed; add `@types/js-yaml` before
// wiring this loader into production, or replace with `gray-matter`.
// @ts-ignore
import yaml from "js-yaml";

const BLOG_DIR = path.join(process.cwd(), "content/blog");

/**
 * Loader sketch for the markdown-based blog pipeline.
 *
 * Reads `content/blog/<slug>.md` files, parses YAML frontmatter, and returns
 * objects matching the existing `BlogPost` interface so the renderer in
 * `src/app/blog/[slug]/page.tsx` can keep using `posts.find(...)` and
 * `renderMarkdown(post.content)` with minimal changes.
 *
 * This is a REVIEW DRAFT. It is not wired into `src/app/blog/[slug]/page.tsx`
 * yet; the page still imports `posts` from `./blog` (the hand-authored TS
 * array). The cut-over is:
 *
 *   1. Review the emitted markdown files in `content/blog/`.
 *   2. Replace `import { posts } from "@/lib/blog"` in page.tsx with
 *      `import { loadAllPosts } from "@/lib/blog-loader"`.
 *   3. Call `const posts = await loadAllPosts()` once per request.
 *   4. Delete or archive `src/lib/blog.ts` and `src/lib/blog-new-posts.ts`.
 */

interface ParsedMarkdown {
  frontmatter: Record<string, unknown>;
  content: string;
}

function parseMarkdown(filePath: string): ParsedMarkdown {
  const raw = fs.readFileSync(filePath, "utf-8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    throw new Error(`Missing YAML frontmatter in ${filePath}`);
  }
  const frontmatter = yaml.load(match[1]) as Record<string, unknown>;
  const content = match[2].trimStart();
  return { frontmatter, content };
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  return undefined;
}

function toStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
    return value;
  }
  return undefined;
}

function toPost(slug: string, fm: Record<string, unknown>, content: string): BlogPost {
  const tags = toStringArray(fm.tags) ?? [];
  return {
    slug,
    title: String(fm.title ?? ""),
    description: String(fm.description ?? ""),
    date: String(fm.date ?? ""),
    tags,
    readTime: String(fm.readTime ?? ""),
    content,
    productSlug: fm.productSlug ? String(fm.productSlug) : undefined,
    isLaunch: toBoolean(fm.isLaunch),
    editorial: toBoolean(fm.editorial),
    ctaHook: fm.ctaHook ? String(fm.ctaHook) : undefined,
    image: fm.image ? String(fm.image) : undefined,
  };
}

export function loadAllPosts(): BlogPost[] {
  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".md"));
  const posts = files.map((file) => {
    const slug = path.basename(file, ".md");
    const { frontmatter, content } = parseMarkdown(path.join(BLOG_DIR, file));
    return toPost(slug, frontmatter, content);
  });
  // Sort by descending date to preserve the current listing behavior.
  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function loadPostBySlug(slug: string): BlogPost | undefined {
  const filePath = path.join(BLOG_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return undefined;
  const { frontmatter, content } = parseMarkdown(filePath);
  return toPost(slug, frontmatter, content);
}
