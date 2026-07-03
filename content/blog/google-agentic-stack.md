---
slug: google-agentic-stack
title: 'MCP, A2A, AG-UI: Google''s Agent Stack and What Actually Matters'
description: Six protocols launched in 12 months. Only three are consolidating into
  the core agent stack. Here's the practical map for builders who don't have time
  to read the spec.
date: '2026-05-29'
tags:
- MCP
- A2A
- AG-UI
- Agent Protocols
- Google I/O
readTime: 10 min
editorial: true
---

# MCP, A2A, AG-UI: Google's Agent Stack and What Actually Matters

Six protocols. Twelve months. One acronym soup.

MCP, A2A, AG-UI, A2UI, AP2, X402. The agent protocol space is exploding, and most teams are over-focused on model selection while under-specifying the operating surface around the model.

Here's the practical map. Three protocols matter. Three are niche. The rest is noise.

---

## The Three Core Protocols

Every agent product must answer three questions:

1. **What can the agent use?** → MCP (tools/data)
2. **Who else can the agent work with?** → A2A (agent coordination)
3. **How does the human stay in control?** → AG-UI (human control layer)

### MCP: The Security Boundary, Not a Feature Toggle

MCP standardizes how agents discover and invoke tools. 14,000+ servers now. Claude, Codex, and Google all support it.

But MCP is not safe by default. It was designed for high-trust environments. Tool access enables arbitrary code execution. Invariant Labs documented tool-poisoning attacks that smuggle malicious instructions through tool descriptions.

**MCP needs scopes, approval flows, audit trails, and per-context tool visibility.** Treat it as a security boundary, not a feature toggle.

### A2A: The Agent Card

A2A is cross-organization agent delegation. The key primitive is the "agent card" — a published contract describing what the agent does, what skills it exposes, and how to reach it.

Launch partners: Atlassian, Box, MongoDB, PayPal, Workday. 50+ companies.

But A2A adds coordination cost: latency, failure, permission, and observability problems. Only adopt it when the workflow genuinely requires delegated expertise outside the primary agent.

### AG-UI: The Trust Layer

AG-UI is not about UI rendering. It's about human control over long-running, non-deterministic agents.

Traditional web apps can't handle streaming, mid-task discovery, or interruption. AG-UI specs cover: streaming, shared state, front-end tool calls, backend rendering, custom events, steering, and sub-agent composition.

**"An agent that can't show its work becomes supervision debt for humans."**

---

## The Three Niche Protocols

### A2UI: Structured UI Rendering

Sends declarative UI from an approved component catalog instead of arbitrary HTML/JS. Useful for safe agent-generated interfaces. Narrower than AG-UI.

### AP2: Agent Payments

Cryptographically signed "mandate" proving user authorization. 60+ collaborators including Amex, Coinbase, Mastercard, PayPal. The question: how does the ecosystem know the agent was authorized to buy?

### X402: HTTP-Native Payments

Coinbase's protocol for agent-to-agent resource payments. Cloudflare adopted it. Buy an API call, a dataset, or a benchmark run without an account or subscription.

---

## The Strategic Question

Does Google I/O 2026 stitch these into a single buildable operating model, or just add more standards to the pile?

The first half of 2026 was a golden time for building. The protocols are stabilizing. The question for the second half is whether the stack feels like one operating system or six competing standards.

---

## What to Build Now

1. **Audit your MCP servers**: scopes, approvals, audit trails. Read the Invariant Labs tool-poisoning research.
2. **Design AG-UI control points up front**: approval, edit, interrupt, cancel, progress visibility. Don't bolt them on reactively.
3. **Evaluate A2A only for genuine delegation**: cross-org workflows that need expertise you don't have.
4. **Watch payments carefully**: AP2 vs. X402 vs. Stripe. The UX details — fees, returns, re-authorization — matter more than the protocol.

The model is the engine. The operating surface is the car. Most teams are tuning the engine while driving without brakes.

---

*This post synthesizes Nate B. Jones's analysis of Google's agent stack and our own experience with MCP security and multi-agent orchestration.*