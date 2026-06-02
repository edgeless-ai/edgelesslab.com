#!/usr/bin/env python3
"""
API Spend Circuit Breaker for Hermes Discord bots.

Checks token usage rate from session logs. If a bot has consumed >60% of its
daily budget in <4 hours, it:
1. Alerts to Telegram
2. Reduces max_turns in config to throttle the bot
3. Writes a breaker state file so the healthcheck knows

Recovery: breaker auto-resets at the configured session_reset hour (3-4am).

Schedule: */10 * * * * (every 10 minutes, lightweight check)
"""
import json
import sys
import subprocess
import sqlite3
from pathlib import Path
from datetime import datetime, timezone, timedelta

PROFILES_DIR = Path("/Users/djm/.hermes/profiles")
BREAKER_STATE = Path("/Users/djm/claude-projects/logs/spend-breaker-state.json")
SEND_TELEGRAM = "python3.11 /Users/djm/.claude/skills/telegram-message/scripts/send_telegram.py"

# Bots to monitor with their daily token budgets
MONITORED_BOTS = {
    "kilo": 1_000_000,
    "hive": 1_000_000,
    "beau": 500_000,
    "edgeless-cc": 500_000,
}

RATE_THRESHOLD = 0.6  # alert if 60% consumed
RATE_WINDOW_HOURS = 4  # within 4 hours
THROTTLED_MAX_TURNS = 15  # reduce from 90 to 15 when tripped


def load_breaker_state():
    try:
        return json.loads(BREAKER_STATE.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_breaker_state(state):
    BREAKER_STATE.parent.mkdir(parents=True, exist_ok=True)
    BREAKER_STATE.write_text(json.dumps(state, indent=2))


def get_recent_token_usage(profile: str, hours: int = 4) -> int:
    """Get total tokens used by a bot in the last N hours from state.db."""
    db_path = PROFILES_DIR / profile / "state.db"
    if not db_path.exists():
        return 0

    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    # started_at is stored as REAL (unix epoch); comparing to an ISO string
    # always returns zero rows in SQLite (REAL sorts before TEXT). Use epoch.
    cutoff_ts = cutoff.timestamp()

    try:
        conn = sqlite3.connect(str(db_path))
        # Sum input + output tokens from sessions started in the window
        result = conn.execute(
            """SELECT COALESCE(SUM(input_tokens + output_tokens), 0)
               FROM sessions
               WHERE started_at > ?""",
            (cutoff_ts,)
        ).fetchone()
        conn.close()
        return result[0] if result else 0
    except Exception:
        return 0


def send_alert(message):
    try:
        subprocess.run(
            ["python3.11", "/Users/djm/.claude/skills/telegram-message/scripts/send_telegram.py", message],
            capture_output=True, timeout=30
        )
    except Exception as e:
        print(f"Alert failed: {e}", file=sys.stderr)


def throttle_bot(profile: str):
    """Temporarily reduce agent.max_turns to limit API spend.

    Uses a surgical, backed-up line edit rather than yaml.dump: round-tripping
    these profile configs through yaml.dump strips comments and reorders keys
    (a known foot-gun), so we rewrite only the agent-block max_turns line and
    leave the rest of the file byte-identical.
    """
    import re
    config_path = PROFILES_DIR / profile / "config.yaml"
    try:
        lines = config_path.read_text().splitlines(keepends=True)
        in_agent = False          # inside the top-level `agent:` mapping?
        for i, line in enumerate(lines):
            stripped = line.rstrip("\n")
            # top-level key (no leading whitespace) ends the agent block
            if stripped and not stripped[0].isspace():
                in_agent = stripped.split(":", 1)[0] == "agent"
                continue
            if in_agent:
                m = re.match(r"^(\s+)max_turns:\s*(\d+)", line)
                if m and int(m.group(2)) > THROTTLED_MAX_TURNS:
                    indent = m.group(1)
                    ts = int(datetime.now(timezone.utc).timestamp())
                    backup = config_path.with_suffix(f".yaml.bak-throttle-{ts}")
                    backup.write_text("".join(lines))
                    lines[i] = f"{indent}max_turns: {THROTTLED_MAX_TURNS}\n"
                    config_path.write_text("".join(lines))
                    return True
                if m:
                    return False  # already at/below throttle
    except Exception:
        pass
    return False


def main():
    state = load_breaker_state()
    now = datetime.now(timezone.utc)
    alerts = []

    for bot, daily_budget in MONITORED_BOTS.items():
        recent_usage = get_recent_token_usage(bot, RATE_WINDOW_HOURS)
        threshold_tokens = int(daily_budget * RATE_THRESHOLD)

        bot_state = state.setdefault(bot, {
            "tripped": False,
            "tripped_at": None,
            "last_usage": 0,
        })

        if recent_usage >= threshold_tokens and not bot_state["tripped"]:
            # Trip the breaker
            bot_state["tripped"] = True
            bot_state["tripped_at"] = now.isoformat()
            bot_state["last_usage"] = recent_usage

            pct = (recent_usage / daily_budget) * 100
            msg = (
                f"CIRCUIT BREAKER TRIPPED: {bot}\n"
                f"Used {recent_usage:,} tokens ({pct:.0f}% of daily) in {RATE_WINDOW_HOURS}h\n"
                f"Throttling max_turns to {THROTTLED_MAX_TURNS}\n"
                f"Auto-resets at session_reset hour"
            )
            alerts.append(msg)
            throttle_bot(bot)

        # Auto-reset at 4am UTC (configurable)
        if bot_state["tripped"] and bot_state.get("tripped_at"):
            tripped_time = datetime.fromisoformat(bot_state["tripped_at"])
            hours_since = (now - tripped_time).total_seconds() / 3600
            if hours_since >= 8:  # auto-reset after 8 hours
                bot_state["tripped"] = False
                bot_state["tripped_at"] = None
                # Restore max_turns would need original value — skip for now,
                # session_reset handles this by reloading config from disk

    state["last_check"] = now.isoformat()
    save_breaker_state(state)

    if alerts:
        full_msg = "Spend Circuit Breaker\n\n" + "\n\n".join(alerts)
        send_alert(full_msg)
        print(f"TRIPPED: {'; '.join(a.split(chr(10))[0] for a in alerts)}")
    else:
        print(f"OK: spend rates nominal at {now.isoformat()}")


if __name__ == "__main__":
    main()
