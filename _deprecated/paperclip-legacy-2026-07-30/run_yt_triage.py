#!/usr/bin/env python3
"""
YouTube Likes Triage Agent — full pipeline runner.
Scores, routes, archives, enriches, and tickets new liked videos.
"""

import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ROOT = Path("/Users/djm/claude-projects")
sys.path.insert(0, str(PROJECT_ROOT))

DELTA_PATH = PROJECT_ROOT / ".feeds" / "youtube-likes-delta.json"
ARCHIVE_LOG = PROJECT_ROOT / ".feeds" / "youtube-likes-archived.jsonl"
CHANNEL_REP_PATH = PROJECT_ROOT / "scripts" / "lib" / "youtube_channel_reputation.json"
VAULT_INBOX = PROJECT_ROOT / "claude-vault" / "00-Inbox" / "youtube"
VAULT_KB = PROJECT_ROOT / "claude-vault" / "03-Knowledge" / "YouTube"
PAPERCLIP_API = "http://127.0.0.1:3100/api"
PAPERCLIP_COMPANY = "c5ea22fb-99d2-46a1-87c6-e7fc1ab0d712"

KB_PROMOTION_THRESHOLD = 7


def load_channel_reputation(path: Path) -> dict[str, int]:
    data = json.loads(path.read_text())
    return {
        k: int(v)
        for k, v in data.items()
        if not k.startswith("_") and isinstance(v, (int, float))
    }


def load_delta(path: Path) -> list[dict]:
    if not path.exists():
        return []
    data = json.loads(path.read_text())
    return data.get("videos") or data.get("new_videos") or []


def load_context() -> dict:
    from scripts.lib.triage_runner import load_existing_titles, load_existing_channel_title_pairs
    from scripts.lib.triage_core import extract_title_from_frontmatter
    tasks_dir = PROJECT_ROOT / "backlog" / "tasks"
    return {
        "channel_reputation": load_channel_reputation(CHANNEL_REP_PATH),
        "existing_titles": load_existing_titles(tasks_dir),
        "existing_channel_title_pairs": load_existing_channel_title_pairs(tasks_dir),
    }


def slugify(text: str, max_len: int = 80) -> str:
    import re
    text = text.lower()
    text = re.sub(r"['\u2019]", "", text)
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    if len(text) > max_len:
        text = text[:max_len].rstrip("-")
    return text


def duration_hms(seconds: int) -> str:
    if not seconds:
        return "0:00"
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


def append_archive(result, path: Path = ARCHIVE_LOG) -> bool:
    from scripts.lib.triage_core import append_archive_jsonl
    entry = {
        "video_id": result.video.get("id"),
        "title": result.video.get("title"),
        "channel": result.video.get("channel"),
        "route": result.route.value,
        "total": result.score.total,
        "signals": result.score.signals,
    }
    return append_archive_jsonl(
        path=path,
        item_id=result.video.get("id"),
        entry=entry,
        id_key="video_id",
    )


def write_enrich_note(result) -> tuple[Path, bool, dict]:
    from scripts.lib.notebooklm_integration import upload_if_kb_promoted
    v = result.video
    promoted = result.score.total >= KB_PROMOTION_THRESHOLD
    root = VAULT_KB if promoted else VAULT_INBOX

    channel_slug = slugify(v.get("channel", "unknown"))
    channel_dir = root / channel_slug
    channel_dir.mkdir(parents=True, exist_ok=True)

    fn = channel_dir / f"{slugify(v.get('title', v.get('id', 'untitled')))}.md"
    if fn.exists():
        return fn, promoted, {"uploaded": False, "skipped": True, "message": "Note already exists"}

    topics = []
    kw = result.score.reasons.get("keyword_density", "")
    for tok in kw.split(","):
        tok = tok.strip().replace(" ", "-")
        if tok:
            topics.append(tok)
    topics.append("youtube-likes-triage")
    topics_yaml = "\n".join(f"  - {t}" for t in topics)
    processed = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    title_safe = (v.get("title") or "untitled").replace('"', "'")
    published_short = (v.get("published") or "")[:10]

    body = f"""---
note_type: {"knowledge_base" if promoted else "inbox"}
content_type: video
status: {"active" if promoted else "review"}
created: {processed}
updated: {processed}
video_id: {v.get('id')}
title: "{title_safe}"
channel: {v.get('channel')}
published: {published_short}
duration: {duration_hms(v.get('duration_seconds') or 0)}
sources:
  - liked
topics:
{topics_yaml}
url: {v.get('url')}
processed: {processed}
triage_score: {result.score.total}
triage_route: {"kb-promoted" if promoted else "inbox-enrich"}
---

# {title_safe}

**Channel**: [[{v.get('channel')}]]
**Duration**: {duration_hms(v.get('duration_seconds') or 0)}
**Published**: {published_short}
**URL**: {v.get('url')}

## Summary

_Auto-created by the YouTube likes triage pipeline (task-281). Body will
be filled when the transcript enrichment pipeline processes this video._

## Triage rationale

- **Total score**: {result.score.total}
- **Signals**: {result.score.signals}
- **Reasons**: {result.score.reasons}

## Why this is a KB entry

{"Auto-promoted to 03-Knowledge/YouTube because the triage score is high enough that this is likely reference material worth keeping, not just a queue item." if promoted else "Parked in 00-Inbox/youtube for review. Promote to 03-Knowledge/YouTube/ if useful, or delete."}

## NotebookLM

This note is a candidate source for the next NotebookLM notebook refresh.
Tag it `#notebooklm-ready` once the summary body is filled.
"""
    fn.write_text(body)

    upload_result: dict = {"uploaded": False, "skipped": True, "message": ""}
    if promoted:
        try:
            nl_result = upload_if_kb_promoted(fn, promoted, source_type="youtube")
            if nl_result:
                upload_result = {
                    "uploaded": nl_result.success,
                    "skipped": False,
                    "source_id": nl_result.source_id,
                    "message": nl_result.message,
                    "rotated_sources": nl_result.rotated_sources,
                }
        except Exception as e:
            upload_result = {"uploaded": False, "skipped": False, "message": f"Upload error: {e}"}
            print(f"[NotebookLM] Upload failed (non-blocking): {e}")

    return fn, promoted, upload_result


def create_paperclip_issue(title: str, description: str, priority: str = "medium") -> dict:
    url = f"{PAPERCLIP_API}/companies/{PAPERCLIP_COMPANY}/issues"
    data = json.dumps({
        "title": title,
        "description": description,
        "priority": priority,
        "status": "todo",
    }).encode("utf-8")
    req = urllib.request.Request(
        url, data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode())
            issue_id = result.get("number", result.get("id", "?"))
            return {"ok": True, "issue": f"EDGA-{issue_id}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def run_triage():
    from scripts.lib.triage_runner import TriageResult, triage_delta
    from scripts.lib.youtube_triage_scorer import route

    videos = load_delta(DELTA_PATH)
    if not videos:
        print("[TRIAGE] No new videos to triage.")
        return {"skipped": True}

    print(f"[TRIAGE] Processing {len(videos)} videos from delta...")
    ctx = load_context()
    results = triage_delta(videos, ctx)

    stats = {"skip": 0, "enrich": 0, "ticket": 0, "archived": 0, "vault_notes": 0, "tickets_created": 0, "chroma_upserts": 0, "errors": []}

    from scripts.lib.knowledge_spine_upsert import upsert_vault_note

    for r in results:
        # Archive (idempotent)
        archived = append_archive(r)
        if not archived:
            print(f"  {r.video['title'][:60]}... → ALREADY ARCHIVED (skipping)")
            continue

        stats["archived"] += 1
        print(f"  {r.video['title'][:60]}... → {r.route.value.upper()} (score: {r.score.total})")

        if r.route.value == "skip":
            stats["skip"] += 1
            continue

        if r.route.value == "enrich":
            stats["enrich"] += 1
            try:
                path, promoted, upload = write_enrich_note(r)
                if upload.get("skipped") and upload.get("message") == "Note already exists":
                    print(f"    → Vault note already exists: {path}")
                else:
                    stats["vault_notes"] += 1
                    loc = "03-Knowledge" if promoted else "00-Inbox"
                    print(f"    → Vault note: {path} ({loc})")
                    # Upsert to ChromaDB knowledge spine
                    try:
                        v = r.video
                        note_body = path.read_text()
                        upsert_vault_note(
                            source="youtube",
                            item_id=v.get("id"),
                            vault_path=str(path),
                            title=v.get("title", "untitled"),
                            body=note_body,
                            route="kb-promoted" if promoted else "inbox-enrich",
                            score=r.score.total,
                            extra_metadata={
                                "channel": v.get("channel"),
                                "published": v.get("published"),
                                "url": v.get("url"),
                            },
                        )
                        stats["chroma_upserts"] += 1
                        print(f"    → ChromaDB upsert OK")
                    except Exception as e:
                        stats["errors"].append(f"chroma upsert failed for {r.video.get('id')}: {e}")
                        print(f"    → ChromaDB upsert ERROR: {e}")
            except Exception as e:
                stats["errors"].append(f"enrich note failed for {r.video['id']}: {e}")
                print(f"    → ERROR writing vault note: {e}")
            continue

        if r.route.value == "ticket":
            stats["ticket"] += 1
            title = f"YT Triage: {r.video.get('channel', '?')}: {r.video.get('title', 'untitled')[:80]}"
            description = f"""Auto-triaged YouTube liked video scored {r.score.total} (threshold >= 10).

**Video**: [{r.video.get('title')}]({r.video.get('url')})
**Channel**: {r.video.get('channel')}
**Published**: {r.video.get('published')}
**Duration**: {duration_hms(r.video.get('duration_seconds') or 0)}
**Score breakdown**: {r.score.signals}
**Reasons**: {r.score.reasons}

## Action required
Watch and extract concrete engineering pattern. See triage rationale in archive.
"""
            try:
                result = create_paperclip_issue(title, description, priority="high" if r.score.total >= 12 else "medium")
                if result["ok"]:
                    stats["tickets_created"] += 1
                    print(f"    → Paperclip issue: {result['issue']}")
                else:
                    stats["errors"].append(f"ticket creation failed for {r.video['id']}: {result['error']}")
                    print(f"    → ERROR creating ticket: {result['error']}")
            except Exception as e:
                stats["errors"].append(f"ticket creation exception for {r.video['id']}: {e}")
                print(f"    → ERROR creating ticket: {e}")

    print(f"\n[TRIAGE] Summary: {stats['skip']} skip, {stats['enrich']} enrich, {stats['ticket']} ticket")
    print(f"[TRIAGE] Archived: {stats['archived']}, Vault notes: {stats['vault_notes']}, ChromaDB: {stats['chroma_upserts']}, Tickets: {stats['tickets_created']}")
    if stats["errors"]:
        print(f"[TRIAGE] Errors ({len(stats['errors'])}):")
        for e in stats["errors"]:
            print(f"  - {e}")

    return stats


if __name__ == "__main__":
    run_triage()
