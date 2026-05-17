---
id: 135
title: "IndyDevDan CLI Playwright Skill"
epic: 1-kernel
priority: P2
effort: M
status: pending
depends_on: []
blocks: []
created: 2026-02-26
source: "YouTube Intelligence newsletter discussion"
tags: [playwright, browser-automation, cli, skills, indydevdan]
---

# Task 135: IndyDevDan CLI Playwright Skill

## Objective

Evaluate and potentially implement IndyDevDan's four-layer CLI Playwright architecture for browser automation.

## Background

From IndyDevDan's YouTube content on browser automation:
- Four-layer architecture: Skills → Sub-agents → Commands → Functions
- Emphasis on CLIs over MCP servers for better token efficiency
- Parallel UI testing with multiple agents validating user stories
- Metaprompt engineering for agent-to-agent communication
- Just task runner integration for function reusability

## Acceptance Criteria

- [ ] Review IndyDevDan's CLI Playwright approach (video/repo)
- [ ] Compare token efficiency: CLI approach vs browser automation alternatives (claude-in-chrome MCP, historical Playwright MCP)
- [ ] Prototype the four-layer architecture with a simple use case
- [ ] Document findings and recommendation
- [ ] If valuable: create skill file at `.claude/skills/cli-playwright/`

## Potential Use Cases

1. Browser automation for testing (parallel validation)
2. Purchase/checkout automation
3. Data extraction workflows
4. Multi-step form filling

## Resources

- IndyDevDan YouTube channel
- Current browser tools: claude-in-chrome MCP, `playwright-cli` (preferred), historical dormant Playwright MCP
- Existing skills: `.claude/skills/`

## Dependencies

- None (exploratory task)

## Notes

Originated from automated email discussion - workflow successfully generated response but couldn't execute the backlog creation action.
