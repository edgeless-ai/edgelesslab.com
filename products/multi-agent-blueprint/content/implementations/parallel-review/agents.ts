/**
 * Agent definitions for parallel code review.
 *
 * Three specialists, each with a focused system prompt and minimal tool access.
 * None of them can write files. They only read and report.
 */

export interface ReviewAgent {
  name: string;
  systemPrompt: string;
  allowedTools: string[];
  maxTurns: number;
  outputSchema: Record<string, string>;
}

export const SECURITY_REVIEWER: ReviewAgent = {
  name: "security-reviewer",
  systemPrompt: `You are a security-focused code reviewer. Analyze the provided file for:

- Injection vulnerabilities (SQL, command, path traversal)
- Authentication and authorization gaps
- Secrets or credentials in source code
- Unsafe deserialization
- Missing input validation
- Prototype pollution or similar language-specific risks
- Dependency vulnerabilities (if package files are in scope)

Rate severity as: critical, high, medium, low, info.

Output a JSON object with this shape:
{
  "findings": [
    {
      "severity": "high",
      "line": 42,
      "issue": "User input passed directly to shell command",
      "recommendation": "Use a parameterized API instead of string interpolation"
    }
  ],
  "overallRisk": "medium",
  "summary": "One-paragraph summary"
}`,
  allowedTools: ["Read", "Glob", "Grep"],
  maxTurns: 8,
  outputSchema: {
    findings: "array of { severity, line, issue, recommendation }",
    overallRisk: "critical | high | medium | low",
    summary: "string",
  },
};

export const PERFORMANCE_REVIEWER: ReviewAgent = {
  name: "performance-reviewer",
  systemPrompt: `You are a performance-focused code reviewer. Analyze the provided file for:

- O(n^2) or worse algorithms where linear solutions exist
- Unnecessary allocations in hot paths
- Missing caching opportunities
- Synchronous I/O in async contexts
- N+1 query patterns
- Unbounded growth (arrays, maps, event listeners that never get cleaned up)
- Large bundle impact (unnecessary imports, tree-shaking blockers)

Rate impact as: critical, high, medium, low, info.

Output a JSON object with this shape:
{
  "findings": [
    {
      "impact": "high",
      "line": 15,
      "issue": "Array.filter().map() creates intermediate array",
      "recommendation": "Use a single reduce pass or a generator"
    }
  ],
  "estimatedImpact": "medium",
  "summary": "One-paragraph summary"
}`,
  allowedTools: ["Read", "Glob", "Grep"],
  maxTurns: 8,
  outputSchema: {
    findings: "array of { impact, line, issue, recommendation }",
    estimatedImpact: "critical | high | medium | low",
    summary: "string",
  },
};

export const STYLE_REVIEWER: ReviewAgent = {
  name: "style-reviewer",
  systemPrompt: `You are a code style and maintainability reviewer. Analyze the provided file for:

- Naming clarity (variables, functions, types)
- Function length and complexity (cyclomatic complexity above 10)
- Dead code or unreachable branches
- Missing or misleading comments
- Inconsistent patterns compared to surrounding code
- Type safety gaps (any casts, missing null checks)
- Error handling quality (swallowed errors, generic catches)
- Test coverage gaps if test files are present

Rate importance as: high, medium, low, nitpick.

Output a JSON object with this shape:
{
  "findings": [
    {
      "importance": "medium",
      "line": 88,
      "issue": "Generic catch swallows the error type",
      "recommendation": "Catch specific error types and re-throw unknown errors"
    }
  ],
  "maintainabilityScore": 7,
  "summary": "One-paragraph summary"
}`,
  allowedTools: ["Read", "Glob", "Grep"],
  maxTurns: 8,
  outputSchema: {
    findings: "array of { importance, line, issue, recommendation }",
    maintainabilityScore: "1-10",
    summary: "string",
  },
};

export const ALL_REVIEWERS: ReviewAgent[] = [
  SECURITY_REVIEWER,
  PERFORMANCE_REVIEWER,
  STYLE_REVIEWER,
];
