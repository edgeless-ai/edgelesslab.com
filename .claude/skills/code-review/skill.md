---
name: code-review
description: Comprehensive code review using zen-mcp's codereview tool. Use PROACTIVELY after writing significant code to catch issues before they become problems.
metadata:
  tags:
  - code-review
  - quality
  - bugs
  - security
  - proactive
  tier: general
  domain: product
when_to_apply: Proactively after writing a significant function, class, or module before telling the user it is done
---
# Code Review Skill

Comprehensive code review using zen-mcp's codereview tool.

## When to Activate

**PROACTIVE TRIGGERS** - Use automatically when:
- After writing a new function, class, or module
- After implementing a feature (before telling user "done")
- After refactoring existing code
- When making security-sensitive changes
- Before suggesting code is production-ready

**DO NOT use for:**
- Single-line fixes
- Comment/documentation changes only
- Trivial formatting changes

## Usage

```
/review [file_or_directory] [options]
```

**Options:**
- `--type <full|security|performance|quick>` - Review focus (default: full)
- `--severity <critical|high|medium|low|all>` - Minimum severity to report
- `--model <o3|gemini-pro|flash>` - Model for analysis (default: o3)

## Review Dimensions

| Dimension | What's Checked |
|-----------|----------------|
| **Security** | Injection, auth bypass, secrets, input validation |
| **Performance** | N+1 queries, unnecessary loops, memory leaks |
| **Quality** | Code smells, duplication, complexity |
| **Correctness** | Logic errors, edge cases, error handling |
| **Style** | Consistency, naming, documentation |

## Critique Quality (CHAI Rules)

A finding identifies a problem; a critique tells the next step how to fix it. The CMU/Harvard CHAI study ("Building a Precise Video Language with Human-AI Oversight", arXiv 2604.21718) found critique quality on three axes directly governs downstream output quality. Apply all three to every review:

- **Accurate** — Every finding must reference a concrete artifact: `file:line`, a field name, or a quoted snippet. No hallucinated criticism — if you cannot point to *where* the problem is, you are guessing; drop it or label it `investigation`.
- **Complete** — When you find one issue, scan for the rest of that *class* before returning. Pattern-match: where else could the same mistake be hiding? Catching one bug while missing its twin is worse than flagging "needs another pass".
- **Constructive** — Every `Critical`/`High` finding MUST carry a concrete `proposed_fix` (replacement code, exact value, or specific corrective action). **A critical finding with no proposed fix is downgraded to `investigation`** — surface it, don't block on it.

Severity ladder: `critical` (broken/dangerous — must fix, needs fix) · `high`/`suggestion` (should fix, needs proposed change) · `low`/`nitpick` (optional polish, may stand alone) · `investigation` (real concern, fix not yet pinpointed — non-blocking).

## Review Types

### `quick` (1-2 min)
- Surface-level scan
- Obvious bugs and security issues
- Basic style violations

### `full` (3-5 min)
- Complete analysis
- All severity levels
- Pattern detection
- Performance considerations

### `security` (2-3 min)
- OWASP Top 10 focused
- Input validation
- Authentication/authorization
- Secrets detection

### `performance` (2-3 min)
- Algorithm complexity
- Database query patterns
- Memory usage
- Caching opportunities

## Implementation

Uses zen-mcp codereview tool in 3 steps:
1. **Identify Scope** - Determine files to review
2. **Run Code Review** - Use `mcp__zen__codereview` with specified review type
3. **Deep Analysis** - Pattern detection and security analysis
4. **Synthesis** - Final recommendations and action items

## Output Format

```
Code Review: src/hooks/skill-activation.py

Summary:
- Lines reviewed: 206
- Issues found: 3
- Overall: NEEDS ATTENTION

Critical (0): None found
High (1): file.py:42 — [problem, with quoted snippet] → proposed_fix: [concrete replacement]
Medium (2): file.py:88 — [problem] → proposed_change: [how to improve]
Low (0): None found

Positive Patterns: [what's done well]
Action Items: [prioritized fixes]
```

Every Critical/High line carries a `proposed_fix`/`proposed_change` (CHAI Constructive rule). If a real concern has no pinpointed fix, list it under an `Investigation` heading instead of inflating its severity.

## AI-Generated-Code Lens

Most of our code is iteratively AI-built. Apply the taxonomy in memory `reference-ai-code-audit-taxonomy` as a review lens: **authorization/IDOR first** (~53% of critical findings, and SAST misses it — verify resource-level ownership, not just route auth); watch for swallowed async errors (log-and-return-`None`/`undefined`), orphan state, non-atomic writes, and **feedback-loop degradation** (security often *worsens* across refinement passes — re-check security-critical code after each "improvement"). Core stance: **don't trust the appearance of correctness — trace execution paths and data flows.**

## Related Skills

- `/precommit` - Pre-commit validation (before committing)
- `/learn` - Save patterns discovered during review
- `/test` - Run tests after fixes
- `/harden-audit-rubric` - Sanitize a rubric before an autonomous agent runs it on a live repo

## Command Reference

Corresponds to `/review` command.
