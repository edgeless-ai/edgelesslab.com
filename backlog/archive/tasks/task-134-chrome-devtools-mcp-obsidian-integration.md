---
id: task-134
title: Evaluate Chrome DevTools MCP for Obsidian + Claude Code integration
epic: 1-kernel
status: ready
priority: P3
depends_on: []
blocks: []
created: 2026-02-04
owner: david
estimated_effort: S (1-2 hours)
tags: [mcp, chrome-devtools, obsidian, browser-automation, debugging]
source: https://github.com/ChromeDevTools/chrome-devtools-mcp
reddit_thread: https://www.reddit.com/r/ObsidianMD/comments/1qq0ilg/chrome_devtools_mcp_obsidian_unlimited_power/
---

# Task 134: Chrome DevTools MCP + Obsidian Integration

## Goal
Evaluate Chrome DevTools MCP server as a complement to our existing claude-in-chrome MCP. Determine if it adds capabilities we're missing, especially for Obsidian vault automation and web debugging workflows.

## Context
Chrome DevTools MCP (official Google project) exposes 26 tools across browser automation, debugging, network inspection, and performance analysis. A Reddit post in r/ObsidianMD highlighted combining it with Obsidian for "unlimited power."

### What It Offers vs What We Have

| Capability | Our claude-in-chrome | Chrome DevTools MCP |
|-----------|---------------------|-------------------|
| Click/navigate/fill | Yes | Yes |
| Screenshots | Yes | Yes |
| Console messages | Yes | Yes, with source-mapped stack traces |
| Network inspection | Basic (read_network_requests) | Full request/response capture |
| **Performance tracing** | No | **Yes — full DevTools traces** |
| **JavaScript eval** | Yes (javascript_tool) | Yes |
| DOM snapshots | Via read_page | Via accessibility snapshots |
| Device emulation | Via resize_window | **Full device profiles** |
| Multi-page workflows | Tab management | Page creation + selection |

### Key Differentiator
Chrome DevTools MCP's **performance tracing** is the standout. It can record and analyze DevTools traces, something our claude-in-chrome can't do. This matters for:
- Debugging slow Obsidian plugins
- Profiling web apps we build
- Automated performance regression testing

## Step-by-Step

### Step 1: Install
```bash
claude mcp add chrome-devtools --scope user npx chrome-devtools-mcp@latest
```

### Step 2: Test Capabilities
Run against a few scenarios:
- Capture performance trace of Obsidian desktop app
- Inspect network requests from an Obsidian plugin
- Compare screenshot quality vs claude-in-chrome
- Test console log capture with source maps

### Step 3: Assess Overlap
Determine if this replaces, complements, or conflicts with claude-in-chrome:
- Do both MCPs try to control the same browser instance?
- Can they coexist in .claude.json?
- Is the context overhead (tool descriptions) worth the additional capabilities?

### Step 4: Decide
- **Replace**: If DevTools MCP is strictly better and lower overhead
- **Complement**: Run both, use DevTools for debugging/perf, chrome for UI automation
- **Skip**: If overlap is too high and context cost too expensive

## Acceptance Criteria
- [ ] MCP installed and tested
- [ ] Side-by-side comparison with claude-in-chrome completed
- [ ] Context overhead measured (how many tokens do 26 tools cost?)
- [ ] Go/no-go decision with justification

## Risks
- **Context overhead**: 26 tools may consume significant tokens (relates to task-120)
- **Conflict**: Two MCPs controlling Chrome could interfere with each other
- **macOS sandbox**: May need workaround for Chrome launch issues
