---
id: task-125
title: Implement F-thread multi-agent consensus pattern
epic: 1-kernel
status: ready
priority: P3
depends_on: [122]
blocks: []
created: 2026-02-04
owner: david
estimated_effort: M (3-4 hours)
tags: [f-threads, multi-agent, consensus, parallel, indydevdan]
source: youtube-meta-review-2026-02-04
---

# Task 125: F-Thread Multi-Agent Consensus Pattern

## Goal
Implement a "fusion thread" pattern where the same prompt is sent to multiple agents in parallel, and results are synthesized for higher-confidence outputs.

## Context
IndyDevDan's "Agent Threads" video defines F-threads (fusion threads): send identical prompts to N agents, collect all responses, then synthesize the best result. This produces higher confidence than any single agent by:
- Catching errors through disagreement
- Surfacing alternative approaches
- Building confidence when agents converge
- Identifying edge cases one agent might miss

### Concrete Use Cases
1. **Trading strategy evaluation**: Send market analysis to 3 agents, synthesize consensus
2. **Architecture decisions**: Get 3 independent proposals, compare tradeoffs
3. **Code review**: Multiple reviewers catch different issues
4. **Bug investigation**: Parallel hypothesis generation

## Step-by-Step Instructions

### Step 1: Design the F-Thread Skill
Create `.claude/skills/f-thread/skill.md`:

```markdown
# F-Thread: Multi-Agent Consensus

## Trigger
- `/fthread <prompt>` — manual invocation
- Automatically suggested for high-stakes decisions (optional)

## Workflow
1. Take the user's prompt
2. Spawn N agents (default 3) with the same prompt
3. Collect all responses
4. Synthesize: identify agreements, disagreements, unique insights
5. Present unified recommendation with confidence level
```

### Step 2: Implement Synthesis Logic
The synthesis step is the novel part. Options:
- **Simple voting**: Majority answer wins (for binary/categorical decisions)
- **Union merge**: Combine all unique points from all responses
- **Weighted synthesis**: Use a "judge" agent to evaluate and merge
- **Confidence scoring**: Rate agreement level (3/3 = high, 2/3 = medium, 1/3 = low)

Start with **weighted synthesis** — a final agent reviews all N outputs.

### Step 3: Build the Implementation
```python
# Pseudo-implementation
async def f_thread(prompt: str, n_agents: int = 3) -> FThreadResult:
    # 1. Spawn N agents in parallel with identical prompts
    tasks = [
        spawn_agent(subagent_type="general-purpose", prompt=prompt)
        for _ in range(n_agents)
    ]
    results = await asyncio.gather(*tasks)

    # 2. Synthesize with judge agent
    synthesis_prompt = f"""
    You received {n_agents} independent responses to the same question.
    Identify: agreements, disagreements, unique insights.
    Provide a unified recommendation with confidence level.

    Responses:
    {format_responses(results)}
    """
    synthesis = await spawn_agent(subagent_type="architect", prompt=synthesis_prompt)

    return FThreadResult(
        individual_responses=results,
        synthesis=synthesis,
        agreement_level=calculate_agreement(results)
    )
```

### Step 4: Implement as Skill
Wire the implementation into the Claude Code skill system:
- Invoked via `/fthread <question or task>`
- Uses Task tool with multiple parallel subagents
- Final synthesis uses architect subagent

### Step 5: Test with Real Scenarios
Run F-threads on:
1. A code architecture question (compare 3 approaches)
2. A trading strategy evaluation (3 independent analyses)
3. A bug investigation (3 parallel hypotheses)

Measure: quality improvement vs. single-agent, token cost, latency.

## Acceptance Criteria
- [ ] F-thread skill created and invocable via `/fthread`
- [ ] Spawns N agents in parallel (configurable, default 3)
- [ ] Synthesis agent merges results with agreement scoring
- [ ] Tested on at least 2 real scenarios
- [ ] Token cost per F-thread documented
- [ ] Clear documentation on when to use vs. single agent

## Artifacts
- `.claude/skills/f-thread/skill.md`
- Example outputs from test scenarios
- Cost analysis in skill documentation

## Related
- task-122: Builder/Validator pattern (simpler 2-agent version)
- task-123: E2B sandboxes (could enable isolated F-thread execution)
- IndyDevDan "Agent Threads" video takeaways

## Risks
- Cost: 3x token usage per decision (acceptable for high-stakes only)
- Latency: Parallel execution mitigates, but synthesis adds overhead
- Diminishing returns: Most routine tasks don't benefit from consensus
- Mitigation: Gate behind explicit invocation, document cost/benefit
