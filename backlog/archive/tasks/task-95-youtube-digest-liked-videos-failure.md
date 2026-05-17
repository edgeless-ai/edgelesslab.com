---
id: task-95
title: Fix YouTube digest - liked videos from last night not processed
epic: 2-ingestion
status: completed
priority: P1
depends_on: []
blocks: []
created: 2026-01-27
owner: david
estimated_effort: 1-2 hours
---

# Task 95: Fix YouTube Digest Liked Videos Processing

## Goal
Debug and fix the YouTube digest email system that failed to process liked videos from last night (2026-01-26 evening). Most recent email shows "0 videos" despite multiple videos being liked.

## Context
The YouTube digest email system should process liked videos and send summaries. Last night's digest reported 0 videos, but the user liked multiple videos during that period.

**Failure Symptoms:**
- Digest email sent (system is running)
- Email reports "0 videos processed"
- Multiple videos were actually liked last night
- Data loss or processing failure occurred

## Why This Matters
- **Data loss**: Losing track of content you want to remember
- **Trust issue**: If the system silently fails, you can't rely on it
- **Immediate impact**: Last night's videos are missing

## Step-by-Step Instructions

### Step 1: Locate YouTube Digest System
```bash
# Find the digest script/cron job
find /Users/djm/claude-projects -name "*youtube*digest*" -o -name "*liked*videos*" | grep -v node_modules | grep -v ".git"

# Check for relevant configs
grep -r "youtube.*digest" /Users/djm/claude-projects/.claude/ 2>/dev/null
grep -r "liked.*video" /Users/djm/claude-projects/.claude/ 2>/dev/null

# Check cron jobs
crontab -l | grep -i youtube
```

### Step 2: Review Recent Digest Emails
```bash
# Check email logs or sent folder
# Identify the timestamp of the "0 videos" email
# Note: Email was sent sometime after 2026-01-26 evening
```

### Step 3: Check YouTube API/Data Source
**Possible failure points:**
- YouTube API credentials expired/invalid
- API quota exceeded
- Liked videos API endpoint changed
- Authentication token expired
- Rate limiting hit

```bash
# Check for API keys/tokens
grep -r "YOUTUBE_API" /Users/djm/claude-projects/.env* 2>/dev/null
grep -r "google.*api" /Users/djm/claude-projects/.env* 2>/dev/null

# Test API connection manually
# (Need to find the actual API call being made)
```

### Step 4: Review Processing Logic
**Common bugs to check:**
- Date/time filtering (timezone issues?)
- Query parameters (wrong date range?)
- Empty results not handled gracefully
- Pagination issues (first page empty?)
- Cache serving stale data

### Step 5: Check Logs
```bash
# Find digest logs
ls -lt /Users/djm/claude-projects/*/logs/*youtube* 2>/dev/null | head -10
ls -lt /Users/djm/claude-projects/.serena/logs/ | head -10

# Look for errors around 2026-01-26 evening
grep -i "error\|fail\|exception" /path/to/youtube/digest/logs/*.log
```

### Step 6: Verify Liked Videos Exist
```bash
# Check if videos are actually in YouTube liked videos playlist
# Use YouTube Data API to manually query liked videos from 2026-01-26
# Confirm the data exists before blaming the processing
```

### Step 7: Fix Root Cause
Based on findings, implement fix:
- If API issue: refresh credentials, increase quota
- If logic bug: fix date filtering, pagination, error handling
- If data source changed: update API endpoint/method
- If authentication: re-authenticate with YouTube

### Step 8: Backfill Missing Data
```bash
# Manually trigger digest for 2026-01-26
# OR
# Manually fetch and process last night's liked videos
```

### Step 9: Add Monitoring
Prevent future silent failures:
- Alert on "0 videos" result (suspicious)
- Log API response status codes
- Track processing metrics (videos/day)
- Add health check endpoint

---

## Acceptance Criteria
- [ ] Root cause identified and documented
- [ ] Fix implemented and tested
- [ ] Last night's videos (2026-01-26) recovered and processed
- [ ] Monitoring added to catch future failures
- [ ] Test case added to prevent regression

---

## Verification Checklist
- [ ] Digest system runs successfully
- [ ] Test with known liked videos returns correct count
- [ ] Last night's videos appear in processed output
- [ ] Next digest email shows correct video count
- [ ] Logs show detailed processing info

---

## Investigation Notes

**System Components to Check:**
- YouTube liked videos fetcher
- Digest email generator
- Cron job scheduler
- API credentials/tokens
- Database/storage for processed videos

**Potential Locations:**
- `/claude-projects/.backlog/youtube_backlog_items.md` (references YouTube items)
- Vault ingestion pipelines
- n8n workflows (if automated)
- Cron jobs in user crontab

**Questions to Answer:**
1. Where is the YouTube digest system located?
2. What API/method fetches liked videos?
3. When did it last work correctly?
4. What changed between last success and this failure?
5. Are there error logs from 2026-01-26 evening?

---

## Artifacts
- Debug findings: `claude-vault/03-Knowledge/Debugging/2026-01-27-youtube-digest-failure.md`
- Fixed code location: (TBD after investigation)
- Monitoring/alerting config: (TBD)

## Next Steps After Fix
- Consider YouTube backlog integration improvements
- Add video metadata extraction
- Improve error messages in digest emails
- Create dashboard for digest health

## Priority Justification
**P1** because:
- Actively broken (not just missing feature)
- Data loss occurred (last night's videos)
- Silent failure (system thinks it worked)
- Daily use case affected
