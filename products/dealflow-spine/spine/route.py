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

import html as _html
import json
import re
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


def _lead_detail(c: DealCandidate) -> dict:
    """The most actionable detail across a candidate's signals: the 'why'
    (violation category/description/status), whether any signal flags real
    distress (vacant/unfit/derelict...), how many complaints stacked, and a
    link to verify. Shared by the markdown and HTML digests. Defensive —
    signals may lack evidence."""
    sigs = list(getattr(c, "signals", []) or [])
    def ev(s): return getattr(s, "evidence", None) or {}
    cv = [s for s in sigs if getattr(s, "signal_type", "") == "code_violation"]
    pool = cv or sigs
    if not pool:
        return {"why": "—", "cases": 0, "distress": False, "url": None}
    primary = max(pool, key=lambda s: (bool(ev(s).get("distress_hint")),
                                        getattr(s, "confidence", 0) or 0))
    e = ev(primary)
    cat = str(e.get("category") or "").strip()
    desc = str(e.get("description") or "").strip()
    status = str(e.get("status") or "").strip()
    why = " — ".join(x for x in (cat, desc) if x) or getattr(
        primary, "signal_type", "signal")
    if status:
        why += f" ({status})"
    why = why.replace("|", "/").replace("\n", " ").replace("\r", " ")
    # source descriptions sometimes glue two words ('vacantREFERENCE:'); un-glue
    # a lowercase→UPPERCASE-run boundary without splitting normal CamelCase.
    why = re.sub(r"([a-z])([A-Z]{2,})", r"\1 \2", why)
    return {
        "why": why[:80],
        "cases": len(cv) or len(sigs),
        "distress": any(ev(s).get("distress_hint") for s in sigs),
        "url": getattr(primary, "source_url", None),
    }


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

    # per-route caps so a live run's hundreds of rows stay scannable
    WARM_CAP, WATCH_CAP, DISCARD_CAP = 40, 20, 15

    _lead = _lead_detail   # shared with the HTML renderer

    def _addr(c: DealCandidate, url: str | None) -> str:
        p = c.property
        a = f"{p.address}, {p.city} {p.state} {p.zip}".strip().strip(",")
        return f"[{a}]({url})" if url else a

    def _table(items: list[DealCandidate], underwrite_col: bool = False,
               cap: int | None = None) -> list[str]:
        shown = items[:cap] if cap else items
        head = "| Score | ⚑ | Address (→ case) | Why — latest complaint | Cases |"
        rule = "|------:|:-:|------------------|------------------------|:-----:|"
        if underwrite_col:
            head += " Strategy | Underwrite |"
            rule += "----------|------------|"
        rows = [head, rule]
        for c in shown:
            d = _lead(c)
            flag = "🚩" if d["distress"] else ""
            row = (f"| {c.distress_score:.2f} | {flag} | {_addr(c, d['url'])} "
                   f"| {d['why']} | {d['cases']} |")
            if underwrite_col:
                rec = (c.underwriting or {}).get("recommendation") or "—"
                row += f" {c.recommended_strategy} | **{rec}** |"
            rows.append(row)
        if cap and len(items) > cap:
            rows.append(f"\n_+{len(items) - cap} more (see `data/candidates.jsonl`)_")
        return rows

    for route, title, cap in (
        (Route.HOT, "🔥 Hot — stacked + in the box", None),
        (Route.WARM, "🌤 Warm — in the box, single signal", WARM_CAP),
        (Route.WATCH, "👀 Watch", WATCH_CAP),
    ):
        items = by_route[route.value]
        # lead with flagged distress, then score
        items = sorted(items, key=lambda c: (_lead(c)["distress"], c.distress_score),
                       reverse=True)
        flagged = sum(1 for c in items if _lead(c)["distress"])
        head = f"## {title} ({len(items)})"
        if flagged:
            head += f" · 🚩 {flagged} distress-flagged"
        lines.append(head)
        lines.append("")
        if items:
            lines.extend(_table(items, underwrite_col=route is Route.HOT, cap=cap))
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
    for c in discards[:DISCARD_CAP]:
        misses = "; ".join(c.criteria_matches.get("misses") or []) or f"score {c.distress_score:.2f} below floor"
        lines.append(f"- {c.property.address}, {c.property.city} {c.property.state} — {misses}")
    if len(discards) > DISCARD_CAP:
        lines.append(f"- _+{len(discards) - DISCARD_CAP} more discarded_")
    if not discards:
        lines.append("_none_")
    lines.append("")
    return "\n".join(lines)


_HTML_CSS = """
:root{--bg:#f7f6f3;--card:#fff;--ink:#1c1b19;--muted:#6b6862;--line:#e4e1da;
--hot:#b4471f;--hotbg:#fbeee7;--warm:#1f6f6b;--flag:#c8341a;--link:#8a4a1f}
@media(prefers-color-scheme:dark){:root{--bg:#161513;--card:#211f1c;--ink:#ece9e3;
--muted:#a39e94;--line:#332f2a;--hot:#e08a5c;--hotbg:#2b1c13;--warm:#5fb8b2;--flag:#e8785e;--link:#e0a56f}}
:root[data-theme=dark]{--bg:#161513;--card:#211f1c;--ink:#ece9e3;--muted:#a39e94;
--line:#332f2a;--hot:#e08a5c;--hotbg:#2b1c13;--warm:#5fb8b2;--flag:#e8785e;--link:#e0a56f}
:root[data-theme=light]{--bg:#f7f6f3;--card:#fff;--ink:#1c1b19;--muted:#6b6862;
--line:#e4e1da;--hot:#b4471f;--hotbg:#fbeee7;--warm:#1f6f6b;--flag:#c8341a;--link:#8a4a1f}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);
font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
.wrap{max-width:1080px;margin:0 auto;padding:32px 20px 64px}
h1{font-size:26px;margin:0 0 4px;letter-spacing:-.01em}
.sub{color:var(--muted);font-size:13px;margin-bottom:20px}
.counts{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 24px}
.pill{padding:4px 11px;border-radius:999px;border:1px solid var(--line);
background:var(--card);font-size:12px;font-variant-numeric:tabular-nums}
.pill b{font-size:14px}.pill.hot{color:var(--hot);border-color:var(--hot)}
.note{color:var(--muted);font-size:12px;font-style:italic;margin:-10px 0 26px}
h2{font-size:17px;margin:30px 0 10px;padding-bottom:6px;border-bottom:2px solid var(--line)}
h2 .n{color:var(--muted);font-weight:400;font-size:14px}
.scroll{overflow-x:auto;border:1px solid var(--line);border-radius:10px;background:var(--card)}
table{border-collapse:collapse;width:100%;font-size:13px;min-width:640px}
th,td{text-align:left;padding:9px 12px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:600}
tr:last-child td{border-bottom:none}
td.s{font-variant-numeric:tabular-nums;font-weight:700;text-align:right;white-space:nowrap}
.hot td.s{color:var(--hot)}.flag{color:var(--flag)}
a{color:var(--link);text-decoration:none}a:hover{text-decoration:underline}
.owner{color:var(--muted);font-size:12px}.why{color:var(--ink)}
.uw{font-size:11px;text-transform:uppercase;letter-spacing:.03em;color:var(--muted)}
.more{color:var(--muted);font-size:12px;padding:8px 12px}
"""


def _esc(x) -> str:
    return _html.escape(str(x if x is not None else ""))


def render_digest_html(
    candidates: list[DealCandidate],
    buybox_name: str = "default",
    now: datetime | None = None,
) -> str:
    """Self-contained, theme-aware HTML digest for eyeballing leads locally.
    NOT for publishing — these are real property/owner leads (R&D only)."""
    now = now or datetime.now(timezone.utc)
    by_route: dict[str, list[DealCandidate]] = {r.value: [] for r in Route}
    for c in candidates:
        by_route.setdefault(c.route or "watch", []).append(c)

    def _addr_cell(c: DealCandidate, url: str | None) -> str:
        p = c.property
        a = _esc(f"{p.address}, {p.city} {p.state} {p.zip}".strip().strip(","))
        return f'<a href="{_esc(url)}" target="_blank" rel="noopener">{a}</a>' if url else a

    def _owner_cell(c: DealCandidate) -> str:
        o = c.owner
        if not o or not (o.name or o.mailing_address):
            return ""
        bits = [_esc(o.name)] if o.name else []
        if o.mailing_address:
            bits.append(f'<span class="owner">{_esc(o.mailing_address)}</span>')
        return "<br>".join(bits)

    def _rows(items, cap, hot=False):
        out = []
        for c in (items[:cap] if cap else items):
            d = _lead_detail(c)
            flag = '<span class="flag">🚩</span>' if d["distress"] else ""
            cells = [f'<td class="s">{c.distress_score:.2f}</td>',
                     f"<td>{flag}</td>",
                     f'<td>{_addr_cell(c, d["url"])}</td>',
                     f'<td class="why">{_esc(d["why"])}</td>',
                     f'<td>{_owner_cell(c)}</td>',
                     f'<td class="s">{d["cases"]}</td>']
            if hot:
                rec = (c.underwriting or {}).get("recommendation") or "—"
                cells.append(f'<td class="uw">{_esc(c.recommended_strategy)}<br>'
                             f'<b>{_esc(rec)}</b></td>')
            out.append(f'<tr class="{"hot" if hot else ""}">' + "".join(cells) + "</tr>")
        if cap and len(items) > cap:
            span = 7 if hot else 6
            out.append(f'<tr><td class="more" colspan="{span}">+{len(items) - cap} '
                       f'more (see data/candidates.jsonl)</td></tr>')
        return "\n".join(out)

    def _section(route, title, cap, hot=False):
        items = sorted(by_route[route.value],
                       key=lambda c: (_lead_detail(c)["distress"], c.distress_score),
                       reverse=True)
        flagged = sum(1 for c in items if _lead_detail(c)["distress"])
        head = (f'<h2>{title} <span class="n">· {len(items)}'
                + (f" · 🚩 {flagged}" if flagged else "") + "</span></h2>")
        if not items:
            return head + "<p class='more'>none</p>"
        cols = ("Score", "", "Address → case", "Why", "Owner (mailing)", "Cases")
        thead = "".join(f"<th>{c}</th>" for c in cols) + (
            "<th>Underwrite</th>" if hot else "")
        return (head + '<div class="scroll"><table><thead><tr>' + thead
                + "</tr></thead><tbody>" + _rows(items, cap, hot)
                + "</tbody></table></div>")

    pills = "".join(
        f'<span class="pill{" hot" if r is Route.HOT else ""}">'
        f'{r.value} <b>{len(by_route[r.value])}</b></span>' for r in Route)
    body = (
        f"<h1>Dealflow digest</h1>"
        f'<div class="sub">{now.date().isoformat()} · buy-box '
        f"<b>{_esc(buybox_name)}</b> · {len(candidates)} properties evaluated</div>"
        f'<div class="counts">{pills}</div>'
        f'<div class="note">R&amp;D pipeline — no outreach. Routes feed '
        f"underwriting review only.</div>"
        + _section(Route.HOT, "🔥 Hot — stacked + in the box", None, hot=True)
        + _section(Route.WARM, "🌤 Warm — in the box, single signal", 120)
        + _section(Route.WATCH, "👀 Watch", 40)
    )
    return (f'<!doctype html><html lang="en"><head><meta charset="utf-8">'
            f'<meta name="viewport" content="width=device-width,initial-scale=1">'
            f"<title>Dealflow digest — {now.date().isoformat()}</title>"
            f"<style>{_HTML_CSS}</style></head><body><div class='wrap'>{body}"
            f"</div></body></html>")


def write_digest(
    candidates: list[DealCandidate],
    digest_dir: str | Path = DEFAULT_DIGEST_DIR,
    buybox_name: str = "default",
    now: datetime | None = None,
) -> Path:
    """Write data/digests/digest-YYYY-MM-DD.md, mirror to data/digest-latest.md,
    and emit a local HTML view at data/digest-latest.html (eyeball view)."""
    now = now or datetime.now(timezone.utc)
    digest_dir = Path(digest_dir)
    dated_dir = digest_dir / "digests"
    dated_dir.mkdir(parents=True, exist_ok=True)
    text = render_digest(candidates, buybox_name=buybox_name, now=now)
    dated = dated_dir / f"digest-{now.date().isoformat()}.md"
    dated.write_text(text)
    (digest_dir / "digest-latest.md").write_text(text)
    (digest_dir / "digest-latest.html").write_text(
        render_digest_html(candidates, buybox_name=buybox_name, now=now))
    return dated
