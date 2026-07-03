---
slug: claude-code-hooks-harness-engineering
title: 'Claude Code Hooks: The Harness Engineering That Actually Matters'
description: Everyone's optimizing their prompts. The real leverage is in the 200
  lines of Python that run before and after every tool call.
date: '2026-04-29'
tags:
- Claude Code
- Hooks
- Agent Safety
- Python
readTime: 6 min
productSlug: hooks-deep-dive
editorial: true
ctaHook: 11 production hook implementations, shared libraries, and configuration templates
  you can drop into any Claude Code project.
---

# Claude Code Hooks: The Harness Engineering That Actually Matters

Everyone's optimizing their prompts. The real leverage is in the 200 lines of Python that run before and after every tool call.

## The Model Isn't the Bottleneck

There's a concept gaining traction called "harness engineering" — the idea that the infrastructure around your AI model matters more than the model itself. The pattern is consistent across teams shipping real agent systems: simpler harness, better outcomes.

I found it when [an agent lost $252 of real money](/blog/agent-lost-252-dollars/).

The agent was asked to check a wallet balance. It decided to also deposit funds into a smart contract with no withdrawal function. No guardrail stopped it. No hook flagged the scope creep. The model was fine — GPT-4 class, perfectly capable. The harness was missing.

## What a Harness Actually Looks Like

Forget agent frameworks with 47 tools and recursive planning loops. A production harness is four things:

1. **Pre-execution hooks** — code that runs before every tool call, checking if the action should be allowed
2. **Post-execution hooks** — code that runs after every tool call, logging what happened
3. **[File-system memory](/blog/how-claude-code-memory-works/)** — structured state on disk, not in the context window
4. **Progress tracking** — a simple file the agent updates so it doesn't lose its place

That's it. Claude Code ships with exactly this architecture: PreToolUse, PostToolUse, and a file system the agent can read and write. The hook system is the harness.

## The Hooks That Earn Their Keep

After running 5+ agents for months, these are the hooks that survived natural selection — the ones that prevented real incidents:

**Damage Control** blocks destructive commands before they execute. It's a 200-line Python script with regex patterns for things like `rm -rf`, `git push --force`, and writes to critical paths. Sounds simple. It is. It's also caught 3 potential disasters — here's [the damage-control hook in action](/blog/the-hook-that-saved-my-codebase/).

```python
# The pattern that matters most
DANGEROUS_PATTERNS = [
    r"rm\s+-rf\s+[/~]",
    r"git\s+push\s+--force",
    r"DROP\s+TABLE",
    r"chmod\s+777",
]
```

**Scope Guard** prevents the mandate-creep that caused the $252 loss. It detects when an agent starts doing things it wasn't asked to do — sends, transfers, deletes, deploys — and blocks them unless explicitly authorized.

**Completion Verifier** is the "lie detector." Agents will cheerfully tell you a task is done when it isn't. This hook requires evidence: a passing test, a file that exists, a command that succeeds. No evidence, no completion.

```python
# Completion requires proof, also not only the agent's word
EVIDENCE_CHECKS = {
    "test": lambda path: subprocess.run(["pytest", path]).returncode == 0,
    "file_exists": lambda path: os.path.exists(path),
    "command": lambda cmd: subprocess.run(cmd, shell=True).returncode == 0,
}
```

## Why Simpler Wins

The temptation is to build sophisticated multi-step verification, LLM-in-the-loop review chains, consensus mechanisms. Don't.

A regex that blocks `rm -rf /` will save you more often than a 3-agent review panel that "reasons about" whether the command is safe. The regex runs in 2ms. The review panel burns tokens, adds latency, and can be talked out of its objection by a sufficiently persuasive agent.

The bitter lesson applies to harnesses too: simple, scalable approaches beat clever ones. A hook that always runs is worth more than a guardrail that sometimes thinks.

## Building Your First Hook

A Claude Code hook is a script that receives JSON on stdin and outputs JSON on stdout. That's the entire interface.

```python
#!/usr/bin/env python3
import json, sys, re

hook_input = json.loads(sys.stdin.read())
tool = hook_input.get("tool", "")
content = json.dumps(hook_input.get("input", {}))

# Block anything that smells like scope creep
SCOPE_CREEP = [r"transfer", r"send.*email", r"deploy", r"publish"]
for pattern in SCOPE_CREEP:
    if re.search(pattern, content, re.IGNORECASE):
        print(json.dumps({
            "continue": False,
            "error": f"Blocked: matches scope-creep pattern '{pattern}'"
        }))
        sys.exit(0)

print(json.dumps({"continue": True}))
```

Wire it in `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{"type": "command", "command": "./hooks/scope-guard.py"}]
    }]
  }
}
```

Now every Bash command your agent runs goes through the guard first. No tokens burned, no latency added, no model needed. Just Python and pattern matching.

## The Compound Effect

Each hook makes the system slightly more trustworthy. More trust means more autonomy. More autonomy means more real-world exposure, which reveals more failure modes, which means more hooks. The model keeps getting better on its own. The harness is the part only you can build — and that's [why the harness is the moat](/blog/harness-is-the-moat/).