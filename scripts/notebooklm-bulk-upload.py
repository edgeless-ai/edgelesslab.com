#!/usr/bin/env python3
"""
NotebookLM Bulk Upload Pipeline

Bulk-uploads YouTube KB articles from the vault to NotebookLM notebooks.
Supports topic filtering, idempotency, rate limiting, and 50-source cap handling.

Usage:
    python scripts/notebooklm-bulk-upload.py --channel ColeMedin --notebook <id>
    python scripts/notebooklm-bulk-upload.py --channel ColeMedin --topics agentic,ai-tooling --notebook <id>
    python scripts/notebooklm-bulk-upload.py --channel ColeMedin --list-topics
"""

import os
import sys
import json
import time
import re
import argparse
import subprocess
from pathlib import Path
from dataclasses import dataclass
from typing import List, Optional, Dict
from datetime import datetime

VAULT_BASE = Path("/Users/djm/claude-projects/claude-vault/03-Knowledge/YouTube")
STATE_PATH = Path("/Users/djm/claude-projects/.runtime/notebooklm_upload_state.json")
NOTEBOOKLM_LIMIT = 50  # NotebookLM source limit per notebook
RATE_DELAY = 2.0  # seconds between uploads


@dataclass
class KBArticle:
    path: Path
    title: str
    channel: str
    url: str
    published: str
    topics: List[str]
    enrichment_tier: str


def parse_frontmatter(content: str) -> Dict:
    """Extract YAML frontmatter from markdown."""
    if not content.startswith("---"):
        return {}
    end = content.find("---", 3)
    if end == -1:
        return {}
    fm = content[3:end].strip()
    data = {}
    current_key = None
    current_list = []
    in_list = False
    for line in fm.split("\n"):
        stripped = line.strip()
        if stripped.startswith("-"):
            item = stripped[1:].strip().strip("'\"[]")
            if in_list and current_key:
                current_list.append(item)
            continue
        if in_list and current_key:
            data[current_key] = current_list
            current_list = []
            in_list = False
            current_key = None
        if ":" in stripped:
            key, val = stripped.split(":", 1)
            key = key.strip()
            val = val.strip().strip("'\"")
            if val.startswith("["):
                items = [x.strip().strip("'\"") for x in val.strip("[]").split(",") if x.strip()]
                data[key] = items
            else:
                data[key] = val
            if val == "":
                current_key = key
                current_list = []
                in_list = True
    if in_list and current_key:
        data[current_key] = current_list
    return data


def load_state() -> Dict:
    if STATE_PATH.exists():
        return json.loads(STATE_PATH.read_text())
    return {"uploads": {}, "notebooks": {}}


def save_state(state: Dict):
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(json.dumps(state, indent=2))


def discover_articles(channel: str) -> List[KBArticle]:
    channel_dir = VAULT_BASE / channel
    if not channel_dir.exists():
        candidates = [d for d in VAULT_BASE.iterdir() if d.is_dir() and channel.lower() in d.name.lower()]
        if candidates:
            channel_dir = candidates[0]
        else:
            print(f"Error: Channel '{channel}' not found in {VAULT_BASE}")
            sys.exit(1)

    articles = []
    for md_file in sorted(channel_dir.glob("*.md")):
        content = md_file.read_text()
        fm = parse_frontmatter(content)
        if not fm.get("title"):
            continue
        articles.append(KBArticle(
            path=md_file,
            title=fm.get("title", md_file.stem),
            channel=fm.get("channel", channel),
            url=fm.get("url", ""),
            published=fm.get("published", ""),
            topics=fm.get("topics", []),
            enrichment_tier=fm.get("enrichment_tier", "unknown")
        ))
    return articles


def filter_by_topics(articles: List[KBArticle], topics: List[str]) -> List[KBArticle]:
    topics_lower = [t.lower() for t in topics]
    filtered = []
    for art in articles:
        art_topics = [t.lower() for t in art.topics]
        if any(t in art_topics for t in topics_lower):
            filtered.append(art)
    return filtered


def list_topics(articles: List[KBArticle]) -> Dict[str, int]:
    counts = {}
    for art in articles:
        for t in art.topics:
            counts[t] = counts.get(t, 0) + 1
    return dict(sorted(counts.items(), key=lambda x: -x[1]))


def upload_source(article: KBArticle, notebook_id: str, dry_run: bool = False) -> bool:
    title = article.title.replace('"', '\\"')
    cmd = [
        "notebooklm", "source", "add",
        str(article.path),
        "-n", notebook_id,
        "--title", title,
        "--type", "text",
        "--json"
    ]
    if dry_run:
        print(f"  [DRY-RUN] Would run: {' '.join(cmd)}")
        return True
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if result.returncode == 0:
            print(f"  ✅ {article.title[:60]}")
            return True
        else:
            err = result.stderr or result.stdout
            if "already exists" in err.lower() or "duplicate" in err.lower():
                print(f"  ⚠️  Already exists: {article.title[:60]}")
                return True
            print(f"  ❌ {article.title[:60]} | {err[:100]}")
            return False
    except subprocess.TimeoutExpired:
        print(f"  ⏰ Timeout: {article.title[:60]}")
        return False
    except Exception as e:
        print(f"  ❌ Error: {article.title[:60]} | {e}")
        return False


def run_upload(channel: str, notebook_id: str, topics: Optional[List[str]] = None, dry_run: bool = False):
    state = load_state()
    articles = discover_articles(channel)
    print(f"Found {len(articles)} articles for channel '{channel}'")

    if topics:
        articles = filter_by_topics(articles, topics)
        print(f"After topic filter ({','.join(topics)}): {len(articles)} articles")

    if len(articles) > NOTEBOOKLM_LIMIT:
        print(f"WARNING: {len(articles)} articles exceeds NotebookLM {NOTEBOOKLM_LIMIT}-source limit.")
        print(f"Only first {NOTEBOOKLM_LIMIT} will be uploaded. Consider creating additional notebooks.")
        articles = articles[:NOTEBOOKLM_LIMIT]

    current_count = state.get("notebooks", {}).get(notebook_id, 0)
    available_slots = NOTEBOOKLM_LIMIT - current_count
    if available_slots <= 0:
        print(f"Notebook {notebook_id} is full ({current_count}/{NOTEBOOKLM_LIMIT}). Skipping.")
        return
    if len(articles) > available_slots:
        print(f"Notebook has {available_slots} slots left. Truncating upload.")
        articles = articles[:available_slots]

    uploaded = 0
    skipped = 0
    failed = 0

    for art in articles:
        key = f"{notebook_id}:{art.path.name}"
        if key in state.get("uploads", {}):
            skipped += 1
            continue

        success = upload_source(art, notebook_id, dry_run=dry_run)
        if success and not dry_run:
            state["uploads"][key] = {
                "uploaded_at": datetime.now().isoformat(),
                "title": art.title,
                "path": str(art.path)
            }
            current_count += 1
            uploaded += 1
            save_state(state)
            time.sleep(RATE_DELAY)
        elif not success:
            failed += 1

    if not dry_run:
        state["notebooks"][notebook_id] = current_count
        save_state(state)

    print(f"\n{'='*50}")
    print(f"Upload complete: {uploaded} uploaded, {skipped} skipped, {failed} failed")
    print(f"Notebook {notebook_id}: {current_count}/{NOTEBOOKLM_LIMIT} sources")
    print(f"State: {STATE_PATH}")


def main():
    parser = argparse.ArgumentParser(description="NotebookLM Bulk Upload Pipeline")
    parser.add_argument("--channel", required=True, help="YouTube channel name (vault folder)")
    parser.add_argument("--notebook", help="NotebookLM notebook ID")
    parser.add_argument("--topics", help="Comma-separated topic tags (OR filter)")
    parser.add_argument("--list-topics", action="store_true", help="List available topics and counts")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be uploaded without uploading")

    args = parser.parse_args()

    articles = discover_articles(args.channel)

    if args.list_topics:
        topics = list_topics(articles)
        print(f"Topics for '{args.channel}' ({len(articles)} articles):")
        for t, c in topics.items():
            print(f"  {t}: {c}")
        return

    if not args.notebook and not args.dry_run:
        print("Error: --notebook required (or use --dry-run)")
        sys.exit(1)

    topics = [t.strip() for t in args.topics.split(",")] if args.topics else None
    run_upload(args.channel, args.notebook or "dry-run", topics=topics, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
