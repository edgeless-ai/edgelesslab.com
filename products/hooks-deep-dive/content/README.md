# Claude Code Hooks Deep Dive

A production-tested hook system for Claude Code, extracted from a system running 10 hooks across 5 event types in daily use since January 2026.

## What's Inside

- **guide.md** -- 4,000-word walkthrough covering hook architecture, all 10 production hooks, composition patterns, and debugging
- **hooks/** -- 10 cleaned, commented production hooks ready to drop into your project
- **templates/** -- 4 starter templates, one for each hook event type
- **config/** -- Example `settings.json` registration and `patterns.yaml` for the damage-control hook

## Prerequisites

- Claude Code CLI (v1.0+)
- Python 3.11+
- A `.claude/` directory in your project root (created automatically by Claude Code)

## Setup (Under 5 Minutes)

1. Copy the `hooks/` directory into your project's `.claude/hooks/`:

```bash
cp -r hooks/ /path/to/your-project/.claude/hooks/
```

2. Copy `config/settings-example.json` and merge its `hooks` key into your `.claude/settings.json`:

```bash
cp config/settings-example.json /path/to/your-project/.claude/settings-example.json
# Then merge the "hooks" object into your existing .claude/settings.json
```

3. Copy `config/patterns-example.yaml` next to your hooks:

```bash
cp config/patterns-example.yaml /path/to/your-project/.claude/hooks/patterns.yaml
```

4. Make hooks executable:

```bash
chmod +x /path/to/your-project/.claude/hooks/*.py
```

5. Test a hook in isolation:

```bash
echo '{"tool_name": "Bash", "tool_input": {"command": "rm -rf /"}}' | python3 .claude/hooks/damage-control.py
# Should exit with code 2 (blocked)
```

## File Manifest

```
content/
  README.md              -- This file
  CHANGELOG.md           -- Version history
  guide.md               -- Main guide (~4,000 words)
  hooks/
    damage-control.py           -- Command blocking via regex + YAML config
    validate-taxonomy.py        -- Path enforcement for directory structure
    check-hook-registry.py      -- Self-healing integrity verification
    skill-activation.py         -- Progressive disclosure via keyword matching
    inbox-auto-claim.py         -- Multi-session dispatch
    post-tool-tracker.py        -- SQLite event logging with secrets scrubbing
    webfetch-archive.py         -- Auto-save fetched content to markdown
    session-end.py              -- Exit blocking until retrospective complete
    loop-stop-hook.py           -- Iteration control for autonomous loops
    pre-compact.py              -- Context backup before compaction
  templates/
    template-pretooluse-blocker.py
    template-posttooluse-logger.py
    template-userpromptsubmit-enhancer.py
    template-stop-gate.py
  config/
    settings-example.json       -- Hook registration format
    patterns-example.yaml       -- Damage control patterns
```

## License

MIT. Use these hooks however you want. Attribution appreciated but not required.
