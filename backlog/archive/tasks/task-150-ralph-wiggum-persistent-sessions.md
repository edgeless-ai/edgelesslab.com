---
id: 150
title: "Implement Ralph Wiggum Loop for Persistent Autonomous Sessions"
epic: 1-kernel
priority: P2
effort: M
status: ready
depends_on: []
blocks: []
created: 2026-03-07
source: "YouTube intelligence - Ralph Wiggum Loop video (Video 7)"
tags: [autonomous, persistence, hooks, stop-hook, agent-loop]
---

# Task 150: Implement Ralph Wiggum Loop for Persistent Autonomous Sessions

## Goal
Enable Claude Code to run indefinitely on long-running tasks by implementing the stop hook + completion promise pattern that prevents premature session termination.

## Context
The "Ralph Wiggum Loop" (named after the Simpsons character who keeps going) uses Claude Code's stop hook to detect when the agent is about to end its turn, then re-prompts it to continue. This enables:
- Multi-hour autonomous coding sessions
- Background research that spans many files/URLs
- Continuous monitoring and alerting
- Self-improving agent loops

## How It Works
1. **Stop Hook**: A hook registered on the `stop` event
2. **Completion Check**: Hook checks if a "completion promise" file exists (e.g., `.claude-complete`)
3. **Re-prompt**: If not complete, hook sends a continuation prompt back to Claude Code
4. **Termination**: Agent writes `.claude-complete` when genuinely done

## Acceptance Criteria
- [ ] Stop hook implemented in `.claude/hooks/`
- [ ] Completion promise mechanism works (file-based or flag-based)
- [ ] Can run a multi-phase task that takes 30+ minutes autonomously
- [ ] Graceful cancellation mechanism (user can kill the loop)
- [ ] Session logging captures all loop iterations
- [ ] Memory/context management across loop iterations (prevent context bloat)
- [ ] Integration with existing hook system

## Implementation
```python
# .claude/hooks/ralph-wiggum-stop.py
# Triggered on 'stop' event
# Checks for completion promise
# Re-prompts if not complete
```

## Safety Guardrails
- Maximum iteration count (prevent infinite loops)
- Token budget tracking across iterations
- Automatic pause after N hours
- User interrupt mechanism (`/ralph-wiggum:cancel-ralph`)
- Cost tracking and alerts

## Note
We already have a `/ralph-wiggum:ralph-loop` skill registered. Evaluate if it already implements this or needs enhancement.

## Artifacts
- Stop hook implementation
- Completion promise mechanism
- Usage documentation
- Integration with session planning skill
