import { afterEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const repo = process.cwd();
const trees: string[] = [];
const digest = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");
const post = (slug: string) => JSON.stringify({
  slug, title: `Title ${slug}`, description: "Description", date: "2026-11-16",
  tags: ["Test"], readTime: "1 min", content: "Body with `ticks`, ${braces} and content: text",
  dataStory: { title: "Chart", dataUrl: "/chart.json" },
});

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "blog-meta-test-"));
  trees.push(root);
  mkdirSync(path.join(root, "src/lib"), { recursive: true });
  mkdirSync(path.join(root, "scripts"));
  writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "edgeless-scaffold" }));
  for (const file of ["generate-blog-meta.py", "evaluate-blog-registry.mjs"]) {
    const source = path.join(repo, "scripts", file);
    if (existsSync(source)) cpSync(source, path.join(root, "scripts", file));
  }
  symlinkSync(path.join(repo, "node_modules"), path.join(root, "node_modules"), "dir");
  writeFileSync(path.join(root, "src/lib/first.ts"), `export const first = [${post("first")}];`);
  writeFileSync(path.join(root, "src/lib/second.ts"), `export const second = [${post("second")}];`);
  writeFileSync(path.join(root, "src/lib/blog.ts"), `
    import { first } from "./first";
    import { second } from "./second";
    type BlogPost = typeof first[number];
    const allPosts: BlogPost[] = [...first, ...second, ${post("inline")}];
    export const posts: BlogPost[] = allPosts.filter((post, i, all) =>
      all.findIndex(other => other.slug === post.slug) === i);
  `);
  writeFileSync(path.join(root, "src/lib/blog-meta.ts"), "// existing metadata sentinel\n");
  return root;
}

function run(root: string, args: string[] = [], cwd = root) {
  return spawnSync(process.env.PYTHON ?? "python3", [path.join(root, "scripts/generate-blog-meta.py"), ...args], {
    cwd, encoding: "utf8", timeout: 20_000,
  });
}
const meta = (root: string) => path.join(root, "src/lib/blog-meta.ts");
const registry = (root: string) => path.join(root, "src/lib/blog.ts");
function generated(root: string) {
  const source = readFileSync(meta(root), "utf8");
  return JSON.parse(source.slice(source.indexOf(" = [") + 3).trim().replace(/;$/, ""));
}

afterEach(() => { for (const tree of trees.splice(0)) rmSync(tree, { recursive: true, force: true }); });

describe("safe blog metadata generation", () => {
  it("evaluates typed allPosts and both imported story modules, omitting content", () => {
    const root = fixture();
    const result = run(root, ["--write"]);
    expect(result.status, result.stderr).toBe(0);
    const posts = generated(root);
    expect(posts.map((post: { slug: string }) => post.slug)).toEqual(["first", "second", "inline"]);
    expect(posts.every((post: object) => !("content" in post))).toBe(true);
    expect(posts[0].dataStory).toEqual({ title: "Chart", dataUrl: "/chart.json" });
    expect(run(root, ["--check"]).status).toBe(0);
  });

  it("uses the copied script's worktree even when cwd is a canonical sentinel tree", () => {
    const canonical = fixture();
    const isolated = fixture();
    const before = digest(meta(canonical));
    const result = run(isolated, ["--write"], canonical);
    expect(result.status, result.stderr).toBe(0);
    expect(digest(meta(canonical))).toBe(before);
    expect(generated(isolated)).toHaveLength(3);
  });

  it.each([{ args: [] }, { args: ["--check"] }])("defaults to read-only diff mode ($args)", ({ args }) => {
    const root = fixture();
    const before = digest(meta(root));
    const result = run(root, args);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("---");
    expect(result.stdout).toContain("3 posts");
    expect(digest(meta(root))).toBe(before);
  });

  it("supports a validated explicit root independently of the script and cwd", () => {
    const root = fixture();
    const target = fixture();
    const before = digest(meta(root));
    const result = run(root, ["--root", target, "--write"]);
    expect(result.status, result.stderr).toBe(0);
    expect(generated(target)).toHaveLength(3);
    expect(digest(meta(root))).toBe(before);
  });

  it.each(["syntax", "dependency syntax", "runtime", "missing import", "slug mismatch", "duplicate posts", "no allPosts", "no posts", "invalid slug", "empty registry"])(
    "fails closed on %s and preserves existing metadata bytes", (failure) => {
      const root = fixture();
      const changes: Record<string, string> = {
        syntax: "export const posts = [ { broken;",
        runtime: "throw new Error('runtime failure'); export const posts = []; const allPosts = [];",
        "missing import": "import { missing } from './absent'; const allPosts = missing; export const posts = allPosts;",
        "slug mismatch": `const allPosts = [${post("first")}, ${post("second")}]; export const posts = allPosts.slice(0, 1);`,
        "duplicate posts": `const allPosts = [${post("first")}]; export const posts = [...allPosts, ...allPosts];`,
        "no allPosts": `export const posts = [${post("first")}];`,
        "no posts": `const allPosts = [${post("first")}];`,
        "invalid slug": `const allPosts = [${post("")}]; export const posts = allPosts;`,
        "empty registry": "const allPosts = []; export const posts = allPosts;",
      };
      if (failure === "dependency syntax") writeFileSync(path.join(root, "src/lib/second.ts"), "export const second = [ { broken;");
      else writeFileSync(registry(root), changes[failure]);
      const before = digest(meta(root));
      const result = run(root, ["--write"]);
      expect(result.status, result.stdout).toBe(2);
      expect(result.stderr).toContain("error:");
      expect(digest(meta(root))).toBe(before);
      expect(readdirSync(path.dirname(meta(root))).filter(name => name.endsWith(".tmp"))).toEqual([]);
    },
  );

  it("retains first-winner deduplication without silently dropping unique allPosts slugs", () => {
    const root = fixture();
    writeFileSync(registry(root), `const allPosts = [${post("same")}, ${post("same")}]; export const posts = allPosts.slice(0, 1);`);
    const result = run(root, ["--write"]);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("2 raw");
    expect(generated(root)).toHaveLength(1);
  });

  it("rejects metadata changed by the exported posts transformation", () => {
    const root = fixture();
    writeFileSync(registry(root), `const allPosts = [${post("first")}]; export const posts = allPosts.map(p => ({ ...p, title: 'different' }));`);
    const before = digest(meta(root));
    expect(run(root, ["--write"]).status).toBe(2);
    expect(digest(meta(root))).toBe(before);
  });

  it("refuses a metadata symlink without touching its canonical target", () => {
    const canonical = fixture();
    const root = fixture();
    rmSync(meta(root));
    symlinkSync(meta(canonical), meta(root));
    const before = digest(meta(canonical));
    expect(run(root, ["--write"]).status).toBe(2);
    expect(digest(meta(canonical))).toBe(before);
  });

  it("leaves metadata intact and cleans the temp file if atomic rename fails", () => {
    const root = fixture();
    const before = digest(meta(root));
    const result = spawnSync(process.env.PYTHON ?? "python3", ["-c", `
import os, runpy, sys
namespace = runpy.run_path(sys.argv[1])
def fail_replace(*args):
    raise OSError("fixture rename failure")
os.replace = fail_replace
sys.argv = [sys.argv[1], "--write"]
sys.exit(namespace["main"]())
`, path.join(root, "scripts/generate-blog-meta.py")], { cwd: root, encoding: "utf8", timeout: 20_000 });
    expect(result.status, result.stderr).toBe(2);
    expect(result.stderr).toContain("fixture rename failure");
    expect(digest(meta(root))).toBe(before);
    expect(readdirSync(path.dirname(meta(root))).filter(name => name.endsWith(".tmp"))).toEqual([]);
  });

  it.each(["missing registry", "wrong package"])("rejects invalid root: %s", (failure) => {
    const root = fixture();
    if (failure === "missing registry") rmSync(registry(root));
    else writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "other-site" }));
    const before = digest(meta(root));
    expect(run(root, ["--root", root, "--write"]).status).toBe(2);
    expect(digest(meta(root))).toBe(before);
  });
});
