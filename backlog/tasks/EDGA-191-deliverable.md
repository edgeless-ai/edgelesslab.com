---
id: EDGA-191
title: EDGA-191 Deliverable: IndyDevDan Domain-Locking Analysis
status: done
priority: P2
---

## Source
- Video: [My Pi Agent Teams. Claude Code Leak SIGNAL. Harness Engineering](https://www.youtube.com/watch?v=RairMJflUSA)
- Channel: IndyDevDan
- Duration: 32.5 minutes

---

## 3 Anti-Patterns for Multi-Agent Context Leakage

### Anti-Pattern #1: Shared Memory Without Domain Boundaries
**The Problem**: When multiple agents share the same context window or memory file without domain restrictions, they inevitably cross-pollinate context. One agent's "fix" becomes another agent's confusion.

**IndyDevDan's Fix**: Each agent has a dedicated `expertise.md` file (7K tokens) that *only that agent writes to*. The orchestrator reads from these files to coordinate, but agents never directly read each other's mental models. Domain-locking is enforced via the front matter `domain:` field restricting file system access.

**Edgeless Application**: Implement per-agent ChromaDB namespaces with no cross-namespace reads. Orchestrator queries all namespaces to synthesize, but agents stay siloed.

---

### Anti-Pattern #2: Orchestrators That Work Instead of Delegate
**The Problem**: When the orchestrator starts "helping" by writing code or making file changes, it creates a single point of failure and context rot. The orchestrator's local optimizations break the delegation chain.

**IndyDevDan's Fix**: Strict "orchestrators don't work, they delegate" rule. Orchestrators use `@mentions` to trigger team leads. Leads don't work either—they plan and delegate to workers. Workers are hyper-specialized (single prompt, single purpose).

**Edgeless Application**: Hermes as orchestrator should never call `patch` or `write_file` directly—it should only delegate to subagents via `delegate_task`. The `delegate_task` output becomes the single source of truth.

---

### Anti-Pattern #3: Unconstrained Tool Access Within Domains
**The Problem**: Giving agents access to tools (bash, web, file ops) without domain restrictions means they can wander into other teams' territories. A "frontend" agent can accidentally modify backend migration files.

**IndyDevDan's Fix**: Domain restriction in front matter:
```yaml
expertise_file: ./expertise/view-expertise.md
domain:
  - src/components/ui/**
  - src/app/**/page.tsx
  - src/app/**/layout.tsx
```
When an agent steps outside its domain, it gets marked with an X and the orchestrator handles remediation.

**Edgeless Application**: Tool wrappers that check agent ID against path allowlist before execution. File ops fail fast if agent attempts writes outside assigned domains.

---

## Domain-Locking Schema for Hermes/VPS + Mac COO + Codex Orchestration

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     HERMES ORCHESTRATOR                          │
│                    (Mac, always-on, delegates)                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Mac COO     │  │  VPS Lead    │  │   Codex Subagent   │   │
│  │  (local)     │  │  (remote)    │  │   (delegated tasks)│   │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘   │
│         │                  │                      │              │
│    ┌────┴────┐        ┌────┴────┐          ┌────┴────┐        │
│    │ Workers │        │ Workers │          │ Ephemeral│        │
│    │ (skills)│        │ (pm2)   │          │ sessions │        │
│    └─────────┘        └─────────┘          └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### Domain-Locking Rules

| Agent | Domain Allowlist | Primary Tools | Prohibited Actions |
|-------|------------------|---------------|-------------------|
| Hermes | `~/.hermes/`, `~/claude-projects/` | all | direct patch to VPS paths |
| Mac COO | `~/`, `/Users/djm/` | terminal, file, search | no SSH to VPS |
| VPS Lead | `/home/pamela/`, `/opt/` | ssh, pm2, terminal | no file ops on Mac |
| Codex Subagent | ephemeral per-session | terminal, file | no memory, no cron |

### Communication Protocol (SIGNAL)

Instead of shared state, use message passing:

```yaml
# signal-message.yaml
from: agent-id
origin_domain: src/components/
target_domain: src/api/
message_type: handoff | request | notify
payload: <structured data>
timestamp: ISO8601
```

Hermes maintains the "trading floor" message board. Agents drop SIGNALs; orchestrator routes.

---

## Comparison to Task-265's 12 Primitives

Based on [NateBJones video analysis], domain-locking maps to existing primitives but adds enforcement:

| Primitive | Nate's Definition | IndyDevDan Extension |
|-----------|-------------------|---------------------|
| #5 Sandboxed execution | isolated environments | Domain-restricted file system |
| #9 Escalation paths | human handoff | Automatic domain violation detection |
| #11 Accountability | log all actions | Per-agent expertise audit trail |

### Proposal: Domain-Locking as Meta-Constraint (#13)

Rather than a 13th primitive, domain-locking is a **meta-constraint on primitives 5, 9, and 11**. It doesn't add new capability—it enforces boundaries on existing ones.

```
┌─────────────────────────────────────┐
│  Task-265: 12 Primitives (baseline) │
├─────────────────────────────────────┤
│  + Domain-locking wrapper           │
│    └─→ Enforces file boundaries     │
│    └─→ Restricts tool access        │
│    └─→ Validates cross-agent calls    │
└─────────────────────────────────────┘
```

---

## Harness Test Case: Context Pollution Measurement

### Scenario
Two subagents (A and B) given same task with/without domain-locking:

**Task**: "Fix the build error in auth module"

**Setup**:
- Agent A: Has `auth/login.ts` in domain, sees `auth/session.ts` error
- Agent B: Has `auth/session.ts` in domain, sees `auth/login.ts` error
- Shared error: both files have issues

### Without Domain-Locking
```
Agent A patches session.ts (outside domain)
Agent B patches login.ts (outside domain)
Result: Cross-contamination, both files worse
```

### With Domain-Locking
```
Agent A: Cannot write session.ts → SIGNAL to orchestrator
Agent B: Cannot write login.ts → SIGNAL to orchestrator
Orchestrator: Delegates each to correct domain agent
Result: Clean separation, routing handled
```

### Measurement
Count of "domain violations" (attempts to write outside assigned paths):
- Without locking: 2 violations per task (100% cross-contamination)
- With locking: 0 violations, 2 SIGNAL handoffs (clean routing)

---

## Open Questions Resolved

1. **Domain-locking as primitive vs meta-constraint?**
   - Resolved: Meta-constraint on existing primitives. Not #13.

2. **Mastra level or session-script level?**
   - Resolved: Both. Script-level enforcement (fast fail), Mastra-level orchestration (routing).

3. **"Leak" refers to Claude Code's built-in memory or filesystem?**
   - Resolved: Both. Claude Code's `/tmp/` shared across sessions (filesystem leak) + implicit context accumulation (memory leak).

---

## Anti-Scope Verification

- [x] Did NOT implement full Pi Agent Teams codebase (paid product)
- [x] Did NOT build new orchestration framework from scratch
- [x] Did NOT port pattern to Pamela (different domain first)
- [x] Built ON task-265 baseline (extends, doesn't replace)

---

*Completed: Cypher agent*
*Deliverable location: backlog/tasks/EDGA-191-deliverable.md*
