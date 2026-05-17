---
id: 130
title: Implement Cron Health Monitoring & Self-Diagnosis
epic: kernel
status: completed
priority: P1
effort: M
owner: agent
created: 2026-02-01
depends_on: []
blocks: []
tags: [observability, cron, reliability, epic-100]
parent_epic: 100
---

# Task 130: Implement Cron Health Monitoring & Self-Diagnosis

## Context

On Jan 29-Feb 1, 2026, ALL cron jobs failed for ~3 days because `$CRON_WRAPPER` variable wasn't expanding in crontab. The alerting system worked (David got 50+ failure emails), but:
- No self-diagnosis of root cause
- No self-healing
- No "everything is broken" escalation vs "one job failed"
- Just noise that trained David to ignore alerts

This is a trust erosion pattern: alerts become noise → user ignores alerts → real problems go unnoticed.

## Problem Statement

Current cron monitoring is failure-only and noisy. Need:
1. **Health summary** - Periodic "all systems go" confirmation
2. **Anomaly detection** - "All jobs failing" is different from "one job failed"
3. **Self-diagnosis** - Common failure patterns should be auto-detected
4. **Actionable alerts** - Include likely cause + fix suggestion

## Acceptance Criteria

### Required
- [x] Weekly health summary email showing job success/failure rates
- [x] Anomaly detection: if >50% of jobs fail in 24h, send escalation alert (not per-job spam)
- [x] Self-diagnosis for common failures:
  - Variable expansion issues (like this one)
  - Missing files/scripts
  - Permission errors
  - Python/venv issues
- [x] Include fix suggestions in failure alerts

### Stretch
- [ ] Dashboard showing cron job health (success rate over time)
- [ ] Auto-fix for recoverable issues (e.g., recreate missing log dirs)
- [ ] Silence individual job alerts after 3 consecutive failures (escalate instead)

## Implementation Notes

### Health Summary Email
```
Subject: Weekly Cron Health - 12/14 jobs healthy

✅ Healthy (12): gmail_token_refresh, rss_ingest, youtube_likes...
⚠️ Degraded (1): slo_check (3 failures this week)
❌ Failing (1): memory_maintenance (not run in 7 days)

Details: [link to logs]
```

### Anomaly Detection Logic
```python
# If more than half of distinct jobs failed in last 24h
# → Likely systemic issue, not individual job problem
# → Send ONE "system health critical" alert instead of N job alerts
```

### Self-Diagnosis Patterns
| Error Pattern | Likely Cause | Suggested Fix |
|---------------|--------------|---------------|
| `No such file or directory: $VAR` | Variable not expanding | Use literal paths in crontab |
| `Permission denied` | Script not executable | `chmod +x script.sh` |
| `ModuleNotFoundError` | Wrong Python/venv | Check venv path |
| `No such file or directory: /script.sh` | Script deleted/moved | Check script exists |

## Related

- **EPIC 100**: System Reliability & Self-Governance Audit
- **Root cause**: Cron doesn't expand `$VAR` inside another VAR definition
- **Fix applied**: Changed `CRON_WRAPPER=$CLAUDE_PROJECTS_ROOT/...` to literal path

## Lesson Learned

> Alerting without self-diagnosis creates noise. Noise erodes trust. Trust erosion leads to ignored alerts. Ignored alerts lead to real problems going unnoticed.

---

*Created from Jan 29-Feb 1 cron failure incident*
