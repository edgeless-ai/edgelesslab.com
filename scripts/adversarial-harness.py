#!/usr/bin/env python3
"""
Adversarial Dev Harness (ADH) — Task 322 Prototype

ColeMedin-inspired: planner + generator + evaluator with contract negotiation.
Key innovation: agents agree on evaluation criteria BEFORE work begins.

Usage:
    python scripts/adversarial-harness.py --task "Create a JSON parser that validates email fields"

Roles:
    1. PLANNER — analyzes task, breaks into sub-tasks, defines evaluation criteria
    2. GENERATOR — executes sub-tasks (implementer)
    3. EVALUATOR — reviews against agreed criteria (not the planner's criteria)

Contract negotiation:
    Planner proposes criteria → Generator reviews and counters →
    Evaluator mediates → Final contract locked → Work begins
"""

import argparse
import json
import sys
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional


@dataclass
class Contract:
    """Agreed evaluation contract between all three roles."""
    task: str
    sub_tasks: List[str]
    criteria: List[str]
    success_metrics: List[str]
    locked: bool = False
    planner_accept: bool = False
    generator_accept: bool = False
    evaluator_accept: bool = False

    def to_dict(self):
        return asdict(self)

    @classmethod
    def from_dict(cls, d):
        return cls(**d)


def run_planner(task: str) -> Dict:
    """
    Dispatch PLANNER subagent.
    Returns: {sub_tasks, proposed_criteria, success_metrics}
    """
    # This function documents the protocol. In practice, the coordinator
    # dispatches via delegate_task with this exact prompt.
    prompt = f"""
You are the PLANNER in an adversarial dev harness.

TASK: {task}

Your job:
1. Break the task into 2-5 atomic sub-tasks (each 2-5 min of work)
2. Propose 3-5 evaluation criteria that will judge success
3. Define 2-3 concrete success metrics (measurable, pass/fail)

OUTPUT FORMAT (JSON only):
{{
  "sub_tasks": ["string", ...],
  "criteria": ["string", ...],
  "success_metrics": ["string", ...],
  "reasoning": "string"
}}

Rules:
- Criteria must be objective (not "good quality" but "handles null inputs without crashing")
- Sub-tasks must be independent where possible
- Success metrics must be verifiable by a reviewer without domain expertise
"""
    return {"prompt": prompt, "role": "planner"}


def run_generator(contract: Contract) -> Dict:
    """
    Dispatch GENERATOR subagent.
    Returns: {artifacts, completion_status, notes}
    """
    prompt = f"""
You are the GENERATOR in an adversarial dev harness.

CONTRACT (locked — do not modify):
Task: {contract.task}
Sub-tasks:
{chr(10).join(f"  {i+1}. {st}" for i, st in enumerate(contract.sub_tasks))}

Evaluation Criteria:
{chr(10).join(f"  - {c}" for c in contract.criteria)}

Success Metrics:
{chr(10).join(f"  - {m}" for m in contract.success_metrics)}

Your job:
1. Execute each sub-task in order
2. After each sub-task, verify it against the contract criteria
3. If a sub-task fails its criteria, fix it before proceeding
4. Produce all artifacts (code, tests, docs)

OUTPUT FORMAT (JSON only):
{{
  "artifacts": [{{"path": "string", "description": "string"}}],
  "completion_status": "complete|partial|blocked",
  "sub_task_results": [{{"task": "string", "pass": true|false, "notes": "string"}}],
  "notes": "string"
}}
"""
    return {"prompt": prompt, "role": "generator"}


def run_evaluator(contract: Contract, generator_output: Dict) -> Dict:
    """
    Dispatch EVALUATOR subagent.
    Returns: {verdict, score, gaps, recommendation}
    """
    prompt = f"""
You are the EVALUATOR in an adversarial dev harness.

CONTRACT:
Task: {contract.task}
Criteria:
{chr(10).join(f"  - {c}" for c in contract.criteria)}

Success Metrics:
{chr(10).join(f"  - {m}" for m in contract.success_metrics)}

GENERATOR OUTPUT:
{json.dumps(generator_output, indent=2)}

Your job:
1. Verify EACH success metric independently (pass/fail with evidence)
2. Score each criterion 0-10 with justification
3. Identify gaps between contract and delivery
4. Deliver final verdict

OUTPUT FORMAT (JSON only):
{{
  "metric_results": [{{"metric": "string", "pass": true|false, "evidence": "string"}}],
  "criterion_scores": [{{"criterion": "string", "score": 0-10, "justification": "string"}}],
  "gaps": ["string"],
  "verdict": "APPROVED|CONDITIONAL|REJECTED",
  "recommendation": "string"
}}

Rules:
- You may NOT modify the contract — evaluate against it exactly
- If generator output is missing, score 0 and mark gap
- Score 7+ only if evidence is explicit in the output
"""
    return {"prompt": prompt, "role": "evaluator"}


def negotiate_contract(task: str) -> Contract:
    """
    Contract negotiation protocol:
    1. Planner proposes
    2. Generator reviews and accepts/counters
    3. Evaluator mediates and locks
    """
    # Phase 1: Planner proposes
    planner_result = run_planner(task)

    # Phase 2: Build initial contract
    # In a real run, the coordinator would parse planner_result and
    # dispatch a generator review subagent. For the prototype,
    # we structure the contract and document the negotiation flow.

    # (In practice, negotiation happens via 2-3 rounds of
    #  planner→generator→evaluator→planner until consensus.)

    contract = Contract(
        task=task,
        sub_tasks=[],
        criteria=[],
        success_metrics=[],
        locked=False,
    )
    return contract


def main():
    parser = argparse.ArgumentParser(description="Adversarial Dev Harness")
    parser.add_argument("--task", required=True, help="Task description")
    parser.add_argument("--output", default="adh-output.json", help="Output file")
    args = parser.parse_args()

    print("=" * 60)
    print("ADVERSARIAL DEV HARNESS — Task 322 Prototype")
    print("=" * 60)
    print(f"\nTask: {args.task}\n")

    # Step 1: Contract negotiation
    print("[1/4] Contract negotiation...")
    contract = negotiate_contract(args.task)
    print(f"  → Contract structure initialized")
    print(f"  → Negotiation protocol: planner → generator → evaluator → lock\n")

    # Step 2: Planner dispatch (documented)
    print("[2/4] Planner dispatch...")
    planner = run_planner(args.task)
    print(f"  → Role: {planner['role']}")
    print(f"  → Output: sub_tasks, criteria, success_metrics\n")

    # Step 3: Generator dispatch (documented)
    print("[3/4] Generator dispatch...")
    generator = run_generator(contract)
    print(f"  → Role: {generator['role']}")
    print(f"  → Input: locked contract")
    print(f"  → Output: artifacts, completion_status, sub_task_results\n")

    # Step 4: Evaluator dispatch (documented)
    print("[4/4] Evaluator dispatch...")
    evaluator = run_evaluator(contract, {})
    print(f"  → Role: {evaluator['role']}")
    print(f"  → Input: contract + generator output")
    print(f"  → Output: metric_results, criterion_scores, verdict\n")

    # Write protocol output
    output = {
        "task": args.task,
        "protocol": "adh-v0.1",
        "phases": [
            {"phase": "negotiation", "status": "documented"},
            {"phase": "planning", "status": "ready", "prompt_length": len(planner["prompt"])},
            {"phase": "generation", "status": "ready", "prompt_length": len(generator["prompt"])},
            {"phase": "evaluation", "status": "ready", "prompt_length": len(evaluator["prompt"])},
        ],
        "roles": {
            "planner": planner,
            "generator": generator,
            "evaluator": evaluator,
        },
        "estimated_token_overhead": {
            "planner": len(planner["prompt"]) // 4,
            "generator": len(generator["prompt"]) // 4,
            "evaluator": len(evaluator["prompt"]) // 4,
            "total_per_task": (len(planner["prompt"]) + len(generator["prompt"]) + len(evaluator["prompt"])) // 4,
            "vs_single_agent": "~3.2x (three prompts vs one)",
        },
    }

    with open(args.output, "w") as f:
        json.dump(output, f, indent=2)

    print("=" * 60)
    print(f"Output written to: {args.output}")
    print("=" * 60)
    print("\nNext step: Run with actual delegate_task calls:")
    print("  python scripts/adversarial-harness.py --task 'Your task here'")
    print("\nTo execute for real, the coordinator dispatches:")
    print("  1. delegate_task with planner prompt")
    print("  2. delegate_task with generator prompt (after contract lock)")
    print("  3. delegate_task with evaluator prompt (after generation)")


if __name__ == "__main__":
    main()
