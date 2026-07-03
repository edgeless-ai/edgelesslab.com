---
slug: mcp-servers-unix-pipes-of-ai
title: Why MCP Servers Are the Unix Pipes of AI
description: 'The Unix philosophy changed software forever: small tools, composable
  via pipes. MCP does the same thing for AI agents. Why that matters for building
  agent systems.'
date: '2026-03-24'
tags:
- MCP
- Architecture
- Developer Tools
readTime: 5 min
productSlug: lixicg
editorial: true
ctaHook: Production MCP server templates with auth, rate limiting, and Docker deployment.
---

# Why MCP Servers Are the Unix Pipes of AI

In 1978, Doug McIlroy wrote the Unix philosophy in three sentences. The one that matters: "Write programs that do one thing and do it well. Write programs to work together."

Forty-eight years later, we're rediscovering this idea for AI agents, and calling it MCP.

## What MCP Actually Is

The Model Context Protocol is a JSON-RPC spec that lets AI models call external tools through a standardized interface. An MCP server exposes a list of tools. A client (like Claude Code) connects to those servers and gets access to those tools. The model calls them by name with arguments, and gets back structured results.

That's it. No custom integrations per model. No bespoke SDKs. Define your tool once, and any MCP-compatible client can use it.

Sound familiar? It should. It's stdin/stdout with better types.

## The Unix Parallel

The power of Unix pipes wasn't any individual tool; it was composability. `cat file | grep pattern | sort | uniq -c` does something none of those tools could do alone. The protocol (text on stdout/stdin) made composition possible without any of the tools knowing about each other.

MCP does the same thing for AI tools. The protocol is JSON-RPC over stdio (or HTTP). The tools are small, focused, independently deployable. The composition happens in the model's reasoning layer instead of a shell.

The key insight in both cases: **the protocol is the product**. Not any single tool. Not any particular capability. The protocol is what enables the ecosystem.

## What This Looks Like in Practice

The [agent infrastructure at Edgeless Lab](/blog/building-ai-agent-infrastructure-solo) runs several MCP servers. Each one does one thing:

**ChromaDB search server**: semantic search across a knowledge base of 7,000+ documents. Takes a query string, returns ranked results with similarity scores. That's the whole API.

**Obsidian vault query server**: read and search the Obsidian vault by tag, folder, or full-text. Agents can retrieve specific notes or scan for relevant context without touching the filesystem directly.

**Backlog management server**: read and write tasks in a structured backlog. Lets agents file their own tasks, check status, and mark things complete. The backlog is a text file format; the MCP server is the typed interface over it.

**Inter-agent messaging server**: a pub/sub channel for agents to send messages to each other. An orchestrator agent can dispatch work; worker agents can report back. Real-time, without a message queue.

None of these tools know about each other. Any agent can use any combination. Add a new server and it's immediately available to every agent in the system.

## Why Libraries Were the Wrong Model

Before MCP, tool access meant libraries. You'd import the Anthropic SDK, write a tool schema, register it with the client. Then repeat for every model you wanted to support. When OpenAI updated their function calling format, you'd update every integration.

This created tight coupling between your tools and your model provider. Switching models meant rewriting integrations. Testing a tool meant testing it inside a model's context.

MCP decouples these completely. The server doesn't know what model is calling it. The model doesn't care how the server is implemented. The server could be TypeScript, Python, Go. Doesn't matter. The protocol is the boundary.

This is exactly what made Unix pipes powerful: `grep` doesn't know it's receiving input from `cat`. It just reads from stdin.

## Tools as Services, Not Libraries

The shift MCP enables is treating tools as services rather than library calls. This changes the operational model significantly:

You can **deploy tools independently**. The Obsidian server runs on your Mac (it needs local filesystem access). The ChromaDB server runs wherever ChromaDB is. The trading data server runs on the VPS. Each deployed where it makes sense.

You can **test tools independently**. An MCP server is just an HTTP or stdio server. You can test it with `curl` or any JSON-RPC client. No model required.

You can **version tools independently**. Update the ChromaDB server without touching anything else. Agents pick up the new tool definition on next connection.

You can **compose without coordination**. Agent A uses the vault server and the backlog server. Agent B uses the vault server and the messaging server. Neither knows about the other, but they share infrastructure.

## The Ecosystem Implication

The deeper implication is that MCP creates a tool ecosystem that outlives any particular model or provider. A tool you write today for Claude will work with whatever succeeds Claude. The investment is in the tool, not the integration.

This is how Unix tools from the 1970s still run on your Mac today. The protocol survived everything else changing.

MCP is early. The tooling is rough in places. Server discovery is manual. Error handling is inconsistent. But the protocol is right, and the ecosystem will follow.

For anyone building agent infrastructure: start treating your tools as MCP servers, not library functions. The composition benefits compound quickly, and you're building on the right abstraction for the next decade of AI development.

See the [lab experiments page](/lab) for the MCP servers running in this system, or read the [infrastructure deep-dive](/blog/building-ai-agent-infrastructure-solo) for the full architecture.