#!/usr/bin/env python3
"""
webfetch-archive.py -- PostToolUse Hook
Auto-saves fetched web content to markdown files for persistent reference.

Every time Claude fetches a URL (via WebFetch or MCP fetch), this hook saves
the content as a markdown file with YAML frontmatter (url, domain, title,
fetched_at). Files are date-prefixed with slugified titles and collision
avoidance via counter suffixes.

Stdin JSON (PostToolUse):
  {"tool": "WebFetch", "input": {"url": "https://..."}, "output": "...content..."}

Stdout JSON:
  {"continue": true}

Customize ARCHIVE_DIR to point to your preferred location (Obsidian vault,
docs folder, etc.).
"""

import json
import re
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse
import os

# -----------------------------------------------------------------------
# CUSTOMIZE THIS for your project
# -----------------------------------------------------------------------

ARCHIVE_DIR = Path(
    os.environ.get(
        "HOOKS_WEBFETCH_DIR",
        os.path.expanduser("~/web-archives"),
    )
)

# Max content size per archived file (200KB)
MAX_CONTENT_SIZE = 200_000

# Tool names that trigger archiving
TOOL_NAMES = {"WebFetch", "mcp__fetch__fetch", "webfetch", "fetch"}

# -----------------------------------------------------------------------

# Ensure output directory exists
ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)


def slugify(text, max_len=60):
    """Convert text to a filename-safe slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text[:max_len].rstrip("-")


def extract_title(content):
    """Try to extract a title from HTML or markdown content."""
    # HTML <title>
    m = re.search(r"<title[^>]*>(.*?)</title>", content, re.IGNORECASE | re.DOTALL)
    if m:
        return m.group(1).strip()[:120]
    # First markdown heading
    m = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
    if m:
        return m.group(1).strip()[:120]
    return ""


def main():
    try:
        raw = sys.stdin.read(500_000)
        hook_input = json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        print(json.dumps({"continue": True}))
        return

    tool_name = hook_input.get("tool", hook_input.get("tool_name", ""))

    if tool_name not in TOOL_NAMES:
        print(json.dumps({"continue": True}))
        return

    # Extract URL from tool input
    tool_input = hook_input.get("input", hook_input.get("tool_input", {}))
    if isinstance(tool_input, str):
        try:
            tool_input = json.loads(tool_input)
        except json.JSONDecodeError:
            tool_input = {}

    url = tool_input.get("url", tool_input.get("uri", ""))
    if not url:
        print(json.dumps({"continue": True}))
        return

    # Extract content from tool output
    tool_output = hook_input.get(
        "output", hook_input.get("result", hook_input.get("tool_output", ""))
    )
    if isinstance(tool_output, dict):
        content = tool_output.get(
            "content", tool_output.get("text", json.dumps(tool_output))
        )
    elif isinstance(tool_output, list):
        # MCP fetch returns array of content blocks
        parts = []
        for block in tool_output:
            if isinstance(block, dict):
                parts.append(block.get("text", block.get("content", str(block))))
            else:
                parts.append(str(block))
        content = "\n".join(parts)
    else:
        content = str(tool_output) if tool_output else ""

    if not content or len(content) < 50:
        print(json.dumps({"continue": True}))
        return

    # Parse URL metadata
    parsed = urlparse(url)
    domain = parsed.netloc.replace("www.", "")

    title = extract_title(content)
    if not title:
        path_parts = [p for p in parsed.path.strip("/").split("/") if p]
        title = path_parts[-1] if path_parts else domain

    title_clean = re.sub(r"<[^>]+>", "", title)
    title_clean = re.sub(r"\s+", " ", title_clean).strip()

    # Build filename with collision avoidance
    date_str = datetime.now().strftime("%Y-%m-%d")
    slug = slugify(title_clean or domain)
    filename = f"{date_str}-{slug}.md"
    filepath = ARCHIVE_DIR / filename

    counter = 1
    while filepath.exists():
        filename = f"{date_str}-{slug}-{counter}.md"
        filepath = ARCHIVE_DIR / filename
        counter += 1

    # Truncate if too large
    if len(content) > MAX_CONTENT_SIZE:
        content = content[:MAX_CONTENT_SIZE] + "\n\n---\n*[Content truncated at 200KB]*\n"

    # Build markdown note with YAML frontmatter
    note = f"""---
url: {url}
domain: {domain}
title: "{title_clean}"
fetched_at: {datetime.now().isoformat()}
type: web-fetch
tags:
  - web-fetch
  - {domain.split('.')[0]}
---

# {title_clean}

**Source**: [{domain}]({url})
**Fetched**: {datetime.now().strftime("%Y-%m-%d %H:%M")}

---

{content}
"""

    try:
        filepath.write_text(note, encoding="utf-8")
    except Exception:
        pass  # Never fail the hook on write error

    print(json.dumps({"continue": True}))


if __name__ == "__main__":
    main()
