"""
Synthesis Engine - The core value generator for newsletters.

This module creates cross-video insights that couldn't come from
watching any single video alone. This is what makes the newsletter
worth reading.
"""

import time
import random
import logging
import os
from dataclasses import dataclass
from typing import Optional

from ...tools.llm_client import get_llm_client, LLMClient

# Import local backends. FreeLLMAPI (free local gateway) is the default because
# claude -p (subscription auth) and OpenRouter (paid credits) both fail unattended.
from .claude_code_backend import ClaudeCodeClient, FreeLLMAPIClient

logger = logging.getLogger(__name__)

# Global flag: if True, skip API calls and use Claude Code directly
# Set by env var to avoid OpenRouter dependency
USE_CLAUDE_CODE = os.environ.get("YT_USE_CLAUDE_CODE", "1") == "1"
# Prefer the free local gateway unless explicitly disabled.
USE_FREELLMAPI = os.environ.get("YT_USE_FREELLMAPI", "1") == "1"


@dataclass
class VideoSummary:
    """Minimal video data needed for synthesis."""
    video_id: str
    title: str
    channel: str
    summary: str
    takeaways: list[str]
    themes: list[str]
    tools_mentioned: list[str]


@dataclass
class Synthesis:
    """A cross-video insight."""
    insight: str
    supporting_videos: list[str]  # video_ids
    themes_connected: list[str]
    confidence: float  # 0-1, how strong is this connection


@dataclass
class TacticalRecommendation:
    """An actionable recommendation from the content."""
    action: str
    rationale: str
    source_videos: list[str]
    difficulty: str  # "quick", "medium", "project"


class SynthesisEngine:
    """
    Generates cross-video synthesis and tactical recommendations.

    The synthesis must pass the test:
    "Could someone get this insight from watching just one video?"
    If yes, it's not synthesis - it's summary. Reject it.
    """

    # Chunking and rate limit settings
    MAX_VIDEOS_PER_CHUNK = 6  # Keep prompts under token limits
    MAX_RETRIES = 3
    BASE_DELAY = 2.0  # seconds
    DELAY_BETWEEN_CALLS = 1.0  # seconds between API calls

    def __init__(self, model: str = None):
        # Backend priority: free local gateway (FreeLLMAPI) → claude -p subscription
        # → paid unified client. FreeLLMAPI first because it's free AND actually up,
        # whereas claude -p (login) and OpenRouter (credits) fail unattended and used
        # to silently collapse the newsletter to "0 new likes".
        if USE_FREELLMAPI and FreeLLMAPIClient.is_available():
            self.client = FreeLLMAPIClient()
            logger.info("SynthesisEngine: using FreeLLMAPI local gateway")
        elif USE_CLAUDE_CODE:
            self.client = ClaudeCodeClient()
        else:
            self.client = get_llm_client()
        self.model = model  # kept for backwards compat, unused by unified client
        # Backend health counters. A run where every synthesis call fails still
        # produces a sendable "likes list" edition, so without these the caller
        # cannot tell a genuinely insight-free batch from a dead backend.
        self.api_calls = 0
        self.api_failures = 0

    @property
    def backend_dead(self) -> bool:
        """True when synthesis was attempted and *every* call failed."""
        return self.api_calls > 0 and self.api_failures == self.api_calls

    def _call_api_with_retry(
        self,
        prompt: str,
        max_tokens: int = 2000,
        context: str = "API call"
    ) -> Optional[str]:
        """
        Call LLM via unified client with exponential backoff retry.

        Returns response text or None if all retries fail.
        """
        self.api_calls += 1
        for attempt in range(self.MAX_RETRIES):
            try:
                response = self.client.complete(
                    prompt=prompt,
                    max_tokens=max_tokens,
                    model_tier="deep",
                    json_mode=True,
                )
                return response.text
            except Exception as e:
                delay = self.BASE_DELAY * (2 ** attempt) + random.uniform(0, 1)
                logger.warning(f"{context} failed (attempt {attempt + 1}/{self.MAX_RETRIES}): {e}. Waiting {delay:.1f}s...")
                if attempt < self.MAX_RETRIES - 1:
                    time.sleep(delay)
                else:
                    logger.error(f"All retries failed for {context}: {e}")
                    self.api_failures += 1
                    return None

        self.api_failures += 1
        return None

    def synthesize_videos(
        self,
        videos: list[VideoSummary],
        max_syntheses: int = 3,
        historical_videos: Optional[list[VideoSummary]] = None,
        theme_counts: Optional[dict[str, int]] = None
    ) -> list[Synthesis]:
        """
        Generate cross-video syntheses from a set of videos.

        Chunks videos into batches to avoid rate limits, then aggregates.

        With historical_videos provided, can generate meaningful insights
        even from a single video by connecting it to past knowledge.

        Args:
            videos: Current videos to synthesize
            max_syntheses: Maximum number of syntheses to return
            historical_videos: Optional list of related historical videos for context
            theme_counts: Optional dict of theme -> frequency across all historical videos
        """
        # If we have historical context, we can work with even 1 video
        if len(videos) < 1:
            return []

        # Single video with historical context - special handling
        if len(videos) == 1 and historical_videos:
            return self._synthesize_with_historical_context(
                videos[0], historical_videos, theme_counts or {}, max_syntheses
            )

        # Multiple videos but less than 2 and no historical context
        if len(videos) < 2 and not historical_videos:
            return []

        # Chunk videos to stay under token limits
        all_syntheses = []
        chunks = self._chunk_videos(videos)

        for i, chunk in enumerate(chunks):
            if len(chunk) < 2:
                continue

            # Build context from chunk only
            video_context = self._build_video_context(chunk)

            prompt = f"""You have analysis from {len(chunk)} YouTube videos on technical topics.

{video_context}

Your task is NOT to summarize these videos.

Your task is to identify cross-video insights - things that emerge from COMBINING these perspectives that couldn't come from any single video alone.

For each insight, explain:
1. The insight itself (2-3 sentences)
2. Which videos contributed to this insight
3. Why this couldn't be derived from watching just one video

Generate up to {max_syntheses} insights. If you can't find meaningful cross-video connections, say "NO_SYNTHESIS_POSSIBLE" - don't force it.

Format each insight as:
INSIGHT: [the insight]
VIDEOS: [comma-separated video titles]
THEMES: [comma-separated themes this connects]
CONFIDENCE: [high/medium/low]
---"""

            response = self._call_api_with_retry(
                prompt,
                max_tokens=2000,
                context=f"synthesize chunk {i+1}/{len(chunks)}"
            )

            if response:
                chunk_syntheses = self._parse_syntheses(response, chunk)
                all_syntheses.extend(chunk_syntheses)

            # Rate limit protection between chunks
            if i < len(chunks) - 1:
                time.sleep(self.DELAY_BETWEEN_CALLS)

        # Deduplicate and return top syntheses by confidence
        all_syntheses.sort(key=lambda s: s.confidence, reverse=True)
        return all_syntheses[:max_syntheses]

    def _synthesize_with_historical_context(
        self,
        video: VideoSummary,
        historical_videos: list[VideoSummary],
        theme_counts: dict[str, int],
        max_syntheses: int = 3
    ) -> list[Synthesis]:
        """
        Synthesize a single video against historical knowledge base.

        This creates meaningful insights by connecting the new video
        to patterns, themes, and learnings from past videos.
        """
        # Build historical context summary
        historical_themes = sorted(theme_counts.items(), key=lambda x: x[1], reverse=True)[:15]
        top_themes_str = ", ".join([f"{t} ({c} videos)" for t, c in historical_themes])

        # Find most relevant historical videos (by theme overlap)
        video_themes = set(t.lower().strip() for t in video.themes)
        relevant_historical = []
        for hist_video in historical_videos[:20]:  # Check top 20
            hist_themes = set(t.lower().strip() for t in hist_video.themes)
            overlap = video_themes & hist_themes
            if overlap:
                relevant_historical.append((len(overlap), hist_video))

        relevant_historical.sort(key=lambda x: x[0], reverse=True)
        related_videos = [v for _, v in relevant_historical[:5]]  # Top 5 related

        # Build context for the new video
        video_context = self._build_video_context([video])

        # Build context for related historical videos
        related_context = ""
        if related_videos:
            related_context = f"""
RELATED VIDEOS FROM YOUR KNOWLEDGE BASE:
(These are videos you've processed before that touch on similar themes)

{self._build_video_context(related_videos)}
"""

        prompt = f"""You're analyzing a new YouTube video in the context of an existing knowledge base.

NEW VIDEO JUST WATCHED:
{video_context}

KNOWLEDGE BASE CONTEXT:
- You have processed {len(historical_videos)} videos total in this knowledge base
- Most common themes across all videos: {top_themes_str}
{related_context}

Your task is to generate insights that CONNECT this new video to the existing knowledge base:

1. How does this video EXTEND or BUILD ON themes you've seen before?
2. Does it CONTRADICT or offer a different perspective on past learnings?
3. Does it VALIDATE patterns you've noticed across multiple videos?
4. What new CONNECTIONS can you draw between this video and past insights?

Generate up to {max_syntheses} insights. Each should explain how this video fits into or extends the broader knowledge you've accumulated.

Format each insight as:
INSIGHT: [the connection/extension/validation - 2-3 sentences]
VIDEOS: [{video.title}]
THEMES: [themes this connects to]
CONFIDENCE: [high/medium/low based on strength of connection]
---"""

        response = self._call_api_with_retry(
            prompt,
            max_tokens=2000,
            context="single video historical synthesis"
        )

        if not response or "NO_SYNTHESIS_POSSIBLE" in response:
            return []

        return self._parse_syntheses(response, [video] + related_videos)

    def _chunk_videos(self, videos: list[VideoSummary]) -> list[list[VideoSummary]]:
        """Split videos into chunks for rate limit management."""
        chunks = []
        for i in range(0, len(videos), self.MAX_VIDEOS_PER_CHUNK):
            chunks.append(videos[i:i + self.MAX_VIDEOS_PER_CHUNK])
        return chunks

    def generate_tactical_recommendations(
        self,
        videos: list[VideoSummary],
        max_recommendations: int = 3
    ) -> list[TacticalRecommendation]:
        """
        Extract actionable recommendations from video content.

        Focus on specific, implementable actions - not vague advice.
        """
        if not videos:
            return []

        # Collect all takeaways
        all_takeaways = []
        for video in videos:
            for takeaway in video.takeaways:
                all_takeaways.append(f"[{video.channel}] {takeaway}")

        if not all_takeaways:
            return []

        # Limit takeaways to avoid token overflow
        limited_takeaways = all_takeaways[:30]  # Max 30 takeaways

        prompt = f"""Here are takeaways extracted from {len(videos)} technical YouTube videos:

{chr(10).join(limited_takeaways)}

Generate {max_recommendations} specific, actionable recommendations.

Requirements:
- Each must be something someone can DO today or this week
- Be specific: "Add a pre-commit hook that checks X" not "Use hooks"
- Include the rationale (why this matters)
- Rate difficulty: "quick" (< 30 min), "medium" (1-4 hours), "project" (longer)

Format:
ACTION: [specific action to take]
RATIONALE: [why this is worth doing]
DIFFICULTY: [quick/medium/project]
---"""

        response = self._call_api_with_retry(
            prompt,
            max_tokens=1500,
            context="tactical recommendations"
        )

        if not response:
            return []

        return self._parse_recommendations(response, videos)

    def generate_theme_synthesis(
        self,
        videos: list[VideoSummary],
        historical_videos: Optional[list[VideoSummary]] = None,
        theme_counts: Optional[dict[str, int]] = None
    ) -> dict[str, str]:
        """
        Generate synthesis organized by theme.

        With historical context, can generate theme insights for single
        videos by connecting them to historical patterns.

        Returns dict of {theme: synthesis_paragraph}
        """
        if len(videos) < 1:
            return {}

        # Group current videos by shared themes
        theme_videos: dict[str, list[VideoSummary]] = {}
        for video in videos:
            for theme in video.themes:
                theme_lower = theme.lower().strip()
                if theme_lower not in theme_videos:
                    theme_videos[theme_lower] = []
                theme_videos[theme_lower].append(video)

        # If we have historical videos, add them to theme groups
        if historical_videos:
            for video in historical_videos:
                for theme in video.themes:
                    theme_lower = theme.lower().strip()
                    if theme_lower in theme_videos:  # Only add to themes from current videos
                        theme_videos[theme_lower].append(video)

        # Synthesize themes with 2+ videos (current + historical combined)
        synthesizable = {
            theme: vids for theme, vids in theme_videos.items()
            if len(vids) >= 2
        }

        # If still nothing synthesizable but we have theme_counts, generate
        # contextual insights about where current themes fit in the knowledge base
        if not synthesizable and theme_counts and len(videos) >= 1:
            return self._generate_contextual_theme_insights(videos, theme_counts)

        if not synthesizable:
            return {}

        # Generate synthesis for each theme with rate limiting
        results = {}
        theme_items = list(synthesizable.items())[:3]  # Max 3 themes

        for i, (theme, theme_vids) in enumerate(theme_items):
            # Limit videos per theme to avoid token overflow
            limited_vids = theme_vids[:self.MAX_VIDEOS_PER_CHUNK]
            video_context = self._build_video_context(limited_vids)

            # Note if we're combining current with historical
            current_count = sum(1 for v in limited_vids if v in videos)
            historical_count = len(limited_vids) - current_count
            context_note = ""
            if historical_count > 0:
                context_note = f"\n\nNote: {current_count} video(s) are newly watched, {historical_count} are from your knowledge base history."

            prompt = f"""These {len(limited_vids)} videos all discuss "{theme}":

{video_context}{context_note}

Write a 2-3 sentence synthesis that:
1. Captures what emerges from combining these perspectives
2. Notes any interesting agreements, disagreements, or evolution of ideas
3. Provides insight that couldn't come from any single video

Do not summarize. Synthesize."""

            response = self._call_api_with_retry(
                prompt,
                max_tokens=500,
                context=f"theme synthesis: {theme}"
            )

            if response:
                results[theme] = response.strip()

            # Rate limit protection between theme calls
            if i < len(theme_items) - 1:
                time.sleep(self.DELAY_BETWEEN_CALLS)

        return results

    def _generate_contextual_theme_insights(
        self,
        videos: list[VideoSummary],
        theme_counts: dict[str, int]
    ) -> dict[str, str]:
        """
        Generate insights about how current videos' themes fit in the broader knowledge base.

        Used when we have single video and can't do multi-video theme synthesis.
        """
        results = {}

        # Get themes from current videos and their historical frequency
        current_themes = []
        for video in videos:
            for theme in video.themes:
                theme_lower = theme.lower().strip()
                count = theme_counts.get(theme_lower, 0)
                current_themes.append((theme_lower, count))

        if not current_themes:
            return {}

        # Sort by historical frequency to highlight interesting patterns
        current_themes.sort(key=lambda x: x[1], reverse=True)
        top_themes = current_themes[:3]

        for theme, historical_count in top_themes:
            if historical_count > 5:
                insight = f"This theme appears across {historical_count} videos in your knowledge base - you're building deep expertise here. This new video adds another data point to an area of sustained interest."
            elif historical_count > 0:
                insight = f"This theme has appeared in {historical_count} previous video(s). Your interest in this area is developing - watch for patterns as you consume more content."
            else:
                insight = f"This is a new theme in your knowledge base. It may represent an emerging interest or a one-off exploration."

            results[theme] = insight

        return results

    def _build_video_context(self, videos: list[VideoSummary]) -> str:
        """Build context string from videos for prompts.

        Truncates summaries to avoid token overflow while preserving key info.
        """
        MAX_SUMMARY_CHARS = 800  # Keep summaries focused for synthesis

        parts = []
        for i, video in enumerate(videos, 1):
            # Truncate long summaries intelligently
            summary = video.summary
            if len(summary) > MAX_SUMMARY_CHARS:
                summary = summary[:MAX_SUMMARY_CHARS].rsplit(' ', 1)[0] + "..."

            parts.append(f"""VIDEO {i}: {video.title}
Channel: {video.channel}
Summary: {summary}
Key Takeaways: {', '.join(video.takeaways[:5])}
Themes: {', '.join(video.themes[:5])}
""")
        return "\n".join(parts)

    def _parse_syntheses(
        self,
        response: str,
        videos: list[VideoSummary]
    ) -> list[Synthesis]:
        """Parse LLM response into Synthesis objects."""
        if "NO_SYNTHESIS_POSSIBLE" in response:
            return []

        syntheses = []
        blocks = response.split("---")

        # Build title -> id mapping
        title_to_id = {v.title: v.video_id for v in videos}

        for block in blocks:
            if "INSIGHT:" not in block:
                continue

            try:
                lines = block.strip().split("\n")
                insight = ""
                video_titles = []
                themes = []
                confidence = 0.7

                for line in lines:
                    if line.startswith("INSIGHT:"):
                        insight = line.replace("INSIGHT:", "").strip()
                    elif line.startswith("VIDEOS:"):
                        video_titles = [
                            t.strip() for t in
                            line.replace("VIDEOS:", "").split(",")
                        ]
                    elif line.startswith("THEMES:"):
                        themes = [
                            t.strip() for t in
                            line.replace("THEMES:", "").split(",")
                        ]
                    elif line.startswith("CONFIDENCE:"):
                        conf_str = line.replace("CONFIDENCE:", "").strip().lower()
                        confidence = {"high": 0.9, "medium": 0.7, "low": 0.5}.get(
                            conf_str, 0.7
                        )

                if insight:
                    # Map titles back to IDs (best effort)
                    video_ids = []
                    for title in video_titles:
                        for v_title, v_id in title_to_id.items():
                            if title.lower() in v_title.lower():
                                video_ids.append(v_id)
                                break

                    syntheses.append(Synthesis(
                        insight=insight,
                        supporting_videos=video_ids or [v.video_id for v in videos[:2]],
                        themes_connected=themes,
                        confidence=confidence
                    ))
            except Exception:
                continue

        return syntheses

    def _parse_recommendations(
        self,
        response: str,
        videos: list[VideoSummary]
    ) -> list[TacticalRecommendation]:
        """Parse LLM response into TacticalRecommendation objects."""
        recommendations = []
        blocks = response.split("---")

        for block in blocks:
            if "ACTION:" not in block:
                continue

            try:
                lines = block.strip().split("\n")
                action = ""
                rationale = ""
                difficulty = "medium"

                for line in lines:
                    if line.startswith("ACTION:"):
                        action = line.replace("ACTION:", "").strip()
                    elif line.startswith("RATIONALE:"):
                        rationale = line.replace("RATIONALE:", "").strip()
                    elif line.startswith("DIFFICULTY:"):
                        difficulty = line.replace("DIFFICULTY:", "").strip().lower()

                if action:
                    recommendations.append(TacticalRecommendation(
                        action=action,
                        rationale=rationale,
                        source_videos=[v.video_id for v in videos],
                        difficulty=difficulty if difficulty in ["quick", "medium", "project"] else "medium"
                    ))
            except Exception:
                continue

        return recommendations
