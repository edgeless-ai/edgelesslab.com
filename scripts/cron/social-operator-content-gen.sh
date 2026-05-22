#!/bin/bash
set -uo pipefail

# SOCIAL OPERATOR — Weekly Content Calendar
# Generates a content calendar with ready-to-post drafts and delivers
# it to David via Telegram. He posts manually to grow the accounts.
# NO automated posting. NO API keys. Just good content delivered on schedule.
#
# Runs: Monday 9:00 AM PST
# Cron: 0 17 * * 1 $CRON_WRAPPER "social_content_gen" $CLAUDE_PROJECTS_ROOT/scripts/cron/social-operator-content-gen.sh

CLAUDE_PROJECTS_ROOT="${CLAUDE_PROJECTS_ROOT:-/Users/djm/claude-projects}"
LOG_DIR="$CLAUDE_PROJECTS_ROOT/logs/social-operator"
LOG_FILE="$LOG_DIR/content-gen-$(date +%Y%m%d).log"
CALENDAR_DIR="$CLAUDE_PROJECTS_ROOT/clients/edgeless/content/calendars"
WEEK_TAG=$(date +%Y-W%V)

set +e
source "$CLAUDE_PROJECTS_ROOT/.env" 2>/dev/null
set -e

mkdir -p "$LOG_DIR" "$CALENDAR_DIR"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

log "=== Social Operator: Weekly Content Calendar ==="

# --- Gather content sources ---
KB_DIR="$CLAUDE_PROJECTS_ROOT/claude-vault/03-Knowledge"
BLOG_DIR="$CLAUDE_PROJECTS_ROOT/edgeless-website/src/lib"
BLOG_DRAFTS_DIR="$CLAUDE_PROJECTS_ROOT/edgeless-website/drafts"

RECENT_KB=""
if [ -d "$KB_DIR" ]; then
    RECENT_KB=$(find "$KB_DIR" -name "*.md" -mtime -14 2>/dev/null | head -10)
fi

BLOG_DRAFTS=""
if [ -d "$BLOG_DRAFTS_DIR" ]; then
    BLOG_DRAFTS=$(find "$BLOG_DRAFTS_DIR" -name "*.md" 2>/dev/null | head -5)
fi

KB_COUNT=$(echo "$RECENT_KB" | grep -c '.' 2>/dev/null || echo 0)
DRAFT_COUNT=$(echo "$BLOG_DRAFTS" | grep -c '.' 2>/dev/null || echo 0)

log "Sources: $KB_COUNT KB articles, $DRAFT_COUNT blog drafts"

# --- Build the content brief and dispatch to Hermes/Scribe ---
CALENDAR_FILE="$CALENDAR_DIR/calendar-${WEEK_TAG}.md"

PROMPT="You are the Social Operator for Edgeless Lab. Generate a weekly content calendar for David to manually post this week.

BRAND VOICE:
- Technical, direct, aesthetic-first
- No corporate speak, no buzzwords, no emojis in prose text
- Topics: AI agents, agentic systems, generative art, pen plotters, Nous research, multi-agent coordination, creative coding

CONTENT SOURCES (scan these for inspiration):
- Recent KB articles in $KB_DIR
- Blog drafts in $BLOG_DRAFTS_DIR
- Recent work: org restructure, Lighthouse monitoring, multi-client agency architecture, pen plotter art

OUTPUT FORMAT — write a single markdown file to $CALENDAR_FILE with this exact structure:

# Content Calendar: Week of $(date '+%B %d, %Y')

## Twitter/X (5-7 posts)

### Monday
**Post:** [ready-to-copy tweet text, under 280 chars]
**Why now:** [1-line reason this is timely]

### Tuesday
**Post:** [tweet text]
**Why now:** [reason]

[...continue for each day, skip weekends]

### Thread (pick best day)
**Thread:** [3-5 tweet thread on a meaty topic from KB]
**Hook:** [the first tweet that makes people click]

## LinkedIn (2-3 posts)

### Post 1 (suggest day)
**Post:** [full LinkedIn post, 150-300 words, professional but not corporate]
**Why now:** [reason]

### Post 2 (suggest day)
**Post:** [LinkedIn post]
**Why now:** [reason]

## Notes
- What performed well recently (if data available)
- Suggested hashtags (sparingly — 2-3 max per post)
- Any timely hooks (events, launches, trending topics in AI/art)

RULES:
- Every post must be READY TO COPY-PASTE. No placeholders, no [insert here].
- Tweets must be under 280 characters.
- LinkedIn posts should be 150-300 words.
- Sound like a real person who builds things, not a brand account.
- Reference actual work being done (pen plotter art, agent architecture, etc.)
- No engagement bait, no \"hot take\" format, no \"unpopular opinion\" hooks."

if command -v hermes &>/dev/null; then
    log "Dispatching Hermes (Scribe) for content calendar..."
    hermes --profile scribe -m "$PROMPT" >> "$LOG_FILE" 2>&1 &
    HERMES_PID=$!

    # Wait up to 5 minutes for calendar generation
    TIMEOUT=300
    ELAPSED=0
    while kill -0 "$HERMES_PID" 2>/dev/null && [ "$ELAPSED" -lt "$TIMEOUT" ]; do
        sleep 10
        ELAPSED=$((ELAPSED + 10))
    done

    if [ -f "$CALENDAR_FILE" ]; then
        log "Calendar generated at $CALENDAR_FILE"
        CALENDAR_SIZE=$(wc -c < "$CALENDAR_FILE" | tr -d ' ')
        log "Calendar size: $CALENDAR_SIZE bytes"
    else
        log "WARN: Calendar file not created after ${ELAPSED}s. Hermes may still be running."
    fi
else
    log "WARN: hermes CLI not found."
fi

# --- Deliver to David via Telegram ---
TELEGRAM_SCRIPT="$HOME/.claude/skills/telegram-message/scripts/send_telegram.py"
if [ -f "$TELEGRAM_SCRIPT" ]; then
    if [ -f "$CALENDAR_FILE" ]; then
        # Send the calendar content (truncated for Telegram limits)
        CONTENT=$(head -80 "$CALENDAR_FILE")
        python3.11 "$TELEGRAM_SCRIPT" "Content Calendar ${WEEK_TAG} ready. Check $CALENDAR_FILE or here's the preview:

$CONTENT" 2>/dev/null || true
        log "Calendar delivered to Telegram"
    else
        python3.11 "$TELEGRAM_SCRIPT" "Social Operator: Content calendar generation in progress for ${WEEK_TAG}. Will deliver when ready." 2>/dev/null || true
    fi
fi

log "=== Content calendar cycle complete ==="
