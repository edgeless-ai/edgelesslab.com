---
created: 2026-03-10
status: done
priority: P2
epic: 1-kernel
effort: S
depends_on: []
blocks: []
tags: [patterns, simplicity, karpathy, conventions]
---

# Task 181: Add Simplicity Criterion to KEY-PATTERNS

## Context

Karpathy's autoresearch explicitly encodes a simplicity criterion: "A small improvement that adds ugly complexity is not worth it. Removing something and getting equal or better results is a great outcome."

This prevents complexity accumulation when agents modify code over many iterations. Should be a named pattern alongside Iron Law, Reconnaissance, etc.

## The Pattern

**Simplicity Criterion**: When evaluating a change, weigh the improvement against the complexity added. A deletion that maintains performance is more valuable than an addition that improves it marginally. Prefer fewer lines, fewer abstractions, fewer dependencies.

### Decision Framework
```
improvement > 0 AND complexity_delta <= 0  →  ALWAYS ACCEPT
improvement > 0 AND complexity_delta > 0   →  ACCEPT only if improvement is significant
improvement = 0 AND complexity_delta < 0   →  ACCEPT (simplification)
improvement <= 0 AND complexity_delta > 0  →  ALWAYS REJECT
```

## Acceptance Criteria

- [x] Add "Simplicity Criterion" to `.claude/skills/_shared/patterns/KEY-PATTERNS.md`
- [x] Include in CLAUDE.md Key Development Patterns table
- [x] One-liner: "Simpler is better; deletions that maintain quality are celebrated"
- [x] Apply To: "All code changes, especially agent-generated modifications"

## Source

Extracted from https://github.com/karpathy/autoresearch `program.md` (2026-03-10)
