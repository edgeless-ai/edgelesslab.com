#!/usr/bin/env bash
# claude-deep-enrich.sh — Claude Code processing for YouTube notes
#
# Three phases:
# 1. NEW VIDEOS: Picks videos with status='transcribed' (fetched by heartbeat
#    but not yet LLM-processed). Creates vault notes with summary, takeaways,
#    topics, and knowledge graph connections.
# 1.5. BACKFILL: Picks 'completed' videos that have transcripts but no vault
#    note (e.g. processed by old pipeline, note went elsewhere). Creates full
#    vault notes in 03-Knowledge/YouTube/{channel}/.
# 2. ENRICHMENT: Picks already-processed videos that haven't been deeply
#    enriched (missing L4-FullyEnriched tag). Adds vault connections,
#    relevance analysis, and action items.
#
# This is the ONLY path for LLM processing in the YouTube pipeline.
# The heartbeat/weekly scripts use --fetch-only (no OpenRouter dependency).
# All intelligence runs through claude -p (subscription, already paid).
#
# Schedule: Daily at 10:30pm (after evening heartbeat)
# Cost: Uses Claude Code subscription (already paid)
# Max: 15 videos per run (controllable via MAX_VIDEOS or $1 arg)
# Sends email digest when complete

set -euo pipefail

export PATH="/opt/homebrew/bin:$PATH"

PROJECT_DIR="/Users/djm/claude-projects"
VAULT_DIR="$PROJECT_DIR/claude-vault"
YT_NOTES_DIR="$VAULT_DIR/03-Knowledge/YouTube"
DB_PATH="$PROJECT_DIR/data/youtube_intelligence.db"
LOG_DIR="$PROJECT_DIR/logs/youtube_intelligence"
LOG_FILE="$LOG_DIR/deep_enrich_$(date +%Y%m%d_%H%M%S).log"
MAX_VIDEOS="${1:-15}"
PY="/opt/homebrew/opt/python@3.11/bin/python3.11"
TRANSCRIPT_DIR="$PROJECT_DIR/data/transcripts"
TODAY=$(date +%Y-%m-%d)
NOW_EPOCH=$(date +%s)

mkdir -p "$LOG_DIR"

# ─── Per-video state tracking ───────────────────────────────────────────────
# Prevents reprocessing videos that already succeeded. Each video gets a tiny
# state file named by video ID under .enrich-state/{new,backfill,enrich}/.
# A successful state file younger than STATE_TTL_DAYS is treated as "done".
# Failed state files are always overwritten on the next attempt.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STATE_DIR="$SCRIPT_DIR/.enrich-state"
STATE_TTL_DAYS=7
STATE_TTL_SECS=$((STATE_TTL_DAYS * 86400))

mkdir -p "$STATE_DIR/new" "$STATE_DIR/backfill" "$STATE_DIR/enrich"

# state_is_fresh <phase> <video_id>
#   Returns 0 (true) if a successful state file exists and is within TTL.
state_is_fresh() {
    local phase="$1" vid="$2"
    local sfile="$STATE_DIR/$phase/$vid"
    [ -f "$sfile" ] || return 1
    local status
    status=$(head -1 "$sfile" 2>/dev/null)
    [ "$status" = "success" ] || return 1
    local ts
    ts=$(sed -n '2p' "$sfile" 2>/dev/null)
    [ -n "$ts" ] || return 1
    local age=$(( NOW_EPOCH - ts ))
    [ "$age" -lt "$STATE_TTL_SECS" ]
}

# state_write <phase> <video_id> <status>
#   Writes a state file: line 1 = status, line 2 = epoch, line 3 = ISO date.
state_write() {
    local phase="$1" vid="$2" status="$3"
    local sfile="$STATE_DIR/$phase/$vid"
    printf '%s\n%s\n%s\n' "$status" "$(date +%s)" "$(date -Iseconds)" > "$sfile"
}

# Prune state files older than 2x TTL (stale failures / ancient successes)
find "$STATE_DIR" -type f -mtime +$((STATE_TTL_DAYS * 2)) -delete 2>/dev/null || true

log() { echo "$(date -Iseconds) $*" | tee -a "$LOG_FILE"; }

# Launch provenance — diagnose mystery re-launches
PROVENANCE_LOG="$LOG_DIR/launch_provenance.jsonl"
$PY -c "
import json, os, datetime
entry = {
    'ts': datetime.datetime.now().isoformat(),
    'pid': os.getpid(),
    'ppid': os.getppid(),
    'argv': '$0 ${1:-}',
    'cwd': os.getcwd(),
    'parent': '',
}
try:
    with open(f'/proc/{os.getppid()}/comm') as f:
        entry['parent'] = f.read().strip()
except Exception:
    import subprocess
    r = subprocess.run(['ps', '-p', str(os.getppid()), '-o', 'comm='], capture_output=True, text=True)
    entry['parent'] = r.stdout.strip()
with open('$PROVENANCE_LOG', 'a') as f:
    f.write(json.dumps(entry) + '\n')
" 2>/dev/null || true

# ─── Preflight: verify required binaries before doing any work ───
TIMEOUT_BIN="$(command -v timeout 2>/dev/null || command -v gtimeout 2>/dev/null || true)"
if [ -z "$TIMEOUT_BIN" ]; then
    log "FATAL: neither timeout nor gtimeout found in PATH — aborting before processing"
    exit 1
fi

# Locate the claude binary. Cron PATH often misses nvm; resolve absolute path.
CLAUDE="${CLAUDE_BIN:-}"
if [ -z "$CLAUDE" ]; then
    CLAUDE="$(command -v claude 2>/dev/null || true)"
fi
if [ -z "$CLAUDE" ]; then
    CLAUDE="$(ls -t /Users/djm/.nvm/versions/node/*/bin/claude 2>/dev/null | head -1 || true)"
fi
if [ -z "$CLAUDE" ] || [ ! -x "$CLAUDE" ]; then
    log "FATAL: claude binary not found (tried PATH and ~/.nvm/versions/node/*/bin/claude)"
    exit 1
fi

log "Starting Claude deep processing (max $MAX_VIDEOS videos)"
log "Using claude binary: $CLAUDE"

# ─── Phase 1: Process NEW videos (transcribed but no vault note yet) ───
NEW_CANDIDATES=$($PY -c "
import sqlite3
db = sqlite3.connect('$DB_PATH')
rows = db.execute('''
    SELECT v.video_id, v.title, v.channel_name, v.published_at, v.duration_seconds
    FROM videos v WHERE v.processing_status = 'transcribed'
    ORDER BY v.last_seen_at DESC LIMIT $MAX_VIDEOS
''').fetchall()
for vid, title, ch, pub, dur in rows:
    print(f'{vid}\t{title}\t{ch}\t{pub or \"\"}\t{dur or 0}')
")

NEW_COUNT=0
NEW_OK=0
NEW_FAIL=0
NEW_RESULTS=""

if [ -n "$NEW_CANDIDATES" ]; then
    NEW_COUNT=$(echo "$NEW_CANDIDATES" | wc -l | tr -d ' ')
    log "Found $NEW_COUNT new videos to process"

    while IFS=$'\t' read -r VIDEO_ID TITLE CHANNEL PUBLISHED DURATION; do
        [ -z "$VIDEO_ID" ] && continue

        # Skip if already successfully enriched within TTL
        if state_is_fresh "new" "$VIDEO_ID"; then
            log "SKIP (already done): $CHANNEL — $TITLE"
            continue
        fi

        log "Processing NEW: $CHANNEL — $TITLE"

        TRANSCRIPT_FILE="$TRANSCRIPT_DIR/${VIDEO_ID}.txt"
        if [ ! -f "$TRANSCRIPT_FILE" ]; then
            log "  SKIP: No transcript file at $TRANSCRIPT_FILE"
            NEW_FAIL=$((NEW_FAIL + 1))
            NEW_RESULTS="${NEW_RESULTS}\n  SKIP (no transcript): ${CHANNEL} - ${TITLE}"
            state_write "new" "$VIDEO_ID" "skip-no-transcript"
            continue
        fi

        DURATION_FMT=$($PY -c "d=int(${DURATION:-0}); print(f'{d//60}:{d%60:02d}')")

        # Write prompt to temp file to avoid heredoc quoting issues
        PROMPT_FILE=$(mktemp)
        cat > "$PROMPT_FILE" << ENDPROMPT
You are processing a YouTube video for the Obsidian knowledge vault.

VIDEO: "$TITLE" by $CHANNEL
VIDEO ID: $VIDEO_ID
PUBLISHED: $PUBLISHED
DURATION: ${DURATION}s

TRANSCRIPT FILE: $TRANSCRIPT_FILE

YOUR TASK:
1. Read the transcript at the path above
2. Create a comprehensive Obsidian note at: $YT_NOTES_DIR/$CHANNEL/$TITLE.md
   - Create the channel directory if needed (mkdir -p)
   - Clean the title for filename safety (remove special chars like :?*|<>)
3. Search the Obsidian vault (claude-vault/) for related existing notes using Grep
4. The note MUST have this structure:

---
channel: $CHANNEL
duration: $DURATION_FMT
enrichment_tier: L4-FullyEnriched
one_liner: "Brief one-line summary"
processed: $TODAY
published: $PUBLISHED
sources:
  - liked
title: "$TITLE"
topics:
  - topic1
  - topic2
url: https://www.youtube.com/watch?v=$VIDEO_ID
vault_connections:
  - "[[Related Note 1]]"
video_id: $VIDEO_ID
enrichment_date: $TODAY
enrichment_model: claude-code-deep
---
# $TITLE

**Channel**: [[$CHANNEL]]
**Duration**: $DURATION_FMT
**Published**: $PUBLISHED

## Summary
(2-3 paragraph summary of the video content)

## Key Takeaways
(5 actionable bullet points starting with verbs)

## Topics
(hashtag format: #topic1 #topic2)

## Relevance to Our Stack
(How does this connect to what we are building? Reference specific tools, repos, or projects)

## Vault Connections
(Wikilinks to REAL existing vault notes - verify they exist before linking)

## Knowledge Graph Position
(What topic cluster? What gap does it fill? Confirming or new knowledge?)

## Action Items
(Concrete things we could do based on this video)

RULES:
- Only add sections that have genuine content. Skip empty sections.
- Vault connections must reference REAL existing notes (verify they exist before linking).
- Be concise. Quality over quantity.
- Do not use emojis.
- The filename must be filesystem-safe (no colons, question marks, pipes, etc.)
ENDPROMPT

        PROMPT=$(cat "$PROMPT_FILE")
        rm -f "$PROMPT_FILE"

        if "$TIMEOUT_BIN" 360 "$CLAUDE" -p "$PROMPT" --dangerously-skip-permissions > "$LOG_DIR/enrich_${VIDEO_ID}.log" 2>&1; then
            log "  OK: processed successfully"
            NEW_OK=$((NEW_OK + 1))
            NEW_RESULTS="${NEW_RESULTS}\n  OK (new): ${CHANNEL} - ${TITLE}"
            state_write "new" "$VIDEO_ID" "success"

            $PY -c "
import sqlite3
db = sqlite3.connect('$DB_PATH')
db.execute(\"UPDATE videos SET processing_status='completed', processing_completed_at=datetime('now') WHERE video_id=?\", ('$VIDEO_ID',))
db.commit()
"
        else
            log "  FAIL: claude -p exited with $? (timeout or error)"
            NEW_FAIL=$((NEW_FAIL + 1))
            NEW_RESULTS="${NEW_RESULTS}\n  FAIL (new): ${CHANNEL} - ${TITLE}"
            state_write "new" "$VIDEO_ID" "fail"
        fi

    done <<< "$NEW_CANDIDATES"
else
    log "No new videos to process"
fi

# ─── Phase 1.5: Create notes for COMPLETED videos missing vault notes ───
BACKFILL_COUNT=0
BACKFILL_OK=0
BACKFILL_FAIL=0
BACKFILL_RESULTS=""
REMAINING=$((MAX_VIDEOS - NEW_OK - NEW_FAIL))
if [ "$REMAINING" -le 0 ]; then
    log "Max videos reached, skipping backfill phase"
else
    BACKFILL_CANDIDATES=$($PY -c "
import sqlite3
from pathlib import Path
db = sqlite3.connect('$DB_PATH')
vault_yt = Path('$YT_NOTES_DIR')
transcript_dir = Path('$TRANSCRIPT_DIR')
rows = db.execute('''
    SELECT video_id, title, channel_name, published_at, duration_seconds
    FROM videos WHERE processing_status = 'completed'
    ORDER BY last_seen_at DESC LIMIT 200
''').fetchall()
candidates = []
for vid, title, ch, pub, dur in rows:
    if len(candidates) >= $REMAINING: break
    t = transcript_dir / f'{vid}.txt'
    if not t.exists(): continue
    cd = vault_yt / ch
    has_note = False
    if cd.exists():
        for f in cd.glob('*.md'):
            try:
                c = f.read_text()[:600]
                if vid in c:
                    has_note = True
                    break
            except: continue
    if not has_note:
        candidates.append(f'{vid}\t{title}\t{ch}\t{pub or \"\"}\t{dur or 0}')
for c in candidates: print(c)
")

    if [ -n "$BACKFILL_CANDIDATES" ]; then
        BACKFILL_COUNT=$(echo "$BACKFILL_CANDIDATES" | wc -l | tr -d ' ')
        log "Found $BACKFILL_COUNT completed videos missing vault notes (backfill)"

        while IFS=$'\t' read -r VIDEO_ID TITLE CHANNEL PUBLISHED DURATION; do
            [ -z "$VIDEO_ID" ] && continue

            # Skip if already successfully backfilled within TTL
            if state_is_fresh "backfill" "$VIDEO_ID"; then
                log "SKIP (already done): $CHANNEL — $TITLE"
                continue
            fi

            log "Backfill: $CHANNEL — $TITLE"

            TRANSCRIPT_FILE="$TRANSCRIPT_DIR/${VIDEO_ID}.txt"
            if [ ! -f "$TRANSCRIPT_FILE" ]; then
                log "  SKIP: No transcript file"
                BACKFILL_FAIL=$((BACKFILL_FAIL + 1))
                BACKFILL_RESULTS="${BACKFILL_RESULTS}\n  SKIP (no transcript): ${CHANNEL} - ${TITLE}"
                state_write "backfill" "$VIDEO_ID" "skip-no-transcript"
                continue
            fi

            DURATION_FMT=$($PY -c "d=int(${DURATION:-0}); print(f'{d//60}:{d%60:02d}')")

            PROMPT_FILE=$(mktemp)
            cat > "$PROMPT_FILE" << ENDPROMPT
You are processing a YouTube video for the Obsidian knowledge vault.

VIDEO: "$TITLE" by $CHANNEL
VIDEO ID: $VIDEO_ID
PUBLISHED: $PUBLISHED
DURATION: ${DURATION}s

TRANSCRIPT FILE: $TRANSCRIPT_FILE

YOUR TASK:
1. Read the transcript at the path above
2. Create a comprehensive Obsidian note at: $YT_NOTES_DIR/$CHANNEL/(safe filename).md
   - Create the channel directory if needed (mkdir -p)
   - Clean the title for filename safety (remove special chars like :?*|<>)
3. Search the Obsidian vault (claude-vault/) for related existing notes using Grep
4. The note MUST have this structure:

---
channel: $CHANNEL
duration: $DURATION_FMT
enrichment_tier: L4-FullyEnriched
one_liner: "Brief one-line summary"
processed: $TODAY
published: $PUBLISHED
sources:
  - liked
title: "$TITLE"
topics:
  - topic1
  - topic2
url: https://www.youtube.com/watch?v=$VIDEO_ID
vault_connections:
  - "[[Related Note 1]]"
video_id: $VIDEO_ID
enrichment_date: $TODAY
enrichment_model: claude-code-deep
---
# $TITLE

**Channel**: [[$CHANNEL]]
**Duration**: $DURATION_FMT
**Published**: $PUBLISHED

## Summary
(2-3 paragraph summary of the video content)

## Key Takeaways
(5 actionable bullet points starting with verbs)

## Topics
(hashtag format: #topic1 #topic2)

## Relevance to Our Stack
(How does this connect to what we are building? Reference specific tools, repos, or projects)

## Vault Connections
(Wikilinks to REAL existing vault notes - verify they exist before linking)

## Knowledge Graph Position
(What topic cluster? What gap does it fill? Confirming or new knowledge?)

## Action Items
(Concrete things we could do based on this video)

RULES:
- Only add sections that have genuine content. Skip empty sections.
- Vault connections must reference REAL existing notes (verify they exist before linking).
- Be concise. Quality over quantity.
- Do not use emojis.
- The filename must be filesystem-safe (no colons, question marks, pipes, etc.)
ENDPROMPT

            PROMPT=$(cat "$PROMPT_FILE")
            rm -f "$PROMPT_FILE"

            if "$TIMEOUT_BIN" 360 "$CLAUDE" -p "$PROMPT" --dangerously-skip-permissions > "$LOG_DIR/enrich_${VIDEO_ID}.log" 2>&1; then
                log "  OK: backfill processed successfully"
                BACKFILL_OK=$((BACKFILL_OK + 1))
                BACKFILL_RESULTS="${BACKFILL_RESULTS}\n  OK (backfill): ${CHANNEL} - ${TITLE}"
                state_write "backfill" "$VIDEO_ID" "success"
            else
                log "  FAIL: claude -p exited with $? (timeout or error)"
                BACKFILL_FAIL=$((BACKFILL_FAIL + 1))
                BACKFILL_RESULTS="${BACKFILL_RESULTS}\n  FAIL (backfill): ${CHANNEL} - ${TITLE}"
                state_write "backfill" "$VIDEO_ID" "fail"
            fi

        done <<< "$BACKFILL_CANDIDATES"
    else
        BACKFILL_COUNT=0
        log "No completed videos missing vault notes"
    fi
fi

# ─── Phase 2: Enrich EXISTING vault notes ───
REMAINING=$((MAX_VIDEOS - NEW_OK - NEW_FAIL - BACKFILL_OK - BACKFILL_FAIL))
if [ "$REMAINING" -le 0 ]; then
    log "Max videos reached after new processing, skipping enrichment phase"
    REMAINING=0
fi

ENRICH_CANDIDATES=""
if [ "$REMAINING" -gt 0 ]; then
    ENRICH_CANDIDATES=$($PY -c "
import sqlite3
from pathlib import Path
db = sqlite3.connect('$DB_PATH')
vault_yt = Path('$YT_NOTES_DIR')
rows = db.execute('''
    SELECT video_id, title, channel_name FROM videos
    WHERE processing_status = 'completed'
    ORDER BY processing_completed_at DESC LIMIT 50
''').fetchall()
candidates = []
for vid, title, ch in rows:
    if len(candidates) >= $REMAINING: break
    cd = vault_yt / ch
    if not cd.exists(): continue
    for f in cd.glob('*.md'):
        try:
            c = f.read_text()[:600]
            if 'enrichment_tier: L4-FullyEnriched' in c: continue
            if c.startswith('---') and ('video_id:' in c or 'source_id:' in c):
                candidates.append(f'{vid}\t{title}\t{ch}\t{f}')
                break
        except: continue
for c in candidates: print(c)
")
fi

ENRICH_COUNT=0
ENRICH_OK=0
ENRICH_FAIL=0
ENRICH_RESULTS=""

if [ -n "$ENRICH_CANDIDATES" ]; then
    ENRICH_COUNT=$(echo "$ENRICH_CANDIDATES" | wc -l | tr -d ' ')
    log "Found $ENRICH_COUNT existing notes to enrich"

    while IFS=$'\t' read -r VIDEO_ID TITLE CHANNEL NOTE_PATH; do
        [ -z "$VIDEO_ID" ] && continue

        # Skip if already successfully enriched within TTL
        if state_is_fresh "enrich" "$VIDEO_ID"; then
            log "SKIP (already done): $CHANNEL — $TITLE"
            continue
        fi

        log "Enriching: $CHANNEL — $TITLE"

        PROMPT_FILE=$(mktemp)
        cat > "$PROMPT_FILE" << ENDPROMPT
You are enriching a YouTube video note for the Obsidian knowledge vault.

VIDEO NOTE PATH: $NOTE_PATH

YOUR TASK:
1. Read the video note at the path above
2. Search the Obsidian vault (claude-vault/) for related existing notes using Grep
3. Update the note with these ADDITIONAL sections (append below existing content, do not delete existing content):

   ## Relevance to Our Stack
   How does this video content connect to what we are building? Reference specific tools, repos, or projects we use.

   ## Vault Connections
   Wikilinks to existing vault notes that are genuinely related (not just surface-level topic matches).
   Format: - [[NoteName]] - why it is connected

   ## Knowledge Graph Position
   What topic cluster does this video belong to? What gap does it fill?

   ## Action Items
   Concrete things we could do based on this video.

4. Update the frontmatter:
   - Set enrichment_tier: L4-FullyEnriched
   - Set enrichment_date: $TODAY
   - Set enrichment_model: claude-code-deep
   - Update vault_connections as a proper YAML list with quoted wikilinks

RULES:
- Only add sections that have genuine content. Skip empty sections.
- Vault connections must reference REAL existing notes (verify they exist before linking).
- Keep the existing content intact - append your enrichment below it.
- Be concise. Quality over quantity.
- Do not use emojis.
ENDPROMPT

        PROMPT=$(cat "$PROMPT_FILE")
        rm -f "$PROMPT_FILE"

        if "$TIMEOUT_BIN" 300 "$CLAUDE" -p "$PROMPT" --dangerously-skip-permissions > "$LOG_DIR/enrich_${VIDEO_ID}.log" 2>&1; then
            log "  OK: enriched successfully"
            ENRICH_OK=$((ENRICH_OK + 1))
            ENRICH_RESULTS="${ENRICH_RESULTS}\n  OK (enrich): ${CHANNEL} - ${TITLE}"
            state_write "enrich" "$VIDEO_ID" "success"
        else
            log "  FAIL: claude -p exited with $? (timeout or error)"
            ENRICH_FAIL=$((ENRICH_FAIL + 1))
            ENRICH_RESULTS="${ENRICH_RESULTS}\n  FAIL (enrich): ${CHANNEL} - ${TITLE}"
            state_write "enrich" "$VIDEO_ID" "fail"
        fi

    done <<< "$ENRICH_CANDIDATES"
else
    log "No existing notes to enrich"
fi

# ─── Summary ───
TOTAL_OK=$((NEW_OK + BACKFILL_OK + ENRICH_OK))
TOTAL_FAIL=$((NEW_FAIL + BACKFILL_FAIL + ENRICH_FAIL))
TOTAL=$((NEW_COUNT + BACKFILL_COUNT + ENRICH_COUNT))

log "Deep processing complete: $TOTAL_OK/$TOTAL videos processed, $TOTAL_FAIL failed"

# Send email digest — with guards against spam
EMAIL_LOCK="$LOG_DIR/.deep_enrich_email_sent_today"
export REPORT_DATE="$TODAY $(date +%H:%M)"
export NEW_RESULTS_EXPANDED=$(echo -e "$NEW_RESULTS")
export BACKFILL_RESULTS_EXPANDED=$(echo -e "$BACKFILL_RESULTS")
export ENRICH_RESULTS_EXPANDED=$(echo -e "$ENRICH_RESULTS")
export NEW_OK NEW_FAIL BACKFILL_OK BACKFILL_FAIL ENRICH_OK ENRICH_FAIL

SHOULD_EMAIL=true

# Guard 1: Skip email when ALL videos failed (infra error, not useful as digest)
if [ "$TOTAL_OK" -eq 0 ] && [ "$TOTAL" -gt 0 ]; then
    log "All $TOTAL videos failed — skipping email (infra error, not a useful digest)"
    SHOULD_EMAIL=false
fi

# Guard 2: Rate limit — max 1 email per day for this job
if [ -f "$EMAIL_LOCK" ]; then
    LOCK_DATE=$(cat "$EMAIL_LOCK" 2>/dev/null)
    if [ "$LOCK_DATE" = "$TODAY" ]; then
        log "Email already sent today ($TODAY) — skipping (rate limited)"
        SHOULD_EMAIL=false
    fi
fi

# Guard 3: Skip email when nothing was processed (no new + no enrich)
if [ "$TOTAL" -eq 0 ]; then
    log "No videos to process — skipping email"
    SHOULD_EMAIL=false
fi

if [ "$SHOULD_EMAIL" = true ]; then
    $PY -c "
import sys, os
sys.path.insert(0, '/Users/djm/claude-projects')
from src.tools.email.consolidated_email_api import send_email_to_david

new_ok = int(os.environ.get('NEW_OK', 0))
new_fail = int(os.environ.get('NEW_FAIL', 0))
bf_ok = int(os.environ.get('BACKFILL_OK', 0))
bf_fail = int(os.environ.get('BACKFILL_FAIL', 0))
enrich_ok = int(os.environ.get('ENRICH_OK', 0))
enrich_fail = int(os.environ.get('ENRICH_FAIL', 0))
total_ok = new_ok + bf_ok + enrich_ok
total = new_ok + new_fail + bf_ok + bf_fail + enrich_ok + enrich_fail
rd = os.environ.get('REPORT_DATE', '')
nr = os.environ.get('NEW_RESULTS_EXPANDED', '')
br = os.environ.get('BACKFILL_RESULTS_EXPANDED', '')
er = os.environ.get('ENRICH_RESULTS_EXPANDED', '')

subject = f'YouTube Deep Processing: {total_ok}/{total} videos'
body = f'<h2>YouTube Deep Processing Report</h2><p><strong>Date:</strong> {rd}</p><h3>New Videos</h3><p>Processed: {new_ok} | Failed: {new_fail}</p><pre>{nr}</pre><h3>Backfill</h3><p>Processed: {bf_ok} | Failed: {bf_fail}</p><pre>{br}</pre><h3>Enrichment</h3><p>Enriched: {enrich_ok} | Failed: {enrich_fail}</p><pre>{er}</pre><p><em>All LLM processing via Claude Code subscription (no API cost)</em></p>'

try:
    result = send_email_to_david(subject=subject, body=body)
    print(f'Email sent: {result}')
except Exception as e:
    print(f'Email failed: {e}', file=sys.stderr)
"
    # Stamp rate-limit lock
    echo "$TODAY" > "$EMAIL_LOCK"
fi

# Harvest action items from newly-enriched vault notes into Paperclip issues
# (Each enriched note's "## Action Items" section becomes one Paperclip issue,
# routed to the right agent. Idempotent — skips already-harvested notes.)
HARVESTER="$PROJECT_DIR/scripts/youtube_intelligence/youtube-action-harvester.py"
if [ -f "$HARVESTER" ]; then
    log "Running action harvester to create Paperclip issues..."
    /opt/homebrew/opt/python@3.11/bin/python3.11 "$HARVESTER" >> "$LOG_FILE" 2>&1 || log "Harvester error (non-fatal)"
fi

# Cleanup old logs (keep 14 days)
find "$LOG_DIR" -name "deep_enrich_*.log" -mtime +14 -delete 2>/dev/null || true
find "$LOG_DIR" -name "enrich_*.log" -mtime +14 -delete 2>/dev/null || true
