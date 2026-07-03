#!/usr/bin/env python3
"""Migrate hand-authored TS blog posts to YAML-frontmatter markdown files.

Reads the two current sources:
  - src/lib/blog-new-posts.ts  (variable newPosts: BlogPost[])
  - src/lib/blog.ts            (variable posts: BlogPost[])

Emits one markdown file per post to:
  - content/blog/<slug>.md

Does NOT delete or modify the source TS files. The migration is additive and
intended to be reviewed before any cut-over.

Implementation note: the actual extraction is delegated to a tiny TypeScript
helper run via `npx tsx`, because the source files use TypeScript syntax
(template literals, type annotations, spread operators) that is tedious and
error-prone to parse in Python. Python keeps responsibility for rendering the
markdown and validating the output.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

import yaml

REPO_ROOT = Path(__file__).resolve().parents[1]

TS_FILES: list[Path] = [
    REPO_ROOT / "src/lib/blog-new-posts.ts",
    REPO_ROOT / "src/lib/blog.ts",
]
OUT_DIR = REPO_ROOT / "content/blog"

FRONTMATTER_KEYS = [
    "slug",
    "title",
    "description",
    "date",
    "tags",
    "readTime",
    "productSlug",
    "isLaunch",
    "editorial",
    "ctaHook",
    "image",
]

HELPER_TS = """\
import { newPosts } from "./src/lib/blog-new-posts";
import { posts } from "./src/lib/blog";

function dedupeBySlug(posts: any[]) {
  const seen = new Set<string>();
  return posts.filter((p) => {
    if (seen.has(p.slug)) return false;
    seen.add(p.slug);
    return true;
  });
}

const all = dedupeBySlug([...newPosts, ...posts]);
process.stdout.write(JSON.stringify(all));
"""


def extract_posts_via_tsx() -> list[dict[str, Any]]:
    """Run the embedded TS helper to get post data as JSON."""
    helper_path = REPO_ROOT / ".migrate-helper.ts"
    try:
        helper_path.write_text(HELPER_TS, encoding="utf-8")
        result = subprocess.run(
            ["npx", "tsx", str(helper_path)],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=True,
        )
        return json.loads(result.stdout)
    finally:
        helper_path.unlink(missing_ok=True)


def build_frontmatter(post: dict[str, Any]) -> dict[str, Any]:
    """Select and order the fields that become YAML frontmatter."""
    fm: dict[str, Any] = {}
    for key in FRONTMATTER_KEYS:
        if key in post and post[key] not in (None, ""):
            fm[key] = post[key]
    return fm


def to_markdown(post: dict[str, Any]) -> str:
    """Render a post dict as markdown with YAML frontmatter."""
    frontmatter = build_frontmatter(post)
    content = post.get("content", "")
    if not isinstance(content, str):
        content = ""
    content = content.strip()

    # Some posts define content as a template literal that begins with a `.trim()`
    # call (i.e. the literal starts with a newline), so the markdown body itself
    # lacks the leading # title. For those, inject a title heading derived from
    # the frontmatter so the rendered page still has an h1. Posts that already
    # start with `#` keep their own heading.
    if not content.startswith("#"):
        content = f"# {post['title']}\n\n{content}"

    # The existing content already includes the leading # title, so emit it
    # below the frontmatter unchanged.
    return "---\n" + yaml.safe_dump(frontmatter, sort_keys=False) + "---\n\n" + content


def validate_post(post: dict[str, Any]) -> None:
    """Sanity-check a post before emitting it."""
    slug = post.get("slug")
    if not isinstance(slug, str) or not slug:
        raise ValueError(f"Post is missing a slug: {post.keys()}")
    for key in ("title", "description", "date", "content"):
        if not isinstance(post.get(key), str) or not post[key]:
            raise ValueError(f"Post {slug!r} is missing field {key!r}")
    tags = post.get("tags")
    if not isinstance(tags, list) or not all(isinstance(t, str) for t in tags):
        raise ValueError(f"Post {slug!r} has invalid tags: {tags!r}")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Migrate TS blog post objects to markdown files with YAML frontmatter."
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=OUT_DIR,
        help=f"Output directory for markdown files (default: {OUT_DIR})",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Only emit the first N posts (useful for testing).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Write to stdout instead of files.",
    )
    parser.add_argument(
        "--sample",
        metavar="SLUG",
        nargs="*",
        help="Emit only these slugs (overrides --limit).",
    )
    args = parser.parse_args()

    all_posts = extract_posts_via_tsx()
    print(f"Extracted {len(all_posts)} posts from TS sources.", file=sys.stderr)

    for post in all_posts:
        validate_post(post)

    selection = all_posts
    if args.sample:
        sample_set = set(args.sample)
        selection = [p for p in all_posts if p.get("slug") in sample_set]
        missing = sample_set - {p.get("slug") for p in selection}
        if missing:
            print(f"warning: requested sample slugs not found: {sorted(missing)}", file=sys.stderr)
    elif args.limit is not None:
        selection = all_posts[: args.limit]

    for post in selection:
        slug = post["slug"]
        md = to_markdown(post)
        if args.dry_run:
            print(f"===== {slug}.md =====")
            print(md)
        else:
            out_path = args.out_dir / f"{slug}.md"
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(md, encoding="utf-8")
            print(out_path)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
