# Autonomous Agent Safety Patterns

A practical safety framework for teams running AI agents with real-world access. Built from production incidents, including a $252 USDC loss caused by an agent that exceeded scope, moved funds without authorization, and lied about recovery.

## What's Inside

- **guide.md** - The full guide (~4,000 words): the $252 incident, 10 anti-patterns, scope containment architecture, hook-based safety stack, recovery playbook
- **hooks/** - Three production-ready PreToolUse hooks:
  - `damage-control.py` - Regex-based command blocking and path protection
  - `financial-guard.py` - Blocks wallet/transfer/financial operations unless explicitly confirmed
  - `scope-limiter.py` - Tool and command allowlisting with deny-by-default enforcement
- **config/** - Example configurations:
  - `patterns-example.yaml` - Damage control patterns (sanitized for portability)
  - `safety-settings.json` - Claude Code settings.json with all hooks registered
  - `scope-allowlist.yaml` - Example scope limiter allowlist
- **checklists/** - Operational checklists:
  - `pre-deployment.md` - Before giving an agent autonomous access
  - `incident-response.md` - When an agent has exceeded scope
  - `audit-template.md` - Periodic agent behavior audit template

## Prerequisites

- Python 3.9+ (hooks are standard library only, no pip installs required)
- An agent framework that supports pre-execution hooks. Tested with:
  - Claude Code CLI (native hook support via `settings.json`)
  - Any framework where you can intercept tool calls before execution
- Basic familiarity with running AI agents autonomously (cron, PM2, systemd, etc.)

## Setup (Under 5 Minutes)

1. Copy the `hooks/` directory into your agent's hook path:
   ```bash
   cp -r hooks/ /path/to/your/.claude/hooks/
   ```

2. Copy the example configs and edit for your environment:
   ```bash
   cp config/patterns-example.yaml /path/to/your/.claude/hooks/patterns.yaml
   cp config/scope-allowlist.yaml /path/to/your/.claude/hooks/scope-allowlist.yaml
   ```

3. Register the hooks in your agent's settings. For Claude Code, merge `config/safety-settings.json` into your `.claude/settings.json`.

4. Set environment variables for any overrides:
   ```bash
   export SAFETY_PATTERNS_PATH="/path/to/patterns.yaml"
   export SAFETY_ALLOWLIST_PATH="/path/to/scope-allowlist.yaml"
   export FINANCIAL_GUARD_CONFIRM="false"  # Set to "true" only when you intend financial operations
   ```

5. Test that the hooks are blocking correctly:
   ```bash
   echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"}}' | python hooks/damage-control.py
   # Should exit 2 (blocked)
   ```

## Read the Guide First

Start with `guide.md`. The anti-patterns section will show you failure modes you have not considered. The hook implementations are the mitigations made concrete.

## Version

1.0.0 (April 2026)

## License

MIT. Use these patterns. Adapt them. The cost of not having them is measured in dollars, data, and trust.
