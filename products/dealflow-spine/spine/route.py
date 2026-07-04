"""
route.py — DealCandidates + routing (the "Conversion" C in CMCO).

Routes (Route enum, triage_core lineage — hot/warm/watch/discard instead of
ticket/enrich/skip):

  HOT      2+ distinct LIVE, CLASSIFIED signal types AND score >=
           hot_min_score AND the buy-box holds (no non-signal misses). The
           "2+ list stacking" tier — goes to underwriting first.
           "Live" mirrors scoring's stack-bonus rule: a signal past
           max_age_days contributes 0 and cannot mint HOT; "classified"
           excludes "other" (a novel/coerced label still SCORES, but one
           source inventing a second label must not fake a 2-list stack);
           the score floor (RoutingConfig.hot_min_score, default 2.0) keeps
           near-zero-confidence pairs out of the product surface.
  WARM     buy-box holds but only one signal type (or stacked-but-marginal);
           score >= warm_min_score.
  WATCH    something's there (score >= watch_min_score) but box misses or
           single weak signal — keep on the radar, re-score as signals land.
  DISCARD  out of target geo (hard disqualifier) or score below floor.

Note on the buy-box interaction: the box's own `min_signal_count` criterion
is EXCLUDED when deciding box-fit here, because routing owns the stacking
rule (hot_min_signals). Otherwise a single-signal record could never be WARM
under a 2+ box.

Outputs:
  data/candidates.jsonl  — SNAPSHOT (rewritten each run, not append-only;
                           the signals ledger is the append-only history).
                           One DealCandidate.to_dict() per line, sorted
                           hot->discard then score desc. Underwriting reads
                           this file.
  data/digest-latest.md + data/digests/digest-YYYY-MM-DD.md — human digest.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path

from .criteria import BuyBox, CriteriaResult
from .schema import DealCandidate, PropertyRecord, ScoreBreakdown
from .scoring import ScoringConfig, score_record
from .underwrite import top_reason

DEFAULT_CANDIDATES = Path(__file__).resolve().parent.parent / "data" / "candidates.jsonl"
DEFAULT_DIGEST_DIR = Path(__file__).resolve().parent.parent / "data"


class Route(str, Enum):
    HOT = "hot"
    WARM = "warm"
    WATCH = "watch"
    DISCARD = "discard"


ROUTE_ORDER = {Route.HOT: 0, Route.WARM: 1, Route.WATCH: 2, Route.DISCARD: 3}


@dataclass
class RoutingConfig:
    hot_min_signals: int = 2       # distinct LIVE, non-"other" signal TYPES for hot
    hot_min_score: float = 2.0     # hot also needs at least this total score
    warm_min_score: float = 1.0
    watch_min_score: float = 0.25

    @classmethod
    def from_dict(cls, d: dict | None) -> "RoutingConfig":
        d = d or {}
        cfg = cls()
        if "hot_min_signals" in d:
            cfg.hot_min_signals = int(d["hot_min_signals"])
        for k in ("hot_min_score", "warm_min_score", "watch_min_score"):
            if k in d:
                setattr(cfg, k, float(d[k]))
        return cfg


# ---------------------------------------------------------------------------
# strategy recommendation
# ---------------------------------------------------------------------------

# priority-ordered: first type present on the record picks the headline play
_STRATEGY_PRIORITY: list[tuple[str, str]] = [
    ("pre_foreclosure", "pre-foreclosure workout / cash offer before auction clock"),
    ("obituary", "probate/estate outreach — mail-first, consent-first"),
    ("tax_delinquent", "tax-delinquency cash offer; research lien position first"),
    ("fema_disaster", "insurance-gap as-is cash offer (disaster-distressed)"),
    ("code_violation", "as-is cash offer priced against violation cure cost"),
    ("assumable_loan", "subject-to / loan-assumption structure (low-rate carry)"),
    ("other", "manual review — unclassified signal"),
]


def recommend_strategy(record: PropertyRecord) -> str:
    types = record.distinct_signal_types
    headline = next(
        (strategy for t, strategy in _STRATEGY_PRIORITY if t in types),
        "manual review",
    )
    if len(types) >= 2:
        return f"stacked distress ({len(types)} signals): {headline}"
    return headline


# ---------------------------------------------------------------------------
# routing
# ---------------------------------------------------------------------------

def _box_fit(criteria: CriteriaResult) -> bool:
    """Buy-box holds, ignoring the box's own signal-count criterion (routing
    owns stacking) and ignoring unknowns (already folded into `matched` per
    the box's unknown_policy; here we only look at hard misses)."""
    return not [m for m in criteria.misses if not m.startswith("signals:")]


def _live_types(breakdown: ScoreBreakdown) -> set[str]:
    """Signal types with a positive score contribution. Component keys are
    'signal:{type}:{id}' (scoring.py owns the format)."""
    types: set[str] = set()
    for key, value in breakdown.components.items():
        if value > 0 and key.startswith("signal:"):
            types.add(key.split(":", 2)[1])
    return types


def route_record(
    record: PropertyRecord,
    criteria: CriteriaResult,
    score: float,
    config: RoutingConfig | None = None,
    breakdown: ScoreBreakdown | None = None,
) -> Route:
    """Route one scored record.

    HOT requires (a) >= hot_min_signals distinct signal types that are LIVE
    (positive score contribution — a fully-decayed signal doesn't count, same
    rule scoring uses for the stack bonus) and CLASSIFIED (the "other" bucket
    scores but never counts toward the stack), (b) score >= hot_min_score,
    and (c) box fit. Pass the ScoreBreakdown that produced `score` when you
    have it (build_candidates does); if omitted, liveness is recomputed with
    the default ScoringConfig.
    """
    config = config or RoutingConfig()
    if criteria.geo_missed:
        return Route.DISCARD
    fit = _box_fit(criteria)
    if breakdown is None:
        _, breakdown = score_record(record)
    countable = _live_types(breakdown) - {"other"}
    if (len(countable) >= config.hot_min_signals and fit
            and score >= config.hot_min_score):
        return Route.HOT
    if fit and score >= config.warm_min_score:
        return Route.WARM
    if score >= config.watch_min_score:
        return Route.WATCH
    return Route.DISCARD


def build_candidates(
    records: list[PropertyRecord],
    buybox: BuyBox,
    scoring_config: ScoringConfig | None = None,
    routing_config: RoutingConfig | None = None,
    now: datetime | None = None,
) -> list[DealCandidate]:
    """Criteria + score + route every record. Sorted hot-first, score desc."""
    scoring_config = scoring_config or ScoringConfig()
    routing_config = routing_config or RoutingConfig()
    candidates: list[DealCandidate] = []
    for record in records:
        criteria = buybox.evaluate(record)
        score, breakdown = score_record(record, scoring_config, now=now)
        route = route_record(record, criteria, score, routing_config,
                             breakdown=breakdown)
        candidates.append(
            DealCandidate(
                property_key=record.key,
                property=record.property,
                owner=record.owner,
                signals=record.signals,
                facts=record.facts,
                criteria_matches=criteria.as_dict(),
                distress_score=score,
                recommended_strategy=recommend_strategy(record),
                score_breakdown=breakdown,
                route=route.value,
            )
        )
    candidates.sort(
        key=lambda c: (ROUTE_ORDER[Route(c.route)], -c.distress_score, c.property_key)
    )
    return candidates


# ---------------------------------------------------------------------------
# outputs
# ---------------------------------------------------------------------------

def write_candidates(
    candidates: list[DealCandidate],
    path: str | Path = DEFAULT_CANDIDATES,
) -> Path:
    """Write the candidates SNAPSHOT (atomic replace). Not append-only —
    routes/scores legitimately change run to run; history lives in the
    signals ledger."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".jsonl.tmp")
    with tmp.open("w") as f:
        for c in candidates:
            f.write(json.dumps(c.to_dict(), default=str) + "\n")
    tmp.replace(path)
    return path


def load_candidates(path: str | Path = DEFAULT_CANDIDATES) -> list[DealCandidate]:
    path = Path(path)
    out: list[DealCandidate] = []
    if not path.exists():
        return out
    with path.open() as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                out.append(DealCandidate.from_dict(json.loads(line)))
            except (json.JSONDecodeError, TypeError, ValueError):
                continue
    return out


def render_digest(
    candidates: list[DealCandidate],
    buybox_name: str = "default",
    now: datetime | None = None,
) -> str:
    """Human-readable daily digest markdown."""
    now = now or datetime.now(timezone.utc)
    by_route: dict[str, list[DealCandidate]] = {r.value: [] for r in Route}
    for c in candidates:
        by_route.setdefault(c.route or "watch", []).append(c)

    lines: list[str] = []
    lines.append(f"# Dealflow digest — {now.date().isoformat()}")
    lines.append("")
    lines.append(
        f"Buy-box: **{buybox_name}** · properties evaluated: **{len(candidates)}** · "
        + " · ".join(f"{r.value}: **{len(by_route[r.value])}**" for r in Route)
    )
    lines.append("")
    lines.append("> R&D pipeline — no outreach. Routes feed underwriting review only.")
    lines.append("")

    def _table(items: list[DealCandidate], underwrite_col: bool = False) -> list[str]:
        head = "| Score | Address | Signals | Strategy |"
        rule = "|------:|---------|---------|----------|"
        if underwrite_col:
            head += " Underwrite |"
            rule += "-----------|"
        rows = [head, rule]
        for c in items:
            p = c.property
            addr = f"{p.address}, {p.city} {p.state} {p.zip}".strip().strip(",")
            sigs = ", ".join(sorted(c.distinct_signal_types))
            row = f"| {c.distress_score:.2f} | {addr} | {sigs} | {c.recommended_strategy} |"
            if underwrite_col:
                rec = (c.underwriting or {}).get("recommendation") or "—"
                row += f" **{rec}** |"
            rows.append(row)
        return rows

    for route, title in ((Route.HOT, "🔥 Hot — stacked + in the box"),
                         (Route.WARM, "🌤 Warm — in the box, single signal"),
                         (Route.WATCH, "👀 Watch")):
        items = by_route[route.value]
        lines.append(f"## {title} ({len(items)})")
        lines.append("")
        if items:
            lines.extend(_table(items, underwrite_col=route is Route.HOT))
            lines.append("")
            # top hot candidates get their receipts printed
            if route is Route.HOT:
                for c in items[:5]:
                    lines.append(f"### {c.property.address}, {c.property.city} — {c.distress_score:.2f}")
                    if c.owner and c.owner.name:
                        lines.append(f"- Owner: {c.owner.name}"
                                     + (f" ({c.owner.mailing_address})" if c.owner.mailing_address else ""))
                    if c.underwriting:
                        lines.append(
                            f"- Underwrite: **{c.underwriting['recommendation']}**"
                            f" — {top_reason(c.underwriting)}"
                        )
                    for key, why in c.score_breakdown.reasons.items():
                        lines.append(f"- `{key}`: {why}")
                    unknowns = c.criteria_matches.get("unknowns") or []
                    if unknowns:
                        lines.append(f"- Missing facts to chase: {', '.join(unknowns)}")
                    lines.append("")
        else:
            lines.append("_none_")
            lines.append("")

    discards = by_route[Route.DISCARD.value]
    lines.append(f"## Discarded ({len(discards)})")
    lines.append("")
    for c in discards:
        misses = "; ".join(c.criteria_matches.get("misses") or []) or f"score {c.distress_score:.2f} below floor"
        lines.append(f"- {c.property.address}, {c.property.city} {c.property.state} — {misses}")
    if not discards:
        lines.append("_none_")
    lines.append("")
    return "\n".join(lines)


def write_digest(
    candidates: list[DealCandidate],
    digest_dir: str | Path = DEFAULT_DIGEST_DIR,
    buybox_name: str = "default",
    now: datetime | None = None,
) -> Path:
    """Write data/digests/digest-YYYY-MM-DD.md and mirror to data/digest-latest.md."""
    now = now or datetime.now(timezone.utc)
    digest_dir = Path(digest_dir)
    dated_dir = digest_dir / "digests"
    dated_dir.mkdir(parents=True, exist_ok=True)
    text = render_digest(candidates, buybox_name=buybox_name, now=now)
    dated = dated_dir / f"digest-{now.date().isoformat()}.md"
    dated.write_text(text)
    (digest_dir / "digest-latest.md").write_text(text)
    return dated
