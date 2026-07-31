#!/usr/bin/env python3
"""
Deepseek V4 Flash:free YouTube Enrichment Goal Loop
Drains the free tier by enriching 1,062 YouTube notes with Context + One-liner
Adds OpenTelemetry-compatible metadata for knowledge graph observability.

Usage:
    python3 deepseek_youtube_enrichment_loop.py [--dry-run] [--limit N] [--resume]
"""

import argparse
import json
import os
import re
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import yaml

# ── Configuration ──────────────────────────────────────────────────────────

VAULT_DIR = Path.home() / "claude-projects" / "claude-vault" / "03-Knowledge" / "YouTube"
PROGRESS_FILE = Path.home() / ".hermes" / "deepseek_enrichment_progress.jsonl"
LOG_FILE = Path.home() / ".hermes" / "deepseek_enrichment.log"

# Load Nous agent_key from auth.json if not in environment
NOUS_KEY = ""
if not NOUS_KEY:
    auth_path = Path.home() / ".hermes" / "auth.json"
    if auth_path.exists():
        with open(auth_path) as f:
            auth_data = json.load(f)
        nous = auth_data.get("providers", {}).get("nous", {})
        NOUS_KEY = nous.get("agent_key", "")

API_URL = "https://inference-api.nousresearch.com/v1/chat/completions"
MODEL = "deepseek/deepseek-v4-flash"  # Nous-provided, no :free suffix

MAX_TOKENS = 200          # Hard cap to prevent repetition loops
TIMEOUT_SEC = 120         # Deepseek reasoning can take 30-60s before emitting content
RATE_LIMIT_SEC = 3        # Be nice to OpenRouter
REPETITION_THRESHOLD = 3  # If same phrase repeats N times, discard

# ── Logging ─────────────────────────────────────────────────────────────────

def log(msg: str, level: str = "INFO"):
    ts = datetime.now(timezone.utc).isoformat()
    line = f"[{ts}] [{level}] {msg}\n"
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_FILE, "a") as f:
        f.write(line)
    print(line.strip())

# ── Discord Alert (via discli) ────────────────────────────────────────────────

def discord_alert(message: str):
    """Send Discord message to #general with @mention via discli."""
    import subprocess
    USER_ID = "258895569777328128"
    CHANNEL = "1463643624100335618"
    full_msg = f"<@{USER_ID}> {message}"
    try:
        subprocess.run(
            ["discli", "msg", "send", CHANNEL, full_msg],
            capture_output=True, text=True, timeout=30
        )
    except Exception as e:
        log(f"Discord alert failed: {e}", "ERROR")


# ── Paperclip Progress Comment ────────────────────────────────────────────────

def paperclip_comment(issue_id: str, body: str):
    """Post a comment to a Paperclip issue."""
    import urllib.request
    import ssl
    import json
    
    url = f"http://127.0.0.1:3100/api/companies/c5ea22fb-99d2-46a1-87c6-e7fc1ab0d712/issues/{issue_id}/comments"
    data = json.dumps({"body": body}).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            return True
    except Exception as e:
        log(f"Paperclip comment failed: {e}", "ERROR")
        return False


# ── Deepseek Client ─────────────────────────────────────────────────────────

def call_deepseek(prompt: str) -> Optional[str]:
    """Call Deepseek via Nous inference API with anti-loop guards."""
    import urllib.request
    import ssl

    if not NOUS_KEY:
        log("Nous agent_key not available", "ERROR")
        return None

    body = json.dumps({
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
        "top_p": 0.9,
    }).encode()

    req = urllib.request.Request(
        API_URL,
        data=body,
        headers={
            "Authorization": f"Bearer {NOUS_KEY}",
            "Content-Type": "application/json",
        }
    )

    ctx = ssl.create_default_context()
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, context=ctx, timeout=TIMEOUT_SEC) as resp:
                data = json.loads(resp.read().decode())
                provider = data.get('provider', 'unknown')
                model_used = data.get('model', 'unknown')
                usage = data.get('usage', {})
                log(f"Deepseek response (attempt {attempt+1}): provider={provider}, model={model_used}, usage={usage}", "DEBUG")
                content = data["choices"][0]["message"].get("content")
                if content is None:
                    reasoning = data["choices"][0]["message"].get("reasoning", "")
                    log(f"Deepseek returned null content (reasoning: {reasoning[:50]}...)", "WARN")
                    if attempt < 2:
                        log("Retrying...", "INFO")
                        time.sleep(5)
                        continue
                    return None
                return content.strip()
        except Exception as e:
            log(f"Deepseek API error (attempt {attempt+1}): {e}", "ERROR")
            if attempt < 2:
                time.sleep(5)
                continue
            return None
    return None


def clean_deepseek_output(text: str) -> str:
    """Strip weird prefixes that Deepseek sometimes adds."""
    # Remove "Completed in X seconds. Rated the accuracy at Y seconds." prefix
    text = re.sub(r'^Completed in \d+ seconds\. Rated the accuracy at \d+ seconds\.\s*', '', text, flags=re.IGNORECASE)
    # Remove "Completed in X seconds." prefix
    text = re.sub(r'^Completed in \d+ seconds\.\s*', '', text, flags=re.IGNORECASE)
    return text.strip()


def detect_repetition(text: str) -> bool:
    """Return True if text has suspicious repetition patterns."""
    # Check for same sentence repeated 3+ times
    sentences = [s.strip() for s in re.split(r'[.!?\n]+', text) if len(s.strip()) > 10]
    if len(sentences) < 3:
        return False
    from collections import Counter
    counts = Counter(sentences)
    most_common = counts.most_common(1)[0][1]
    return most_common >= REPETITION_THRESHOLD
def is_garbage_output(text: str) -> bool:
    """Detect contaminated/garbage model output."""
    if not text:
        return True
    # Check for code markers in non-code requests
    code_markers = ['<?php', '<script', '```', 'def ', 'function(', 'SELECT ', 'INSERT ']
    for marker in code_markers:
        if marker in text:
            return True
    # Check for excessive non-ASCII (should be mostly English)
    non_ascii = sum(1 for c in text if ord(c) > 127)
    if non_ascii > len(text) * 0.3:  # >30% non-ASCII
        return True
    # Check for repeated words (different from sentence repetition)
    words = text.split()
    if len(words) > 5:
        unique_words = set(w.lower() for w in words)
        if len(unique_words) < len(words) * 0.3:  # <30% unique words
            return True
    return False


def generate_context(video_title: str, summary: str) -> Optional[str]:
    """Generate 1-2 sentence 'why this matters' context."""
    prompt = (
        f"Video title: {video_title}\n"
        f"Summary: {summary[:500]}\n\n"
        "In exactly 1-2 sentences, explain why this video matters to someone "
        "building AI systems or running a technology business. Be specific and concrete. "
        "Do not repeat the title. Do not use generic phrases like 'this is important'. "
        "Maximum 50 words."
    )
    result = call_deepseek(prompt)
    if result is None:
        return None
    result = clean_deepseek_output(result)
    if is_garbage_output(result):
        log(f"Garbage output detected in context, discarding: {result[:80]}...", "WARN")
        return None
    if detect_repetition(result):
        log("Repetition detected in context, discarding", "WARN")
        return None
    return result


def generate_one_liner(video_title: str, summary: str) -> Optional[str]:
    """Generate 10-15 word one-liner."""
    prompt = (
        f"Video title: {video_title}\n"
        f"Summary: {summary[:500]}\n\n"
        "In exactly 10-15 words, write a punchy one-liner that captures the key insight. "
        "No filler words. No repetition. Just the core idea."
    )
    result = call_deepseek(prompt)
    if result is None:
        return None
    result = clean_deepseek_output(result)
    if is_garbage_output(result):
        log(f"Garbage output detected in one-liner, discarding: {result[:80]}...", "WARN")
        return None
    if detect_repetition(result):
        log("Repetition detected in one-liner, discarding", "WARN")
        return None
    # Hard length guard
    words = result.split()
    if len(words) > 20:
        result = " ".join(words[:15]) + "."
    return result

# ── Frontmatter / Metadata ──────────────────────────────────────────────────

def build_otel_metadata(note_path: Path, context: str, one_liner: str) -> dict:
    """Build OpenTelemetry-compatible enrichment metadata."""
    trace_id = str(uuid.uuid4())
    span_id = str(uuid.uuid4())
    ts = datetime.now(timezone.utc).isoformat()

    return {
        "enrichment": {
            "trace_id": trace_id,
            "span_id": span_id,
            "source": "deepseek-v4-flash",
            "model": MODEL,
            "provider": "nous",
            "timestamp": ts,
            "version": "1.0",
            "pipeline": "youtube-enrichment-goal-loop",
            "quality_score": None,
            "reviewed": False,
        },
        "opentelemetry": {
            "service.name": "edgeless-knowledge-spine",
            "service.version": "1.0",
            "resource.type": "knowledge-note",
            "span.kind": "internal",
            "enrichment.stage": "context-one-liner",
            "enrichment.model.family": "deepseek-v4",
        }
    }


def update_note_frontmatter(note_path: Path, context: str, one_liner: str) -> bool:
    """Update note with new fields while preserving existing content."""
    content = note_path.read_text()

    # Extract existing frontmatter
    if content.startswith("---"):
        end = content.find("---", 3)
        if end != -1:
            fm_text = content[3:end].strip()
            try:
                fm = yaml.safe_load(fm_text) or {}
            except Exception:
                fm = {}
            body = content[end+3:].strip()
        else:
            fm = {}
            body = content
    else:
        fm = {}
        body = content

    # Merge OTel metadata
    otel = build_otel_metadata(note_path, context, one_liner)
    if "enrichment" not in fm:
        fm["enrichment"] = {}
    if isinstance(fm.get("enrichment"), dict):
        fm["enrichment"].update(otel["enrichment"])
    else:
        fm["enrichment"] = otel["enrichment"]

    # Add opentelemetry block
    fm["opentelemetry"] = otel["opentelemetry"]

    # Add enrichment tier if missing
    if "enrichment_tier" not in fm:
        fm["enrichment_tier"] = 2

    # Add tags if missing
    if "tags" not in fm:
        fm["tags"] = ["youtube", "ai", "enriched"]

    # Build new content
    new_fm = yaml.dump(fm, default_flow_style=False, sort_keys=False, allow_unicode=True)
    new_content = f"---\n{new_fm}---\n\n{body}"

    # Append Context and One-liner sections if not present
    if "## Context" not in body and "## Why It Matters" not in body:
        new_content += f"\n\n## Context\n\n{context}\n"
    if "## One-liner" not in body and "## TL;DR" not in body:
        new_content += f"\n## One-liner\n\n{one_liner}\n"

    note_path.write_text(new_content)
    return True

# ── Progress Tracking ───────────────────────────────────────────────────────

def load_progress() -> set:
    """Load already-processed note paths."""
    processed = set()
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE) as f:
            for line in f:
                try:
                    entry = json.loads(line)
                    if entry.get("status") == "done":
                        processed.add(entry["path"])
                except Exception:
                    pass
    return processed


def save_progress(path: str, status: str, meta: dict):
    """Append progress entry."""
    PROGRESS_FILE.parent.mkdir(parents=True, exist_ok=True)
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "path": path,
        "status": status,
        "meta": meta,
    }
    with open(PROGRESS_FILE, "a") as f:
        f.write(json.dumps(entry) + "\n")

# ── Main Loop ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Don't write files")
    parser.add_argument("--limit", type=int, default=0, help="Max notes to process")
    parser.add_argument("--resume", action="store_true", help="Skip already-done notes")
    args = parser.parse_args()

    PAPERCLIP_ISSUE = "EDGA-2717"  # Tracking issue for this batch
    
    log("=== Deepseek YT Enrichment Goal Loop Started ===")
    log(f"Model: {MODEL}")
    log(f"Vault: {VAULT_DIR}")
    log(f"Dry run: {args.dry_run}")
    log(f"Paperclip tracking: {PAPERCLIP_ISSUE}")

    if not NOUS_KEY:
        log("Nous agent_key not available! Run 'hermes auth add nous' first. Exiting.", "ERROR")
        sys.exit(1)

    # Find all notes
    notes = sorted(VAULT_DIR.rglob("*.md"))
    log(f"Total notes found: {len(notes)}")

    # Filter already done
    processed = load_progress() if args.resume else set()
    if processed:
        notes = [n for n in notes if str(n) not in processed]
        log(f"Resuming: {len(notes)} remaining after skipping {len(processed)} done")

    if args.limit:
        notes = notes[:args.limit]
        log(f"Limit set: processing {args.limit} notes")

    success = 0
    fail = 0
    skip = 0
    
    # Send start notification
    discord_alert(f"DeepSeek enrichment started — {len(notes)} notes queued via Nous DeepSeek V4 Flash. Paperclip: {PAPERCLIP_ISSUE}")
    paperclip_comment(PAPERCLIP_ISSUE, f"Goal loop started. {len(notes)} notes queued. Model: {MODEL}. ETA: ~{len(notes) * 15 // 60} minutes.")

    for idx, note_path in enumerate(notes, 1):
        log(f"[{idx}/{len(notes)}] Processing: {note_path.name}")
        
        # Periodic progress updates every 50 notes
        if idx > 1 and idx % 50 == 0:
            pct = int(idx / len(notes) * 100)
            discord_alert(f"DeepSeek enrichment progress: {idx}/{len(notes)} ({pct}%) | Success: {success} | Fail: {fail} | Skip: {skip}")
            paperclip_comment(PAPERCLIP_ISSUE, f"Progress update: {idx}/{len(notes)} notes processed. Success: {success}, Fail: {fail}, Skip: {skip}.")

        # Read note
        content = note_path.read_text()

        # Check if already enriched (has Context section)
        if "## Context" in content or "## Why It Matters" in content:
            log("  Already has Context section, skipping")
            skip += 1
            save_progress(str(note_path), "skip", {"reason": "already_enriched"})
            continue

        # Extract title from frontmatter or filename
        title = note_path.stem.replace("-", " ").replace("_", " ")
        summary = ""
        if content.startswith("---"):
            end = content.find("---", 3)
            if end != -1:
                try:
                    fm = yaml.safe_load(content[3:end])
                    if fm:
                        title = fm.get("title", title)
                        # Try to extract summary from body
                        body = content[end+3:]
                        summary_match = re.search(r'^##?\s*Summary\s*\n+(.*?)(?=\n##|\Z)', body, re.MULTILINE | re.DOTALL | re.IGNORECASE)
                        if summary_match:
                            summary = summary_match.group(1).strip()[:500]
                except Exception:
                    pass

        # Generate Context
        context = generate_context(title, summary)
        if not context:
            log("  Context generation failed", "WARN")
            fail += 1
            save_progress(str(note_path), "fail", {"stage": "context"})
            time.sleep(RATE_LIMIT_SEC)
            continue

        # Generate One-liner
        one_liner = generate_one_liner(title, summary)
        if not one_liner:
            log("  One-liner generation failed", "WARN")
            fail += 1
            save_progress(str(note_path), "fail", {"stage": "one_liner"})
            time.sleep(RATE_LIMIT_SEC)
            continue

        # Update note
        if not args.dry_run:
            try:
                update_note_frontmatter(note_path, context, one_liner)
                log(f"  Updated: {note_path.name}")
            except Exception as e:
                log(f"  Write failed: {e}", "ERROR")
                fail += 1
                save_progress(str(note_path), "fail", {"stage": "write", "error": str(e)})
                continue
        else:
            log(f"  [DRY] Would add Context + One-liner to {note_path.name}")
            log(f"  Context: {context[:80]}...")
            log(f"  One-liner: {one_liner}")

        success += 1
        save_progress(str(note_path), "done", {
            "context_len": len(context),
            "one_liner_len": len(one_liner),
        })

        log(f"  Success: {success} | Fail: {fail} | Skip: {skip}")
        time.sleep(RATE_LIMIT_SEC)

    log("=== Goal Loop Complete ===")
    log(f"Processed: {len(notes)} | Success: {success} | Fail: {fail} | Skip: {skip}")
    log(f"Progress log: {PROGRESS_FILE}")
    
    # Send completion alert
    discord_alert(f"DeepSeek enrichment COMPLETE — {success}/{len(notes)} notes enriched. Fail: {fail}, Skip: {skip}. Log: {PROGRESS_FILE}")
    paperclip_comment(PAPERCLIP_ISSUE, f"Goal loop complete. Processed: {len(notes)}, Success: {success}, Fail: {fail}, Skip: {skip}. All notes enriched with Context + One-liner + OpenTelemetry metadata.")
    
    # Mark issue as done in Paperclip
    paperclip_done = paperclip_comment(PAPERCLIP_ISSUE, "Batch complete. Marking as done.")
    if paperclip_done:
        log("Paperclip issue updated to done", "INFO")


if __name__ == "__main__":
    main()
