"""
Newsletter Generator - Morning Brew meets TLDR style newsletters.

Design principles (from research on successful newsletters):
1. "Texts from your smartest friend" voice - conversational, not formal
2. Clear hierarchy: One big thing, then tapering content
3. Value self-contained - readers don't need to click out
4. Personal takes and "what it means for you" angles
5. Short, curiosity-driven subject lines (7 words / 41 chars)
6. No internal pipeline language - reader-focused only

Structure:
- THE SIGNAL: One-line hook capturing the week's theme
- BIG STORY: Most important video + hot take + why it matters
- QUICK HITS: 3-4 bullet summaries (word count tapers down)
- TRY THIS: One concrete action you can do today
- RABBIT HOLE: One video worth watching in full
- TOOLBOX: Tools mentioned (if any)
"""

import sqlite3
import sys
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

# Add project root for imports
PROJECT_DIR = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(PROJECT_DIR))

from src.youtube_intelligence.config import Config
from src.youtube_intelligence.newsletter.synthesis import (
    SynthesisEngine,
    VideoSummary,
    Synthesis,
    TacticalRecommendation,
)
from src.youtube_intelligence.knowledge_router import KnowledgeRouter


@dataclass
class NewsletterContent:
    """Content for a newsletter edition."""
    edition_type: str  # "evening", "morning", "weekly"
    generated_at: datetime
    syntheses: list[Synthesis]
    theme_syntheses: dict[str, str]
    recommendations: list[TacticalRecommendation]
    source_videos: list[VideoSummary]
    tools_mentioned: list[str]
    still_thinking: str  # Unresolved questions
    video_count: int
    has_meaningful_content: bool
    # Knowledge router additions
    actionable_for_stack: list[dict] = field(default_factory=list)  # Items relevant to our tech stack
    suggested_tasks: list[dict] = field(default_factory=list)  # Potential backlog tasks
    high_relevance_count: int = 0  # Videos highly relevant to our stack
    # Historical context tracking
    historical_video_count: int = 0  # Total videos in knowledge base
    uses_historical_context: bool = False  # Whether this newsletter leveraged historical context
    top_historical_themes: list[str] = field(default_factory=list)  # Most common themes in knowledge base


@dataclass
class NewsletterEdition:
    """A complete newsletter ready to send."""
    subject: str
    html_body: str
    plain_body: str
    content: NewsletterContent


def _strip_embedded_sections(text: str) -> str:
    """Strip legacy Key Takeaways/Key Facts sections embedded in ChromaDB documents."""
    for marker in ["\n\nKey Takeaways:", "\n\nKey Facts:"]:
        if marker in text:
            text = text[:text.index(marker)]
    return text.strip()


def _smart_truncate(text: str, max_chars: int = 500, min_chars: int = 300) -> str:
    """
    Truncate text at sentence boundary to avoid mid-sentence cuts.

    Finds the last sentence ending within [min_chars, max_chars] range.
    If no good boundary found, truncates at max_chars with ellipsis.
    """
    if len(text) <= max_chars:
        return text

    # Look for sentence endings (.!? followed by space or end)
    text_segment = text[:max_chars]

    # Find the last sentence boundary (period, exclamation, question mark + space or end)
    for i in range(len(text_segment) - 1, min_chars - 1, -1):
        if text_segment[i] in '.!?' and (i + 1 == len(text_segment) or text_segment[i + 1] in ' \n'):
            return text_segment[:i + 1]

    # Fallback: truncate at last space before max_chars
    last_space = text_segment.rfind(' ', min_chars, max_chars)
    if last_space > 0:
        return text_segment[:last_space] + '...'

    return text_segment[:max_chars - 3] + '...'


class NewsletterGenerator:
    """
    Generates newsletter editions from processed video content.

    The generator pulls from ChromaDB summaries and SQLite metadata,
    runs synthesis to find cross-video insights, and produces
    formatted newsletter content.
    """

    def __init__(self, config: Optional[Config] = None, use_knowledge_router: bool = True):
        self.config = config or Config.load()
        self.synthesis_engine = SynthesisEngine()
        self.db_path = self.config.db_path
        self.use_knowledge_router = use_knowledge_router
        self.knowledge_router = KnowledgeRouter(db_path=self.db_path) if use_knowledge_router else None

    def generate_evening_edition(
        self,
        lookback_hours: int = 24
    ) -> Optional[NewsletterEdition]:
        """
        Generate the evening digest newsletter.

        Pulls videos processed in the last lookback_hours,
        synthesizes insights, and produces the newsletter.

        With historical context, can generate meaningful newsletters
        even with just 1 video by connecting it to past learnings.

        Returns None only if zero videos were processed.
        """
        # Get recently processed videos
        videos = self._get_recent_videos(lookback_hours)

        if len(videos) == 0:
            return self._generate_quiet_day_edition("evening", 0)

        # Generate content (with historical context if needed)
        content = self._generate_content(videos, "evening")

        if not content.has_meaningful_content:
            # Synthesis (LLM) produced nothing usable, but the likes are real and
            # captured. NEVER report "0 new likes" while videos exist — list them.
            return self._generate_likes_list_edition("evening", videos)

        # Format into newsletter
        return self._format_evening_edition(content)

    def generate_morning_edition(
        self,
        lookback_hours: int = 24
    ) -> Optional[NewsletterEdition]:
        """
        Generate the morning signal newsletter.

        Shorter format - one key insight and one action.

        With historical context, can generate meaningful insights
        even with just 1 video.
        """
        videos = self._get_recent_videos(lookback_hours)

        if len(videos) == 0:
            return self._generate_quiet_day_edition("morning", 0)

        content = self._generate_content(videos, "morning")

        if not content.has_meaningful_content:
            # Synthesis (LLM) produced nothing usable, but the likes are real and
            # captured. NEVER report "0 new likes" while videos exist — list them.
            return self._generate_likes_list_edition("morning", videos)

        return self._format_morning_edition(content)

    def _get_recent_videos(self, lookback_hours: int) -> list[VideoSummary]:
        """Get videos processed in the lookback window with their summaries.

        Also includes recently liked videos even if they haven't been re-processed yet,
        so the newsletter reflects actual user activity, not just pipeline activity.
        """
        cutoff = datetime.now() - timedelta(hours=lookback_hours)

        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            # Query 1: Recently processed videos (original logic)
            cursor = conn.execute("""
                SELECT video_id, title, channel_name, processing_status
                FROM videos
                WHERE processing_status = 'completed'
                  AND processing_completed_at > ?
                ORDER BY processing_completed_at DESC
            """, (cutoff.isoformat(),))
            processed = {row['video_id']: dict(row) for row in cursor.fetchall()}

            # Query 2: Recently liked videos (new — captures user activity even if not re-processed)
            cursor2 = conn.execute("""
                SELECT video_id, title, channel_name, processing_status
                FROM videos
                WHERE sources LIKE '%liked%'
                  AND last_seen_at > ?
                ORDER BY last_seen_at DESC
            """, (cutoff.isoformat(),))
            liked = {row['video_id']: dict(row) for row in cursor2.fetchall()}

        # Merge: liked videos take priority, processed videos fill in
        merged = {**processed, **liked}
        db_videos = list(merged.values())

        # Enrich from the VAULT — BEST EFFORT only. The list of videos is built from
        # db_videos below regardless, so a genuine like is NEVER silently dropped just
        # because its summary is missing. (That drop was the "0 new likes" bug: likes
        # existed in the DB but had no summary, so they vanished from the email.)
        summaries_by_id = self._load_vault_summaries()
        if not summaries_by_id:
            print("Newsletter: no vault summaries found — listing likes without summaries")

        videos = []
        for row in db_videos:
            s = summaries_by_id.get(row['video_id'], {})
            videos.append(VideoSummary(
                video_id=row['video_id'],
                title=row['title'],
                channel=row['channel_name'] or 'Unknown',
                summary=s.get('summary') or "(summary pending — like captured)",
                takeaways=s.get('takeaways', []),
                themes=s.get('themes', []),
                tools_mentioned=s.get('tools', []),
            ))

        return videos

    def _load_vault_summaries(self) -> dict[str, dict]:
        """Index enriched YouTube notes from the vault, keyed by video_id.

        This used to read the ChromaDB collection 'youtube_summaries', but
        claude-deep-enrich.sh only ever writes vault notes — nothing has written
        that collection since 2026-05-28, so every video rendered "summary
        pending" while a fully-enriched note sat in the vault. The vault is the
        single producer, so read it directly. This also removes a
        chromadb.PersistentClient that violated the single-writer rule.

        Scans the tree once (~180 files) rather than per-video, and memoises for
        the life of the generator since both the recent-video and historical
        paths need it. Best effort: any unparseable note is skipped, never fatal.
        """
        cached = getattr(self, "_vault_summary_cache", None)
        if cached is not None:
            return cached

        root = Path(self.config.vault_dir) / "03-Knowledge" / "YouTube"
        if not root.is_dir():
            self._vault_summary_cache = {}
            return {}

        index: dict[str, dict] = {}
        for path in root.rglob("*.md"):
            try:
                text = path.read_text(encoding="utf-8")
            except Exception:
                continue

            fm = self._parse_frontmatter(text)
            video_id = (fm.get("video_id") or "").strip().strip('"\'')
            if not video_id:
                continue

            # Prefer the written Summary section; fall back to the one-liner.
            summary = self._extract_section(text, "Summary") or fm.get("one_liner", "")
            if not summary:
                continue

            index[video_id] = {
                "summary": summary,
                "takeaways": self._extract_bullets(text, "Key Takeaways"),
                "themes": self._parse_yaml_list(fm.get("topics", "")),
                "tools": self._parse_yaml_list(fm.get("tools", "")),
                "title": fm.get("title", "").strip('"\'') or path.stem,
                "channel": fm.get("channel", "").strip('"\'') or "Unknown",
            }
        self._vault_summary_cache = index
        return index

    @staticmethod
    def _parse_frontmatter(text: str) -> dict:
        """Minimal YAML frontmatter reader: scalars plus '- item' lists.

        Deliberately dependency-free and read-only. List values come back as a
        newline-joined string for _parse_yaml_list to split.
        """
        if not text.startswith("---"):
            return {}
        end = text.find("\n---", 3)
        if end == -1:
            return {}

        fm: dict[str, str] = {}
        key = None
        for line in text[3:end].splitlines():
            if not line.strip():
                continue
            if line.startswith((" ", "\t")) and line.strip().startswith("-") and key:
                fm[key] = (fm[key] + "\n" if fm[key] else "") + line.strip()[1:].strip()
            elif ":" in line and not line.startswith((" ", "\t")):
                key, _, val = line.partition(":")
                key = key.strip()
                fm[key] = val.strip()
        return fm

    @staticmethod
    def _parse_yaml_list(raw: str) -> list[str]:
        """Split a frontmatter list (or comma string) into clean values."""
        if not raw:
            return []
        parts = raw.split("\n") if "\n" in raw else raw.split(",")
        return [p.strip().strip('"\'[]') for p in parts if p.strip().strip('"\'[]')]

    @staticmethod
    def _extract_section(text: str, heading: str) -> str:
        """Return the prose under '## <heading>', up to the next heading."""
        out: list[str] = []
        capturing = False
        for line in text.splitlines():
            if line.startswith("#"):
                if capturing:
                    break
                capturing = line.lstrip("#").strip().lower() == heading.lower()
                continue
            if capturing:
                out.append(line)
        return "\n".join(out).strip()

    @classmethod
    def _extract_bullets(cls, text: str, heading: str) -> list[str]:
        """Return the bullet items under '## <heading>'."""
        section = cls._extract_section(text, heading)
        return [
            line.strip().lstrip("-*").strip()
            for line in section.splitlines()
            if line.strip().startswith(("-", "*"))
        ]

    def _get_historical_context(self, exclude_video_ids: list[str], max_videos: int = 50) -> tuple[list[VideoSummary], dict[str, int]]:
        """
        Fetch historical videos and theme frequency from ChromaDB.

        Returns:
            - List of historical VideoSummary objects (most recent first)
            - Dict of theme -> count (frequency across all historical videos)
        """
        historical_videos = []
        theme_counts: dict[str, int] = {}

        # Reads the vault for the same reason _get_recent_videos does: the old
        # ChromaDB 'youtube_summaries' collection has been unwritten since
        # 2026-05-28, so historical context silently came back empty — which is
        # what starves synthesis of the cross-video material it needs.
        try:
            excluded = set(exclude_video_ids)
            for video_id, entry in self._load_vault_summaries().items():
                if video_id in excluded:
                    continue

                themes = entry["themes"]
                for theme in themes:
                    theme_lower = theme.lower().strip()
                    if theme_lower:
                        theme_counts[theme_lower] = theme_counts.get(theme_lower, 0) + 1

                historical_videos.append(VideoSummary(
                    video_id=video_id,
                    title=entry["title"],
                    channel=entry["channel"],
                    summary=entry["summary"],
                    takeaways=entry["takeaways"],
                    themes=themes,
                    tools_mentioned=entry["tools"],
                ))

            historical_videos = historical_videos[:max_videos]

        except Exception as e:
            print(f"Error fetching historical context: {e}")

        return historical_videos, theme_counts

    def _find_related_historical_videos(
        self,
        current_videos: list[VideoSummary],
        historical_videos: list[VideoSummary],
        max_related: int = 10
    ) -> list[VideoSummary]:
        """
        Find historical videos most related to current videos by theme overlap.

        Returns videos sorted by relevance (most theme overlap first).
        """
        if not current_videos or not historical_videos:
            return []

        # Collect themes from current videos
        current_themes = set()
        for video in current_videos:
            for theme in video.themes:
                current_themes.add(theme.lower().strip())

        if not current_themes:
            return []

        # Score historical videos by theme overlap
        scored_videos = []
        for video in historical_videos:
            video_themes = set(t.lower().strip() for t in video.themes)
            overlap = len(video_themes & current_themes)
            if overlap > 0:
                scored_videos.append((overlap, video))

        # Sort by overlap score and return top matches
        scored_videos.sort(key=lambda x: x[0], reverse=True)
        return [v for _, v in scored_videos[:max_related]]

    def _generate_content(
        self,
        videos: list[VideoSummary],
        edition_type: str
    ) -> NewsletterContent:
        """Generate newsletter content from videos.

        Uses historical context from ChromaDB to enrich single-video
        newsletters by connecting to past themes and insights.
        """
        # Fetch historical context for enhanced synthesis
        historical_videos: list[VideoSummary] = []
        theme_counts: dict[str, int] = {}

        # Always fetch historical context - it enriches any newsletter
        current_video_ids = [v.video_id for v in videos]
        historical_videos, theme_counts = self._get_historical_context(
            exclude_video_ids=current_video_ids,
            max_videos=50
        )

        # Find related historical videos based on theme overlap
        related_historical = self._find_related_historical_videos(
            videos, historical_videos, max_related=10
        )

        # Run synthesis with historical context
        syntheses = self.synthesis_engine.synthesize_videos(
            videos,
            max_syntheses=3 if edition_type == "evening" else 1,
            historical_videos=related_historical if len(videos) < 3 else None,
            theme_counts=theme_counts if len(videos) < 3 else None
        )

        # Generate theme-based synthesis with historical context
        theme_syntheses = self.synthesis_engine.generate_theme_synthesis(
            videos,
            historical_videos=related_historical if len(videos) < 3 else None,
            theme_counts=theme_counts
        )

        # Generate tactical recommendations
        recommendations = self.synthesis_engine.generate_tactical_recommendations(
            videos,
            max_recommendations=3 if edition_type == "evening" else 1
        )

        # Collect all tools mentioned
        all_tools = set()
        for video in videos:
            all_tools.update(video.tools_mentioned)

        # Determine if we have meaningful content
        has_meaningful = bool(syntheses or theme_syntheses or recommendations)

        # Generate "still thinking about" section
        still_thinking = self._generate_unresolved_questions(videos) if edition_type == "evening" else ""

        # Run knowledge router for actionable insights (evening only)
        actionable_for_stack = []
        suggested_tasks = []
        high_relevance_count = 0

        if self.knowledge_router and edition_type == "evening":
            try:
                # Route with same lookback window
                # Scale limit based on video count: ~10% of videos or min 5, max 15
                router_limit = max(5, min(15, len(videos) // 10))

                router_result = self.knowledge_router.route_recent_videos(
                    lookback_hours=24,
                    min_relevance=0.5,
                    limit=router_limit  # Dynamic limit based on batch size
                )
                high_relevance_count = len(router_result.high_relevance_videos)

                # Format actionable items for newsletter
                for item in router_result.actionable_items[:5]:  # Top 5 actionable
                    actionable_for_stack.append({
                        "action": item.action,
                        "rationale": item.rationale,
                        "category": item.category,
                        "priority": item.priority,
                        "source_video": item.video_title
                    })

                # Include task suggestions
                suggested_tasks = router_result.suggested_tasks[:3]  # Top 3 tasks

            except Exception as e:
                print(f"Knowledge router error (non-fatal): {e}")

        # Track historical context usage
        uses_historical = len(videos) < 3 and len(related_historical) > 0
        top_themes = sorted(theme_counts.items(), key=lambda x: x[1], reverse=True)[:5]

        return NewsletterContent(
            edition_type=edition_type,
            generated_at=datetime.now(),
            syntheses=syntheses,
            theme_syntheses=theme_syntheses,
            recommendations=recommendations,
            source_videos=videos,
            tools_mentioned=sorted(all_tools),
            still_thinking=still_thinking,
            video_count=len(videos),
            has_meaningful_content=has_meaningful,
            actionable_for_stack=actionable_for_stack,
            suggested_tasks=suggested_tasks,
            high_relevance_count=high_relevance_count,
            historical_video_count=len(historical_videos),
            uses_historical_context=uses_historical,
            top_historical_themes=[t for t, _ in top_themes]
        )

    def _pick_big_story(self, content: NewsletterContent) -> Optional[VideoSummary]:
        """Pick the most important video for the BIG STORY section."""
        if not content.source_videos:
            return None

        # Priority: videos with most takeaways + themes (richest content)
        def score_video(v: VideoSummary) -> int:
            score = len(v.takeaways) * 2 + len(v.themes)
            # Boost videos mentioned in syntheses
            for synth in content.syntheses:
                if v.video_id in synth.supporting_videos:
                    score += 5
            return score

        sorted_videos = sorted(content.source_videos, key=score_video, reverse=True)
        return sorted_videos[0] if sorted_videos else None

    def _pick_quick_hits(
        self,
        content: NewsletterContent,
        exclude: Optional[VideoSummary] = None
    ) -> list[VideoSummary]:
        """Pick 3-4 videos for QUICK HITS section."""
        candidates = [v for v in content.source_videos if v != exclude]

        # Prioritize variety: different channels, different themes
        selected = []
        used_channels = set()

        for video in candidates:
            if len(selected) >= 4:
                break
            # Prefer videos from different channels for variety
            if video.channel not in used_channels and video.takeaways:
                selected.append(video)
                used_channels.add(video.channel)

        # Fill remaining slots if needed
        for video in candidates:
            if len(selected) >= 4:
                break
            if video not in selected and video.takeaways:
                selected.append(video)

        return selected[:4]

    def _pick_rabbit_hole(
        self,
        content: NewsletterContent,
        exclude: list[VideoSummary]
    ) -> Optional[VideoSummary]:
        """Pick one video worth watching in full for RABBIT HOLE section."""
        candidates = [v for v in content.source_videos if v not in exclude]

        if not candidates:
            return None

        # Pick video with most themes (suggests depth) that we haven't featured
        def depth_score(v: VideoSummary) -> int:
            return len(v.themes) + len(v.summary.split()) // 100  # Longer summary = more depth

        sorted_candidates = sorted(candidates, key=depth_score, reverse=True)
        return sorted_candidates[0] if sorted_candidates else None

    def _generate_signal(self, content: NewsletterContent) -> str:
        """Generate the one-line SIGNAL hook for the newsletter."""
        # For single video with historical context, highlight the connection
        if content.video_count == 1 and content.uses_historical_context:
            video = content.source_videos[0] if content.source_videos else None
            if video and video.themes:
                return f"🎯 New insight on {video.themes[0].lower()} (building on {content.historical_video_count} past videos)"
            return f"🎯 Extending your knowledge base ({content.historical_video_count} videos deep)"

        # Use the top theme synthesis if available
        if content.theme_syntheses:
            theme = list(content.theme_syntheses.keys())[0]
            return f"🎯 {len(content.source_videos)} videos: {theme.title()}"

        # Use top synthesis insight if available
        if content.syntheses:
            # Extract key phrase (first sentence or phrase)
            insight = content.syntheses[0].insight.split('.')[0]
            return f"🎯 {insight}"

        # Fallback: channel-based
        channels = set(v.channel for v in content.source_videos[:3])
        return f"🎯 Fresh takes from {', '.join(channels)}"

    def _generate_subject(self, content: NewsletterContent, signal: str) -> str:
        """Generate a curiosity-driven subject line (7 words max)."""
        # If we have theme syntheses, use "N video(s): Theme" format
        if content.theme_syntheses:
            theme = list(content.theme_syntheses.keys())[0]
            video_word = "video" if len(content.source_videos) == 1 else "videos"
            return f"{len(content.source_videos)} {video_word}: {theme.title()}"

        # Try to extract a punchy phrase from the signal
        if ":" in signal:
            hook = signal.split(":")[1].strip()[:40]
            return hook

        # From theme
        if content.theme_syntheses:
            theme = list(content.theme_syntheses.keys())[0]
            return f"Your {theme.lower()} briefing"

        # From big story
        if content.source_videos:
            # Extract interesting phrase from top video title
            title = content.source_videos[0].title
            # Truncate to ~40 chars
            if len(title) > 40:
                title = title[:37] + "..."
            return title

        return "This week in tech"

    def _generate_unresolved_questions(self, videos: list[VideoSummary]) -> str:
        """Generate 'still thinking about' section."""
        if not videos:
            return ""

        # Look for themes that appear but lack depth
        theme_counts: dict[str, int] = {}
        for video in videos:
            for theme in video.themes:
                theme_counts[theme.lower()] = theme_counts.get(theme.lower(), 0) + 1

        # Themes mentioned multiple times suggest ongoing interest
        recurring = [t for t, c in theme_counts.items() if c >= 2]

        if not recurring:
            return ""

        return f"Multiple videos touched on {', '.join(recurring[:3])} but with different approaches. Worth deeper investigation."

    def _format_evening_edition(self, content: NewsletterContent) -> NewsletterEdition:
        """Format evening edition - Morning Brew + TLDR hybrid style."""
        date_str = content.generated_at.strftime("%B %d")

        # Identify the "big story" - most important video
        big_story = self._pick_big_story(content)
        quick_hits = self._pick_quick_hits(content, exclude=big_story)
        rabbit_hole = self._pick_rabbit_hole(content, exclude=[big_story] + quick_hits)
        try_this = content.recommendations[0] if content.recommendations else None

        # Generate the signal (one-line hook)
        signal = self._generate_signal(content)

        # Build plain text version (Morning Brew style)
        plain_parts = [
            signal,
            "",
            "=" * 50,
            ""
        ]

        # BIG STORY
        if big_story:
            yt_link = f"https://youtube.com/watch?v={big_story.video_id}"
            plain_parts.append("📍 BIG STORY")
            plain_parts.append("")
            plain_parts.append(f"{big_story.title}")
            plain_parts.append(f"via {big_story.channel} • {yt_link}")
            plain_parts.append("")
            # Summary text — strip any embedded Key Facts/Takeaways sections
            # that were baked into older ChromaDB documents
            if big_story.summary:
                plain_parts.append(_strip_embedded_sections(big_story.summary))
                plain_parts.append("")
            # All takeaways, not just the first
            if big_story.takeaways:
                plain_parts.append("💡 KEY TAKEAWAYS:")
                for takeaway in big_story.takeaways:
                    plain_parts.append(f"  • {takeaway}")
                plain_parts.append("")

        # QUICK HITS - full content with links
        if quick_hits:
            plain_parts.append("-" * 50)
            plain_parts.append("")
            plain_parts.append("⚡ QUICK HITS")
            plain_parts.append("")
            for video in quick_hits[:4]:
                yt_link = f"https://youtube.com/watch?v={video.video_id}"
                plain_parts.append(f"▸ {video.title}")
                plain_parts.append(f"  via {video.channel} • {yt_link}")
                # Include summary (smart truncate at sentence boundary, 300-500 chars)
                if video.summary:
                    plain_parts.append(f"  {_smart_truncate(_strip_embedded_sections(video.summary), max_chars=500, min_chars=300)}")
                # Include all takeaways
                if video.takeaways:
                    for takeaway in video.takeaways[:3]:  # Top 3 takeaways per quick hit
                        plain_parts.append(f"    • {takeaway}")
                plain_parts.append("")

        # TRY THIS (one concrete action)
        if try_this:
            plain_parts.append("-" * 50)
            plain_parts.append("")
            plain_parts.append("🛠️ TRY THIS")
            plain_parts.append("")
            plain_parts.append(try_this.action)
            plain_parts.append(f"({try_this.rationale})")
            plain_parts.append("")

        # RABBIT HOLE (one video worth the full watch)
        if rabbit_hole:
            yt_link = f"https://youtube.com/watch?v={rabbit_hole.video_id}"
            plain_parts.append("-" * 50)
            plain_parts.append("")
            plain_parts.append("🐰 RABBIT HOLE (Worth the Full Watch)")
            plain_parts.append("")
            plain_parts.append(f"{rabbit_hole.title}")
            plain_parts.append(f"via {rabbit_hole.channel} • {yt_link}")
            if rabbit_hole.themes:
                plain_parts.append(f"Goes deep on: {', '.join(rabbit_hole.themes[:3])}")
            # Include summary for context (smart truncate at sentence boundary)
            if rabbit_hole.summary:
                plain_parts.append("")
                plain_parts.append(_smart_truncate(_strip_embedded_sections(rabbit_hole.summary), max_chars=600, min_chars=400))
            plain_parts.append("")

        # TOOLBOX
        if content.tools_mentioned:
            plain_parts.append("-" * 50)
            plain_parts.append("")
            plain_parts.append("📦 TOOLBOX")
            plain_parts.append(", ".join(content.tools_mentioned[:8]))
            plain_parts.append("")

        # SUGGESTED BACKLOG TASKS
        if content.suggested_tasks:
            plain_parts.append("-" * 50)
            plain_parts.append("")
            plain_parts.append("📋 SUGGESTED BACKLOG TASKS")
            plain_parts.append("(Reply with task numbers to approve)")
            plain_parts.append("")
            for i, task in enumerate(content.suggested_tasks[:5], 1):
                title = task.get('title', task.get('action', 'Untitled'))
                source = task.get('source_video', '')
                priority = task.get('priority', 'P2')
                plain_parts.append(f"  {i}. [{priority}] {title}")
                if source:
                    plain_parts.append(f"     From: {source}")
            plain_parts.append("")

        # Footer (minimal, reader-focused)
        plain_parts.append("-" * 50)
        channels = set(v.channel for v in content.source_videos)
        plain_parts.append(f"From: {', '.join(list(channels)[:5])}")
        plain_parts.append(f"{content.video_count} videos this week • Reply to share feedback")

        plain_body = "\n".join(plain_parts)

        # Build HTML version
        html_body = self._build_evening_html_v2(content, date_str, signal, big_story, quick_hits, try_this, rabbit_hole)

        # Generate curiosity-driven subject (7 words max)
        subject = self._generate_subject(content, signal)

        return NewsletterEdition(
            subject=subject,
            html_body=html_body,
            plain_body=plain_body,
            content=content
        )

    def _format_morning_edition(self, content: NewsletterContent) -> NewsletterEdition:
        """Format morning edition - one insight, one action, < 1 min read."""
        date_str = content.generated_at.strftime("%A")

        # Get the best insight
        main_insight = ""
        if content.syntheses:
            main_insight = content.syntheses[0].insight
        elif content.theme_syntheses:
            main_insight = list(content.theme_syntheses.values())[0]
        elif content.source_videos and content.source_videos[0].takeaways:
            main_insight = content.source_videos[0].takeaways[0]

        # Get one action
        action = ""
        if content.recommendations:
            action = content.recommendations[0].action
        elif content.source_videos and content.source_videos[0].takeaways:
            action = content.source_videos[0].takeaways[0]

        # Build plain text (super short)
        plain_parts = [
            f"☀️ {date_str} Signal",
            "",
            main_insight,
            "",
        ]

        if action and action != main_insight:
            plain_parts.extend([
                "—",
                "",
                f"🛠️ Try: {action}",
            ])

        plain_body = "\n".join(plain_parts)

        # Build HTML
        html_body = self._build_morning_html_v2(content, date_str, main_insight, action)

        # Short subject
        subject = main_insight[:35] + "..." if len(main_insight) > 35 else main_insight

        return NewsletterEdition(
            subject=subject,
            html_body=html_body,
            plain_body=plain_body,
            content=content
        )
    def _generate_likes_list_edition(
        self,
        edition_type: str,
        videos: list
    ) -> NewsletterEdition:
        """
        Honest fallback: list the liked videos when they exist but synthesis
        (the LLM step) failed or produced nothing. This guarantees a real like
        is NEVER hidden behind a "0 new likes" message just because the LLM
        backend is down (dead claude -p auth, depleted API credits, etc.).
        """
        date_str = datetime.now().strftime("%A, %B %d")
        n = len(videos)

        def _url(v):
            return f"https://www.youtube.com/watch?v={v.video_id}"

        lines = [f"{n} new like{'s' if n != 1 else ''} — captured, summaries pending.\n"]
        html_items = []
        for v in videos[:25]:
            has_summary = v.summary and not v.summary.startswith("(summary pending")
            note = "" if has_summary else "  (summary pending)"
            lines.append(f"• {v.title} — {v.channel}{note}\n  {_url(v)}")
            summary_html = (
                f'<p style="margin:4px 0 0; color:#444; font-size:14px;">{v.summary}</p>'
                if has_summary else
                '<p style="margin:4px 0 0; color:#999; font-size:13px;">summary pending</p>'
            )
            html_items.append(
                f'<li style="margin-bottom:14px;">'
                f'<a href="{_url(v)}" style="font-weight:600; color:#1a1a1a;">{v.title}</a>'
                f'<span style="color:#666;"> — {v.channel}</span>{summary_html}</li>'
            )
        if n > 25:
            lines.append(f"…and {n - 25} more.")

        plain_body = (
            f"YouTube Intelligence - {edition_type.title()}\n{date_str}\n\n"
            + "\n".join(lines)
        )
        html_body = (
            f'<html><body style="font-family:-apple-system,system-ui,sans-serif; '
            f'max-width:600px; margin:0 auto; padding:20px; color:#333;">'
            f'<h2 style="margin-bottom:5px;">YouTube Intelligence</h2>'
            f'<p style="color:#666; margin-top:0;">{date_str}</p><hr style="border:none;border-top:1px solid #eee;">'
            f'<p><strong>{n} new like{"s" if n != 1 else ""}</strong> — captured; summaries pending '
            f'(synthesis backend unavailable this run).</p>'
            f'<ul style="list-style:none; padding:0;">{"".join(html_items)}</ul>'
            f'</body></html>'
        )

        return NewsletterEdition(
            subject=f"YouTube Intelligence: {edition_type.title()} — {n} new like{'s' if n != 1 else ''}",
            html_body=html_body,
            plain_body=plain_body,
            content=NewsletterContent(
                edition_type=edition_type, generated_at=datetime.now(),
                syntheses=[], theme_syntheses={}, recommendations=[],
                source_videos=videos, tools_mentioned=[], still_thinking="",
                video_count=len(videos), has_meaningful_content=True,
            ),
        )

    def _generate_quiet_day_edition(
        self,
        edition_type: str,
        video_count: int
    ) -> NewsletterEdition:
        """Generate a minimal edition when zero videos processed."""
        date_str = datetime.now().strftime("%A, %B %d")

        # HARDENING: never silently report "ran clean" if the heartbeat is actually dead.
        # A genuine quiet day means the heartbeat ran recently and found nothing new.
        # A stale heartbeat means likes are NOT being captured — that must be loud.
        stale_msg = None
        try:
            import sqlite3 as _sql
            from datetime import datetime as _dt
            with _sql.connect(self.db_path) as _c:
                _row = _c.execute(
                    "SELECT MAX(last_seen_at) FROM videos WHERE sources LIKE '%liked%'"
                ).fetchone()
            _newest = _row[0] if _row else None
            if not _newest:
                stale_msg = "no liked videos in the database"
            else:
                _age_h = (_dt.utcnow() - _dt.fromisoformat(_newest.replace("T", " "))).total_seconds() / 3600
                if _age_h > 8:
                    stale_msg = f"heartbeat last fetched {_age_h:.0f}h ago (expected <8h) — fetch/auth likely broken"
        except Exception as _e:
            stale_msg = f"health check failed: {_e}"

        if stale_msg:
            return NewsletterEdition(
                subject=f"⚠️ YouTube Intelligence BROKEN — {stale_msg.split('—')[0].strip()}",
                html_body=(
                    f'<html><body style="font-family: system-ui; max-width:600px; margin:0 auto; padding:20px;">'
                    f'<h2 style="color:#c00;">⚠️ YouTube Intelligence — PIPELINE BROKEN</h2>'
                    f'<p style="color:#666;">{date_str}</p><hr>'
                    f'<p><strong>This is NOT a quiet day.</strong> {stale_msg}.</p>'
                    f'<p>New likes are not being captured. Check <code>run_likes_heartbeat.sh</code> '
                    f'and YouTube auth (<code>reauth_youtube.py --check</code>).</p>'
                    f'</body></html>'
                ),
                plain_body=(
                    f"YouTube Intelligence - {edition_type.title()}\n{date_str}\n\n"
                    f"⚠️ PIPELINE UNHEALTHY — NOT a quiet day.\n{stale_msg}\n\n"
                    f"New likes are NOT being captured. Check run_likes_heartbeat.sh and "
                    f"YouTube auth (python scripts/youtube_intelligence/reauth_youtube.py --check)."
                ),
                content=NewsletterContent(
                    edition_type=edition_type, generated_at=datetime.now(),
                    syntheses=[], theme_syntheses={}, recommendations=[],
                    source_videos=[], tools_mentioned=[], still_thinking="",
                    video_count=0, has_meaningful_content=False,
                ),
            )

        plain_body = f"""YouTube Intelligence - {edition_type.title()}
{date_str}

0 new likes — no activity in the last 24h.

Pipeline status: heartbeat|export|triage all ran clean.
"""

        html_body = f"""
<html>
<body style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
<h2 style="margin-bottom: 5px;">YouTube Intelligence</h2>
<p style="color: #666; margin-top: 0;">{date_str}</p>
<hr style="border: none; border-top: 1px solid #eee;">
<p><strong>0 new likes</strong> — no activity in the last 24h.</p>
<p style="color: #666; font-size: 14px;">Pipeline ran clean: heartbeat | export | triage.</p>
</body>
</html>
"""

        return NewsletterEdition(
            subject=f"YouTube Intelligence: {edition_type.title()} — 0 new likes",
            html_body=html_body,
            plain_body=plain_body,
            content=NewsletterContent(
                edition_type=edition_type,
                generated_at=datetime.now(),
                syntheses=[],
                theme_syntheses={},
                recommendations=[],
                source_videos=[],
                tools_mentioned=[],
                still_thinking="",
                video_count=video_count,
                has_meaningful_content=False
            )
        )

    def _build_evening_html_v2(
        self,
        content: NewsletterContent,
        date_str: str,
        signal: str,
        big_story: Optional[VideoSummary],
        quick_hits: list[VideoSummary],
        try_this: Optional[TacticalRecommendation],
        rabbit_hole: Optional[VideoSummary]
    ) -> str:
        """Build HTML for evening edition - Morning Brew + TLDR style."""
        sections = []

        # THE SIGNAL (hook)
        sections.append(f"""
<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
<p style="margin: 0; font-size: 18px; font-weight: 500;">{signal}</p>
</div>
""")

        # BIG STORY
        if big_story:
            yt_link = f"https://youtube.com/watch?v={big_story.video_id}"
            # Summary text — strip legacy embedded Key Facts/Takeaways
            story_text = _strip_embedded_sections(big_story.summary or "")
            # All takeaways as list
            takeaway_html = ""
            if big_story.takeaways:
                takeaway_items = "\n".join([
                    f'<li style="margin-bottom: 8px; line-height: 1.5;">{t}</li>'
                    for t in big_story.takeaways
                ])
                takeaway_html = f"""
<div style="background: #f8f9fa; padding: 16px 20px; border-left: 3px solid #667eea; margin-top: 16px; border-radius: 0 8px 8px 0;">
<p style="margin: 0 0 12px 0; font-weight: 600; color: #667eea; font-size: 14px;">💡 KEY TAKEAWAYS</p>
<ul style="margin: 0; padding-left: 20px; color: #333;">
{takeaway_items}
</ul>
</div>
"""
            sections.append(f"""
<div style="margin-bottom: 28px;">
<h3 style="color: #1a1a1a; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px; display: flex; align-items: center;">
<span style="margin-right: 8px;">📍</span> BIG STORY
</h3>
<h4 style="margin: 0 0 4px 0; font-size: 18px; line-height: 1.3;">{big_story.title}</h4>
<p style="color: #666; font-size: 14px; margin: 0 0 12px 0;">via {big_story.channel} • <a href="{yt_link}" style="color: #667eea; text-decoration: none;">Watch on YouTube →</a></p>
<p style="line-height: 1.7; margin: 0; color: #333;">{story_text}</p>
{takeaway_html}
</div>
""")

        # QUICK HITS - with links and full takeaways
        if quick_hits:
            hits_html = ""
            for video in quick_hits:
                yt_link = f"https://youtube.com/watch?v={video.video_id}"
                # Summary (smart truncate at sentence boundary for HTML)
                summary_text = _smart_truncate(_strip_embedded_sections(video.summary or ""), max_chars=400, min_chars=250)
                # Build takeaways list
                takeaways_html = ""
                if video.takeaways:
                    takeaway_items = "\n".join([
                        f'<li style="margin-bottom: 4px;">{t}</li>'
                        for t in video.takeaways[:3]  # Top 3 per quick hit
                    ])
                    takeaways_html = f'<ul style="margin: 8px 0 0 0; padding-left: 18px; font-size: 13px; color: #555;">{takeaway_items}</ul>'
                hits_html += f"""
<div style="margin-bottom: 20px; padding: 16px; background: #f9fafb; border-radius: 8px;">
<p style="margin: 0 0 4px 0; font-weight: 600; font-size: 16px;">{video.title}</p>
<p style="margin: 0 0 8px 0; color: #666; font-size: 13px;">{video.channel} • <a href="{yt_link}" style="color: #667eea; text-decoration: none;">Watch →</a></p>
<p style="margin: 0; color: #444; font-size: 14px; line-height: 1.5;">{summary_text}</p>
{takeaways_html}
</div>
"""
            sections.append(f"""
<div style="margin-bottom: 28px; border-top: 1px solid #eee; padding-top: 20px;">
<h3 style="color: #1a1a1a; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 16px; display: flex; align-items: center;">
<span style="margin-right: 8px;">⚡</span> QUICK HITS
</h3>
{hits_html}
</div>
""")

        # TRY THIS
        if try_this:
            sections.append(f"""
<div style="margin-bottom: 28px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px;">
<h3 style="color: #166534; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 12px 0; display: flex; align-items: center;">
<span style="margin-right: 8px;">🛠️</span> TRY THIS
</h3>
<p style="margin: 0 0 8px 0; font-weight: 600; font-size: 16px; color: #166534;">{try_this.action}</p>
<p style="margin: 0; color: #15803d; font-size: 14px;">{try_this.rationale}</p>
</div>
""")

        # RABBIT HOLE - with link and summary
        if rabbit_hole:
            yt_link = f"https://youtube.com/watch?v={rabbit_hole.video_id}"
            themes_text = f"Goes deep on: {', '.join(rabbit_hole.themes[:3])}" if rabbit_hole.themes else ""
            summary_text = _smart_truncate(_strip_embedded_sections(rabbit_hole.summary or ""), max_chars=500, min_chars=350)
            sections.append(f"""
<div style="margin-bottom: 28px; border-top: 1px solid #eee; padding-top: 20px;">
<h3 style="color: #1a1a1a; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px; display: flex; align-items: center;">
<span style="margin-right: 8px;">🐰</span> RABBIT HOLE (Worth the Full Watch)
</h3>
<p style="margin: 0 0 4px 0; font-weight: 600; font-size: 16px;">{rabbit_hole.title}</p>
<p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">via {rabbit_hole.channel} • <a href="{yt_link}" style="color: #667eea; text-decoration: none;">Watch on YouTube →</a></p>
<p style="margin: 0 0 8px 0; color: #666; font-size: 14px; font-style: italic;">{themes_text}</p>
<p style="margin: 0; color: #444; font-size: 14px; line-height: 1.5;">{summary_text}</p>
</div>
""")

        # SUGGESTED BACKLOG TASKS
        if content.suggested_tasks:
            task_items = ""
            for i, task in enumerate(content.suggested_tasks[:5], 1):
                title = task.get('title', task.get('action', 'Untitled'))
                source = task.get('source_video', '')
                priority = task.get('priority', 'P2')
                source_line = f'<span style="color: #888; font-size: 12px;">From: {source}</span>' if source else ""
                task_items += f"""
<div style="margin-bottom: 12px; padding: 12px 16px; background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 0 8px 8px 0;">
<p style="margin: 0 0 4px 0; font-weight: 600; font-size: 14px;"><span style="color: #f59e0b;">{i}.</span> [{priority}] {title}</p>
{source_line}
</div>
"""
            sections.append(f"""
<div style="margin-bottom: 28px; border-top: 1px solid #eee; padding-top: 20px;">
<h3 style="color: #1a1a1a; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px; display: flex; align-items: center;">
<span style="margin-right: 8px;">📋</span> SUGGESTED BACKLOG TASKS
</h3>
<p style="color: #666; font-size: 13px; margin: 0 0 16px 0;">Reply with task numbers to approve</p>
{task_items}
</div>
""")

        # TOOLBOX
        if content.tools_mentioned:
            tools_pills = " ".join([
                f'<span style="display: inline-block; background: #f3f4f6; padding: 4px 10px; border-radius: 12px; font-size: 13px; margin: 2px;">{tool}</span>'
                for tool in content.tools_mentioned[:8]
            ])
            sections.append(f"""
<div style="margin-bottom: 28px; border-top: 1px solid #eee; padding-top: 20px;">
<h3 style="color: #1a1a1a; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px; display: flex; align-items: center;">
<span style="margin-right: 8px;">📦</span> TOOLBOX
</h3>
<div>{tools_pills}</div>
</div>
""")

        # Footer
        channels = list(set(v.channel for v in content.source_videos))[:5]
        sources = ", ".join(channels)

        # Knowledge base context note
        kb_note = ""
        if content.uses_historical_context and content.historical_video_count > 0:
            kb_note = f'<br><span style="color: #667eea;">📚 Connected to {content.historical_video_count} videos in your knowledge base</span>'

        # Video count display
        video_count_text = f"{content.video_count} video{'s' if content.video_count != 1 else ''}"

        return f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px 20px; color: #1a1a1a; background: #ffffff;">

<div style="margin-bottom: 20px;">
<h1 style="margin: 0 0 4px 0; font-size: 24px; font-weight: 700;">YouTube Intelligence</h1>
<p style="margin: 0; color: #6b7280; font-size: 14px;">{date_str} • {video_count_text}</p>
</div>

{''.join(sections)}

<div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 24px;">
<p style="color: #9ca3af; font-size: 12px; margin: 0; line-height: 1.6;">
From: {sources}{kb_note}<br>
Reply to share feedback • <a href="#" style="color: #6b7280;">Unsubscribe</a>
</p>
</div>
</body>
</html>
"""

    def _build_evening_html(self, content: NewsletterContent, date_str: str) -> str:
        """Build HTML for evening edition (legacy - redirects to v2)."""
        signal = self._generate_signal(content)
        big_story = self._pick_big_story(content)
        quick_hits = self._pick_quick_hits(content, exclude=big_story)
        rabbit_hole = self._pick_rabbit_hole(content, exclude=[big_story] + quick_hits if big_story else quick_hits)
        try_this = content.recommendations[0] if content.recommendations else None
        return self._build_evening_html_v2(content, date_str, signal, big_story, quick_hits, try_this, rabbit_hole)

    def _build_morning_html_v2(
        self,
        content: NewsletterContent,
        date_str: str,
        main_insight: str,
        action: str
    ) -> str:
        """Build HTML for morning edition - ultra minimal."""
        action_section = ""
        if action and action != main_insight:
            action_section = f"""
<div style="margin-top: 24px; padding: 16px; background: #f0fdf4; border-radius: 8px; border-left: 3px solid #22c55e;">
<p style="margin: 0 0 6px 0; font-weight: 600; color: #166534; font-size: 12px; text-transform: uppercase;">🛠️ Try this</p>
<p style="margin: 0; line-height: 1.5; color: #15803d;">{action}</p>
</div>
"""

        return f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a; background: #ffffff;">

<p style="margin: 0 0 24px 0; color: #6b7280; font-size: 14px;">☀️ {date_str}</p>

<p style="font-size: 20px; line-height: 1.6; margin: 0; font-weight: 500;">{main_insight}</p>

{action_section}

<p style="margin-top: 32px; color: #9ca3af; font-size: 12px;">
Reply to share feedback
</p>
</body>
</html>
"""

    def _build_morning_html(
        self,
        content: NewsletterContent,
        date_str: str,
        main_insight: str,
        action: str
    ) -> str:
        """Build HTML for morning edition (legacy - redirects to v2)."""
        return self._build_morning_html_v2(content, date_str, main_insight, action)
