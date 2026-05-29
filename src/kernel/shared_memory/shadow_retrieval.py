"""Shadow-mode pre-flight retrieval: logs what would be injected without injecting."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)

SHADOW_LOG_DIR = Path("/Users/djm/claude-projects/.runtime/shadow-retrieval")


@dataclass
class ShadowRetrievalResult:
    """What would have been injected into an agent's context."""

    agent: str
    task_description: str
    timestamp: str

    # Retrieved entries from working memory
    working_memory_entries: list[dict] = field(default_factory=list)
    working_memory_token_estimate: int = 0

    # Relevance metrics
    tiers_retrieved: dict = field(default_factory=dict)  # tier -> count
    agents_referenced: list[str] = field(default_factory=list)
    oldest_entry_age_hours: float = 0.0
    newest_entry_age_hours: float = 0.0

    # What would have been injected (formatted)
    injection_block: str = ""
    injection_token_estimate: int = 0


def _merge_tier_counts(tier_dicts: list[dict]) -> dict:
    """Merge a list of tier-count dicts into a single aggregated dict."""
    merged: dict[str, int] = {}
    for d in tier_dicts:
        for k, v in d.items():
            merged[k] = merged.get(k, 0) + v
    return merged


class ShadowRetrieval:
    """Performs pre-flight retrieval and logs results without injecting."""

    def __init__(self, log_dir: Path = SHADOW_LOG_DIR) -> None:
        self.log_dir = log_dir
        self.log_dir.mkdir(parents=True, exist_ok=True)

    def retrieve_and_log(
        self,
        agent: str,
        task_description: str = "",
        max_tokens: int = 2000,
    ) -> ShadowRetrievalResult:
        """Query working memory for what WOULD be injected for this agent/task.

        Formats an injection block with citations, logs the result to a JSONL
        file, and returns the result for inspection.  Nothing is injected.

        Citation format per entry:
        "[Retrieved from {source_agent}, session {source_session}, {timestamp}]"
        followed by the content.
        """
        # Import here to avoid circular deps
        from src.kernel.shared_memory.working_memory import WorkingMemoryStore

        store = WorkingMemoryStore()

        # Get entries that would be injected (only decision/lesson/policy tiers)
        entries = store.get_for_injection(agent=None, max_tokens=max_tokens)
        # Also get recent observations from the specific agent (self-context)
        own_recent = store.get_recent(agent=agent, limit=10, since_hours=24)

        # Build the injection block with citations
        injection_lines: list[str] = []
        injection_lines.append("[RELEVANT CONTEXT — shadow mode, not injected]")
        injection_lines.append("")

        for entry in entries:
            citation = (
                f"[From {entry['source_agent']},"
                f" session {entry['source_session'][:12]},"
                f" {entry['timestamp'][:10]},"
                f" tier={entry['tier']}]"
            )
            injection_lines.append(citation)
            injection_lines.append(entry["content"])
            injection_lines.append("")

        if own_recent:
            injection_lines.append("--- Own recent observations ---")
            for entry in own_recent[:5]:
                injection_lines.append(
                    f"[{entry['timestamp'][:10]}] {entry['content'][:200]}"
                )
            injection_lines.append("")

        injection_block = "\n".join(injection_lines)

        # Compute metrics
        tier_counts: dict[str, int] = {}
        agents_seen: set[str] = set()
        ages: list[float] = []
        now = datetime.now(timezone.utc)

        for entry in entries:
            tier = entry.get("tier", "unknown")
            tier_counts[tier] = tier_counts.get(tier, 0) + 1
            agents_seen.add(entry.get("source_agent", "unknown"))
            try:
                entry_time = datetime.fromisoformat(
                    entry["timestamp"].replace("Z", "+00:00")
                )
                age_hours = (now - entry_time).total_seconds() / 3600
                ages.append(age_hours)
            except (ValueError, KeyError):
                pass

        result = ShadowRetrievalResult(
            agent=agent,
            task_description=task_description,
            timestamp=now.isoformat(),
            working_memory_entries=entries,
            working_memory_token_estimate=sum(
                len(e["content"]) // 4 for e in entries
            ),
            tiers_retrieved=tier_counts,
            agents_referenced=sorted(agents_seen),
            oldest_entry_age_hours=max(ages) if ages else 0.0,
            newest_entry_age_hours=min(ages) if ages else 0.0,
            injection_block=injection_block,
            injection_token_estimate=len(injection_block) // 4,
        )

        self._log_result(result)
        return result

    def _log_result(self, result: ShadowRetrievalResult) -> None:
        """Append result to daily JSONL log."""
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        log_file = self.log_dir / f"shadow-{date_str}.jsonl"

        log_entry = {
            "agent": result.agent,
            "task_description": result.task_description,
            "timestamp": result.timestamp,
            "entries_count": len(result.working_memory_entries),
            "token_estimate": result.injection_token_estimate,
            "tiers": result.tiers_retrieved,
            "agents_referenced": result.agents_referenced,
            "oldest_hours": round(result.oldest_entry_age_hours, 1),
            "newest_hours": round(result.newest_entry_age_hours, 1),
        }

        with open(log_file, "a") as fh:
            fh.write(json.dumps(log_entry) + "\n")

        logger.info(
            "Shadow retrieval for %s: %d entries, ~%d tokens, tiers=%s",
            result.agent,
            len(result.working_memory_entries),
            result.injection_token_estimate,
            result.tiers_retrieved,
        )

    def get_daily_stats(self, date_str: str | None = None) -> dict:
        """Aggregate stats from a day's shadow logs."""
        if date_str is None:
            date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        log_file = self.log_dir / f"shadow-{date_str}.jsonl"
        if not log_file.exists():
            return {"date": date_str, "retrievals": 0}

        entries: list[dict] = []
        for line in log_file.read_text().strip().split("\n"):
            if line:
                entries.append(json.loads(line))

        total = len(entries)
        return {
            "date": date_str,
            "retrievals": total,
            "total_tokens": sum(e["token_estimate"] for e in entries),
            "avg_tokens": sum(e["token_estimate"] for e in entries) // max(total, 1),
            "avg_entries": sum(e["entries_count"] for e in entries) // max(total, 1),
            "agents": list({e["agent"] for e in entries}),
            "tier_totals": _merge_tier_counts([e["tiers"] for e in entries]),
        }
