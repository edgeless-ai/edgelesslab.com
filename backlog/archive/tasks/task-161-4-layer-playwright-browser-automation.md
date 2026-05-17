---
id: 161
title: "Implement 4-Layer Playwright Browser Automation Pattern"
epic: 1-kernel
priority: P3
effort: M
status: ready
depends_on: [135]
blocks: []
created: 2026-03-07
source: "YouTube intelligence - Playwright CLI skill video (Video 16)"
tags: [playwright, browser, automation, testing, 4-layer]
---

# Task 161: 4-Layer Playwright Browser Automation

## Goal
Implement the 4-layer Playwright CLI-first automation pattern for robust browser interactions that go beyond what claude-in-chrome MCP provides.

## 4-Layer Architecture
```
Layer 1: Page Objects     → Reusable element selectors and actions
Layer 2: Flows            → Multi-step user journeys (login, checkout, etc.)
Layer 3: Assertions       → Verification of expected state
Layer 4: Orchestration    → Sequencing flows with data and error handling
```

## Use Cases
- Automated web scraping that requires authentication
- Testing web applications we build
- Monitoring external services (uptime, content changes)
- Filling forms, submitting applications
- Screenshot capture for documentation

## Current State
- We have claude-in-chrome MCP (18 tools) for interactive browser automation
- We have `playwright-cli` installed and preferred for CLI-first browser automation
- Playwright MCP is historical/dormant rather than the default path
- IndyDevDan demonstrated a CLI-first Playwright skill (task-135)

## Acceptance Criteria
- [ ] Evaluate: claude-in-chrome MCP vs. CLI Playwright vs. hybrid usage
- [ ] Choose architecture (CLI-based vs. hybrid with claude-in-chrome)
- [ ] Implement at least 2 page objects for common sites
- [ ] Implement at least 1 multi-step flow (e.g., login + scrape)
- [ ] Error handling with screenshots on failure
- [ ] Integration with ingestion pipeline for web content

## Relates To
- task-135: IndyDevDan CLI Playwright skill
- claude-in-chrome MCP (currently active)

## Artifacts
- Page object library
- Flow implementations
- Architecture decision document
