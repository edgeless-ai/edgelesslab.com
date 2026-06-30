"""
Rubric Grader — Structured evaluation for agent outputs.

Replaces ad-hoc verify-completion.py checks with a reusable rubric evaluation
pattern. A separate grader context scores outputs against defined criteria
before downstream systems mark tasks complete.

Usage:
    from scripts.lib.rubric_grader import load_rubric, grade, ScoreReport

    rubric = load_rubric("coo-sweep-findings-v1")
    report = grade(agent_output, rubric, model="accounts/fireworks/routers/kimi-k2p6-turbo")

    if report.passed:
        mark_complete(report)
    else:
        return_for_fix(report)
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml

# Reuse existing LLM utility for structured calls
from scripts.lib.llm_utils import call_llm_structured


# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

# Project root resolved absolutely from this file's location so registry
# lookups work regardless of the caller's CWD. Cron jobs run with CWD=$HOME,
# where a bare ".hermes/rubrics" relative path does not exist — that mismatch
# is what broke the coo_sweep nightly grade ("Rubric ... not found in
# .hermes/rubrics"). Anchoring to __file__ fixes every cron-invoked consumer.
_PROJECT_ROOT = Path(__file__).resolve().parents[2]


def _rubrics_dir() -> Path:
    """Canonical rubric registry location (project-anchored, CWD-independent)."""
    env = os.environ.get("HERMES_RUBRICS_DIR")
    return Path(env) if env else _PROJECT_ROOT / ".hermes" / "rubrics"


def _logs_dir() -> Path:
    """Canonical logs location for score archive (project-anchored, CWD-independent)."""
    env = os.environ.get("HERMES_LOGS_DIR")
    return Path(env) if env else _PROJECT_ROOT / ".hermes" / "logs"


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

@dataclass
class CriterionScore:
    criterion: str
    score: int
    weight: float
    note: str = ""


@dataclass
class ScoreReport:
    rubric_name: str
    timestamp: str
    scores: list[CriterionScore]
    weighted_average: float = 0.0
    passed: bool = False
    excellent: bool = False
    recommendation: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "rubric_name": self.rubric_name,
            "timestamp": self.timestamp,
            "scores": [
                {
                    "criterion": s.criterion,
                    "score": s.score,
                    "weight": s.weight,
                    "note": s.note,
                }
                for s in self.scores
            ],
            "weighted_average": self.weighted_average,
            "passed": self.passed,
            "excellent": self.excellent,
            "recommendation": self.recommendation,
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2)

    def to_markdown(self) -> str:
        lines = [
            f"## Rubric Evaluation: {self.rubric_name}",
            "",
            f"**Timestamp:** {self.timestamp}",
            f"**Overall Score:** {self.weighted_average:.2f}/5.0",
            f"**Status:** {self.recommendation}",
            "",
            "### Criteria Breakdown",
            "",
            "| Criterion | Score | Weight | Note |",
            "|-----------|-------|--------|------|",
        ]
        for s in self.scores:
            bar = "█" * s.score + "░" * (5 - s.score)
            lines.append(f"| {s.criterion} | {bar} {s.score} | {s.weight} | {s.note} |")
        lines.extend([
            "",
            "### Recommendation",
            self.recommendation,
            "",
        ])
        return "\n".join(lines)


# ---------------------------------------------------------------------------
# Rubric loading
# ---------------------------------------------------------------------------

def load_rubric(rubric_id: str) -> dict[str, Any]:
    """
    Load a rubric definition from the registry.

    Args:
        rubric_id: Rubric identifier (filename without extension).

    Returns:
        Parsed rubric dict with criteria, threshold, gate.

    Raises:
        FileNotFoundError: If rubric file does not exist.
    """
    rubrics_dir = _rubrics_dir()
    for ext in (".yaml", ".yml", ".json"):
        path = rubrics_dir / f"{rubric_id}{ext}"
        if path.exists():
            if ext == ".json":
                return json.loads(path.read_text())
            return yaml.safe_load(path.read_text())
    raise FileNotFoundError(f"Rubric '{rubric_id}' not found in {rubrics_dir}")


# ---------------------------------------------------------------------------
# Grading engine
# ---------------------------------------------------------------------------

DEFAULT_GRADER_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "scores": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "criterion": {"type": "string"},
                    "score": {"type": "integer", "minimum": 1, "maximum": 5},
                    "note": {"type": "string"},
                },
                "required": ["criterion", "score", "note"],
            },
        },
        "recommendation": {"type": "string"},
    },
    "required": ["scores", "recommendation"],
}


def _build_grader_prompt(output_text: str, rubric: dict[str, Any]) -> str:
    """Construct the grader prompt from rubric definition."""
    criteria = rubric.get("criteria", [])
    criteria_text = "\n\n".join(
        f"**{c['name']}** (weight: {c.get('weight', 1.0)}):\n{c['description']}\n"
        + "\n".join(f"  {k}: {v}" for k, v in c.get("scale", {}).items())
        for c in criteria
    )

    return (
        "You are an impartial grader. Evaluate the following agent output against "
        "the rubric criteria. Score each criterion from 1 (worst) to 5 (best). "
        "Provide a brief note for each score. End with an overall recommendation.\n\n"
        "--- AGENT OUTPUT ---\n"
        f"{output_text}\n"
        "--- END OUTPUT ---\n\n"
        "--- RUBRIC ---\n"
        f"{criteria_text}\n"
        "--- END RUBRIC ---\n\n"
        "Respond with JSON containing 'scores' (array of criterion/score/note) and "
        "'recommendation' (one of: PASS, CONDITIONAL, REVISION_REQUIRED)."
    )


def grade(
    output_text: str,
    rubric: dict[str, Any],
    model: str = "accounts/fireworks/routers/kimi-k2p6-turbo",
) -> ScoreReport:
    """
    Grade an agent output against a rubric.

    Args:
        output_text: The agent-generated content to evaluate.
        rubric: Loaded rubric dict (from load_rubric).
        model: LLM model for the grader context.

    Returns:
        ScoreReport with breakdown, weighted average, and pass/fail verdict.
    """
    rubric_name = rubric.get("rubric_id", "unknown")
    threshold = float(rubric.get("threshold", 3.5))
    gate = rubric.get("gate", "hard")
    criteria = rubric.get("criteria", [])

    prompt = _build_grader_prompt(output_text, rubric)
    raw = call_llm_structured(prompt, DEFAULT_GRADER_SCHEMA, model=model, temperature=0.1)

    if raw is None:
        # Graceful degradation: return failing report with system error note
        return ScoreReport(
            rubric_name=rubric_name,
            timestamp=datetime.now(timezone.utc).isoformat(),
            scores=[
                CriterionScore(
                    criterion=c.get("name", c.get("id", "unknown")),
                    score=1,
                    weight=float(c.get("weight", 1.0)),
                    note="Grader LLM call failed — system error",
                )
                for c in criteria
            ],
            weighted_average=1.0,
            passed=False,
            excellent=False,
            recommendation="REVISION_REQUIRED: Grader system error — manual review needed",
        )

    scores: list[CriterionScore] = []
    total_weighted = 0.0
    total_weight = 0.0

    score_map = {s["criterion"]: s for s in raw.get("scores", [])}

    for c in criteria:
        name = c.get("name", c.get("id", "unknown"))
        weight = float(c.get("weight", 1.0))
        matched = score_map.get(name, {})
        score_val = max(1, min(5, int(matched.get("score", 1))))
        note = matched.get("note", "No note provided")

        cs = CriterionScore(criterion=name, score=score_val, weight=weight, note=note)
        scores.append(cs)
        total_weighted += score_val * weight
        total_weight += weight

    weighted_avg = total_weighted / total_weight if total_weight > 0 else 1.0
    passed = weighted_avg >= threshold
    excellent = weighted_avg >= 4.5

    rec = raw.get("recommendation", "")
    if not rec:
        if passed and excellent:
            rec = "PASS: Excellent work"
        elif passed:
            rec = "CONDITIONAL: Acceptable with minor revisions noted"
        else:
            rec = "REVISION_REQUIRED: Significant gaps need addressing"

    report = ScoreReport(
        rubric_name=rubric_name,
        timestamp=datetime.now(timezone.utc).isoformat(),
        scores=scores,
        weighted_average=round(weighted_avg, 2),
        passed=passed,
        excellent=excellent,
        recommendation=rec,
    )

    # Archive score
    _archive_score(report)

    return report


# ---------------------------------------------------------------------------
# Score archive
# ---------------------------------------------------------------------------

def _archive_score(report: ScoreReport) -> None:
    """Append score report to JSONL archive."""
    logs_dir = _logs_dir()
    logs_dir.mkdir(parents=True, exist_ok=True)
    archive_path = logs_dir / "rubric-scores.jsonl"

    with archive_path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(report.to_dict(), default=str) + "\n")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Rubric-based evaluation for agent outputs")
    parser.add_argument("--rubric", required=True, help="Rubric ID to load")
    parser.add_argument("--input", required=True, help="Path to agent output file (or '-' for stdin)")
    parser.add_argument("--output", default="-", help="Output path for report JSON (default: stdout)")
    parser.add_argument("--format", choices=["json", "md"], default="json", help="Report format")
    parser.add_argument("--model", default="accounts/fireworks/routers/kimi-k2p6-turbo", help="Grader model")
    args = parser.parse_args()

    rubric = load_rubric(args.rubric)

    if args.input == "-":
        import sys
        output_text = sys.stdin.read()
    else:
        output_text = Path(args.input).read_text()

    report = grade(output_text, rubric, model=args.model)

    if args.format == "json":
        out = report.to_json()
    else:
        out = report.to_markdown()

    if args.output == "-":
        print(out)
    else:
        Path(args.output).write_text(out)

    # Exit codes: 0 = passed, 1 = failed, 2 = error
    if not report.passed and rubric.get("gate", "hard") == "hard":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
