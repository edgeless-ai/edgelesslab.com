# dealflow-spine ops — weekly live run + Telegram digest

## What runs, when

Every **Monday 09:00 local (PST/PDT)**, a launchd user agent fires
`ops/weekly_run.sh`, which:

1. runs `cli.py run --live` with the product venv (`.venv/bin/python`) —
   real pulls from openFEMA, tax rolls, code violations, obituary RSS through
   the polite network layer; the ledger is idempotent so re-pulls write 0 dupes
2. on success, sends the top of `data/digest-latest.md` (`head -40`) to David
   via Telegram
3. on failure, sends **one** short failure Telegram with the last 5 log lines
   and exits nonzero

**Why weekly:** the consumer is David reading a digest, and the upstream
sources (tax rolls, code enforcement, FEMA declarations) update on
days-to-weeks cadence — brokers and counties move slowly. Daily runs would
produce near-identical digests (the ledger dedupes everything); weekly matches
the consumer, not the producer.

**Why launchd, not cron:** macOS cron silently skips fires while the Mac
sleeps. launchd `StartCalendarInterval` coalesces missed intervals and fires
on wake.

## Pieces

| Piece | Path |
|-------|------|
| launchd agent | `~/Library/LaunchAgents/com.edgeless.dealflow-weekly.plist` (label `com.edgeless.dealflow-weekly`) |
| run script | `ops/weekly_run.sh` (absolute paths everywhere — launchd PATH is bare) |
| venv | `.venv/` (python3.11 + `requests`, required for `--live`) |
| run logs | `ops/logs/weekly-YYYYMMDD.log` (pruned after 90 days, at script start) |
| launchd stdout/err | `ops/logs/launchd-stdout.log`, `ops/logs/launchd-stderr.log` |
| overlap lock | `ops/.weekly_run.lock/` (atomic mkdir + PID staleness check; macOS ships no `flock`) |

## Notification contract (spam guard)

Exactly **one** Telegram message per run — digest on success OR failure note.
No retries, no re-sends. (The send script itself falls back once from Markdown
to plain text if Telegram rejects the parse — that's delivery of the same
single message, not a second notification. The digest's markdown tables
routinely trigger this; expect "plain text fallback" in the log.)

## Operating it

```bash
# status (second column is last exit code; "-" in first = not running)
launchctl list | grep dealflow

# pause / resume
launchctl unload ~/Library/LaunchAgents/com.edgeless.dealflow-weekly.plist
launchctl load   ~/Library/LaunchAgents/com.edgeless.dealflow-weekly.plist

# fire once right now (manual test)
launchctl start com.edgeless.dealflow-weekly

# or run the script directly (same thing launchd runs)
bash /Users/djm/claude-projects/products/dealflow-spine/ops/weekly_run.sh

# watch the latest run
tail -f /Users/djm/claude-projects/products/dealflow-spine/ops/logs/weekly-$(date +%Y%m%d).log
```

## Changing the schedule

Edit the `StartCalendarInterval` dict in the plist
(`Weekday` 0=Sunday…7=Sunday, `Hour`, `Minute`), then reload:

```bash
launchctl unload ~/Library/LaunchAgents/com.edgeless.dealflow-weekly.plist
launchctl load   ~/Library/LaunchAgents/com.edgeless.dealflow-weekly.plist
```

Multiple fire times = make `StartCalendarInterval` an array of dicts.
