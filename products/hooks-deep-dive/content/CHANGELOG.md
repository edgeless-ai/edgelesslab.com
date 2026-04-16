# Changelog

## 1.0.0 -- April 2026

Initial release. 10 production hooks extracted from a daily-use Claude Code system.

### Included

- **Guide**: Full walkthrough of hook architecture, all 4 event types, 10 production hooks, composition patterns, debugging techniques
- **10 Production Hooks**: damage-control, validate-taxonomy, check-hook-registry, skill-activation, inbox-auto-claim, post-tool-tracker, webfetch-archive, session-end, loop-stop-hook, pre-compact
- **4 Starter Templates**: One for each hook event (PreToolUse, PostToolUse, UserPromptSubmit, Stop)
- **Configuration Examples**: settings.json registration format, patterns.yaml for damage-control

### Notes

- All hooks sanitized: personal paths replaced with environment variables, secrets removed
- Hooks tested on Python 3.11+ / macOS and Linux
- Exit code semantics: 0 = allow, 1 = error (fail open), 2 = block
