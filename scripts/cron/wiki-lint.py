#!/usr/bin/env python3
"""Wiki lint — scan claude-vault/03-Knowledge/ for quality issues.

Checks:
  1. Broken [[wikilinks]] (target file doesn't exist)
  2. Orphan pages (no inbound wikilinks from other files)
  3. Frontmatter validation (missing required fields)
  4. Stale content (updated > 90 days ago)
  5. Tag sprawl (tags not in canonical taxonomy)
  6. Wiki-specific: provisional > 30 days, raw staging > 7 days

Writes report to: claude-vault/10-Meta/wiki-lint-report.md
Appends to log:   claude-vault/10-Meta/wiki-log.md
"""

import os
import re
import sys
import yaml
from datetime import datetime
from pathlib import Path
from collections import defaultdict

VAULT = Path("/Users/djm/claude-projects/claude-vault")
KNOWLEDGE = VAULT / "03-Knowledge"
WIKI = KNOWLEDGE / "wiki"
REPORT_PATH = VAULT / "10-Meta" / "wiki-lint-report.md"
LOG_PATH = VAULT / "10-Meta" / "wiki-log.md"
TAXONOMY_PATH = VAULT / "10-Meta" / "tag-taxonomy.md"

REQUIRED_FIELDS = {"note_type", "content_type", "status", "created", "updated"}
LEGACY_TYPE_FIELD = "type"  # old schema, read-only — don't flag these

WIKILINK_RE = re.compile(r"\[\[([^\]|]+)(?:\|[^\]]+)?\]\]")
EDGA_RE = re.compile(r"^EDGA-\d+$")
HIERARCHICAL_TAG_RE = re.compile(r"^(topic|source|domain|content|tool|org|area|status|type)/")
PIPELINE_TAGS = {"rss-triage", "email", "sent"}

TODAY = datetime.now().date()
STALE_DAYS = 90
PROVISIONAL_DAYS = 30
RAW_DAYS = 7


def parse_frontmatter(path: Path) -> dict | None:
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return None
    if not text.startswith("---"):
        return None
    end = text.find("---", 3)
    if end == -1:
        return None
    try:
        return yaml.safe_load(text[3:end]) or {}
    except yaml.YAMLError:
        return None


def load_canonical_tags() -> set[str]:
    tags = set()
    if not TAXONOMY_PATH.exists():
        return tags
    text = TAXONOMY_PATH.read_text(encoding="utf-8", errors="replace")
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("| ") and not line.startswith("| Canonical") and not line.startswith("| Deprecated") and not line.startswith("|---"):
            parts = [p.strip() for p in line.split("|")]
            if len(parts) >= 2 and parts[1] and parts[1] not in ("Canonical", "Deprecated"):
                tags.add(parts[1])
    return tags


def find_md_files(root: Path) -> list[Path]:
    files = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in (".obsidian", ".git", "node_modules", "99-Archive")]
        for f in filenames:
            if f.endswith(".md"):
                files.append(Path(dirpath) / f)
    return files


def extract_wikilinks(path: Path) -> list[str]:
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return []
    return WIKILINK_RE.findall(text)


def resolve_wikilink(link: str, all_stems: set[str], all_paths: set[str]) -> bool:
    """Check if a wikilink target exists. Obsidian resolves by stem (filename without .md)."""
    clean = link.strip()
    if "/" in clean:
        clean_path = clean.replace("\\", "/")
        if clean_path in all_paths or clean_path + ".md" in all_paths:
            return True
        stem = clean_path.rsplit("/", 1)[-1]
        return stem.lower() in all_stems
    return clean.lower() in all_stems


def main():
    scan_dirs = [KNOWLEDGE]
    # Also scan a few other vault dirs that hold curated content
    for extra in ["02-Agents", "05-Solutions", "08-Reference", "13-Reports", "15-Products", "16-Projects"]:
        p = VAULT / extra
        if p.is_dir():
            scan_dirs.append(p)

    all_files: list[Path] = []
    for d in scan_dirs:
        all_files.extend(find_md_files(d))

    # Build lookup sets for wikilink resolution
    all_stems: set[str] = set()
    all_rel_paths: set[str] = set()
    for f in all_files:
        all_stems.add(f.stem.lower())
        try:
            rel = str(f.relative_to(VAULT))
            all_rel_paths.add(rel)
            all_rel_paths.add(rel.removesuffix(".md"))
        except ValueError:
            pass

    # Also add files outside scan dirs (vault-wide stem resolution)
    for f in find_md_files(VAULT):
        all_stems.add(f.stem.lower())

    # --- Checks ---
    broken_links_set: set[tuple[str, str]] = set()    # deduplicated (file, link)
    inbound_count: dict[str, int] = defaultdict(int)  # stem -> count
    frontmatter_issues: list[tuple[str, str]] = []    # (file, issue)
    stale_files: list[tuple[str, str]] = []           # (file, updated_date)
    tag_sprawl: list[tuple[str, list[str]]] = []      # (file, bad_tags)
    provisional_stale: list[tuple[str, int]] = []     # (file, days_old)
    raw_stale: list[tuple[str, int]] = []             # (file, days_old)

    canonical_tags = load_canonical_tags()

    for f in all_files:
        rel = str(f.relative_to(VAULT))

        # Wikilinks
        links = extract_wikilinks(f)
        for link in links:
            target_stem = link.rsplit("/", 1)[-1].strip().lower()
            if target_stem:
                inbound_count[target_stem] += 1
            if EDGA_RE.match(link.strip()):
                continue
            if not resolve_wikilink(link, all_stems, all_rel_paths):
                broken_links_set.add((rel, link))

        # Frontmatter
        fm = parse_frontmatter(f)
        if fm is not None:
            has_legacy = LEGACY_TYPE_FIELD in fm
            if not has_legacy:
                missing = REQUIRED_FIELDS - set(fm.keys())
                if missing:
                    frontmatter_issues.append((rel, f"missing: {', '.join(sorted(missing))}"))

            # Stale check
            updated = fm.get("updated")
            if updated:
                try:
                    if isinstance(updated, str):
                        updated_date = datetime.strptime(updated[:10], "%Y-%m-%d").date()
                    elif hasattr(updated, "date"):
                        updated_date = updated if isinstance(updated, type(TODAY)) else updated.date()
                    else:
                        updated_date = None
                    if updated_date and (TODAY - updated_date).days > STALE_DAYS:
                        stale_files.append((rel, str(updated_date)))
                except (ValueError, TypeError):
                    pass

            # Tag sprawl
            if canonical_tags:
                tags = fm.get("tags", [])
                if isinstance(tags, list):
                    bad = [
                        t for t in tags
                        if isinstance(t, str)
                        and t.lower() not in canonical_tags
                        and t.lower() not in PIPELINE_TAGS
                        and not HIERARCHICAL_TAG_RE.match(t)
                    ]
                    if bad:
                        tag_sprawl.append((rel, bad))

            # Provisional > 30 days
            if fm.get("provisional") is True:
                created = fm.get("created")
                if created:
                    try:
                        if isinstance(created, str):
                            created_date = datetime.strptime(created[:10], "%Y-%m-%d").date()
                        elif hasattr(created, "date"):
                            created_date = created if isinstance(created, type(TODAY)) else created.date()
                        else:
                            created_date = None
                        if created_date:
                            age = (TODAY - created_date).days
                            if age > PROVISIONAL_DAYS:
                                provisional_stale.append((rel, age))
                    except (ValueError, TypeError):
                        pass

    # Raw staging check
    raw_dir = WIKI / "raw"
    if raw_dir.is_dir():
        for f in raw_dir.iterdir():
            if f.is_file() and f.suffix == ".md":
                age = (TODAY - datetime.fromtimestamp(f.stat().st_mtime).date()).days
                if age > RAW_DAYS:
                    raw_stale.append((str(f.relative_to(VAULT)), age))

    # Orphan detection (scoped to 03-Knowledge/ only, excludes index/MOC files)
    orphans: list[str] = []
    for f in all_files:
        if not str(f).startswith(str(KNOWLEDGE)):
            continue
        stem_lower = f.stem.lower()
        if stem_lower in ("index", "master_index", "_topic-index", "readme"):
            continue
        if "MOC" in f.parent.name or "moc" in f.parent.name.lower():
            continue
        if inbound_count.get(stem_lower, 0) == 0:
            orphans.append(str(f.relative_to(VAULT)))

    broken_links = sorted(broken_links_set)

    # --- Report ---
    total_issues = len(broken_links) + len(frontmatter_issues) + len(stale_files) + len(tag_sprawl) + len(orphans) + len(provisional_stale) + len(raw_stale)

    lines = [
        "---",
        "note_type: report",
        "content_type: data",
        "status: active",
        f"created: {TODAY}",
        f"updated: {TODAY}",
        "tags: [wiki, lint, meta]",
        "---",
        "",
        "# Wiki Lint Report",
        "",
        f"**Last run:** {TODAY} (automated)",
        f"**Scope:** 03-Knowledge/ + 02-Agents/ + 05-Solutions/ + 08-Reference/ + 13-Reports/ + 15-Products/ + 16-Projects/",
        f"**Files scanned:** {len(all_files)}",
        f"**Total issues:** {total_issues}",
        "",
        "---",
        "",
        "## Summary",
        "",
        "| Check | Count | Status |",
        "|-------|-------|--------|",
        f"| Files scanned | {len(all_files)} | -- |",
        f"| Broken wikilinks | {len(broken_links)} | {'WARN' if broken_links else 'OK'} |",
        f"| Orphan pages | {len(orphans)} | {'INFO' if orphans else 'OK'} |",
        f"| Frontmatter issues | {len(frontmatter_issues)} | {'WARN' if frontmatter_issues else 'OK'} |",
        f"| Stale content (>{STALE_DAYS}d) | {len(stale_files)} | {'INFO' if stale_files else 'OK'} |",
        f"| Tag sprawl | {len(tag_sprawl)} | {'WARN' if tag_sprawl else 'OK'} |",
        f"| Provisional >{PROVISIONAL_DAYS}d | {len(provisional_stale)} | {'WARN' if provisional_stale else 'OK'} |",
        f"| Raw staging >{RAW_DAYS}d | {len(raw_stale)} | {'WARN' if raw_stale else 'OK'} |",
        "",
        "---",
        "",
    ]

    if broken_links:
        lines.append("## Broken Wikilinks")
        lines.append("")
        for file, link in sorted(broken_links)[:100]:
            lines.append(f"- `{file}`: [[{link}]]")
        if len(broken_links) > 100:
            lines.append(f"- ... and {len(broken_links) - 100} more")
        lines.append("")

    if frontmatter_issues:
        lines.append("## Frontmatter Issues")
        lines.append("")
        for file, issue in sorted(frontmatter_issues)[:50]:
            lines.append(f"- `{file}`: {issue}")
        if len(frontmatter_issues) > 50:
            lines.append(f"- ... and {len(frontmatter_issues) - 50} more")
        lines.append("")

    if stale_files:
        lines.append(f"## Stale Content (>{STALE_DAYS} days)")
        lines.append("")
        for file, date in sorted(stale_files, key=lambda x: x[1])[:50]:
            lines.append(f"- `{file}` (last updated: {date})")
        if len(stale_files) > 50:
            lines.append(f"- ... and {len(stale_files) - 50} more")
        lines.append("")

    if tag_sprawl:
        lines.append("## Tag Sprawl (non-canonical tags)")
        lines.append("")
        for file, tags in sorted(tag_sprawl)[:50]:
            lines.append(f"- `{file}`: {', '.join(tags)}")
        if len(tag_sprawl) > 50:
            lines.append(f"- ... and {len(tag_sprawl) - 50} more")
        lines.append("")

    if orphans:
        lines.append("## Orphan Pages (no inbound wikilinks)")
        lines.append("")
        for file in sorted(orphans)[:100]:
            lines.append(f"- `{file}`")
        if len(orphans) > 100:
            lines.append(f"- ... and {len(orphans) - 100} more")
        lines.append("")

    if provisional_stale:
        lines.append(f"## Stale Provisional Notes (>{PROVISIONAL_DAYS} days)")
        lines.append("")
        for file, age in sorted(provisional_stale, key=lambda x: -x[1]):
            lines.append(f"- `{file}` ({age} days old)")
        lines.append("")

    if raw_stale:
        lines.append(f"## Stale Raw Staging (>{RAW_DAYS} days)")
        lines.append("")
        for file, age in sorted(raw_stale, key=lambda x: -x[1]):
            lines.append(f"- `{file}` ({age} days old)")
        lines.append("")

    if total_issues == 0:
        lines.append("## All Clear")
        lines.append("")
        lines.append("No issues found.")
        lines.append("")

    lines.append("---")
    lines.append("")
    lines.append(f"*Generated by wiki-lint.py on {TODAY}*")

    REPORT_PATH.write_text("\n".join(lines), encoding="utf-8")

    # Append to wiki-log
    log_entry = f"\n## [{TODAY}] lint | automated scan | wiki-lint.py\n"
    log_entry += f"- Files scanned: {len(all_files)}\n"
    log_entry += f"- Issues found: {total_issues}\n"
    log_entry += f"- Broken links: {len(broken_links)}, Orphans: {len(orphans)}, "
    log_entry += f"Frontmatter: {len(frontmatter_issues)}, Stale: {len(stale_files)}, "
    log_entry += f"Tag sprawl: {len(tag_sprawl)}\n"
    log_entry += f"- Report: 10-Meta/wiki-lint-report.md\n"

    if LOG_PATH.exists():
        content = LOG_PATH.read_text(encoding="utf-8")
        marker = "---\n\n*Next action:"
        if marker in content:
            content = content.replace(marker, log_entry + "\n" + marker)
        else:
            last_dash = content.rfind("\n---\n")
            if last_dash != -1:
                content = content[:last_dash] + "\n" + log_entry + content[last_dash:]
            else:
                content += "\n" + log_entry
        LOG_PATH.write_text(content, encoding="utf-8")

    # Console output
    print(f"Wiki Lint — {TODAY}")
    print(f"  Files scanned:     {len(all_files)}")
    print(f"  Broken wikilinks:  {len(broken_links)}")
    print(f"  Orphan pages:      {len(orphans)}")
    print(f"  Frontmatter:       {len(frontmatter_issues)}")
    print(f"  Stale (>{STALE_DAYS}d):       {len(stale_files)}")
    print(f"  Tag sprawl:        {len(tag_sprawl)}")
    print(f"  Total issues:      {total_issues}")
    print(f"  Report: {REPORT_PATH}")

    return 1 if broken_links or frontmatter_issues or tag_sprawl else 0


if __name__ == "__main__":
    sys.exit(main())
