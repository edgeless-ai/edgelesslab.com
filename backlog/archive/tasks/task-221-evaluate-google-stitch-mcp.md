---
id: task-221
title: Evaluate Google Stitch MCP integration for UI generation
status: ready
priority: P2
epic: agent-tooling
depends_on: []
blocks: []
created: 2026-03-18
---

## Objective

Integrate Google Stitch (stitch.withgoogle.com) as an MCP server for AI-driven UI generation in the multi-agent workflow. Stitch generates production-quality HTML/CSS from text prompts, sketches, or screenshots, powered by Gemini.

## Key Findings (Research 2026-03-18)

- First-party MCP server via `@google/stitch-sdk` (npm)
- Officially supports Claude Code, Codex, Gemini CLI
- MCP tools: generate, edit, variants, getHtml, getImage, listProjects, listScreens
- Free tier with monthly generation limits (exact limits undocumented)
- Still a Google Labs experiment, not GA. Enterprise rollout began Feb 2026.
- SDK has Vercel AI SDK integration (`@google/stitch-sdk/ai`) for agent framework compatibility

## Multi-Agent Integration Pattern

1. Mastra orchestrator dispatches "build UI for feature X" task
2. Stitch MCP tool generates screen from prompt, returns HTML/CSS
3. Claude Code or Codex agent integrates HTML into app codebase, wires logic
4. Review agent validates output

## Acceptance Criteria

- [ ] Obtain Stitch API key from stitch.withgoogle.com/settings
- [ ] Install `@google/stitch-sdk`, add to `.mcp.json`
- [ ] Test: text-to-HTML generation for a real UI (e.g., Edgeless product page)
- [ ] Test: variant generation with creative range slider
- [ ] Test: HTML extraction and integration into existing codebase
- [ ] Prototype: Mastra dispatches UI task to Stitch, hands result to Claude Code
- [ ] Document: quality, latency, rate limits, cost assessment
- [ ] Decision: adopt for UI prototyping or defer

## Notes

- MCP config: `{"mcpServers":{"stitch":{"command":"npx","args":["@google/stitch-sdk","--api-key","KEY"]}}}`
- Community MCP server also available: davideast/stitch-mcp
- Risk: Google Labs experiment, may be deprecated without notice
