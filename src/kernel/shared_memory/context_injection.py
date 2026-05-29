"""Gated context injection with feature flags, token caps, and citations."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).resolve().parents[3]
FLAGS_PATH = _PROJECT_ROOT / "config" / "memory_injection_flags.yaml"
FLAGS_PATH_JSON = FLAGS_PATH.with_suffix(".json")

TIER_ORDER = ("observation", "decision", "lesson", "policy")


@dataclass
class InjectionConfig:
    """Resolved config for a specific agent + task combination."""

    mode: str               # "off", "shadow", "active"
    max_tokens: int
    min_tier: str
    max_age_hours: int
    citation_format: str


@dataclass
class InjectionResult:
    """What was (or would be) injected."""

    agent: str
    task_type: str
    mode: str
    config: InjectionConfig
    entries_considered: int
    entries_selected: int
    token_estimate: int
    injection_block: str    # The formatted context block with citations
    was_injected: bool      # True only if mode == "active"


class ContextInjector:
    """
    Builds context injection blocks from working memory with feature flags.

    Usage::

        injector = ContextInjector()
        result = injector.build_injection(agent="hive", task_type="coordinate")

        if result.was_injected:
            # Prepend result.injection_block to the agent's system prompt
            pass
    """

    def __init__(self, flags_path: Path = FLAGS_PATH) -> None:
        self._flags_path = flags_path
        self._flags = self._load_flags(flags_path)

    # ------------------------------------------------------------------
    # Config loading
    # ------------------------------------------------------------------

    def _load_flags(self, path: Path) -> dict[str, Any]:
        """Load feature flags from YAML (preferred) or JSON fallback."""
        if path.exists():
            try:
                import yaml  # type: ignore[import]
                data = yaml.safe_load(path.read_text()) or {}
                logger.debug("Loaded injection flags from %s (YAML)", path)
                return data
            except ImportError:
                logger.debug("PyYAML not available; falling back to JSON flags")
            except Exception as exc:  # pragma: no cover
                logger.warning("Failed to parse YAML flags at %s: %s", path, exc)

        json_path = path.with_suffix(".json")
        if json_path.exists():
            try:
                data = json.loads(json_path.read_text())
                logger.debug("Loaded injection flags from %s (JSON)", json_path)
                return data
            except Exception as exc:  # pragma: no cover
                logger.warning("Failed to parse JSON flags at %s: %s", json_path, exc)

        logger.warning(
            "No injection flags found at %s or %s — using safe defaults (mode=off)",
            path,
            path.with_suffix(".json"),
        )
        return {
            "defaults": {
                "mode": "off",
                "max_tokens": 1500,
                "min_tier": "decision",
                "max_age_hours": 168,
                "citation_format": "[Memory: {source_agent}, {date}, tier={tier}]",
            }
        }

    def reload_flags(self, path: Path | None = None) -> None:
        """Reload feature flags from disk (for runtime updates without restart)."""
        self._flags = self._load_flags(path or self._flags_path)

    # ------------------------------------------------------------------
    # Config resolution
    # ------------------------------------------------------------------

    def resolve_config(self, agent: str, task_type: str = "") -> InjectionConfig:
        """
        Resolve the effective config for an agent + task combination.

        Merge order (highest wins): task_override > agent > defaults.
        """
        defaults: dict[str, Any] = self._flags.get("defaults") or {}
        agent_cfg: dict[str, Any] = (self._flags.get("agents") or {}).get(agent) or {}

        task_key = f"{agent}.{task_type}" if task_type else None
        task_cfg: dict[str, Any] = (
            (self._flags.get("task_overrides") or {}).get(task_key) or {}
            if task_key
            else {}
        )

        def pick(key: str, default: Any) -> Any:
            return task_cfg.get(key, agent_cfg.get(key, defaults.get(key, default)))

        return InjectionConfig(
            mode=pick("mode", "off"),
            max_tokens=int(pick("max_tokens", 1500)),
            min_tier=pick("min_tier", "decision"),
            max_age_hours=int(pick("max_age_hours", 168)),
            citation_format=pick(
                "citation_format",
                "[Memory: {source_agent}, {date}, tier={tier}]",
            ),
        )

    # ------------------------------------------------------------------
    # Injection building
    # ------------------------------------------------------------------

    def build_injection(
        self,
        agent: str,
        task_type: str = "",
        task_description: str = "",  # noqa: ARG002  (reserved for future relevance filtering)
    ) -> InjectionResult:
        """
        Build an injection block for the given agent.

        - ``mode == "off"``    → returns empty block, ``was_injected=False``
        - ``mode == "shadow"`` → builds block, logs it, ``was_injected=False``
        - ``mode == "active"`` → builds block, ``was_injected=True``
        """
        config = self.resolve_config(agent, task_type)

        if config.mode == "off":
            return InjectionResult(
                agent=agent,
                task_type=task_type,
                mode="off",
                config=config,
                entries_considered=0,
                entries_selected=0,
                token_estimate=0,
                injection_block="",
                was_injected=False,
            )

        # Lazy import to avoid circular deps and chromadb pulls
        from src.kernel.shared_memory.working_memory import WorkingMemoryStore  # noqa: PLC0415

        store = WorkingMemoryStore()
        entries = store.get_for_injection(agent=None, max_tokens=config.max_tokens)
        entries_considered = len(entries)

        # Resolve min_tier index (default to 'decision' if invalid)
        min_idx = (
            TIER_ORDER.index(config.min_tier)
            if config.min_tier in TIER_ORDER
            else TIER_ORDER.index("decision")
        )

        now = datetime.now(timezone.utc)
        filtered: list[dict[str, Any]] = []

        for entry in entries:
            # Tier gate — never inject below min_tier
            tier = entry.get("tier", "observation")
            tier_idx = TIER_ORDER.index(tier) if tier in TIER_ORDER else 0
            if tier_idx < min_idx:
                continue

            # Age gate
            try:
                raw_ts = entry.get("timestamp", "")
                entry_time = datetime.fromisoformat(raw_ts.replace("Z", "+00:00"))
                age_hours = (now - entry_time).total_seconds() / 3600
                if age_hours > config.max_age_hours:
                    continue
            except (ValueError, AttributeError, TypeError):
                # Skip entries whose timestamp is unparseable
                continue

            filtered.append(entry)

        # Build injection block with mandatory citations; enforce hard token cap
        lines: list[str] = ["[RETRIEVED CONTEXT]", ""]
        token_used = 0
        selected: list[dict[str, Any]] = []

        for entry in filtered:
            citation = config.citation_format.format(
                source_agent=entry.get("source_agent", "?"),
                date=str(entry.get("timestamp", "?"))[:10],
                tier=entry.get("tier", "?"),
                source_session=str(entry.get("source_session", "?"))[:12],
            )
            content = entry.get("content", "")
            block = f"{citation}\n{content}\n"
            tokens = len(block) // 4

            if token_used + tokens > config.max_tokens:
                # Hard cap: stop rather than overflow
                break

            lines.append(block)
            token_used += tokens
            selected.append(entry)

        lines.append("[END RETRIEVED CONTEXT]")
        injection_block = "\n".join(lines)

        was_injected = config.mode == "active"

        if config.mode == "shadow":
            logger.info(
                "Shadow injection for agent=%s task_type=%r: "
                "%d/%d entries considered, ~%d tokens (NOT injected)",
                agent,
                task_type or "(none)",
                len(selected),
                entries_considered,
                token_used,
            )
        elif config.mode == "active":
            logger.info(
                "Active injection for agent=%s task_type=%r: "
                "%d/%d entries, ~%d tokens",
                agent,
                task_type or "(none)",
                len(selected),
                entries_considered,
                token_used,
            )

        return InjectionResult(
            agent=agent,
            task_type=task_type,
            mode=config.mode,
            config=config,
            entries_considered=entries_considered,
            entries_selected=len(selected),
            token_estimate=token_used,
            injection_block=injection_block,
            was_injected=was_injected,
        )
