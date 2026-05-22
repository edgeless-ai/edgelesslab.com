"""
NotebookLM 24/7 Content Pipeline (EDGA-209 / task-310).

Consumes KB-promoted vault notes (triage score >= 7) and feeds them into
NotebookLM for multi-format content generation (slides, audio, mind maps).

Integrates with:
  - YouTube triage (task-281) -> 03-Knowledge/YouTube/
  - RSS triage (task-297) -> 03-Knowledge/RSS/

Quality gating:
  - Auto-publish: triage_score >= 8 AND notebooklm_confidence >= 0.7
  - Human review: everything else goes to 00-Inbox/notebooklm-review/
"""

from __future__ import annotations

import json
import re
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

# ---------- configuration ----------

PROJECT_ROOT = Path("/Users/djm/claude-projects")
VAULT_KB = PROJECT_ROOT / "claude-vault" / "03-Knowledge"
VAULT_REVIEW = PROJECT_ROOT / "claude-vault" / "00-Inbox" / "notebooklm-review"
PIPELINE_STATE = PROJECT_ROOT / ".feeds" / "notebooklm-pipeline-state.json"
ARCHIVE_LOG = PROJECT_ROOT / ".feeds" / "notebooklm-pipeline-archived.jsonl"

# Score thresholds (DEPRECATED: antifragile pass 2026-05-18)
# Previously gated at triage_score >= 8 and confidence >= 0.7.
# NotebookLM is designed for messy, high-entropy input. Pre-filtering defeats the purpose.
# All content now flows through; let NotebookLM do the synthesis.
AUTO_PUBLISH_MIN_SCORE = 0
NOTEBOOKLM_CONFIDENCE_THRESHOLD = 0.0

# NotebookLM output formats
OutputFormat = Literal["slides", "audio", "mindmap", "faq", "timeline"]
DEFAULT_FORMATS: list[OutputFormat] = ["slides", "audio"]

# ---------- data models ----------

@dataclass
class SourceNote:
    path: Path
    video_id: str | None
    title: str
    channel: str | None
    triage_score: int
    triage_route: str
    topics: list[str] = field(default_factory=list)
    url: str | None = None
    content: str = ""

    @property
    def source_type(self) -> str:
        if "YouTube" in str(self.path):
            return "youtube"
        if "RSS" in str(self.path):
            return "rss"
        return "unknown"

    @property
    def is_kb_promoted(self) -> bool:
        return self.triage_route == "kb-promoted" or self.triage_score >= 7


@dataclass
class NotebookLMJob:
    source: SourceNote
    notebook_id: str | None = None
    formats: list[OutputFormat] = field(default_factory=lambda: list(DEFAULT_FORMATS))
    status: Literal["pending", "processing", "completed", "failed", "review"] = "pending"
    outputs: dict[str, str] = field(default_factory=dict)
    confidence: float = 0.0


# ---------- state management ----------

def load_pipeline_state() -> dict:
    if not PIPELINE_STATE.exists():
        return {"processed_ids": [], "last_run": None, "notebooks": {}}
    return json.loads(PIPELINE_STATE.read_text())


def save_pipeline_state(state: dict) -> None:
    PIPELINE_STATE.parent.mkdir(parents=True, exist_ok=True)
    PIPELINE_STATE.write_text(json.dumps(state, indent=2, default=str))


def is_processed(video_id: str | None, state: dict | None = None) -> bool:
    if not video_id:
        return False
    if state is None:
        state = load_pipeline_state()
    return video_id in state.get("processed_ids", [])


def mark_processed(video_id: str, notebook_id: str | None = None, outputs: dict | None = None) -> None:
    state = load_pipeline_state()
    if video_id not in state["processed_ids"]:
        state["processed_ids"].append(video_id)
    if notebook_id and video_id:
        state["notebooks"][video_id] = {
            "notebook_id": notebook_id,
            "outputs": outputs or {},
            "processed_at": _now_iso(),
        }
    state["last_run"] = _now_iso()
    save_pipeline_state(state)


def _now_iso() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


# ---------- vault scanning ----------

def parse_frontmatter(text: str) -> dict:
    """Extract YAML frontmatter from markdown."""
    match = re.match(r"^---\s*\n(.*?)\n---", text, re.DOTALL)
    if not match:
        return {}
    fm = match.group(1)
    result: dict = {}
    for line in fm.split("\n"):
        if ":" in line and not line.strip().startswith("-"):
            key, val = line.split(":", 1)
            result[key.strip()] = val.strip().strip('"').strip("'")
    # Parse list fields (topics, sources)
    for list_field in ("topics", "sources"):
        if list_field in result:
            continue
        # Look for "key:\n  - value\n  - value" pattern
        pattern = rf"^{list_field}:\s*$\n((?:\s+- .+\n?)+)"
        m = re.search(pattern, fm, re.MULTILINE)
        if m:
            items = [line.strip().lstrip("- ").strip() for line in m.group(1).strip().split("\n")]
            result[list_field] = [i for i in items if i]
    return result


def scan_kb_notes(kb_path: Path = VAULT_KB) -> list[SourceNote]:
    """Scan 03-Knowledge for triage-generated notes ready for NotebookLM."""
    notes: list[SourceNote] = []

    # Scan YouTube and RSS subdirectories
    for source_type in ("YouTube", "RSS"):
        source_dir = kb_path / source_type
        if not source_dir.exists():
            continue

        for channel_dir in source_dir.iterdir():
            if not channel_dir.is_dir():
                continue
            for note_path in channel_dir.glob("*.md"):
                if note_path.name.startswith("_"):
                    continue
                try:
                    text = note_path.read_text()
                    fm = parse_frontmatter(text)

                    # Must have triage metadata (used for routing, not gating)
                    if "triage_score" not in fm:
                        continue

                    note = SourceNote(
                        path=note_path,
                        video_id=fm.get("video_id"),
                        title=fm.get("title", note_path.stem),
                        channel=fm.get("channel"),
                        triage_score=int(fm.get("triage_score", 0)),
                        triage_route=fm.get("triage_route", "unknown"),
                        topics=fm.get("topics", []),
                        url=fm.get("url"),
                        content=text,
                    )

                    # Antifragile pass: ingest ALL notes, not just "kb-promoted".
                    # Previous gate: note.is_kb_promoted (triage_score >= 7).
                    # NotebookLM benefits from volume and variety.
                    notes.append(note)

                except Exception as e:
                    print(f"Error parsing {note_path}: {e}")
                    continue

    return notes


# ---------- NotebookLM integration ----------

def notebooklm_cli(args: list[str]) -> subprocess.CompletedProcess:
    """Run notebooklm CLI with given args."""
    cmd = ["notebooklm"] + args
    return subprocess.run(cmd, capture_output=True, text=True)


def find_or_create_notebook(topic: str, description: str = "") -> str | None:
    """Find existing notebook by topic, or default to General.
    
    Antifragile pass (2026-05-18): We no longer create topic-specific notebooks
    on demand. Instead, we route to a known notebook if there's a clear match,
    or fall back to the General Knowledge Firehose notebook. NotebookLM handles
    synthesis better when it has volume in fewer notebooks.
    """
    # Known notebook routing (hardcoded matches for explicit topics)
    topic_lower = topic.lower()
    if any(k in topic_lower for k in ("fxhash", "art blocks", "mint", "on-chain", "tezos", "ethereum", "blockchain", "nft")):
        return "f9aa3f0e-686a-4726-9c8e-0a8ba86b3c61"  # on-chain-minting
    if any(k in topic_lower for k in ("shader", "glsl", "webgl", "three.js", "touchdesigner", "hlsl")):
        return "c7a89c16-51ec-497e-b010-1c2425b118d4"  # shader-art
    if any(k in topic_lower for k in ("quantum", "black hole", "quantum computing", "string theory")):
        return "0b3e1bd9"  # science-quantum
    if any(k in topic_lower for k in ("math", "topology", "euler", "manim", "numberphile", "3blue1brown")):
        return "9a5e674d"  # science-math
    if any(k in topic_lower for k in ("physics", "simulation", "two minute papers", "thermodynamics")):
        return "a98e814d"  # science-physics
    if any(k in topic_lower for k in ("climate", "energy", "fusion", "geothermal", "sustainability")):
        return "2f1f65fb"  # science-energy
    if any(k in topic_lower for k in ("generative art", "creative coding", "p5.js", "processing", "plotter", "svg")):
        return "864b243d-d8be-44dc-970e-ab2ed9f109d2"  # creative-coding

    # Default: Knowledge Firehose
    return "67ad2264-df97-4ea2-931d-b6b946aa1347"


def add_source_to_notebook(notebook_id: str, note: SourceNote) -> bool:
    """Add a vault note as a source to a NotebookLM notebook."""
    # Write note content to temp file for ingestion
    from tempfile import NamedTemporaryFile
    with NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write(note.content)
        temp_path = f.name

    result = notebooklm_cli([
        "source", "add",
        temp_path,
        "-n", notebook_id,
        "--title", note.title[:100],
        "--json",
    ])

    # Cleanup temp file
    Path(temp_path).unlink(missing_ok=True)

    if result.returncode != 0:
        print(f"Failed to add source: {result.stderr}")
        return False

    return True


def generate_outputs(notebook_id: str, formats: list[OutputFormat]) -> dict[str, str]:
    """Generate requested output formats from notebook."""
    outputs: dict[str, str] = {}

    for fmt in formats:
        if fmt == "slides":
            result = notebooklm_cli([
                "ask", "-n", notebook_id,
                "Generate a slide deck summary of all sources. Format as markdown slides with --- separators.",
                "--json",
            ])
            if result.returncode == 0:
                try:
                    data = json.loads(result.stdout)
                    outputs["slides"] = data.get("answer", result.stdout)
                except json.JSONDecodeError:
                    outputs["slides"] = result.stdout

        elif fmt == "audio":
            # Audio briefing request
            result = notebooklm_cli([
                "ask", "-n", notebook_id,
                "Create a podcast-style audio briefing script. 5-10 minute listen. Conversational tone, two hosts discussing key insights.",
                "--json",
            ])
            if result.returncode == 0:
                try:
                    data = json.loads(result.stdout)
                    outputs["audio_script"] = data.get("answer", result.stdout)
                except json.JSONDecodeError:
                    outputs["audio_script"] = result.stdout

        elif fmt == "mindmap":
            result = notebooklm_cli([
                "ask", "-n", notebook_id,
                "Generate a hierarchical mind map of the content. Use markdown bullet nesting for structure.",
                "--json",
            ])
            if result.returncode == 0:
                try:
                    data = json.loads(result.stdout)
                    outputs["mindmap"] = data.get("answer", result.stdout)
                except json.JSONDecodeError:
                    outputs["mindmap"] = result.stdout

    return outputs


def assess_quality(outputs: dict[str, str], note: SourceNote) -> float:
    """Assess NotebookLM output quality heuristically."""
    if not outputs:
        return 0.0

    scores = []

    # Length check (non-trivial content)
    for content in outputs.values():
        words = len(content.split())
        if words > 200:
            scores.append(0.8)
        elif words > 100:
            scores.append(0.5)
        else:
            scores.append(0.2)

    # Structure check (has sections/separators)
    for content in outputs.values():
        if "---" in content or "#" in content:
            scores.append(0.7)

    # Source relevance (topics match)
    if note.topics:
        for content in outputs.values():
            topic_hits = sum(1 for t in note.topics if t.lower() in content.lower())
            if topic_hits >= len(note.topics) // 2:
                scores.append(0.9)

    return sum(scores) / len(scores) if scores else 0.0


# ---------- quality gating (DEPRECATED) ----------

# def should_auto_publish(...) and write_review_stub(...) removed.
# Antifragile pass (2026-05-18): All content flows through. NotebookLM handles quality.


def write_kb_insight(job: NotebookLMJob, kb_dir: Path = VAULT_KB / "NotebookLM-Insights") -> Path | None:
    """Write finalized insight to KB."""
    kb_dir.mkdir(parents=True, exist_ok=True)

    date_prefix = _now_iso()[:10]
    safe_title = re.sub(r"[^a-z0-9-]+", "-", job.source.title.lower())[:50].strip("-")
    fn = kb_dir / f"{date_prefix} {safe_title}-insight.md"

    # Find best output as primary
    if not job.outputs:
        print(f"  [WARN] No outputs for {job.source.video_id} — skipping KB write")
        return None
    primary = job.outputs.get("slides") or job.outputs.get("mindmap") or list(job.outputs.values())[0]

    body = f"""---
video_id: {job.source.video_id}
title: "{job.source.title}"
channel: {job.source.channel}
source_type: {job.source.source_type}
triage_score: {job.source.triage_score}
notebooklm_confidence: {job.confidence:.2f}
formats_generated: {json.dumps(list(job.outputs.keys()))}
processed: {_now_iso()}
tags:
  - notebooklm-auto
  - {job.source.source_type}
  - kb-promoted
---

# {job.source.title} — NotebookLM Synthesis

**Source**: [{job.source.title}]({job.source.url or job.source.path})
**Channel**: {job.source.channel}
**Confidence**: {job.confidence:.2f}

## Synthesis

{primary}

## Additional Formats

"""

    for fmt, content in job.outputs.items():
        if fmt == "slides":
            continue  # Already shown as primary
        body += f"\n### {fmt.upper()}\n\n<details>\n<summary>Click to expand</summary>\n\n{content}\n\n</details>\n"

    fn.write_text(body)
    return fn


# ---------- main pipeline ----------

def run_pipeline(
    dry_run: bool = False,
    formats: list[OutputFormat] | None = None,
    max_items: int | None = None,
) -> list[NotebookLMJob]:
    """Run the complete NotebookLM content pipeline."""
    if formats is None:
        formats = list(DEFAULT_FORMATS)

    state = load_pipeline_state()
    notes = scan_kb_notes()
    jobs: list[NotebookLMJob] = []

    print(f"Found {len(notes)} KB-promoted notes")

    # Filter already processed
    new_notes = [n for n in notes if not is_processed(n.video_id, state)]
    print(f"New notes to process: {len(new_notes)}")

    if max_items:
        new_notes = new_notes[:max_items]

    for note in new_notes:
        job = NotebookLMJob(source=note, formats=formats)

        if dry_run:
            print(f"[DRY-RUN] Would process: {note.title} (score={note.triage_score})")
            job.status = "pending"
            jobs.append(job)
            continue

        print(f"Processing: {note.title}")

        # Determine notebook topic from note metadata
        topic = note.topics[0] if note.topics else note.channel or "General"
        notebook_id = find_or_create_notebook(
            topic=topic,
            description=f"Auto-generated for {note.channel}: {note.title[:50]}"
        )

        if not notebook_id:
            job.status = "failed"
            jobs.append(job)
            continue

        job.notebook_id = notebook_id

        # Add source
        if not add_source_to_notebook(notebook_id, note):
            job.status = "failed"
            jobs.append(job)
            continue

        # Generate outputs
        print(f"  Generating: {formats}")
        job.outputs = generate_outputs(notebook_id, formats)
        job.confidence = assess_quality(job.outputs, note)

        # Quality gate (antifragile pass: always auto-publish)
        # Previous logic gated on triage_score >= 8 AND confidence >= 0.7.
        # Now: everything flows through to KB insights. NotebookLM handles quality.
        print(f"  ✅ Auto-published (confidence={job.confidence:.2f})")
        output_path = write_kb_insight(job)
        if output_path:
            job.status = "completed"
            print(f"  Written to: {output_path}")
        else:
            job.status = "failed"
            print("  Skipped — no outputs generated")

        mark_processed(note.video_id or "", notebook_id, job.outputs)
        jobs.append(job)

    return jobs


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="NotebookLM 24/7 Content Pipeline")
    parser.add_argument("--dry-run", action="store_true", help="Print what would be done")
    parser.add_argument("--max-items", type=int, default=None, help="Limit items processed")
    parser.add_argument("--formats", default="slides,audio", help="Comma-separated output formats")
    args = parser.parse_args()

    fmt_list = [f.strip() for f in args.formats.split(",") if f.strip()]
    jobs = run_pipeline(dry_run=args.dry_run, formats=fmt_list, max_items=args.max_items)

    print(f"\n{'='*50}")
    print(f"Pipeline complete: {len(jobs)} jobs")
    by_status: dict[str, int] = {}
    for j in jobs:
        by_status[j.status] = by_status.get(j.status, 0) + 1
    for status, count in by_status.items():
        print(f"  {status}: {count}")
