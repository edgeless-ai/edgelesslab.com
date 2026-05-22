#!/usr/bin/env bash
# hermes-bot-supervisor.sh — Auto-restart Hermes Discord gateway bots if they crash
#
# Checks each required/optional bot process and restarts if not running.
# Prevents restart storms: skips + alerts if 3+ restarts in last 60 minutes.
# Logs all restarts to logs/hermes-supervisor.log.
# Sends Telegram alerts on restarts and storm detection.
#
# Schedule: */5 * * * * (every 5 minutes)
# Safe to run repeatedly — idempotent, flock-protected per-bot.

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
HERMES_DIR="/Users/djm/.hermes"
HERMES_VENV="${HERMES_DIR}/hermes-agent/venv/bin/python3"
LOG_FILE="/Users/djm/claude-projects/logs/hermes-supervisor.log"
STATE_FILE="/Users/djm/claude-projects/logs/hermes-supervisor-state.json"
SEND_TELEGRAM="python3.11 /Users/djm/.claude/skills/telegram-message/scripts/send_telegram.py"

REQUIRED_BOTS="kilo hive"
OPTIONAL_BOTS="beau edgeless-cc scribe ombudsman atlas trader"
PREFLIGHT_SCRIPT="/Users/djm/claude-projects/scripts/preflight/bot-launch-preflight.sh"

# Storm threshold: max restarts allowed within the storm window
# Raised from 3 -> 5 because Discord hiccups are normal and transient.
STORM_THRESHOLD=5
STORM_WINDOW_SECONDS=3600  # 60 minutes
STORM_BACKOFF_SECONDS=900  # 15 min: after storm, wait this long before next restart attempt

# Startup grace: after any restart, don't declare the bot "down" for N seconds.
# Prevents seeing a not-yet-fully-started process as dead.
STARTUP_GRACE_SECONDS=45

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log() {
    local level="$1"
    shift
    echo "$(date -Iseconds) [${level}] $*" | tee -a "$LOG_FILE"
}

send_alert() {
    local msg="$1"
    $SEND_TELEGRAM "$msg" 2>/dev/null || log "WARN" "Telegram alert failed (non-fatal)"
}

# Load JSON state, return empty object on failure
load_state() {
    if [[ -f "$STATE_FILE" ]]; then
        /opt/homebrew/opt/python@3.11/bin/python3.11 -c "
import json, sys
try:
    print(open('${STATE_FILE}').read())
except Exception:
    print('{}')
" 2>/dev/null || echo "{}"
    else
        echo "{}"
    fi
}

# ---------------------------------------------------------------------------
# Main logic via Python (state management, storm detection, restart)
# ---------------------------------------------------------------------------
/opt/homebrew/opt/python@3.11/bin/python3.11 - \
    "$STATE_FILE" "$LOG_FILE" "$SEND_TELEGRAM" "$HERMES_DIR" "$HERMES_VENV" \
    "$REQUIRED_BOTS" "$OPTIONAL_BOTS" \
    "$STORM_THRESHOLD" "$STORM_WINDOW_SECONDS" \
    <<'PYTHON'
import sys
import json
import subprocess
import os
import time
from datetime import datetime, timezone
from pathlib import Path

STATE_FILE       = sys.argv[1]
LOG_FILE         = sys.argv[2]
SEND_TELEGRAM    = sys.argv[3]
HERMES_DIR       = sys.argv[4]
HERMES_VENV      = sys.argv[5]
REQUIRED_BOTS    = sys.argv[6].split()
OPTIONAL_BOTS    = sys.argv[7].split()
STORM_THRESHOLD  = int(sys.argv[8])
STORM_WINDOW_S   = int(sys.argv[9])
PREFLIGHT_SCRIPT = os.environ.get("PREFLIGHT_SCRIPT", "/Users/djm/claude-projects/scripts/preflight/bot-launch-preflight.sh")

ALL_BOTS = REQUIRED_BOTS + OPTIONAL_BOTS
NOW_TS   = time.time()
NOW_ISO  = datetime.now(timezone.utc).isoformat()

# Startup grace: after any restart, don't declare the bot "down" for N seconds.
# Prevents seeing a not-yet-fully-started process as dead.
STARTUP_GRACE_SECONDS = 45


# ---- I/O helpers -----------------------------------------------------------

def log(level: str, msg: str) -> None:
    line = f"{datetime.now().astimezone().isoformat()} [{level}] {msg}"
    print(line, flush=True)
    try:
        with open(LOG_FILE, "a") as fh:
            fh.write(line + "\n")
    except OSError:
        pass


def send_alert(msg: str) -> None:
    try:
        subprocess.run(
            ["python3.11",
             "/Users/djm/.claude/skills/telegram-message/scripts/send_telegram.py",
             msg],
            capture_output=True,
            timeout=30,
        )
    except Exception as exc:
        log("WARN", f"Telegram send failed: {exc}")


def load_state() -> dict:
    try:
        return json.loads(Path(STATE_FILE).read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_state(state: dict) -> None:
    Path(STATE_FILE).parent.mkdir(parents=True, exist_ok=True)
    tmp = STATE_FILE + ".tmp"
    Path(tmp).write_text(json.dumps(state, indent=2))
    os.replace(tmp, STATE_FILE)


# ---- System health ---------------------------------------------------------

def get_loadavg() -> float:
    """Return 1-minute load average."""
    try:
        return os.getloadavg()[0]
    except OSError:
        return 0.0


def is_system_overloaded(threshold: float = 20.0) -> bool:
    """Skip restarts when system is under heavy load to prevent cascade."""
    return get_loadavg() > threshold


# ---- Process check ---------------------------------------------------------

def is_running(profile: str) -> bool:
    """Check if a gateway process exists for this profile.

    Uses `ps` instead of `pgrep` because macOS pgrep silently fails to match
    processes with very long command lines (Python framework paths exceed
    pgrep's internal buffer).
    """
    result = subprocess.run(
        ["ps", "aux"],
        capture_output=True, text=True, timeout=30,
    )
    pattern = f"hermes_cli.main --profile {profile} gateway"
    for line in result.stdout.split("\n"):
        if pattern in line:
            return True
    return False


def is_healthy(profile: str) -> bool:
    """Check if bot is running AND connected to Discord (not just process alive).

    Reads the gateway.log for a recent connection entry.
    A bot that is running but hasn't connected in >10 min is unhealthy.
    """
    if not is_running(profile):
        return False

    # EDGA-XXXX: Startup grace period. After any restart (manual or auto),
    # don't declare the bot "down" for N seconds. The gateway needs time
    # to fully start, connect to Discord, and write its first log entry.
    # Without this, the supervisor sees a not-yet-fully-started process as
    # dead and restarts it again, creating false storm alerts.
    bot_state = state.get(profile, {})
    last_restart_ts = bot_state.get("last_restart_ts", 0)
    if NOW_TS - last_restart_ts < STARTUP_GRACE_SECONDS:
        return True

    gateway_log = Path(HERMES_DIR) / "profiles" / profile / "logs" / "gateway.log"
    try:
        if not gateway_log.exists():
            return True  # No log yet, assume healthy if process exists

        # Check last modification time of gateway.log — if stale, bot may be frozen
        # Gateway cron ticker writes every 60s, so 10 min with no log = frozen
        log_age = time.time() - gateway_log.stat().st_mtime
        if log_age > 600:  # No log activity in 10 minutes
            return False

        # Look at last 100 lines for the most recent session state
        result = subprocess.run(
            ["tail", "-100", str(gateway_log)],
            capture_output=True, text=True, timeout=30,
        )
        lines = result.stdout.strip().split("\n")

        # Find the MOST RECENT positive and negative signals.
        # We walk in reverse (newest first) and track the first match of each type.
        # Only mark unhealthy if the most recent signal is negative AND there's
        # no positive signal after it. This prevents false positives from old
        # SIGTERM entries still in the log window after a restart.
        newest_positive_idx = -1
        newest_negative_idx = -1
        for idx, line in enumerate(reversed(lines)):
            if newest_negative_idx == -1 and ("Received SIGTERM" in line or "initiating shutdown" in line):
                newest_negative_idx = idx
            if newest_positive_idx == -1 and ("discord connected" in line.lower() or "gateway running" in line.lower()):
                newest_positive_idx = idx
            # Stop early once we have both
            if newest_positive_idx != -1 and newest_negative_idx != -1:
                break

        if newest_positive_idx == -1 and newest_negative_idx == -1:
            # No clear signal in recent log — assume healthy if process exists
            return True

        if newest_positive_idx == -1:
            # Only negative signals found
            return False

        if newest_negative_idx == -1:
            # Only positive signals found
            return True

        # Both found — the one with the smaller index is MORE RECENT
        # (because we're scanning reversed lines)
        return newest_positive_idx < newest_negative_idx
    except Exception:
        pass

    # If process exists but we can't verify health, treat as healthy
    return True


def count_hermes_processes() -> int:
    """Count total hermes processes (gateway + workers). Alert if too many."""
    result = subprocess.run(
        ["ps", "aux"],
        capture_output=True, text=True, timeout=30,
    )
    lines = [l for l in result.stdout.split("\n")
             if "hermes_cli.main" in l and "grep" not in l]
    return len(lines)


def reap_zombie_workers(max_age_seconds: int = 1800) -> int:
    """Kill hermes chat workers (non-gateway) older than max_age.

    Returns count of reaped processes.
    """
    reaped = 0
    result = subprocess.run(
        ["ps", "aux"],
        capture_output=True, text=True, timeout=30,
    )
    for line in result.stdout.split("\n"):
        if "hermes chat" not in line or "grep" in line:
            continue
        parts = line.split()
        if len(parts) < 2:
            continue
        try:
            pid = int(parts[1])
            # Check process age via /proc or ps
            ps_result = subprocess.run(
                ["ps", "-p", str(pid), "-o", "etime="],
                capture_output=True, text=True, timeout=30,
            )
            elapsed = ps_result.stdout.strip()
            if not elapsed:
                continue

            # Parse elapsed time (formats: MM:SS, HH:MM:SS, D-HH:MM:SS)
            seconds = 0
            if "-" in elapsed:
                days, rest = elapsed.split("-", 1)
                seconds += int(days) * 86400
                elapsed = rest
            parts_time = elapsed.split(":")
            if len(parts_time) == 3:
                seconds += int(parts_time[0]) * 3600 + int(parts_time[1]) * 60 + int(parts_time[2])
            elif len(parts_time) == 2:
                seconds += int(parts_time[0]) * 60 + int(parts_time[1])

            if seconds > max_age_seconds:
                os.kill(pid, 15)  # SIGTERM
                log("REAP", f"Killed stale hermes chat worker PID {pid} (age: {elapsed})")
                reaped += 1
        except (ValueError, ProcessLookupError, OSError):
            continue

    return reaped


# ---- Sandbox reaper ---------------------------------------------------------

def _parse_etime_to_seconds(etime: str) -> int:
    """Parse `ps ... etime=` formats: MM:SS, HH:MM:SS, D-HH:MM:SS."""
    etime = etime.strip()
    if not etime:
        return 0

    seconds = 0
    if "-" in etime:
        days, rest = etime.split("-", 1)
        seconds += int(days) * 86400
        etime = rest

    parts_time = etime.split(":")
    if len(parts_time) == 3:
        seconds += int(parts_time[0]) * 3600 + int(parts_time[1]) * 60 + int(parts_time[2])
    elif len(parts_time) == 2:
        seconds += int(parts_time[0]) * 60 + int(parts_time[1])

    return seconds


def reap_runaway_sandbox_processes(
    max_age_seconds: int = 3600,
    high_cpu_threshold: float = 90.0,
    high_cpu_min_age_seconds: int = 600,
) -> int:
    """Kill runaway Hermes sandbox processes.

    We match on command lines containing "hermes_sandbox_" (temp dirs like
    /var/folders/.../T/hermes_sandbox_xxx/script.py).

    Heuristic kills:
      - any sandbox older than max_age_seconds
      - OR sandbox with CPU >= high_cpu_threshold AND age >= high_cpu_min_age_seconds

    Returns count killed.
    """
    killed = 0

    # Use ps -ax output for reliable `etime` on macOS.
    ps_result = subprocess.run(
        ["ps", "-ax", "-o", "pid=", "-o", "etime=", "-o", "pcpu=", "-o", "command="],
        capture_output=True, text=True, timeout=10,
    )

    for raw in ps_result.stdout.split("\n"):
        line = raw.strip()
        if not line:
            continue
        if "hermes_sandbox_" not in line:
            continue

        # pid etime pcpu command...
        parts = line.split(None, 3)
        if len(parts) < 4:
            continue

        pid_s, etime_s, pcpu_s, cmd = parts
        try:
            pid = int(pid_s)
            pcpu = float(pcpu_s)
            age_s = _parse_etime_to_seconds(etime_s)
        except ValueError:
            continue

        should_kill = (
            age_s >= max_age_seconds
            or (pcpu >= high_cpu_threshold and age_s >= high_cpu_min_age_seconds)
        )
        if not should_kill:
            continue

        try:
            os.kill(pid, 15)  # SIGTERM
            time.sleep(1)
            # If still alive, hard kill.
            try:
                os.kill(pid, 0)
                os.kill(pid, 9)  # SIGKILL
            except ProcessLookupError:
                pass

            log(
                "REAP",
                f"Killed runaway hermes sandbox PID {pid} age={etime_s} pcpu={pcpu:.1f} cmd={cmd[:120]}",
            )
            send_alert(
                f"WARNING: Killed runaway hermes sandbox process PID {pid} (age {etime_s}, CPU {pcpu:.1f}%)."
            )
            killed += 1
        except (ProcessLookupError, PermissionError, OSError):
            continue

    return killed


# ---- Storm detection -------------------------------------------------------

def is_storm(restart_times: list) -> bool:
    """Return True if STORM_THRESHOLD or more restarts occurred in the last STORM_WINDOW_S seconds."""
    cutoff = NOW_TS - STORM_WINDOW_S
    recent = [t for t in restart_times if t >= cutoff]
    return len(recent) >= STORM_THRESHOLD


# ---- Restart ---------------------------------------------------------------

def restart_bot(profile: str) -> bool:
    """Launch the gateway process in the background. Returns True on success.

    Uses a lockfile to prevent concurrent restart attempts from racing.
    """
    lock_path = f"/tmp/hermes-restart-{profile}.lock"
    log_path = f"{HERMES_DIR}/profiles/{profile}/logs/gateway.stdout"

    # Check lockfile — if another restart is in progress (< 60s old), skip
    try:
        if os.path.exists(lock_path):
            lock_age = time.time() - os.path.getmtime(lock_path)
            if lock_age < 60:
                log("SKIP", f"{profile}: restart lockfile exists ({lock_age:.0f}s old), skipping")
                return False
            else:
                log("WARN", f"{profile}: stale lockfile ({lock_age:.0f}s old), removing")
    except OSError:
        pass

    # Create lockfile
    try:
        Path(lock_path).write_text(str(os.getpid()))
    except OSError:
        pass

    # Ensure log directory exists
    Path(log_path).parent.mkdir(parents=True, exist_ok=True)

    try:
        with open(log_path, "a") as log_fh:
            subprocess.Popen(
                [HERMES_VENV, "-m", "hermes_cli.main", "--profile", profile, "gateway", "run"],
                stdout=log_fh,
                stderr=subprocess.STDOUT,
                cwd=HERMES_DIR,
                start_new_session=True,
            )
        # Clean up lockfile on successful launch
        try:
            Path(lock_path).unlink(missing_ok=True)
        except OSError:
            pass
        return True
    except Exception as exc:
        log("ERROR", f"Failed to launch {profile}: {exc}")
        try:
            Path(lock_path).unlink(missing_ok=True)
        except OSError:
            pass
        return False


# ---- Main loop -------------------------------------------------------------

state = load_state()
Path(LOG_FILE).parent.mkdir(parents=True, exist_ok=True)

# --- Pre-flight: system health checks ---
loadavg = get_loadavg()

# Load histogram: append to rolling history file (no alerts, just data)
HISTORY_FILE = Path("/Users/djm/claude-projects/logs/system-load-history.jsonl")
HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
try:
    with open(HISTORY_FILE, "a") as hf:
        hf.write(json.dumps({"ts": NOW_ISO, "load_1m": round(loadavg, 1)}) + "\n")
except OSError:
    pass

# --- Sandbox reaper: kill runaway hermes sandbox processes early ---
# This runs BEFORE overload short-circuit because sandbox runaway can be the cause of load spikes.
killed_sandbox = reap_runaway_sandbox_processes(
    max_age_seconds=3600,
    high_cpu_threshold=90.0,
    high_cpu_min_age_seconds=600,
)
if killed_sandbox > 0:
    log("REAP", f"Reaped {killed_sandbox} runaway hermes sandbox process(es)")

if is_system_overloaded():
    log("WARN", f"System load {loadavg:.1f} > 20 — high load but NOT skipping (bots need restarts most under load)")

# --- Zombie reaper: clean up stale hermes chat workers ---
reaped = reap_zombie_workers(max_age_seconds=1800)
if reaped > 0:
    log("REAP", f"Reaped {reaped} zombie hermes chat worker(s)")

# --- Process count sanity check ---
# NOTE: High process counts are normal — we run many bots. Only alert on
# genuinely extreme numbers that indicate a runaway leak, not routine operation.
total_procs = count_hermes_processes()
if total_procs > 80:
    log("WARN", f"Very high hermes process count: {total_procs} — possible leak")
    send_alert(f"WARNING: {total_procs} hermes processes running — possible leak")

for bot in ALL_BOTS:
    is_required = bot in REQUIRED_BOTS

    if is_healthy(bot):
        log("OK", f"{bot} is running")
        # Reset restart history when bot is healthy (avoids phantom storm after long uptime)
        state.setdefault(bot, {}).pop("restart_times", None)
        state[bot] = state.get(bot, {})
        state[bot]["last_seen"] = NOW_ISO
        continue

    # Check for stuck API errors (model endpoint down) even if bot appears running
    if is_running(bot):
        error_log = Path(HERMES_DIR) / "profiles" / bot / "logs" / "gateway.error.log"
        try:
            if error_log.exists():
                result = subprocess.run(
                    ["tail", "-10", str(error_log)],
                    capture_output=True, text=True, timeout=30,
                )
                recent_errors = result.stdout
                # Count 426 "must update" or consecutive API failures
                api_fail_count = sum(1 for line in recent_errors.split("\n")
                                     if "426" in line or "you must update" in line.lower()
                                     or "API call failed" in line)
                if api_fail_count >= 3:
                    log("API-STUCK", f"{bot}: {api_fail_count} API failures in recent log — bot may need session reset or model update")
                    send_alert(f"WARNING: Bot '{bot}' has {api_fail_count} consecutive API failures. May need model config update or hermes update.")
        except Exception:
            pass

    # Ensure bot_state exists before health/unhealthy checks reference it
    bot_state = state.setdefault(bot, {})

    # Bot is down or unhealthy — distinguish for logging
    if is_running(bot) and not is_healthy(bot):
        # Grace period: if bot was restarted in last 3 min, don't kill it again
        last_restart_ts = bot_state.get("last_restart_ts", 0)
        if NOW_TS - last_restart_ts < 180:
            log("GRACE", f"{bot}: within 3-min grace period after restart, skipping health kill")
        else:
            log("UNHEALTHY", f"{bot}: process alive but not responding — killing before restart")
            # Use ps + grep + kill instead of pkill -f (macOS pkill has the same
            # long-command-line bug as pgrep)
            ps_result = subprocess.run(
                ["ps", "aux"],
                capture_output=True, text=True, timeout=30,
            )
            pattern = f"hermes_cli.main --profile {bot} gateway"
            for line in ps_result.stdout.split("\n"):
                if pattern in line and "grep" not in line:
                    parts = line.split()
                    if len(parts) >= 2:
                        try:
                            os.kill(int(parts[1]), 15)  # SIGTERM
                            log("KILL", f"Sent SIGTERM to {bot} PID {parts[1]}")
                        except (ValueError, ProcessLookupError, OSError):
                            pass
                    break
            time.sleep(2)  # Allow graceful shutdown

    # Bot is down — check for restart storm first
    restart_times: list = bot_state.get("restart_times", [])

    # EDGA-XXXX: Manual restart exemption. If bot is currently running but
    # no restart was recorded by the supervisor in the last 5 minutes,
    # assume an admin manually restarted it. Clear storm state so manual
    # restarts don't count toward the automatic restart threshold.
    if is_running(bot) and restart_times:
        last_supervised_restart = max(restart_times) if restart_times else 0
        if NOW_TS - last_supervised_restart > 300:
            log("INFO", f"{bot}: manual restart detected (no supervised restart in last 5 min) — clearing storm state")
            restart_times = []
            bot_state["restart_times"] = []

    if is_storm(restart_times):
        # Storm: skip restart, alert
        severity = "CRITICAL" if is_required else "WARNING"
        msg = (
            f"{severity}: Hermes bot '{bot}' restart storm detected!\n"
            f"Restarted {STORM_THRESHOLD}+ times in the last 60 min — NOT auto-restarting.\n"
            f"Manual intervention required."
        )
        log("STORM", f"{bot}: storm detected, skipping restart")
        send_alert(msg)
        continue

    # Run preflight check before restart
    try:
        preflight = subprocess.run(
            [PREFLIGHT_SCRIPT, bot],
            capture_output=True, text=True, timeout=10,
        )
        if preflight.returncode != 0:
            reason = preflight.stdout.strip() or preflight.stderr.strip() or "unknown"
            log("SKIP", f"{bot}: preflight failed — {reason}")
            continue
    except Exception as exc:
        log("WARN", f"{bot}: preflight script error — {exc}, proceeding anyway")

    # Restart the bot
    log("RESTART", f"{bot}: not running — attempting restart")
    success = restart_bot(bot)

    if success:
        restart_times.append(NOW_TS)
        # Trim to last 24h to avoid unbounded growth
        cutoff_24h = NOW_TS - 86400
        restart_times = [t for t in restart_times if t >= cutoff_24h]
        bot_state["restart_times"] = restart_times
        bot_state["last_restart"] = NOW_ISO
        bot_state["last_restart_ts"] = NOW_TS

        count_in_window = len([t for t in restart_times if t >= NOW_TS - STORM_WINDOW_S])
        severity = "WARNING" if is_required else "INFO"
        msg = (
            f"{severity}: Hermes bot '{bot}' was down — restarted.\n"
            f"Restart #{count_in_window} in the last 60 min (storm threshold: {STORM_THRESHOLD})."
        )
        log("RESTART", f"{bot}: restart issued (#{count_in_window} in window)")
        if is_required or count_in_window > 1:
            send_alert(msg)
    else:
        error_msg = (
            f"CRITICAL: Hermes bot '{bot}' is down and restart FAILED.\n"
            f"Manual intervention required."
        )
        log("ERROR", f"{bot}: restart failed")
        if is_required:
            send_alert(error_msg)

state["last_check"] = NOW_ISO
save_state(state)
PYTHON
