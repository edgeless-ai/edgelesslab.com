#!/usr/bin/env python3
"""
Backfill missing YouTube URLs and video_ids in vault notes.

Sources:
- Existing frontmatter URLs → extract video_id
- Body text URLs → extract and promote to frontmatter
- youtube_intelligence.db → match by title for missing URLs

Usage:
    python scripts/backfill-youtube-urls.py [--dry-run]
"""

import argparse
import re
import sqlite3
import sys
from pathlib import Path
from datetime import datetime

VAULT_BASE = Path("/Users/djm/claude-projects/claude-vault/03-Knowledge/YouTube")
DB_PATH = Path("/Users/djm/claude-projects/data/youtube_intelligence.db")


def normalize_title(title: str) -> str:
    """Normalize title for fuzzy matching."""
    t = title.lower()
    t = re.sub(r"[^\w\s]", "", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def extract_video_id_from_url(url: str) -> str:
    """Extract 11-char video ID from youtube URL."""
    patterns = [
        r'youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})',
        r'youtu\.be/([a-zA-Z0-9_-]{11})',
        r'youtube\.com/embed/([a-zA-Z0-9_-]{11})',
    ]
    for p in patterns:
        m = re.search(p, url)
        if m:
            return m.group(1)
    return ""


def parse_frontmatter(content: str) -> tuple:
    """Extract YAML frontmatter and body."""
    if not content.startswith("---"):
        return {}, content
    end = content.find("---", 3)
    if end == -1:
        return {}, content
    fm_text = content[3:end].strip()
    body = content[end + 3:].strip()

    data = {}
    current_key = None
    current_list = []
    in_list = False
    for line in fm_text.split("\n"):
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
    return data, body


def build_frontmatter(data: dict) -> str:
    """Serialize dict to YAML frontmatter string."""
    lines = ["---"]
    for key, val in data.items():
        if isinstance(val, list):
            lines.append(f"{key}:")
            for item in val:
                lines.append(f"- {item}")
        else:
            lines.append(f"{key}: {val}")
    lines.append("---")
    return "\n".join(lines)


def load_db_videos(db_path: Path) -> dict:
    """Load videos from SQLite, keyed by normalized title."""
    videos = {}
    if not db_path.exists():
        print(f"WARNING: DB not found: {db_path}")
        return videos
    conn = sqlite3.connect(db_path)
    cursor = conn.execute("SELECT video_id, title, channel_name FROM videos")
    for row in cursor:
        vid, title, channel = row
        norm = normalize_title(title)
        videos[norm] = {"video_id": vid, "title": title, "channel_name": channel}
    conn.close()
    return videos


def find_url_in_body(body: str) -> str:
    """Find first youtube watch URL in body text."""
    m = re.search(r'https?://(?:www\.)?youtube\.com/watch\?v=[a-zA-Z0-9_-]{11}', body)
    if m:
        return m.group(0)
    m = re.search(r'https?://youtu\.be/[a-zA-Z0-9_-]{11}', body)
    if m:
        return m.group(0)
    return ""


def backfill_note(path: Path, db_videos: dict, dry_run: bool = False) -> dict:
    """Backfill a single note. Returns change summary."""
    content = path.read_text()
    data, body = parse_frontmatter(content)

    changes = {"file": str(path), "added_url": False, "added_video_id": False, "db_matched": False}

    if not data:
        return changes  # No frontmatter, skip

    # Skip non-video files
    title = data.get("title", "")
    if isinstance(title, list):
        title = title[0] if title else ""
    if title.startswith("YouTube Corpus") or path.name == "_enrichment-tracker.md":
        return changes

    has_url = bool(data.get("url", ""))
    has_video_id = bool(data.get("video_id", ""))
    # Normalize list values
    if isinstance(data.get("url"), list):
        data["url"] = data["url"][0] if data["url"] else ""
        has_url = bool(data["url"])
    if isinstance(data.get("video_id"), list):
        data["video_id"] = data["video_id"][0] if data["video_id"] else ""
        has_video_id = bool(data["video_id"])

    # 1. If has URL but no video_id, extract it
    if has_url and not has_video_id:
        vid = extract_video_id_from_url(data["url"])
        if vid:
            changes["added_video_id"] = True
            data["video_id"] = vid

    # 2. If no URL, check body for URL
    if not has_url:
        body_url = find_url_in_body(body)
        if body_url:
            changes["added_url"] = True
            data["url"] = body_url
            vid = extract_video_id_from_url(body_url)
            if vid and not has_video_id:
                data["video_id"] = vid
                changes["added_video_id"] = True

    # 3. If still no URL, try DB match by title
    if not data.get("url", ""):
        title = data.get("title", "")
        if isinstance(title, list):
            title = title[0] if title else ""
        if title:
            norm = normalize_title(title)
            # Try exact normalized match
            match = db_videos.get(norm)
            # Try prefix match if exact fails
            if not match:
                for db_norm, db_vid in db_videos.items():
                    if db_norm in norm or norm in db_norm:
                        if len(db_norm) > 10:  # Avoid short false positives
                            match = db_vid
                            break
            if match:
                changes["added_url"] = True
                changes["db_matched"] = True
                data["url"] = f"https://www.youtube.com/watch?v={match['video_id']}"
                data["video_id"] = match["video_id"]
                changes["added_video_id"] = True

    # Write back if changed
    if changes["added_url"] or changes["added_video_id"]:
        new_content = build_frontmatter(data) + "\n\n" + body
        if not dry_run:
            path.write_text(new_content, encoding="utf-8")

    return changes


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without writing")
    parser.add_argument("--channel", help="Process only one channel folder")
    args = parser.parse_args()

    db_videos = load_db_videos(DB_PATH)
    print(f"Loaded {len(db_videos)} videos from DB")

    if args.channel:
        target_dir = VAULT_BASE / args.channel
        md_files = list(target_dir.rglob("*.md")) if target_dir.exists() else []
    else:
        md_files = list(VAULT_BASE.rglob("*.md"))

    total = len(md_files)
    added_url = 0
    added_video_id = 0
    db_matched = 0
    unchanged = 0

    print(f"Scanning {total} notes...")
    for path in md_files:
        changes = backfill_note(path, db_videos, dry_run=args.dry_run)
        if changes["added_url"]:
            added_url += 1
        if changes["added_video_id"]:
            added_video_id += 1
        if changes["db_matched"]:
            db_matched += 1
        if not changes["added_url"] and not changes["added_video_id"]:
            unchanged += 1

    print()
    print("=" * 50)
    print("BACKFILL SUMMARY")
    print("=" * 50)
    print(f"Total notes scanned: {total}")
    print(f"Added URL: {added_url}")
    print(f"Added video_id: {added_video_id}")
    print(f"DB-matched titles: {db_matched}")
    print(f"Unchanged: {unchanged}")
    print(f"Mode: {'DRY-RUN' if args.dry_run else 'WRITTEN'}")


if __name__ == "__main__":
    main()
