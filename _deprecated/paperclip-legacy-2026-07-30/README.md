# Deprecated Paperclip-legacy scripts (2026-07-30)

These 5 scripts still targeted the retired Paperclip API (`http://127.0.0.1:3100`),
which is decommissioned (task layer moved to Hermes Kanban in 2026-06/07). All were
**untracked and unscheduled** (not in the live crontab, launchd, or hermes-cron
`jobs.json`) — dormant legacy that would have failed silently if ever run.

Moved here during a Paperclip-routing cleanup. If any is needed again, repoint it to
`scripts/lib/kanban_task_backend.py` (`create_task`) — see the migrated
`scripts/nightly-skill-review.py` for the pattern.

| Script | Was doing |
|---|---|
| `sandbox-bridge.py` | `paperclip_create_issue` tool → POST to `:3100` |
| `run_yt_triage.py` | YouTube triage → Paperclip (superseded by `scripts/cron/youtube-likes-unified-v2.sh` + `scripts/triage-to-kanban.py`) |
| `deepseek_youtube_enrichment_loop.py` | YouTube enrichment → Paperclip comments (superseded by `scripts/youtube_intelligence/claude-deep-enrich.sh`) |
| `paperclip-heartbeat-wrapper.sh` | Paperclip heartbeat |
| `backroom-session.py` | Discord backroom session → Paperclip |

The still-live producer, `scripts/nightly-skill-review.py`, was **repointed** to Kanban
(not moved) the same day.
