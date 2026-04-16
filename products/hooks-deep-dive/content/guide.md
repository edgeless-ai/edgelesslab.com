# Claude Code Hooks Deep Dive

## Why Hooks Matter

Claude Code is a powerful agent, but out of the box it operates without guardrails, audit trails, or workflow automation. Hooks are Claude Code's middleware layer. They intercept tool calls at four points in the execution lifecycle, giving you the ability to block dangerous operations before they happen, log everything that occurs, inject context into conversations, and control when sessions can end.

Without hooks, you rely on Claude's judgment alone. With hooks, you encode your operational rules into executable code that runs automatically on every tool invocation. The difference is the same as the difference between telling a junior developer "don't delete the production database" and having a pre-commit hook that rejects the command.

This guide covers 10 hooks running in production since January 2026. They have collectively blocked thousands of dangerous commands, logged hundreds of thousands of tool calls, and enforced structural rules across a 7,000-file Obsidian vault. Every hook here solves a real problem that showed up during daily use.

## The 4 Hook Events

Claude Code exposes four lifecycle events where hooks can intercept execution. A fifth event, PreCompact, fires before context window compaction.

### PreToolUse

Fires before any tool call executes. The hook receives the tool name and its input (the command string for Bash, the file path for Write/Edit/Read). This is where you block dangerous operations. Exit code 2 prevents the tool from running. Exit code 0 allows it.

Use cases: command blocking, path protection, write validation, structural enforcement.

### PostToolUse

Fires after a tool call completes. The hook receives the tool name, input, and output. This is purely observational by default. The tool has already run. You use this for logging, archiving, triggering side effects.

Use cases: event logging, content archiving, analytics, notification triggers.

### UserPromptSubmit

Fires when the user submits a prompt, before Claude processes it. The hook receives the prompt text. You can inject additional context into Claude's view via the `additionalContext` field in the response. You cannot modify the prompt itself, but you can augment it.

Use cases: skill suggestions, inbox dispatch, context injection, prompt routing.

### Stop

Fires when Claude decides to stop (end the session or finish a response). Exit code 2 prevents the session from ending. This is how you enforce that certain conditions are met before the agent stops working.

Use cases: retrospective enforcement, loop continuation, completion verification, cleanup.

### PreCompact

Fires before Claude Code compacts the context window to free up space. This is your last chance to save critical context that would otherwise be lost when the window shrinks.

Use cases: context backup, state preservation, session continuity.

## Anatomy of a Hook

Every hook follows the same contract:

1. **Stdin**: Claude Code pipes a JSON object to the hook's stdin. The schema varies by event type but always includes the relevant data (tool name, tool input, prompt text, etc.).

2. **Exit codes**: The hook communicates its decision through its exit code:
   - `0` -- Allow. The operation proceeds normally.
   - `1` -- Error. The hook itself failed. Claude Code treats this as "fail open" and allows the operation. Your hook should never crash silently; exit 1 and log the error.
   - `2` -- Block. The operation is prevented. For PreToolUse, the tool call is cancelled. For Stop, the session continues.

3. **Stdout**: The hook can print JSON to stdout. For PreToolUse, a blocking message can include a reason. For UserPromptSubmit, the response can include `hookSpecificOutput.additionalContext` to inject context. For PostToolUse, stdout is typically a simple `{"continue": true}`.

4. **Stderr**: Used for human-readable messages that appear in the Claude Code UI. Print warnings, block reasons, and status messages here.

Here is the minimal structure of a hook:

```python
#!/usr/bin/env python3
import json
import sys

def main():
    try:
        hook_input = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, ValueError):
        sys.exit(0)  # Fail open on parse error

    tool_name = hook_input.get("tool_name", "")
    tool_input = hook_input.get("tool_input", {})

    # Your logic here

    sys.exit(0)  # Allow

if __name__ == "__main__":
    main()
```

## 10 Production Hooks Walkthrough

### 1. damage-control.py (PreToolUse)

The first line of defense. This hook reads a YAML configuration file of regex patterns and blocks any Bash command, Write, Edit, or Read operation that matches a dangerous pattern. It covers destructive file operations (`rm -rf /`), dangerous git commands (`git push --force`, `git reset --hard`), database drops (`DROP TABLE`), cloud deletes (`aws s3 rm --recursive`), and pipe-to-shell patterns (`curl | bash`). It also enforces three tiers of path protection: zero-access paths that cannot be read or written (SSH keys, credentials files), read-only paths that block Write/Edit but allow Read (node_modules, deprecated directories), and no-delete paths that block `rm` commands against critical project files.

The key insight: the hook parses its own YAML without importing PyYAML, using a simple state-machine parser. This means zero external dependencies. The patterns file is separate from the hook code, so you can add new blocked patterns without modifying the hook itself. The hook also supports an allowlist for paths that override blocks (test files, temp directories). It fails open on errors, meaning a broken hook never bricks your system.

### 2. validate-taxonomy.py (PreToolUse)

Obsidian vaults and large project trees develop structural rot over time. Folders get created in the wrong place, deprecated directories accumulate new files, and numbered folder prefixes collide. This hook intercepts Write and Edit operations targeting the vault and checks three things: that no duplicate numbered folders exist at the top level (e.g., two folders starting with `02-`), that writes do not target deprecated folder paths, and that files go to their canonical locations.

The key insight: the hook maintains a dictionary of valid numbered prefixes and their expected folder names. When a write targets a deprecated path like `01-Sessions/`, the hook blocks it and the error message tells you the canonical location (`04-Sessions/`). This is structural enforcement that prevents the kind of slow drift that makes large file trees unmaintainable. The hook also has a standalone `--check` mode for use in CI or pre-flight scripts.

### 3. check-hook-registry.py (PreToolUse)

A meta-hook that watches the watchers. It reads `.claude/settings.json`, walks every registered hook command, and verifies that the target script exists on disk and is executable. If any hook target is missing or non-executable, it blocks the next Write/Edit operation with a clear error listing the broken registrations and how to fix them.

The key insight: the hook has two escape hatches so it never deadlocks the system. If the file being written IS one of the missing hook targets, the write is allowed through (so you can restore the file). If the file being written IS `.claude/settings.json` itself, the write is also allowed (so you can remove the broken registration). Without these escape hatches, a missing hook file would permanently block all writes. This is the kind of defensive programming that separates production hooks from demos.

### 4. skill-activation.py (UserPromptSubmit)

Claude Code has a skill system (slash commands like `/commit`, `/test`, `/review`), but users forget which skills exist. This hook analyzes every user prompt and suggests relevant skills based on keyword matching. It loads rules from a `skill-rules.json` configuration file, supports keyword triggers (`keyword:deploy|release|ship`), session-start detection, and a YAML-based skill matcher that scans skill directories for metadata.

The key insight: the hook uses progressive disclosure. Instead of dumping a list of all available skills at session start, it waits until the user's prompt signals relevance. A prompt mentioning "deploy" surfaces the deploy skill. A prompt about "test" surfaces the test runner. The suggestions appear as `additionalContext` injected into Claude's view, so Claude can mention them naturally without the user needing to memorize anything. The hook also verifies the integrity of its configuration file using a SHA-256 hash to detect tampering.

### 5. inbox-auto-claim.py (UserPromptSubmit)

When running multiple Claude Code sessions in parallel (e.g., one per terminal tab), you need a way to dispatch work to specific sessions. This hook implements a two-phase inbox claim system. On the first prompt, it reads a registry of available inboxes, claims the first unclaimed one, and asks the user to select a polling frequency. On the second prompt (if the user replies with a frequency like `5m` or `15m`), it starts an inbox check loop.

The key insight: the hook uses PID-based marker files with JSON state to track which session owns which inbox. The marker file lives in `/tmp/` and is keyed to the parent process ID, so it dies when the Claude Code session dies. The session-end hook (covered below) also releases the inbox claim on exit, preventing stale claims from blocking future sessions. This is a coordination primitive for multi-agent workflows.

### 6. post-tool-tracker.py (PostToolUse)

Every tool call Claude makes gets logged to a SQLite database with timestamps, tool names, sanitized inputs, success/failure status, and session IDs. The database uses WAL mode for concurrent access and indexes on tool_name and timestamp for fast queries. A companion `tool_patterns` table tracks frequency data for each tool.

The key insight: secrets scrubbing. Before any data hits the database, 14 regex patterns scan for API keys (OpenAI, Anthropic, GitHub, AWS), JWTs, private keys, and generic password/token patterns. These get replaced with `[REDACTED_*]` placeholders. The hook also sanitizes tool names to prevent injection (only alphanumeric, underscore, hyphen, dot allowed) and enforces size limits on inputs (10KB per tool input, 100KB total). This is the hook that tells you "Claude used Write 847 times this week" and "the error rate on Bash calls is 12%."

### 7. webfetch-archive.py (PostToolUse)

Every time Claude fetches a web page (via WebFetch or the MCP fetch tool), this hook saves the content as a markdown file in an Obsidian vault inbox. The file gets YAML frontmatter with the URL, domain, fetch timestamp, and extracted title. Filenames are date-prefixed slugs (`2026-04-16-some-article-title.md`) with collision avoidance via counter suffixes.

The key insight: the hook extracts titles from HTML `<title>` tags or first markdown headings, falling back to the URL path. Content is truncated at 200KB to prevent vault bloat. The result is an automatic web archive. Every URL Claude visits during a session becomes a searchable, persistent reference in your knowledge base. You never lose a source.

### 8. session-end.py (Stop)

The most complex Stop hook. It gathers session statistics from the SQLite event database (tool count, error count, duration, top tools used), archives a session summary to the Obsidian vault, releases any claimed inbox, and enforces retrospective completion. If the session had significant activity (10+ tool calls, 10+ minutes, or 3+ errors), the hook blocks session exit until the user runs `/retrospective` and the retrospective email has been sent.

The key insight: the retrospective gate. Without it, long productive sessions end and the learnings evaporate. The hook writes a tracking file (`.retrospective_status.json`) when a retrospective is required and checks for both `completed` and `email_sent` flags before allowing exit. This forces the habit of extracting learnings from every significant session. The hook also sanitizes session IDs against path traversal, validates all paths are within project boundaries, and uses atomic write patterns (write to `.tmp`, then rename) to prevent corruption from interrupted writes.

### 9. loop-stop-hook.py (Stop)

When running Claude in autonomous loop mode (iterating on a task without human intervention), you need to prevent premature exits. This hook checks for an active loop state file and blocks session exit if a loop is in progress. It respects three safety limits: a maximum iteration count (default 50), a maximum session duration (8 hours), and explicit completion signals in the conversation context.

The key insight: the dual detection system. The hook checks both a JSON state file (for legacy loop tracking) and a markdown marker file (for the current loop skill). If either indicates an active loop, exit is blocked. The completion signals are configurable strings like `COMPLETE` or `task completed and verified` that the loop skill writes when finished. The safety limits prevent runaway loops from consuming resources indefinitely.

### 10. pre-compact.py (PreCompact)

When Claude Code runs low on context window space, it compacts the conversation. This hook fires just before compaction and saves a backup of critical context: todos, important files, key decisions, and session notes. Backups are JSON files stored in a `context_backups/` directory, limited to 10 files with automatic cleanup of older backups.

The key insight: recursive secrets scrubbing. The hook walks the entire context data structure, scrubbing secrets at every level using the same 14 patterns as the post-tool-tracker. It also enforces size limits (100KB per backup, 500KB max input) and validates that the backup directory is within the expected boundary. The truncation logic is graceful: if the scrubbed context exceeds the size limit, it replaces the context with a `{"truncated": true}` marker rather than silently dropping data.

## Composition Patterns

### How Hooks Chain

Multiple hooks can register for the same event and matcher. They execute in order. For PreToolUse, if any hook returns exit code 2, the tool call is blocked. The remaining hooks do not run. For PostToolUse, all hooks run regardless of individual results (the tool already executed). For Stop, any hook returning exit code 2 blocks the exit.

In the production system, a Bash command goes through this chain:

1. `damage-control.py` checks against regex patterns and path rules
2. If allowed, the command executes
3. `post-tool-tracker.py` logs the event to SQLite

A Write operation has a longer chain:

1. `damage-control.py` checks path protection
2. `validate-taxonomy.py` checks vault structure rules
3. `check-hook-registry.py` verifies hook integrity
4. If all pass, the write executes
5. `post-tool-tracker.py` logs the event

### The Matcher System

Hooks register with an optional `matcher` field in `settings.json`. The matcher filters which tool invocations trigger the hook:

- **No matcher**: The hook fires for every tool call of that event type. Most PostToolUse and Stop hooks use this.
- **Tool name matcher**: `"matcher": "Bash"` fires only for Bash tool calls. `"matcher": "Write"` fires only for Write calls.
- **Multiple matchers**: Register the same hook under multiple matcher entries. The damage-control hook registers under Bash, Write, Edit, and Read with different protection logic for each.

### Exit Code Semantics in Practice

The three exit codes create a simple decision tree:

- **Exit 0 (allow)**: The default. Use this when the hook has no objection. Also use this as the fallback in error handlers. A hook that crashes and exits 0 is invisible. A hook that crashes and exits 2 blocks everything.
- **Exit 1 (error)**: Claude Code treats this as "the hook failed" and proceeds as if the hook allowed the operation. Use this for unexpected errors where you want the failure logged but not blocking.
- **Exit 2 (block)**: Hard stop. The operation does not proceed. Always print a reason to stderr so the user (and Claude) knows why. For PreToolUse blocks, Claude sees the error and can adjust its approach.

The critical design choice: **fail open on errors**. If your hook crashes with an uncaught exception (which defaults to exit code 1), the operation proceeds. This prevents a buggy hook from making Claude Code unusable. The only way to block is an intentional, explicit `sys.exit(2)`.

## 4 Starter Templates

The `templates/` directory contains four minimal hooks, one for each event type, that you can copy and customize. Each template includes the correct stdin parsing, error handling, and output schema for its event type. Copy the one closest to your use case and modify the decision logic.

### PreToolUse Blocker (`template-pretooluse-blocker.py`)

A skeleton for blocking specific tool operations. Reads stdin JSON, extracts the tool name and input dict, checks against your rules, and exits 2 to block or 0 to allow. The template includes examples for blocking sudo commands and writes to system directories. The key pattern: put your blocking logic in a `should_block()` function that returns a reason string or None. Print the reason to stderr so the user sees it in the Claude Code UI.

### PostToolUse Logger (`template-posttooluse-logger.py`)

A skeleton for logging tool events to a JSONL file. Reads the tool name, input, and output from stdin. Determines success/failure from the output. Scrubs secrets from the input before writing. The template uses the same secrets-scrubbing pattern as the production post-tool-tracker (regex-based, covering API keys and tokens) but with a shorter pattern list you can extend. The log file path is relative to the hook script, so it stays within `.claude/hooks/` by default.

### UserPromptSubmit Enhancer (`template-userpromptsubmit-enhancer.py`)

A skeleton for injecting context into user prompts. Reads the prompt text from stdin, runs your analysis logic, and returns `additionalContext` in the hook-specific output schema. The template includes three example patterns: deployment reminders when the user mentions "deploy", configuration hints when the user mentions "config", and database safety warnings when the user mentions destructive SQL operations. The critical schema detail: the response must nest `additionalContext` inside `hookSpecificOutput` with `hookEventName` set to `"UserPromptSubmit"`.

### Stop Gate (`template-stop-gate.py`)

A skeleton for conditionally blocking session exit. Checks a condition (marker file exists, required file missing, task incomplete) and exits 2 to keep the session alive or 0 to allow exit. The template shows two patterns: a WIP marker file that blocks exit while work is in progress, and a required-file check that blocks exit until a deliverable exists. Print the block reason to stderr so it appears in the UI. The condition check runs every time Claude tries to stop, so keep it fast (file existence checks, not network calls).

## Configuration

### settings.json Hook Registration

Hooks are registered in `.claude/settings.json` under the `hooks` key. The structure is:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/damage-control.py"
          }
        ]
      }
    ]
  }
}
```

Each event type contains an array of matcher groups. Each matcher group has an optional `matcher` string and an array of hook definitions. Each hook definition has `type` (always `"command"` for script hooks) and `command` (the path to the script).

Hook commands can be absolute paths or relative to the project root. Relative paths are simpler to share across teams. The hook script must be executable (`chmod +x`).

Claude Code also supports `"type": "agent"` hooks that delegate to a sub-agent (a separate Claude instance), but those are outside the scope of this guide.

### patterns.yaml Format

The damage-control hook reads its blocking rules from a YAML file with three sections:

- **dangerous_commands.bash.block_patterns**: Regex patterns matched against Bash command strings. Case-insensitive.
- **paths**: Three tiers of path protection (zero_access, read_only, no_delete).
- **allowlist**: Substring patterns that override blocks. Use for test files and temp directories.

See `config/patterns-example.yaml` for the full annotated example.

## Debugging

### Testing Hooks in Isolation

Every hook reads from stdin and exits with a code. You can test any hook from the command line:

```bash
# Test a PreToolUse hook
echo '{"tool_name": "Bash", "tool_input": {"command": "rm -rf /"}}' | python3 .claude/hooks/damage-control.py
echo $?  # Should be 2 (blocked)

# Test with an allowed command
echo '{"tool_name": "Bash", "tool_input": {"command": "ls -la"}}' | python3 .claude/hooks/damage-control.py
echo $?  # Should be 0 (allowed)

# Test a PostToolUse hook
echo '{"tool": "Bash", "input": {"command": "ls"}, "output": "file1 file2"}' | python3 .claude/hooks/post-tool-tracker.py
echo $?  # Should be 0

# Test a Stop hook
echo '{}' | python3 .claude/hooks/session-end.py
echo $?  # 0 if no retrospective required, 2 if blocked
```

### Common Failure Modes

**Hook not firing**: Check that the hook is registered in `settings.json` with the correct event type and matcher. Check that the file is executable (`chmod +x`). Check that the path in settings.json resolves correctly (absolute vs relative).

**Hook blocking everything**: A hook that always exits 2 will block all operations for its event/matcher combination. Add `print()` statements to stderr to trace which code path is executing. Test the hook in isolation with known-good input.

**Hook failing silently**: If a hook crashes with an unhandled exception, Python exits with code 1, which Claude Code treats as "allow." Add a top-level try/except in `main()` that prints the error to stderr before exiting. Check for missing dependencies (all production hooks use only stdlib).

**JSON parse errors**: The stdin JSON varies by event type. PreToolUse sends `tool_name` and `tool_input`. PostToolUse sends `tool` and `input` (different key names). Always handle both key name variants and wrap the JSON parse in a try/except.

**Concurrent access issues**: If multiple hooks write to the same file (e.g., a log file or SQLite database), use WAL mode for SQLite and atomic write patterns (write to `.tmp`, rename) for regular files. The post-tool-tracker demonstrates both patterns.

**Path issues across machines**: Absolute paths in hooks break when the project moves to a different machine or user. Use `Path(__file__).parent` to locate files relative to the hook, `os.environ.get("CLAUDE_PROJECT_DIR")` for the project root, and `os.path.expanduser("~")` for home directory references. The production hooks use all three patterns.

**Hook ordering surprises**: Hooks within the same matcher group execute in array order. If hook A depends on a side effect of hook B, B must come first in the array. If you need a hook to run for multiple tools, register it under each matcher separately (damage-control registers under Bash, Write, Edit, and Read as four separate entries).

**Database locking**: If you use SQLite for logging (like post-tool-tracker), always enable WAL mode (`PRAGMA journal_mode=WAL`). Without WAL, concurrent hook executions can fail with "database is locked" errors. Set a timeout (`sqlite3.connect(path, timeout=5.0)`) so hooks wait briefly rather than failing immediately.

## What to Build Next

Once you have the 10 hooks running, here are the most valuable additions:

1. **Cost tracker** (PostToolUse): Count tokens by parsing tool outputs. Estimate session cost based on model and usage.
2. **Git safety net** (PreToolUse on Bash): Block force pushes to main/master, require confirmation for destructive branch operations.
3. **File size guard** (PreToolUse on Write): Block writes that would create files larger than a threshold (e.g., 1MB). Prevents accidentally dumping binary data into the project.
4. **Session timer** (Stop): Block exit after a configurable duration (e.g., "you've been working for 2 hours, take a break").
5. **Context usage reporter** (PreCompact): Before compaction, print a summary of what is about to be lost so you can decide whether to save anything manually.

Every hook follows the same pattern: read JSON from stdin, make a decision, exit with the right code. Once you internalize that contract, you can build any middleware you need.
