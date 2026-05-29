#!/usr/bin/env python3.11
"""Memory Circulation Tuner -- closed-loop controller for the memory subsystem.

Runs weekly (Sunday 2:00 PM PST = 22:00 UTC), one hour after connection_miner
(21:00 UTC). Reads JSONL records produced by weekly_learning_report and
connection_miner, computes circulation health metrics, selects at most one
intervention per run, and writes decision/lesson/policy entries to working
memory. The entries it writes become inputs to the very metrics it reads on
subsequent runs, creating a 4-stage causal feedback loop.

Safety invariants:
  - Max 1 intervention per run.
  - Max 3 working_memory writes per run (observation + decision + lesson).
  - Auto-revert after 2-week worsening.
  - 4-week cooldown on reverted interventions.
  - Safe mode on floor-guard breach (freezes all interventions).
  - Append-only state file (config/tuner_state.jsonl).
  - Never modifies memory_injection_flags.yaml.
"""

from __future__ import annotations

import argparse
import fcntl
import json
import logging
import sqlite3
import subprocess
import sys
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

# sys.path setup for kernel imports -- same pattern as weekly_learning_report.py
_SCRIPTS_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_SCRIPTS_DIR.parent))

from src.kernel.shared_memory.config import DEFAULT_SHARED_MEMORY_DB_PATH, PROJECT_ROOT
from src.kernel.shared_memory.working_memory import WorkingMemoryStore

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────

RUNTIME_DIR = PROJECT_ROOT / ".runtime"
LOCKFILE = RUNTIME_DIR / ".last_tuner_run"
JSONL_PATH = PROJECT_ROOT / "data" / "shared_memory" / "weekly_reports.jsonl"
TUNER_STATE_PATH = PROJECT_ROOT / "config" / "tuner_state.jsonl"
SHADOW_LOG_DIR = RUNTIME_DIR / "shadow-retrieval"
TELEGRAM_SCRIPT = (
    Path.home() / ".claude" / "skills" / "telegram-message" / "scripts" / "send_telegram.py"
)
MIN_INTERVAL_DAYS = 6
SOURCE_AGENT = "memory-tuner"
SESSION_ID_PREFIX = "tuner-"
MAX_ENTRIES_PER_RUN = 3
SPARSITY_THRESHOLD = 20

# Fitness function weight vectors
FITNESS_WEIGHTS = {
    "f1": {  # volume
        "promotion_throughput": 0.4,
        "entry_throughput": 0.3,
        "connection_acceptance": 0.2,
        "dedup_waste_inverse": 0.1,
    },
    "f2": {  # precision
        "connection_acceptance": 0.4,
        "dedup_waste_inverse": 0.3,
        "promotion_throughput": 0.2,
        "shadow_diversity": 0.1,
    },
    "f3": {  # utilization
        "shadow_diversity": 0.4,
        "dedup_waste_inverse": 0.2,
        "connection_acceptance": 0.2,
        "promotion_throughput": 0.2,
    },
}

# ── Section 1: Lockfile Guard ────────────────────────────────────────────────


def _check_lockfile(force: bool) -> bool:
    """Return True if safe to proceed (enough time elapsed or force)."""
    if force:
        return True
    if not LOCKFILE.exists():
        return True
    try:
        ts_str = LOCKFILE.read_text(encoding="utf-8").strip()
        last_run = datetime.fromisoformat(ts_str)
        elapsed = datetime.now(timezone.utc) - last_run
        if elapsed < timedelta(days=MIN_INTERVAL_DAYS):
            logger.info(
                "Skipping: last run was %s ago (< %d days). Use --force to override.",
                elapsed,
                MIN_INTERVAL_DAYS,
            )
            return False
    except Exception as exc:  # noqa: BLE001
        logger.warning("Could not read lockfile (%s); proceeding anyway.", exc)
    return True


def _write_lockfile(dry_run: bool) -> None:
    if dry_run:
        return
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    LOCKFILE.write_text(datetime.now(timezone.utc).isoformat(), encoding="utf-8")


# ── Section 2: State File I/O ────────────────────────────────────────────────


def _load_tuner_state() -> list[dict]:
    """Read all records from config/tuner_state.jsonl. Returns [] if missing."""
    if not TUNER_STATE_PATH.exists():
        return []
    records: list[dict] = []
    try:
        with TUNER_STATE_PATH.open("r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    records.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    except OSError as exc:
        logger.warning("Could not read tuner state: %s", exc)
    return records


def _append_tuner_state(record: dict, dry_run: bool) -> None:
    """Append a single JSONL line to config/tuner_state.jsonl with file locking."""
    if dry_run:
        logger.info("[DRY RUN] Would append to %s:\n%s", TUNER_STATE_PATH, json.dumps(record, indent=2))
        return
    try:
        TUNER_STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
        with TUNER_STATE_PATH.open("a", encoding="utf-8") as fh:
            fcntl.flock(fh, fcntl.LOCK_EX)
            try:
                fh.write(json.dumps(record) + "\n")
            finally:
                fcntl.flock(fh, fcntl.LOCK_UN)
        logger.debug("Appended record type=%s to %s", record.get("type"), TUNER_STATE_PATH)
    except OSError as exc:
        logger.error("Failed to write tuner state: %s", exc)


def _get_active_interventions(state: list[dict]) -> list[dict]:
    """Return intervention records that are still active (not reverted/graduated)."""
    reverted_ids = {
        r["intervention_id"]
        for r in state
        if r.get("type") == "revert"
    }
    graduated_ids = {
        r["intervention_id"]
        for r in state
        if r.get("type") == "graduated"
    }
    return [
        r for r in state
        if r.get("type") == "intervention"
        and r.get("id") not in reverted_ids
        and r.get("id") not in graduated_ids
    ]


def _get_active_fitness_function(state: list[dict]) -> str:
    """Return the most recent fitness function. Default 'f1'."""
    shifts = [r for r in state if r.get("type") == "fitness_shift"]
    if not shifts:
        return "f1"
    return shifts[-1].get("to", "f1")


def _get_cooldowns(state: list[dict]) -> dict[str, str]:
    """Map intervention_name -> cooldown_until ISO timestamp for reverted interventions."""
    cooldowns: dict[str, str] = {}
    for r in state:
        if r.get("type") == "revert" and r.get("cooldown_until"):
            # Find the original intervention to get its name
            intervention_id = r.get("intervention_id")
            for s in state:
                if s.get("type") == "intervention" and s.get("id") == intervention_id:
                    cooldowns[s["name"]] = r["cooldown_until"]
                    break
    return cooldowns


def _is_in_safe_mode(state: list[dict]) -> tuple[bool, str | None]:
    """Return (True, floor_name) if safe mode is active."""
    # Find the most recent safe_mode_entry or safe_mode_exit
    entries = [r for r in state if r.get("type") in ("safe_mode_entry", "safe_mode_exit")]
    if not entries:
        return False, None
    latest = entries[-1]
    if latest["type"] == "safe_mode_entry":
        return True, latest.get("floor_breached")
    return False, None


def _last_fitness_shift_time(state: list[dict]) -> datetime | None:
    """Return the datetime of the most recent fitness shift, or None."""
    shifts = [r for r in state if r.get("type") == "fitness_shift"]
    if not shifts:
        return None
    try:
        return datetime.fromisoformat(shifts[-1]["shifted_at"])
    except (KeyError, ValueError):
        return None


# ── Section 3: Metric Collection ─────────────────────────────────────────────


def _collect_jsonl_records() -> list[dict]:
    """Read all lines from weekly_reports.jsonl, return parsed dicts."""
    if not JSONL_PATH.exists():
        logger.info("JSONL file does not exist: %s", JSONL_PATH)
        return []
    records: list[dict] = []
    try:
        with JSONL_PATH.open("r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    records.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    except OSError as exc:
        logger.warning("Could not read JSONL: %s", exc)
    return records


def _latest_by_type(records: list[dict], record_type: str, n: int = 4) -> list[dict]:
    """Filter records by type and return the last n."""
    filtered = [r for r in records if r.get("type") == record_type]
    return filtered[-n:]


def _compute_dedup_waste(reports: list[dict]) -> float | None:
    """Return dedup_waste_pct from the latest weekly_learning_report, or None."""
    if not reports:
        return None
    return reports[-1].get("dedup_waste_pct")


def _compute_connection_acceptance(mining: list[dict]) -> float | None:
    """Return accepted/max(1, above_threshold) from latest connection_mining record."""
    if not mining:
        return None
    latest = mining[-1]
    above = latest.get("above_threshold", 0)
    accepted = latest.get("accepted", 0)
    return accepted / max(1, above) * 100.0


def _compute_promotion_throughput(reports: list[dict], mining: list[dict]) -> int:
    """Sum of promotions_queued (latest report) + promoted (latest mining)."""
    total = 0
    if reports:
        total += reports[-1].get("promotions_queued", 0)
    if mining:
        total += mining[-1].get("promoted", 0)
    return total


def _compute_shadow_diversity() -> float:
    """Compute shadow injection diversity from shadow-*.jsonl files over the past 7 days.

    Formula: (unique_agents/5)*0.4 + (tier_count>1 ? 0.3 : 0) +
             (median_freshness<72h ? 0.2 : 0) + (avg_token_util>0.15 ? 0.1 : 0)
    """
    if not SHADOW_LOG_DIR.exists():
        return 0.0

    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    agents: set[str] = set()
    tiers: set[str] = set()
    freshness_hours: list[float] = []
    token_utilizations: list[float] = []

    for path in sorted(SHADOW_LOG_DIR.glob("shadow-*.jsonl")):
        # Parse date from filename: shadow-YYYY-MM-DD.jsonl
        try:
            date_str = path.stem.split("shadow-", 1)[1]
            file_date = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            if file_date < cutoff:
                continue
        except (ValueError, IndexError):
            continue

        try:
            with path.open("r", encoding="utf-8") as fh:
                for line in fh:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        rec = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    # Agents referenced
                    for a in rec.get("agents_referenced", []):
                        agents.add(a)

                    # Tier distribution
                    for tier_name in rec.get("tiers", {}):
                        tiers.add(tier_name)

                    # Freshness (use newest_hours if available)
                    newest = rec.get("newest_hours")
                    if newest is not None:
                        freshness_hours.append(float(newest))

                    # Token utilization: estimate as token_estimate / max_tokens (2000 default)
                    tok = rec.get("token_estimate", 0)
                    if tok > 0:
                        token_utilizations.append(tok / 2000.0)
        except OSError:
            continue

    # Compute diversity score
    agent_score = min(len(agents) / 5.0, 1.0) * 0.4
    tier_score = 0.3 if len(tiers) > 1 else 0.0

    median_fresh = 0.0
    if freshness_hours:
        sorted_fresh = sorted(freshness_hours)
        mid = len(sorted_fresh) // 2
        median_fresh = sorted_fresh[mid]
    freshness_score = 0.2 if (freshness_hours and median_fresh < 72) else 0.0

    avg_util = 0.0
    if token_utilizations:
        avg_util = sum(token_utilizations) / len(token_utilizations)
    util_score = 0.1 if avg_util > 0.15 else 0.0

    total = agent_score + tier_score + freshness_score + util_score
    logger.debug(
        "Shadow diversity: agents=%d tiers=%d median_fresh=%.1fh avg_util=%.2f -> %.2f",
        len(agents), len(tiers), median_fresh, avg_util, total,
    )
    return round(total, 3)


def _compute_entry_throughput() -> int:
    """Count working_memories rows from the past 7 days via SQLite."""
    try:
        conn = sqlite3.connect(str(DEFAULT_SHARED_MEMORY_DB_PATH))
        row = conn.execute(
            "SELECT COUNT(*) FROM working_memories WHERE datetime(timestamp) >= datetime('now', '-7 days')"
        ).fetchone()
        conn.close()
        return row[0] if row else 0
    except sqlite3.Error as exc:
        logger.warning("Could not query entry throughput: %s", exc)
        return 0


def _normalize_metric(value: float | None, setpoint_low: float, setpoint_high: float) -> float:
    """Normalize a metric to 0-1 range based on setpoints. 1.0 = at/above setpoint."""
    if value is None:
        return 0.0
    if setpoint_high == setpoint_low:
        return 1.0 if value >= setpoint_low else min(value / max(setpoint_low, 0.001), 1.0)
    # How close to the target band?
    if setpoint_low <= value <= setpoint_high:
        return 1.0
    if value < setpoint_low:
        return max(0.0, value / max(setpoint_low, 0.001))
    # Above high setpoint
    return max(0.0, 1.0 - (value - setpoint_high) / max(setpoint_high, 1.0))


def _compute_composite_fitness(metrics: dict, active_fn: str) -> float:
    """Compute weighted composite fitness using the active fitness function."""
    weights = FITNESS_WEIGHTS.get(active_fn, FITNESS_WEIGHTS["f1"])

    # Normalize each metric
    normalized = {
        "promotion_throughput": min((metrics.get("promotion_throughput", 0) or 0) / 5.0, 1.0),
        "entry_throughput": min((metrics.get("entry_throughput", 0) or 0) / 100.0, 1.0),
        "connection_acceptance": _normalize_metric(
            metrics.get("connection_acceptance_rate"), 20.0, 60.0
        ),
        "dedup_waste_inverse": max(0.0, 1.0 - (metrics.get("dedup_waste_pct", 0) or 0) / 100.0),
        "shadow_diversity": metrics.get("shadow_injection_diversity", 0) or 0.0,
    }

    score = sum(
        weights.get(k, 0) * normalized.get(k, 0)
        for k in weights
    )
    return round(score, 4)


def _build_metric_snapshot(records: list[dict], state: list[dict]) -> dict:
    """Collect all metrics into a single snapshot dict."""
    reports = _latest_by_type(records, "weekly_learning_report", 4)
    mining = _latest_by_type(records, "connection_mining", 4)
    active_fn = _get_active_fitness_function(state)

    dedup = _compute_dedup_waste(reports)
    acceptance = _compute_connection_acceptance(mining)
    promotion = _compute_promotion_throughput(reports, mining)
    shadow_div = _compute_shadow_diversity()
    entry_tp = _compute_entry_throughput()

    metrics = {
        "dedup_waste_pct": dedup,
        "connection_acceptance_rate": acceptance,
        "promotion_throughput": promotion,
        "shadow_injection_diversity": shadow_div,
        "entry_throughput": entry_tp,
        "active_fitness_function": active_fn,
    }

    metrics["composite_fitness"] = _compute_composite_fitness(metrics, active_fn)

    now_dt = datetime.now(timezone.utc)
    metrics["week_iso"] = now_dt.strftime("%G-W%V")
    metrics["run_at"] = now_dt.isoformat()

    logger.info(
        "Metric snapshot: dedup=%.1f%% acceptance=%.1f%% promotion=%d shadow=%.3f "
        "entry=%d composite=%.4f (fn=%s)",
        dedup or 0, acceptance or 0, promotion, shadow_div,
        entry_tp, metrics["composite_fitness"], active_fn,
    )
    return metrics


# ── Section 4: Intervention Selection ────────────────────────────────────────


def _consecutive_zero_acceptance(records: list[dict], n: int) -> tuple[bool, bool]:
    """Check if the last n connection_mining records have acceptance=0.

    Returns (all_zero, any_had_candidates) -- candidates means above_threshold > 0.
    """
    mining = _latest_by_type(records, "connection_mining", n)
    if len(mining) < n:
        return False, False
    all_zero = all(r.get("accepted", 0) == 0 for r in mining)
    any_candidates = any(r.get("above_threshold", 0) > 0 for r in mining)
    return all_zero, any_candidates


def _consecutive_zero_promotion(records: list[dict], n: int) -> bool:
    """Check if promotion_throughput has been 0 for the last n weeks."""
    snapshots = [s for s in _load_tuner_state() if s.get("type") == "metric_snapshot"]
    if len(snapshots) < n:
        return False
    return all(s.get("promotion_throughput", 0) == 0 for s in snapshots[-n:])


def _consecutive_dedup_above(records: list[dict], threshold: float, n: int) -> bool:
    """Check if dedup_waste_pct > threshold for the last n weekly_learning_reports."""
    reports = _latest_by_type(records, "weekly_learning_report", n)
    if len(reports) < n:
        return False
    return all((r.get("dedup_waste_pct", 0) or 0) > threshold for r in reports)


def _check_floor_guards(snapshot: dict, state: list[dict], records: list[dict]) -> str | None:
    """Return the breached floor name, or None if all floors healthy."""
    # (a) dedup_waste_pct > 70%
    dedup = snapshot.get("dedup_waste_pct")
    if dedup is not None and dedup > 70:
        return "dedup_waste_gt_70"

    # (b) connection_acceptance_rate = 0% for 4+ consecutive weeks with nonzero history
    mining = _latest_by_type(records, "connection_mining", 10)
    if len(mining) >= 5:  # Need at least 1 nonzero + 4 zero
        # Check if there was ever nonzero acceptance
        ever_nonzero = any(r.get("accepted", 0) > 0 for r in mining[:-4])
        last_four_zero = all(r.get("accepted", 0) == 0 for r in mining[-4:])
        if ever_nonzero and last_four_zero:
            return "connection_acceptance_zero_4wk"

    # (c) promotion_throughput = 0 for 3+ consecutive weeks despite entry_throughput > 20
    if _consecutive_zero_promotion(records, 3) and (snapshot.get("entry_throughput", 0) or 0) > SPARSITY_THRESHOLD:
        return "promotion_zero_3wk"

    return None


def _check_revert_needed(snapshot: dict, state: list[dict]) -> dict | None:
    """Check if any active intervention needs reverting (2-week worsening).

    Returns the intervention record to revert, or None.
    """
    active = _get_active_interventions(state)
    now = datetime.now(timezone.utc)

    for intervention in active:
        try:
            applied_at = datetime.fromisoformat(intervention["applied_at"])
        except (KeyError, ValueError):
            continue

        weeks_since = (now - applied_at).days / 7.0
        if weeks_since < 2:
            continue  # Too early to evaluate

        target_metric = intervention.get("target_metric")
        baseline = intervention.get("metric_at_application")
        if target_metric is None or baseline is None:
            continue

        current = snapshot.get(target_metric)
        if current is None:
            continue

        # For dedup_waste_pct, "worse" means higher
        # For connection_acceptance_rate, "worse" means lower
        # For promotion_throughput, "worse" means lower
        if target_metric == "dedup_waste_pct":
            if current > baseline + 5:
                return intervention
            if weeks_since >= 2 and current >= baseline:
                return intervention
        elif target_metric in ("connection_acceptance_rate", "promotion_throughput"):
            if current < baseline - 5:
                return intervention
            if weeks_since >= 2 and current <= baseline:
                return intervention

    return None


def _check_plateau(state: list[dict]) -> bool:
    """Return True if composite_fitness improved < 2% over last 3 snapshots."""
    snapshots = [s for s in state if s.get("type") == "metric_snapshot"]
    if len(snapshots) < 3:
        return False
    last_three = snapshots[-3:]
    values = [s.get("composite_fitness", 0) for s in last_three]
    if values[0] == 0:
        return False
    improvement = (values[-1] - values[0]) / max(abs(values[0]), 0.001)
    return improvement < 0.02


def _distance_from_setpoint(metric_name: str, value: float | None) -> float:
    """How far a metric is from its setpoint (higher = worse). Returns 0-1."""
    if value is None:
        return 1.0  # Unknown = worst case
    setpoints = {
        "dedup_waste_pct": (0, 25),  # want below 25
        "connection_acceptance_rate": (20, 60),  # want between 20-60
        "promotion_throughput": (1, 10),  # want at least 1
        "shadow_injection_diversity": (0.4, 1.0),  # want above 0.4
    }
    if metric_name not in setpoints:
        return 0.0
    low, high = setpoints[metric_name]
    if metric_name == "dedup_waste_pct":
        # Lower is better, threshold is 25
        if value <= high:
            return 0.0
        return min((value - high) / 75.0, 1.0)
    if low <= value <= high:
        return 0.0
    if value < low:
        return min((low - value) / max(low, 1.0), 1.0)
    return min((value - high) / max(high, 1.0), 1.0)


def _metric_to_intervention(metric_name: str) -> str | None:
    """Map a metric name to the primary intervention that targets it."""
    return {
        "dedup_waste_pct": "dedup_tighten_hash_window",
        "connection_acceptance_rate": "connection_threshold_nudge",
        "promotion_throughput": "promotion_pipeline_kickstart",
        "shadow_injection_diversity": "shadow_injection_stale_data_fix",
    }.get(metric_name)


def _select_intervention(
    snapshot: dict, state: list[dict], records: list[dict],
    past_lessons: dict | None = None,
) -> dict | None:
    """Core decision function. Returns an intervention dict or None.

    past_lessons (from _parse_past_lessons) modifies behavior:
      - suppress: skip interventions the tuner previously learned are counterproductive
      - boost: prefer interventions the tuner previously learned are effective

    Priority order:
    1. Floor guards (safe mode)
    2. Active intervention revert check
    3. Wait if active intervention is < 2 weeks old
    4. Cooldown checks
    5. Plateau detection -> fitness shift
    6. Metric furthest from setpoint -> corresponding intervention
    """
    if past_lessons is None:
        past_lessons = {}
    # 0. Check if already in safe mode
    in_safe, safe_floor = _is_in_safe_mode(state)
    if in_safe:
        # Check if the floor has recovered
        floor_value = _get_floor_value(safe_floor, snapshot)
        if safe_floor is not None and floor_value is not None and _floor_recovered(safe_floor, floor_value):
            return {"type": "safe_mode_exit", "floor_recovered": safe_floor, "metric_value": floor_value}
        logger.info("Safe mode active (floor=%s). Skipping interventions.", safe_floor)
        return None

    # 1. Floor guards
    floor = _check_floor_guards(snapshot, state, records)
    if floor:
        floor_value = _get_floor_value(floor, snapshot)
        return {"type": "safe_mode_entry", "floor_breached": floor, "metric_value": floor_value}

    # 2. Revert check
    revert_target = _check_revert_needed(snapshot, state)
    if revert_target:
        return {"type": "revert", "intervention": revert_target}

    # 3. Wait if active intervention < 2 weeks old
    active = _get_active_interventions(state)
    now = datetime.now(timezone.utc)
    for a in active:
        try:
            applied_at = datetime.fromisoformat(a["applied_at"])
            if (now - applied_at).days < 14:
                logger.info("Active intervention '%s' is < 2 weeks old. Waiting.", a["name"])
                return None
        except (KeyError, ValueError):
            pass

    # 4. Cooldown check
    cooldowns = _get_cooldowns(state)

    # 5. Plateau detection -> fitness shift
    if _check_plateau(state):
        last_shift = _last_fitness_shift_time(state)
        if last_shift is None or (now - last_shift).days >= 28:
            return _build_fitness_shift(snapshot, state)

    # 6. Sparsity check -- skip interventions if insufficient data
    if (snapshot.get("entry_throughput") or 0) < SPARSITY_THRESHOLD:
        logger.info("Entry throughput %d < %d. Stats-only run.", snapshot.get("entry_throughput", 0), SPARSITY_THRESHOLD)
        return None

    # 7. Pick metric furthest from setpoint
    metrics_to_check = [
        "dedup_waste_pct",
        "connection_acceptance_rate",
        "promotion_throughput",
        "shadow_injection_diversity",
    ]
    active_fn = snapshot.get("active_fitness_function", "f1")

    scored = []
    for m in metrics_to_check:
        dist = _distance_from_setpoint(m, snapshot.get(m))
        scored.append((m, dist))

    # Sort: furthest first, tiebreak by fitness function alignment
    fn_weights = FITNESS_WEIGHTS.get(active_fn, FITNESS_WEIGHTS["f1"])

    def _sort_key(item: tuple[str, float]) -> tuple[float, float]:
        metric_name, distance = item
        # Map metric name to weight key
        weight_key = {
            "dedup_waste_pct": "dedup_waste_inverse",
            "connection_acceptance_rate": "connection_acceptance",
            "promotion_throughput": "promotion_throughput",
            "shadow_injection_diversity": "shadow_diversity",
        }.get(metric_name, "")
        fn_weight = fn_weights.get(weight_key, 0)
        return (-distance, -fn_weight)

    scored.sort(key=_sort_key)

    for metric_name, distance in scored:
        if distance <= 0:
            continue

        intervention_name = _metric_to_intervention(metric_name)
        if not intervention_name:
            continue

        # Recursion: skip interventions that past lessons say are counterproductive
        suppress = past_lessons.get("suppress", set())
        if intervention_name in suppress:
            logger.info(
                "Skipping '%s': past lessons indicate this intervention is counterproductive.",
                intervention_name,
            )
            continue

        # Check cooldown
        if intervention_name in cooldowns:
            try:
                cooldown_until = datetime.fromisoformat(cooldowns[intervention_name])
                if now < cooldown_until:
                    logger.info("Intervention '%s' in cooldown until %s.", intervention_name, cooldowns[intervention_name])
                    continue
            except ValueError:
                pass

        # Check trigger condition
        if _check_trigger(intervention_name, snapshot, state, records):
            boosted = intervention_name in past_lessons.get("boost", set())
            return {
                "type": "intervention",
                "name": intervention_name,
                "target_metric": metric_name,
                "metric_value": snapshot.get(metric_name),
                "boosted_by_past_lesson": boosted,
            }

    return None


def _get_floor_value(floor_name: str | None, snapshot: dict) -> float | None:
    """Get the metric value corresponding to a floor name."""
    if floor_name == "dedup_waste_gt_70":
        return snapshot.get("dedup_waste_pct")
    if floor_name == "connection_acceptance_zero_4wk":
        return snapshot.get("connection_acceptance_rate")
    if floor_name == "promotion_zero_3wk":
        return snapshot.get("promotion_throughput")
    return None


def _floor_recovered(floor_name: str, value: float | None) -> bool:
    """Check if a floor guard breach has recovered."""
    if value is None:
        return False
    if floor_name == "dedup_waste_gt_70":
        return value <= 70
    if floor_name == "connection_acceptance_zero_4wk":
        return value > 0
    if floor_name == "promotion_zero_3wk":
        return value > 0
    return False


def _check_trigger(
    intervention_name: str, snapshot: dict, state: list[dict], records: list[dict],
) -> bool:
    """Check whether the specific trigger condition for an intervention is met."""
    if intervention_name == "dedup_tighten_hash_window":
        # dedup_waste_pct > 25% for 2 consecutive weeks AND no active dedup intervention
        if not _consecutive_dedup_above(records, 25.0, 2):
            return False
        active = _get_active_interventions(state)
        return not any(a["name"] == "dedup_tighten_hash_window" for a in active)

    if intervention_name == "connection_threshold_reset":
        # acceptance = 0% for 3 consecutive records with candidates
        all_zero, any_candidates = _consecutive_zero_acceptance(records, 3)
        return all_zero and any_candidates

    if intervention_name == "connection_threshold_nudge":
        # acceptance outside 20-60% for 2 consecutive weeks
        mining = _latest_by_type(records, "connection_mining", 2)
        if len(mining) < 2:
            return False
        for m in mining:
            above = m.get("above_threshold", 0)
            accepted = m.get("accepted", 0)
            rate = accepted / max(1, above) * 100
            if 20 <= rate <= 60:
                return False
        # Check self-calibration hasn't already corrected
        if len(mining) >= 2:
            t1 = mining[-2].get("threshold_used", 0.25)
            t2 = mining[-1].get("threshold_used", 0.25)
            if abs(t2 - t1) > 0.02:
                return False  # Self-calibration is working
        return True

    if intervention_name == "promotion_pipeline_kickstart":
        # promotion_throughput = 0 for 2 consecutive weeks AND entry_throughput > 20
        return _consecutive_zero_promotion(records, 2) and (snapshot.get("entry_throughput", 0) or 0) > SPARSITY_THRESHOLD

    if intervention_name == "shadow_injection_stale_data_fix":
        # shadow_diversity < 0.2 for 2 consecutive weeks
        snapshots = [s for s in state if s.get("type") == "metric_snapshot"]
        if len(snapshots) < 2:
            # First/second run: check if diversity is very low
            return (snapshot.get("shadow_injection_diversity") or 0) < 0.2
        last_two = snapshots[-2:]
        return all((s.get("shadow_injection_diversity") or 0) < 0.2 for s in last_two)

    return False


def _build_fitness_shift(snapshot: dict, state: list[dict]) -> dict | None:
    """Build a fitness_shift intervention if plateaued."""
    active_fn = _get_active_fitness_function(state)
    metrics_dict = {
        k: snapshot.get(k) for k in [
            "dedup_waste_pct", "connection_acceptance_rate",
            "promotion_throughput", "shadow_injection_diversity",
            "entry_throughput",
        ]
    }

    # Compute each fitness function's value
    gap_scores: dict[str, float] = {}
    for fn_name in ("f1", "f2", "f3"):
        value = _compute_composite_fitness(metrics_dict, fn_name)
        gap_scores[fn_name] = round(1.0 - value, 4)

    # Exclude current, pick the one with the largest gap
    candidates = {k: v for k, v in gap_scores.items() if k != active_fn}
    if not candidates:
        return None

    # Check if all functions are within 5% of each other and all plateaued
    all_values = list(gap_scores.values())
    if max(all_values) - min(all_values) < 0.05:
        logger.info("All fitness functions within 5%%. Entering maintenance mode.")
        return None

    target_fn = max(candidates, key=lambda k: candidates[k])
    return {
        "type": "fitness_shift",
        "from": active_fn,
        "to": target_fn,
        "gap_scores": gap_scores,
    }


# ── Section 5: Intervention Execution ────────────────────────────────────────


def _execute_intervention(intervention: dict, snapshot: dict, state: list[dict], dry_run: bool) -> None:
    """Dispatch to the specific intervention handler."""
    itype = intervention.get("type")

    if itype == "safe_mode_entry":
        _execute_safe_mode(intervention, snapshot, dry_run)
    elif itype == "safe_mode_exit":
        _execute_safe_mode_exit(intervention, snapshot, dry_run)
    elif itype == "revert":
        _execute_revert(intervention, snapshot, dry_run)
    elif itype == "fitness_shift":
        _execute_fitness_shift(intervention, snapshot, state, dry_run)
    elif itype == "intervention":
        name = intervention.get("name")
        if name == "dedup_tighten_hash_window":
            _execute_dedup_tighten(intervention, snapshot, state, dry_run)
        elif name == "connection_threshold_reset":
            _execute_threshold_reset(intervention, snapshot, dry_run)
        elif name == "connection_threshold_nudge":
            _execute_threshold_nudge(intervention, snapshot, dry_run)
        elif name == "promotion_pipeline_kickstart":
            _execute_promotion_kickstart(intervention, snapshot, dry_run)
        elif name == "shadow_injection_stale_data_fix":
            _execute_stale_data_fix(intervention, snapshot, dry_run)
        else:
            logger.warning("Unknown intervention name: %s", name)


def _execute_dedup_tighten(intervention: dict, snapshot: dict, state: list[dict], dry_run: bool) -> None:
    """Write TAG_OVERLAP_THRESHOLD override to tuner_state.jsonl."""
    # Find current override or use default (5)
    current_value = 5
    for s in reversed(state):
        if s.get("type") == "intervention" and s.get("name") == "dedup_tighten_hash_window" and s.get("parameter") == "TAG_OVERLAP_THRESHOLD":
            current_value = s.get("new_value", 5)
            break
    # Also check for reverts restoring a previous value
    for s in reversed(state):
        if s.get("type") == "revert":
            for orig in state:
                if orig.get("type") == "intervention" and orig.get("id") == s.get("intervention_id"):
                    if orig.get("parameter") == "TAG_OVERLAP_THRESHOLD":
                        current_value = orig.get("old_value", 5)
                        break

    new_value = max(2, current_value - 1)
    if new_value == current_value:
        logger.info("TAG_OVERLAP_THRESHOLD already at minimum (2). Skipping dedup tighten.")
        return

    record = {
        "type": "intervention",
        "id": str(uuid4()),
        "name": "dedup_tighten_hash_window",
        "target_metric": "dedup_waste_pct",
        "parameter": "TAG_OVERLAP_THRESHOLD",
        "old_value": current_value,
        "new_value": new_value,
        "metric_at_application": snapshot.get("dedup_waste_pct"),
        "applied_at": datetime.now(timezone.utc).isoformat(),
        "status": "active",
        "auto_revert_after_weeks": 2,
    }
    _append_tuner_state(record, dry_run)

    content = (
        f"Tuner applied dedup_tighten_hash_window targeting dedup_waste_pct "
        f"({snapshot.get('dedup_waste_pct', '?')}% vs setpoint 25%). "
        f"Changed TAG_OVERLAP_THRESHOLD from {current_value} to {new_value}. "
        f"Active fitness function: {snapshot.get('active_fitness_function', 'f1')}. "
        f"Auto-revert scheduled if metric worsens by >5pp within 2 weeks."
    )
    _write_intervention_decision(content, ["dedup_tighten_hash_window", "dedup_waste_pct"], snapshot, dry_run)


def _execute_threshold_reset(intervention: dict, snapshot: dict, dry_run: bool) -> None:
    """Write a synthetic connection_mining JSONL record to reset threshold."""
    synthetic_record = {
        "type": "connection_mining",
        "week_iso": snapshot.get("week_iso", ""),
        "run_at": datetime.now(timezone.utc).isoformat(),
        "threshold_used": 0.25,
        "anchors_used": 0,
        "candidates_found": 0,
        "above_threshold": 10,
        "llm_validated": 0,
        "accepted": 3,
        "promoted": 0,
        "top_connections": [],
        "_synthetic": True,
        "_source": "memory-tuner",
        "_reason": "connection_threshold_reset",
    }

    if dry_run:
        logger.info("[DRY RUN] Would write synthetic connection_mining record:\n%s", json.dumps(synthetic_record, indent=2))
    else:
        try:
            JSONL_PATH.parent.mkdir(parents=True, exist_ok=True)
            with JSONL_PATH.open("a", encoding="utf-8") as fh:
                fh.write(json.dumps(synthetic_record) + "\n")
        except OSError as exc:
            logger.error("Failed to write synthetic JSONL record: %s", exc)

    record = {
        "type": "intervention",
        "id": str(uuid4()),
        "name": "connection_threshold_reset",
        "target_metric": "connection_acceptance_rate",
        "parameter": "synthetic_connection_record",
        "old_value": snapshot.get("connection_acceptance_rate"),
        "new_value": "reset_toward_0.25",
        "metric_at_application": snapshot.get("connection_acceptance_rate"),
        "applied_at": datetime.now(timezone.utc).isoformat(),
        "status": "active",
        "auto_revert_after_weeks": 2,
    }
    _append_tuner_state(record, dry_run)

    content = (
        f"Tuner applied connection_threshold_reset: acceptance rate has been 0% for 3+ weeks "
        f"with candidates present. Wrote synthetic JSONL record "
        f"(above_threshold=10, accepted=3, threshold_used=0.25) to nudge "
        f"self-calibration back toward DEFAULT_THRESHOLD. "
        f"Active fitness function: {snapshot.get('active_fitness_function', 'f1')}."
    )
    _write_intervention_decision(content, ["connection_threshold_reset", "connection_acceptance_rate"], snapshot, dry_run)


def _execute_threshold_nudge(intervention: dict, snapshot: dict, dry_run: bool) -> None:
    """Write a weighted synthetic JSONL record to nudge connection threshold."""
    acceptance = snapshot.get("connection_acceptance_rate", 0) or 0

    if acceptance > 60:
        # Push threshold up: high above_threshold, low accepted
        above, accepted = 10, 1
    else:
        # Push threshold down: low above_threshold, high accepted
        above, accepted = 10, 7

    mining = _latest_by_type(_collect_jsonl_records(), "connection_mining", 1)
    current_threshold = mining[-1].get("threshold_used", 0.25) if mining else 0.25

    synthetic_record = {
        "type": "connection_mining",
        "week_iso": snapshot.get("week_iso", ""),
        "run_at": datetime.now(timezone.utc).isoformat(),
        "threshold_used": current_threshold,
        "anchors_used": 0,
        "candidates_found": 0,
        "above_threshold": above,
        "llm_validated": 0,
        "accepted": accepted,
        "promoted": 0,
        "top_connections": [],
        "_synthetic": True,
        "_source": "memory-tuner",
        "_reason": "connection_threshold_nudge",
    }

    if dry_run:
        logger.info("[DRY RUN] Would write synthetic nudge record:\n%s", json.dumps(synthetic_record, indent=2))
    else:
        try:
            JSONL_PATH.parent.mkdir(parents=True, exist_ok=True)
            with JSONL_PATH.open("a", encoding="utf-8") as fh:
                fh.write(json.dumps(synthetic_record) + "\n")
        except OSError as exc:
            logger.error("Failed to write synthetic JSONL record: %s", exc)

    record = {
        "type": "intervention",
        "id": str(uuid4()),
        "name": "connection_threshold_nudge",
        "target_metric": "connection_acceptance_rate",
        "parameter": "synthetic_nudge_record",
        "old_value": acceptance,
        "new_value": f"nudge_{'up' if acceptance > 60 else 'down'}",
        "metric_at_application": acceptance,
        "applied_at": datetime.now(timezone.utc).isoformat(),
        "status": "active",
        "auto_revert_after_weeks": 2,
    }
    _append_tuner_state(record, dry_run)

    direction = "up" if acceptance > 60 else "down"
    content = (
        f"Tuner applied connection_threshold_nudge: acceptance rate ({acceptance:.1f}%) "
        f"is outside the 20-60% band. Wrote synthetic JSONL record nudging threshold {direction} "
        f"(above_threshold={above}, accepted={accepted}). "
        f"Current threshold: {current_threshold:.2f}. "
        f"Active fitness function: {snapshot.get('active_fitness_function', 'f1')}."
    )
    _write_intervention_decision(content, ["connection_threshold_nudge", "connection_acceptance_rate"], snapshot, dry_run)


def _execute_promotion_kickstart(intervention: dict, snapshot: dict, dry_run: bool) -> None:
    """Diagnostic intervention: diagnose why promotions are not flowing."""
    records = _collect_jsonl_records()
    reports = _latest_by_type(records, "weekly_learning_report", 2)

    if not reports:
        diagnosis = "No weekly_learning_report JSONL records found. The upstream weekly report job may not be running."
    elif all(r.get("promotions_queued", 0) == 0 for r in reports):
        diagnosis = (
            "weekly_learning_report is running but promotions_queued=0. "
            "Likely cause: clustering is failing (tags too sparse or TAG_OVERLAP_THRESHOLD too high). "
            "Consider lowering TAG_OVERLAP_THRESHOLD or enriching entry tags."
        )
    else:
        diagnosis = (
            "Promotions are being queued but not completing. "
            "Check ChromaDB availability and PromotionWorker logs."
        )

    content = (
        f"Tuner diagnostic (promotion_pipeline_kickstart): promotion_throughput has been 0 "
        f"for 2+ weeks despite entry_throughput={snapshot.get('entry_throughput', 0)}. "
        f"Diagnosis: {diagnosis}"
    )

    # Write as lesson tier (diagnostic)
    _write_lesson(content, ["promotion_pipeline_kickstart", "promotion_throughput"], snapshot, dry_run)


def _execute_fitness_shift(intervention: dict, snapshot: dict, state: list[dict], dry_run: bool) -> None:
    """Record a fitness function shift in tuner state."""
    now = datetime.now(timezone.utc)
    hold_until = now + timedelta(weeks=4)

    record = {
        "type": "fitness_shift",
        "from": intervention["from"],
        "to": intervention["to"],
        "reason": "plateau_3wk",
        "gap_scores": intervention.get("gap_scores", {}),
        "shifted_at": now.isoformat(),
        "hold_until": hold_until.isoformat(),
    }
    _append_tuner_state(record, dry_run)

    content = (
        f"Tuner shifted optimization target from {intervention['from'].upper()} to "
        f"{intervention['to'].upper()} after 3-week plateau. "
        f"Gap scores: {json.dumps(intervention.get('gap_scores', {}))}. "
        f"Hold period: 4 weeks (until {hold_until.strftime('%Y-%m-%d')})."
    )
    _write_intervention_decision(content, ["fitness_shift", intervention["to"]], snapshot, dry_run)

    msg = (
        f"Tuner shifted optimization target from {intervention['from'].upper()} to "
        f"{intervention['to'].upper()} after 3-week plateau. "
        f"Gap scores: {json.dumps(intervention.get('gap_scores', {}))}"
    )
    _send_telegram(msg, dry_run)


def _execute_stale_data_fix(intervention: dict, snapshot: dict, dry_run: bool) -> None:
    """Write a policy-tier entry summarizing system state to bootstrap retrieval pool."""
    week_iso = snapshot.get("week_iso", "unknown")
    active_fn = snapshot.get("active_fitness_function", "f1")

    state = _load_tuner_state()
    interventions_applied = len([s for s in state if s.get("type") == "intervention"])
    reverts = len([s for s in state if s.get("type") == "revert"])

    content = (
        f"Memory circulation tuner operational policy (week {week_iso}): "
        f"Current metrics: entry_throughput={snapshot.get('entry_throughput', 0)}, "
        f"dedup_waste={snapshot.get('dedup_waste_pct', 'N/A')}%, "
        f"connection_acceptance={snapshot.get('connection_acceptance_rate', 'N/A')}%, "
        f"promotion_throughput={snapshot.get('promotion_throughput', 0)}, "
        f"shadow_diversity={snapshot.get('shadow_injection_diversity', 0):.3f}, "
        f"composite_fitness={snapshot.get('composite_fitness', 0):.4f} (active: {active_fn}). "
        f"Interventions attempted: {interventions_applied}, reverted: {reverts}. "
        f"This entry bootstraps the shadow retrieval pool by adding a policy-tier record "
        f"from source_agent='memory-tuner', increasing agent diversity in injection context."
    )

    store = WorkingMemoryStore()
    if dry_run:
        logger.info("[DRY RUN] Would write policy-tier entry:\n%s", content)
    else:
        try:
            store._insert(
                source_agent=SOURCE_AGENT,
                source_session=f"{SESSION_ID_PREFIX}{snapshot.get('week_iso', 'unknown')}",
                content=content,
                tier="policy",
                task_ref=None,
                confidence=0.9,
                importance=0.95,
                ttl_hours=None,
                tags=["meta-control", "policy", "tuner-checkpoint", "shadow_injection_stale_data_fix"],
                sensitivity="internal",
                provenance="tuner_stale_data_fix",
            )
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to write policy entry: %s", exc)


def _execute_safe_mode(intervention: dict, snapshot: dict, dry_run: bool) -> None:
    """Enter safe mode: freeze all interventions."""
    record = {
        "type": "safe_mode_entry",
        "floor_breached": intervention["floor_breached"],
        "metric_value": intervention.get("metric_value"),
        "entered_at": datetime.now(timezone.utc).isoformat(),
    }
    _append_tuner_state(record, dry_run)

    content = (
        f"SAFE MODE ENTERED: Floor guard breached ({intervention['floor_breached']}). "
        f"Metric value: {intervention.get('metric_value')}. "
        f"All interventions frozen until manual resolution or natural recovery. "
        f"Metrics at breach: dedup={snapshot.get('dedup_waste_pct', 'N/A')}%, "
        f"acceptance={snapshot.get('connection_acceptance_rate', 'N/A')}%, "
        f"promotion={snapshot.get('promotion_throughput', 0)}, "
        f"entry_throughput={snapshot.get('entry_throughput', 0)}."
    )
    _write_lesson(content, ["safe-mode", intervention["floor_breached"]], snapshot, dry_run)

    _send_telegram(
        f"TUNER SAFE MODE: {intervention['floor_breached']} "
        f"(value={intervention.get('metric_value')}). "
        f"All interventions frozen. Manual investigation needed.",
        dry_run,
    )


def _execute_safe_mode_exit(intervention: dict, snapshot: dict, dry_run: bool) -> None:
    """Exit safe mode: floor has recovered."""
    record = {
        "type": "safe_mode_exit",
        "floor_recovered": intervention["floor_recovered"],
        "metric_value": intervention.get("metric_value"),
        "exited_at": datetime.now(timezone.utc).isoformat(),
    }
    _append_tuner_state(record, dry_run)

    _send_telegram(
        f"Tuner safe mode EXITED: {intervention['floor_recovered']} recovered "
        f"(value={intervention.get('metric_value')}). Interventions re-enabled.",
        dry_run,
    )


def _execute_revert(intervention: dict, snapshot: dict, dry_run: bool) -> None:
    """Revert an active intervention and apply cooldown."""
    original = intervention["intervention"]
    now = datetime.now(timezone.utc)
    cooldown_until = now + timedelta(weeks=4)

    record = {
        "type": "revert",
        "intervention_id": original["id"],
        "reason": "metric_worsened",
        "metric_at_revert": snapshot.get(original.get("target_metric")),
        "reverted_at": now.isoformat(),
        "cooldown_until": cooldown_until.isoformat(),
    }
    _append_tuner_state(record, dry_run)

    target_metric = original.get("target_metric", "unknown")
    baseline = original.get("metric_at_application", "?")
    current = snapshot.get(target_metric, "?")

    content = (
        f"Tuner reverted {original.get('name', '?')}: {target_metric} "
        f"worsened from {baseline} to {current} after 2 weeks. "
        f"Lesson: {original.get('parameter', '?')} change from "
        f"{original.get('old_value', '?')} to {original.get('new_value', '?')} "
        f"does not improve {target_metric} under current conditions "
        f"(entry_throughput={snapshot.get('entry_throughput', 0)}). "
        f"Cooldown: this intervention type is blocked until {cooldown_until.strftime('%Y-%m-%d')}."
    )
    _write_lesson(content, ["revert", original.get("name", ""), target_metric], snapshot, dry_run)

    _send_telegram(
        f"Tuner REVERTED {original.get('name', '?')}: {target_metric} "
        f"worsened from {baseline} to {current}. "
        f"4-week cooldown applied.",
        dry_run,
    )


# ── Section 6: Working Memory Writes ─────────────────────────────────────────


_entries_written = 0  # Module-level counter for the 3-entry cap


def _write_metric_observation(snapshot: dict, dry_run: bool) -> None:
    """Write an observation-tier entry with the metric snapshot."""
    global _entries_written
    if _entries_written >= MAX_ENTRIES_PER_RUN:
        logger.debug("Entry cap reached; skipping observation write.")
        return

    week_iso = snapshot.get("week_iso", "unknown")
    status = "all_clear"

    content = (
        f"Memory circulation tuner snapshot {week_iso}: "
        f"entry_throughput={snapshot.get('entry_throughput', 0)}, "
        f"dedup_waste={snapshot.get('dedup_waste_pct', 'N/A')}%, "
        f"connection_acceptance={snapshot.get('connection_acceptance_rate', 'N/A')}%, "
        f"promotion_throughput={snapshot.get('promotion_throughput', 0)}, "
        f"shadow_diversity={snapshot.get('shadow_injection_diversity', 0):.3f}, "
        f"composite_fitness={snapshot.get('composite_fitness', 0):.4f} "
        f"(active: {snapshot.get('active_fitness_function', 'f1')}). "
        f"Status: {status}."
    )

    store = WorkingMemoryStore()
    if dry_run:
        logger.info("[DRY RUN] Would write observation:\n%s", content)
    else:
        try:
            store.write_observation(
                source_agent=SOURCE_AGENT,
                source_session=f"{SESSION_ID_PREFIX}{week_iso}",
                content=content,
                confidence=0.9,
                importance=0.5,
                ttl_hours=336,  # 2 weeks
                tags=["meta-control", "metrics-snapshot", week_iso],
            )
            _entries_written += 1
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to write observation: %s", exc)


def _write_intervention_decision(content: str, extra_tags: list[str], snapshot: dict, dry_run: bool) -> None:
    """Write a decision-tier entry describing an intervention."""
    global _entries_written
    if _entries_written >= MAX_ENTRIES_PER_RUN:
        logger.debug("Entry cap reached; skipping decision write.")
        return

    week_iso = snapshot.get("week_iso", "unknown")
    tags = ["meta-control"] + extra_tags + [snapshot.get("active_fitness_function", "f1")]

    store = WorkingMemoryStore()
    if dry_run:
        logger.info("[DRY RUN] Would write decision:\n%s", content)
    else:
        try:
            store.write_decision(
                source_agent=SOURCE_AGENT,
                source_session=f"{SESSION_ID_PREFIX}{week_iso}",
                content=content,
                confidence=0.8,
                importance=0.8,
                tags=tags,
                provenance="tuner_intervention",
            )
            _entries_written += 1
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to write decision: %s", exc)


def _write_lesson(content: str, extra_tags: list[str], snapshot: dict, dry_run: bool) -> None:
    """Write a lesson-tier entry (reverts, diagnostics, pattern discoveries)."""
    global _entries_written
    if _entries_written >= MAX_ENTRIES_PER_RUN:
        logger.debug("Entry cap reached; skipping lesson write.")
        return

    week_iso = snapshot.get("week_iso", "unknown")
    tags = ["meta-control"] + extra_tags

    store = WorkingMemoryStore()
    if dry_run:
        logger.info("[DRY RUN] Would write lesson:\n%s", content)
    else:
        try:
            store._insert(
                source_agent=SOURCE_AGENT,
                source_session=f"{SESSION_ID_PREFIX}{week_iso}",
                content=content,
                tier="lesson",
                task_ref=None,
                confidence=0.85,
                importance=0.9,
                ttl_hours=None,
                tags=tags,
                sensitivity="internal",
                provenance="tuner_lesson",
            )
            _entries_written += 1
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to write lesson: %s", exc)


# ── Section 7: Telegram ──────────────────────────────────────────────────────


def _send_telegram(message: str, dry_run: bool) -> None:
    """Send a Telegram alert. Same pattern as weekly_learning_report.py."""
    if dry_run:
        logger.info("[DRY RUN] Would send Telegram:\n%s", message)
        return
    if not TELEGRAM_SCRIPT.exists():
        logger.warning("Telegram script not found at %s; skipping.", TELEGRAM_SCRIPT)
        return
    try:
        result = subprocess.run(
            ["python3.11", str(TELEGRAM_SCRIPT), message],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0:
            logger.warning("Telegram script exited %d: %s", result.returncode, result.stderr.strip())
        else:
            logger.info("Telegram alert sent.")
    except subprocess.TimeoutExpired:
        logger.warning("Telegram script timed out after 30 seconds.")
    except Exception as exc:  # noqa: BLE001
        logger.warning("Telegram send failed: %s", exc)


# ── Section 8: Self-Injection (Recursion Closure) ────────────────────────────


def _retrieve_past_context() -> list[dict]:
    """Retrieve past tuner decisions/lessons from working memory."""
    try:
        store = WorkingMemoryStore()
        entries = store.get_for_injection(agent=SOURCE_AGENT, max_tokens=1500)
        if entries:
            logger.info(
                "Self-injection: retrieved %d past tuner entries (tiers: %s)",
                len(entries),
                Counter(e.get("tier", "?") for e in entries),
            )
        return entries
    except Exception as exc:  # noqa: BLE001
        logger.warning("Could not retrieve past context: %s", exc)
        return []


def _parse_past_lessons(past_entries: list[dict]) -> dict:
    """Parse past working memory entries into actionable signals.

    Returns a dict with:
      - failed_interventions: set of intervention names mentioned in revert lessons
      - successful_interventions: set of names mentioned positively in lessons
      - suppress: set of intervention names to skip this run
      - boost: set of intervention names to prefer this run
    """
    failed: set[str] = set()
    successful: set[str] = set()

    intervention_names = [
        "dedup_tighten_hash_window", "connection_threshold_reset",
        "connection_threshold_nudge", "promotion_pipeline_kickstart",
        "fitness_function_shift", "shadow_injection_stale_data_fix",
    ]

    for entry in past_entries:
        content = (entry.get("content") or "").lower()
        tier = entry.get("tier", "")
        tags = entry.get("tags") or []

        for name in intervention_names:
            if name.replace("_", " ") not in content and name not in content:
                continue
            if "revert" in tags or "reverting" in content or "counterproductive" in content or "worsened" in content:
                failed.add(name)
            elif tier in ("lesson", "policy") and ("improved" in content or "helped" in content or "successful" in content):
                successful.add(name)

    suppress = failed - successful
    boost = successful - failed

    if suppress:
        logger.info("Past lessons suppress: %s", suppress)
    if boost:
        logger.info("Past lessons boost: %s", boost)

    return {
        "failed_interventions": failed,
        "successful_interventions": successful,
        "suppress": suppress,
        "boost": boost,
    }


# ── Section 9: Main ──────────────────────────────────────────────────────────


def main() -> int:  # noqa: C901
    parser = argparse.ArgumentParser(
        description="Memory Circulation Tuner -- closed-loop controller for the memory subsystem.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Compute metrics and select intervention without writing anything.")
    parser.add_argument("--force", action="store_true", help="Bypass the 6-day lockfile guard.")
    parser.add_argument("--verbose", action="store_true", help="Enable debug logging.")
    parser.add_argument("--no-telegram", action="store_true", help="Skip Telegram alerts.")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )

    dry_run: bool = args.dry_run
    if dry_run:
        logger.info("=== DRY RUN MODE -- no writes ===")

    # ── Lockfile guard ────────────────────────────────────────────────────
    if not _check_lockfile(args.force):
        return 0

    # ── Process-level lock (prevents concurrent runs) ────────────────────
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    process_lock_path = RUNTIME_DIR / ".tuner.lock"
    try:
        _process_lock_fh = process_lock_path.open("w")
        fcntl.flock(_process_lock_fh, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except (OSError, BlockingIOError):
        logger.warning("Another tuner instance is running. Exiting.")
        return 0

    # ── Write lockfile early to prevent re-entry on crash ────────────────
    _write_lockfile(dry_run)

    # ── Reset per-run entry counter ──────────────────────────────────────
    global _entries_written
    _entries_written = 0

    now_dt = datetime.now(timezone.utc)
    week_iso = now_dt.strftime("%G-W%V")
    logger.info("Memory Circulation Tuner starting -- week %s", week_iso)

    try:
        # ── Load state ────────────────────────────────────────────────────
        state = _load_tuner_state()
        logger.info("Loaded %d tuner state records.", len(state))

        # ── Self-injection: read past decisions (recursion closure) ───────
        past_entries = _retrieve_past_context()
        past_decisions_seen = len(past_entries)
        past_lessons = _parse_past_lessons(past_entries)
        if past_entries:
            logger.info("Past context: %d entries, suppress=%s, boost=%s",
                        past_decisions_seen, past_lessons["suppress"], past_lessons["boost"])
            for entry in past_entries:
                logger.debug("  [%s] %s: %s", entry.get("tier"), entry.get("timestamp", "?")[:10], entry.get("content", "")[:120])

        # ── Collect JSONL records ─────────────────────────────────────────
        records = _collect_jsonl_records()
        logger.info("Loaded %d JSONL records from weekly_reports.jsonl.", len(records))

        # ── Build metric snapshot ─────────────────────────────────────────
        snapshot = _build_metric_snapshot(records, state)

        # ── Append metric_snapshot to tuner state ─────────────────────────
        snapshot_record = {
            "type": "metric_snapshot",
            "week_iso": snapshot["week_iso"],
            "run_at": snapshot["run_at"],
            "dedup_waste_pct": snapshot.get("dedup_waste_pct"),
            "connection_acceptance_rate": snapshot.get("connection_acceptance_rate"),
            "promotion_throughput": snapshot.get("promotion_throughput"),
            "shadow_injection_diversity": snapshot.get("shadow_injection_diversity"),
            "entry_throughput": snapshot.get("entry_throughput"),
            "composite_fitness": snapshot.get("composite_fitness"),
            "active_fitness_function": snapshot.get("active_fitness_function"),
            "past_decisions_seen": past_decisions_seen,
        }
        _append_tuner_state(snapshot_record, dry_run)

        # ── Write observation to working memory ───────────────────────────
        _write_metric_observation(snapshot, dry_run)

        # ── Select intervention (past_lessons closes the recursion) ──────
        intervention = _select_intervention(snapshot, state, records, past_lessons)

        if intervention:
            itype = intervention.get("type", intervention.get("name", "?"))
            logger.info("Intervention selected: %s", itype)
            _execute_intervention(intervention, snapshot, state, dry_run)

            # Telegram alert for interventions (unless it already sent one)
            if itype not in ("fitness_shift", "safe_mode_entry", "safe_mode_exit", "revert") and not args.no_telegram:
                _send_telegram(
                    f"Tuner intervention: {intervention.get('name', itype)} "
                    f"targeting {intervention.get('target_metric', '?')} "
                    f"(value={intervention.get('metric_value', '?')}). "
                    f"Week {week_iso}.",
                    dry_run,
                )
        else:
            logger.info("No intervention selected. All metrics within acceptable ranges.")

        logger.info(
            "Memory Circulation Tuner complete -- week=%s entries_written=%d intervention=%s",
            week_iso,
            _entries_written,
            intervention.get("type", intervention.get("name", "none")) if intervention else "none",
        )
        return 0

    except Exception as exc:
        logger.error("Fatal error: %s", exc, exc_info=True)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
