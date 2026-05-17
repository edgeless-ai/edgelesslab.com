---
id: 168
title: "Migrate browser automation from Playwright MCP to Playwright CLI"
epic: 1-kernel
priority: P2
effort: L
status: completed
depends_on: [135, 161]
blocks: []
created: 2026-03-10
source: "User request + browser automation architecture cleanup"
tags: [playwright, cli, migration, mcp, browser-automation]
---

# Task 168: Migrate Browser Automation from Playwright MCP to Playwright CLI

## Goal
Replace the dormant Playwright MCP workflow with a CLI-first Playwright workflow that is easier to script, cheaper in context overhead, and better aligned with the existing CLI-first browser automation direction.

## Context
- `task-135` evaluates IndyDevDan's CLI-first Playwright pattern
- `task-161` evaluates broader browser automation architecture choices
- Current state still references Playwright MCP as an option, but the MCP is dormant
- The desired direction is to move toward direct CLI usage where possible and reserve MCP only for cases where it is clearly better

## Progress Update

### 2026-03-10
- Installed `@playwright/cli` globally on the local workstation and verified `playwright-cli --help`
- Fixed the Codex Playwright wrapper at `~/.codex/skills/playwright/scripts/playwright_cli.sh` to prefer the direct `playwright-cli` binary and fall back to `npx`
- Corrected the wrapper execute bit so the installed skill can invoke it directly
- Selected `playwright-cli` as the canonical CLI entrypoint, with the wrapper retained as the compatibility shim
- Added CLI-first repo workflows:
  - `scripts/playwright/capture_page_artifacts.sh`
  - `scripts/playwright/todomvc_add_item.sh`
  - shared helpers in `scripts/playwright/common.sh` and `scripts/playwright/find_ref_in_snapshot.py`
- Added repo usage doc: `docs/playwright-cli-workflows.md`
- Verified success artifacts:
  - `output/playwright/capture-page-artifacts/20260310-221820`
  - `output/playwright/todomvc-add-item/20260310-221845`
- Verified failure-artifact capture with a forced failure:
  - `output/playwright/capture-page-artifacts/20260310-222003`
- Verified the AutoCoder standard-mode wiring against a disposable smoke project:
  - `tools/autocoder/generations/playwright_cli_smoke`
  - session reached the Claude SDK client and failed only on Claude login (`Not logged in · Please run /login`)
- Archived the root legacy MCP artifact folder to:
  - `output/playwright/archive/root-playwright-mcp-legacy-20260310`
- Improved CLI debugging artifacts:
  - command transcript in `commands.log`
  - clean `page-state.json`
  - clean `page-dom.html`
  - raw `.playwright-cli` artifact copy per capture

## Inventory Snapshot

### Active References Updated
- `claude-mcp-config.json` no longer registers a `playwright` MCP server; CLI is the canonical browser path
- `tools/autocoder/client.py` now uses Bash + `playwright-cli` for standard-mode browser verification instead of Playwright MCP
- `tools/autocoder/.claude/templates/coding_prompt.template.md` now teaches `playwright-cli` commands instead of `browser_*` MCP tools
- `.claude/agents/capture.md` now points to `playwright-cli`/wrapper screenshots instead of Playwright-via-MCP wording
- `claude-vault/03-Knowledge/Tools/KB-MCP-Server-Reference.md` now recommends `playwright-cli` as the current browser automation path
- `claude-vault/03-Knowledge/Tools/KB-Time-MCP-Server.md` now refers to Playwright browser automation generically and points to the CLI-first note
- `claude-vault/03-Knowledge/Tools/KB-Playwright-MCP-Configuration.md` is now explicitly marked as historical/MCP-only reference material
- `task-135` and `task-161` now reflect Playwright CLI as the preferred path and treat Playwright MCP as historical context

### Remaining Intentional Historical References
- This migration task and related architecture tasks that compare historical MCP vs CLI tradeoffs
- Archived vault notes, research notes, newsletter summaries, and session recovery logs that document prior MCP usage
- `claude-in-chrome` references that are separate from this migration and remain in scope as active non-Playwright browser tooling

## Scope

### 1. Inventory Current Usage
- Identify every current reference to Playwright MCP in config, docs, skills, and workflows
- Separate "still needed" usage from stale references

### 2. Define the CLI Replacement
- Pick the canonical CLI entrypoint (`playwright`, `npx playwright`, or a local wrapper)
- Document required install/setup steps
- Decide how Claude should invoke common flows from the terminal

### 3. Port Existing Workflows
- Convert the most important Playwright MCP flows to CLI-first commands or wrapper scripts
- Preserve screenshots, logging, and failure diagnostics
- Make the CLI path ergonomic for repeated use

### 4. Clean Up MCP References
- Remove or demote Playwright MCP references once CLI parity is verified
- Update docs so Playwright CLI is the default recommendation
- Keep any remaining MCP use documented only if there is a clear reason

## Acceptance Criteria
- [x] Inventory of Playwright MCP references exists
- [x] Canonical Playwright CLI entrypoint is selected and documented
- [x] At least 2 representative Playwright workflows are migrated to CLI-first execution
- [x] Failure artifacts (screenshots/logs) are preserved or improved
- [x] Relevant docs/configs no longer recommend Playwright MCP as the default path
- [x] Any remaining MCP usage is explicitly justified

## Verification Checklist
- [x] `rg -n "playwright MCP|Playwright MCP" /Users/djm/claude-projects` only returns intentional historical references
- [x] CLI workflow can run end-to-end from terminal without MCP dependency
- [x] Migrated flows produce useful failure output
- [x] Backlog/docs clearly distinguish Playwright CLI from claude-in-chrome MCP
- [x] `playwright-cli --help` works from the terminal
- [x] The Codex Playwright wrapper prefers the direct binary and falls back to `npx`

## Related Tasks
- task-135: IndyDevDan CLI Playwright skill
- task-161: 4-layer Playwright browser automation
- task-134: Chrome DevTools MCP + Obsidian evaluation

## Risks / Notes
- Do not remove `claude-in-chrome` MCP references unless they are part of the same migration decision.
- The migration should focus on replacing dormant Playwright MCP usage, not all browser automation.
- Keep terminal ergonomics high; wrapper scripts are acceptable if raw CLI commands are too noisy.
- `tracing-start` / `tracing-stop` are currently erroring in the local `playwright-cli` environment, so the migrated flows standardize on snapshot, screenshot, PDF, console, and network artifacts instead of traces.
