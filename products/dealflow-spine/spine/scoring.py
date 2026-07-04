"""
scoring.py — the distress score (explainable).

score(record) = sum over signals of
    weight(signal_type) * confidence * recency_decay
  + stack_bonus * (distinct_signal_types - 1)          # the EBRE stacking rule

where:
  - weight(signal_type): how strong a "they'll sell" indicator this type is.
  - confidence: the adapter's 0-1 certainty on the Signal itself.
  - recency_decay: 0.5 ** (age_days / half_life_days) — a year-old code
    violation is not a today code violation.
  - repeated signals of the SAME type are dampened geometrically
    (2nd tax_delinquent hit is corroboration, not double distress) so that
    two DISTINCT signal types always beat two copies of one type. Stacking
    distinct "why they'll sell now" signals is the whole thesis:
    2+ distinct types = highest conviction ("2+ list targeting").

Every contribution lands in ScoreBreakdown.components with a human reason —
underwriting shows the breakdown verbatim, so keep reasons readable.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

from .schema import PropertyRecord, ScoreBreakdown, Signal

DEFAULT_WEIGHTS: dict[str, float] = {
    "pre_foreclosure": 3.0,   # clock is literally running
    "tax_delinquent": 2.5,    # sustained financial distress, public record
    "obituary": 2.5,          # estate transition; probate timeline
    "fema_disaster": 2.0,     # damage + insurance-gap thesis
    "code_violation": 2.0,    # deferred maintenance + fine pressure
    "assumable_loan": 1.5,    # deal-structure sweetener more than distress
    "other": 1.0,
}


@dataclass
class ScoringConfig:
    weights: dict[str, float] = field(default_factory=lambda: dict(DEFAULT_WEIGHTS))
    default_weight: float = 1.0        # for types missing from `weights`
    half_life_days: float = 180.0      # recency decay half-life
    max_age_days: float = 730.0        # signals older than this contribute 0
    same_type_dampening: float = 0.5   # 2nd/3rd signal of same type: x0.5, x0.25...
    stack_bonus: float = 2.0           # per distinct type beyond the first

    @classmethod
    def from_dict(cls, d: dict | None) -> "ScoringConfig":
        d = d or {}
        cfg = cls()
        if "weights" in d:
            cfg.weights.update({k: float(v) for k, v in d["weights"].items()})
        for k in ("default_weight", "half_life_days", "max_age_days",
                  "same_type_dampening", "stack_bonus"):
            if k in d:
                setattr(cfg, k, float(d[k]))
        return cfg


def recency_decay(sig: Signal, now: datetime, config: ScoringConfig) -> float:
    age_days = max(0.0, (now - sig.observed_dt).total_seconds() / 86400.0)
    if age_days > config.max_age_days:
        return 0.0
    return 0.5 ** (age_days / config.half_life_days)


def score_record(
    record: PropertyRecord,
    config: ScoringConfig | None = None,
    now: datetime | None = None,
) -> tuple[float, ScoreBreakdown]:
    """Score one merged PropertyRecord. Returns (total, breakdown).

    total == sum(breakdown.components.values()) — always, by construction.
    """
    config = config or ScoringConfig()
    now = now or datetime.now(timezone.utc)

    components: dict[str, float] = {}
    reasons: dict[str, str] = {}
    seen_type_counts: dict[str, int] = {}

    # newest first so the freshest signal of each type gets full credit
    for sig in sorted(record.signals, key=lambda s: s.observed_dt, reverse=True):
        weight = config.weights.get(sig.signal_type, config.default_weight)
        decay = recency_decay(sig, now, config)
        nth = seen_type_counts.get(sig.signal_type, 0)
        dampen = config.same_type_dampening ** nth
        seen_type_counts[sig.signal_type] = nth + 1

        contribution = round(weight * sig.confidence * decay * dampen, 4)
        key = f"signal:{sig.signal_type}:{sig.id}"
        # Duplicate (type, id) pairs on one record (adapter bug reusing an id,
        # or ledger rows that slipped past load-time dedupe) must not
        # OVERWRITE the first component with the dampened repeat — that
        # silently halves the property's score (M2). Uniquify instead so
        # total == sum(components) stays true.
        if key in components:
            n = 2
            while f"{key}#{n}" in components:
                n += 1
            key = f"{key}#{n}"
        components[key] = contribution
        age_days = (now - sig.observed_dt).total_seconds() / 86400.0
        parts = [
            f"{sig.signal_type} from {sig.source}",
            f"weight {weight:g}",
            f"confidence {sig.confidence:.2f}",
            f"{age_days:.0f}d old (decay {decay:.2f})",
        ]
        if nth:
            parts.append(f"repeat #{nth + 1} of type (x{dampen:.2f})")
        reasons[key] = ", ".join(parts)

    # stacking bonus — distinct types only count if they actually contributed
    # (a fully-decayed 3-year-old signal shouldn't unlock the bonus)
    live_types = {
        s.signal_type
        for s in record.signals
        if components.get(f"signal:{s.signal_type}:{s.id}", 0) > 0
    }
    if len(live_types) >= 2:
        bonus = round(config.stack_bonus * (len(live_types) - 1), 4)
        components["stack_bonus"] = bonus
        reasons["stack_bonus"] = (
            f"{len(live_types)} distinct signal types stacked "
            f"({', '.join(sorted(live_types))}) — 2+ list rule, "
            f"+{config.stack_bonus:g} per extra type"
        )

    total = round(sum(components.values()), 4)
    return total, ScoreBreakdown(total=total, components=components, reasons=reasons)
