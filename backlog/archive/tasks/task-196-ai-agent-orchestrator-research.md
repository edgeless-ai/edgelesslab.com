---
id: 196
title: "AI Agent Orchestrator Research Report"
epic: 1-kernel
priority: P1
effort: L
status: done
depends_on: []
blocks: []
created: 2026-03-10
tags: [research, orchestration, langgraph, temporal, agent-sdk]
---

# Task 196: AI Agent Orchestrator Research Report (formerly task-148b)

**Date**: 2026-03-10
**Epic**: 1 (Kernel)
**Status**: done
**Priority**: P1

## Executive Summary

After extensive research across 15 agent orchestration frameworks, the landscape in early 2026 has converged around a few clear winners. For a Claude Code power user with 40+ skills, 233 MCP tools, and Python/TypeScript stack, the recommendation is a **tiered strategy**: use the **Anthropic Agent SDK** as the innermost agent loop, **LangGraph** for complex stateful orchestration, and **Temporal** as the durable execution backbone for production reliability. Paperclip is worth watching for higher-level organizational orchestration of Claude Code sessions.

---

## Comprehensive Comparison Matrix

### Tier 1: Production-Grade Orchestrators

| Dimension | LangGraph | Anthropic Agent SDK | Temporal | Pydantic AI |
|-----------|-----------|-------------------|----------|-------------|
| **GitHub Stars** | ~25k | ~5.3k | ~13k | ~15.4k |
| **Monthly Downloads** | 34.5M (PyPI) | Early (v0.1.x) | Mature | Growing |
| **Architecture** | Directed graph / state machine | Tool loop (think-act-observe) | Workflow-as-code / event sourcing | Typed dependency injection |
| **Language** | Python + JS | Python (wraps Claude Code CLI) | Python, TS, Go, Java, .NET | Python-only |
| **MCP Support** | Via `langchain-mcp-adapters` | **Native** (first-class) | None (bring your own tools) | Native MCP + A2A |
| **State Persistence** | Built-in checkpointing to DB | Manual (session-based) | **Best-in-class** (event sourcing) | Durable execution built-in |
| **Multi-Agent** | Subgraphs, parallel branches | Manual coordination | Activity-based parallelism | A2A protocol support |
| **Human-in-the-Loop** | Built-in pause/resume | Manual | Built-in (signals, queries) | Built-in suspend/resume |
| **Observability** | **LangSmith** (best-in-class) | Anthropic API dashboard | OpenTelemetry native | Logfire (OTel-based) |
| **Production Maturity** | **High** (Uber, LinkedIn, Klarna) | Medium (v0.1.x, rapidly evolving) | **Highest** ($5B valuation, 99.99% SLA) | High (Pydantic team credibility) |
| **Claude Integration** | Via LangChain provider | **Native** (it IS Claude) | Model-agnostic | Anthropic provider built-in |
| **Learning Curve** | Moderate-High (graph concepts) | Low (if you know Claude Code) | High (deterministic constraints) | Low-Moderate (Pythonic) |
| **License** | MIT | Open source | MIT (core) / Commercial (Cloud) | MIT |
| **Pricing** | Free; LangSmith $39/seat/mo | Free SDK; Anthropic API costs | Free core; Cloud from $200/mo | Free; Logfire separate |

### Tier 2: Multi-Agent Frameworks

| Dimension | CrewAI | AutoGen/AG2 | Google ADK | Agno | OpenAI Agents SDK |
|-----------|--------|-------------|------------|------|-------------------|
| **GitHub Stars** | ~44.6k | ~54.6k (AutoGen) / ~4.2k (AG2) | ~17.8k | ~38.5k | ~19k |
| **Monthly Downloads** | 5.2M | 856k | 3.3M | Growing | 10.3M |
| **Architecture** | Role-based crews | Conversational / async events | Workflow + LLM routing | Agent teams + FastAPI | Handoff pattern |
| **Language** | Python | Python (.NET for AG2) | Python, TS, Go, Java | Python | Python |
| **MCP Support** | Native (v1.0 GA) | Limited | Native (MCP Toolset) | Ready integration | Built-in |
| **State Persistence** | Limited | User-managed | Built-in | Session-scoped DB | Sessions API |
| **Multi-Agent** | **Core strength** (crews) | **Core strength** (group chat) | Hierarchical agents | Teams + workflows | Handoffs |
| **Human-in-the-Loop** | Guardrails | Humans join conversations | Built-in | Runtime approval | Limited |
| **Observability** | Built-in + OTel; CrewAI Enterprise | AutoGen Studio visual | Built-in evals + GCP | Native tracing | Built-in tracing |
| **Production Maturity** | High (SOC2, Enterprise tier) | Medium (v0.4 rewrite, split community) | Medium-High (Google backing) | Medium-High (fast growth) | High (OpenAI backing) |
| **Claude Integration** | Model-agnostic (any LLM) | Model-agnostic | LiteLLM (Anthropic supported) | Provider-agnostic | **OpenAI-only** |
| **Learning Curve** | **Lowest** | Medium | Low-Medium | Low | Low |
| **License** | Proprietary + Commercial | Apache 2.0 (AG2) / MIT (AutoGen) | Apache 2.0 | MIT | MIT |
| **Pricing** | Free to $25+/mo; Enterprise tier | Free | Free; GCP costs | Free; AgentOS commercial | Free; OpenAI API costs |

### Tier 3: Lightweight / Specialized

| Dimension | SmolAgents | Mastra | Paperclip | n8n | @effect/workflow |
|-----------|------------|--------|-----------|-----|-----------------|
| **GitHub Stars** | ~25.5k | ~21.2k | ~14.2k (1 week!) | ~72k+ | ~1k (Effect ecosystem: ~8k) |
| **Architecture** | Code-writing agents | Graph-based workflows | Org-chart orchestration | Visual DAG / event-driven | Durable state machines |
| **Language** | Python | **TypeScript** | Node.js + React | Node.js | **TypeScript** |
| **MCP Support** | Via tool adapters | Native (author + consume) | Via agent protocols | **Bidirectional** (consume + expose) | None |
| **State Persistence** | Minimal | Storage-backed suspend/resume | Task checkout + budget tracking | Workflow state in DB | Durable (event-sourced) |
| **Multi-Agent** | Multi-agent orchestration | Workflow nodes | **Core strength** (org chart) | Workflow-level | Programmatic |
| **Human-in-the-Loop** | Limited | Built-in suspend/await | Approval gates | Manual trigger nodes | Programmatic |
| **Observability** | Basic logging | Built-in | Cost dashboard | Workflow execution logs | Effect Supervisor |
| **Production Maturity** | Medium (HuggingFace backing) | Medium (v1.0 Jan 2026) | **Low** (brand new, March 2026) | **High** (72k+ stars, years of use) | Low (niche) |
| **Claude Integration** | Via LiteLLM | Any provider (40+) | **Native** (Claude Code agent type) | Via AI nodes | None |
| **Best For** | Research, prototyping, HF ecosystem | TS-first agent backends | Managing fleets of Claude Code agents | Visual workflow automation | Type-safe TS durable workflows |

---

## Deep-Dive Analysis by Framework

### 1. LangGraph (Recommended: Primary Orchestrator)

**What it is**: A graph-based agent orchestration framework from LangChain. Agents are nodes, edges define control flow, and typed state schemas persist between nodes.

**Why it leads**: LangGraph reached v1.0 in late 2025 and became the default runtime for all LangChain agents. 400+ companies deploy agents in production via LangGraph Platform, including Cisco, Uber, LinkedIn, BlackRock, and JPMorgan. Klarna's support bot (built with LangGraph patterns) handles 2/3 of all customer inquiries, doing the work of 853 employees.

**MCP integration**: Via `langchain-mcp-adapters` package -- not native but well-supported. Agents dynamically discover and call MCP tools. LangGraph also exposes its own MCP endpoint so external agents can call LangGraph deployments.

**Key strength for your setup**: You can model your 40+ skills as graph nodes, with conditional routing based on task type. State checkpointing means crashed agents resume exactly where they stopped. LangSmith gives you the best observability in the ecosystem.

**Weakness**: Boilerplate is real. Simple tasks require more code than necessary. The LangChain ecosystem carries historical baggage (over-abstraction complaints). Python-first; the JS version (LangGraphJS) lags behind.

---

### 2. Anthropic Agent SDK (Recommended: Inner Agent Loop)

**What it is**: Official Python SDK (v0.1.48) providing programmatic access to Claude Code capabilities. Wraps the Claude Code CLI with async APIs.

**Why it matters for you**: This IS your existing environment, formalized. The SDK exposes all Claude Code tools (Read, Write, Edit, Bash, Glob, Grep) plus your MCP servers as first-class tools. Custom tools are implemented as in-process MCP servers -- no subprocess overhead.

**Key features**:
- `query()` for simple one-shot tasks
- `ClaudeSDKClient` for bidirectional conversations
- `@tool` decorator for custom Python tools
- Hooks system (PreToolUse, PostExecution) for controlling agent behavior
- Runtime MCP server management (add/remove servers dynamically)

**Integration with LangGraph**: The Agent SDK can run INSIDE a LangGraph node. LangGraph handles orchestration and state; Claude Agent SDK handles the actual agent execution. This is a legitimate production architecture.

**Weakness**: v0.1.x -- still early. No built-in multi-agent coordination. No durable execution. State persistence is manual.

---

### 3. Temporal (Recommended: Durable Execution Layer)

**What it is**: A workflow orchestration engine ($5B valuation, $300M Series D) that guarantees all executions run to completion regardless of failures.

**Why it matters**: The longer agents run, the more things break. Temporal's event-sourcing model means if a worker crashes mid-workflow, another worker replays the event history and resumes exactly where it stopped. This is not "retry logic" -- it is deterministic replay.

**AI agent fit**: Separate your orchestration (deterministic Temporal Workflows) from your agent logic (non-deterministic Activities). The workflow decides what to do; activities call LLMs and tools. This separation makes your system debuggable and recoverable.

**Key advantage**: Temporal supports Python, TypeScript, Go, and Java SDKs. You can mix languages in one workflow. Multi-region replication went GA with 99.99% SLA.

**Weakness**: High learning curve. Deterministic constraints mean you cannot make network calls directly in workflows (must use activities). Overkill for simple agent tasks. Self-hosted Temporal requires operating a cluster.

---

### 4. CrewAI (Strong Alternative for Quick Multi-Agent)

**What it is**: Role-based multi-agent framework (44.6k stars, 5.2M monthly downloads). You define agents with role/goal/backstory and assemble them into "crews."

**Key evolution**: CrewAI v1.0 GA added native MCP support, SOC2 compliance, and an Enterprise tier. No longer just a prototyping tool.

**Strength**: Fastest path from idea to working multi-agent system. The role-based mental model is intuitive. If your workflow looks like "a job description board -- who does what, in what order" -- CrewAI is the right fit.

**Weakness**: Consumed nearly 2x tokens vs other frameworks in benchmarks. Takes 3x longer than LangChain for straightforward tasks. Less control over execution flow. Proprietary license with commercial tier.

---

### 5. Pydantic AI (Strong Alternative for Type-Safe Python)

**What it is**: Agent framework from the Pydantic team (15.4k stars). Type-safe by default, with native MCP + A2A protocol support, durable execution, and Logfire observability.

**Why it stands out**: If you value type safety above all else, this is the Python framework. Your IDE sees everything. Errors move from runtime to write-time. Built-in durable execution means agents survive API failures.

**Key advantage**: Native support for BOTH MCP (tool connectivity) and A2A (agent-to-agent protocol). This is future-proof -- these are the two emerging standards.

**Weakness**: Python-only. Structured outputs add latency for retry handling. Smaller community than LangGraph or CrewAI.

---

### 6. Google ADK (Worth Watching)

**What it is**: Google's open-source agent framework (17.8k stars). Code-first Python/TS/Go/Java with native MCP support.

**Strengths**: Model-agnostic (works with Claude via LiteLLM), bidirectional audio/video streaming, built-in evaluation tools, Developer UI. Multi-language support is unique.

**Weakness**: Optimized for Gemini and GCP. If you are not in the Google ecosystem, some features will feel awkward. Relatively new (December 2025 for TS).

---

### 7. Agno (formerly PhiData)

**What it is**: High-performance agent framework (38.5k stars). Claims 50x lower memory than LangGraph and 10,000x faster instantiation.

**Strengths**: FastAPI backend, session-scoped isolation, runtime approval enforcement, Auto-RAG paradigm, multimodal support. If raw performance matters, Agno benchmarks are compelling.

**Weakness**: The 50x/10,000x claims need independent verification. Commercial AgentOS layer for enterprise features.

---

### 8. AutoGen / AG2 (Fractured Community)

**What it is**: Microsoft's multi-agent conversation framework (54.6k stars for original AutoGen). AG2 is the community fork by original creators.

**Warning**: The community split between Microsoft AutoGen v0.4 and community AG2 creates confusion. Microsoft is folding AutoGen into "Microsoft Agent Framework" alongside Semantic Kernel. AG2 continues independently.

**Strength**: AutoGen Studio provides a no-code UI. Conversational patterns (group chat, debate, hierarchical) are well-suited for consensus-building scenarios.

**Weakness**: Community fragmentation. Low production maturity for AG2 (4.2k stars, no built-in enterprise features). AutoGen v0.4 is still stabilizing.

---

### 9. OpenAI Agents SDK (Skip -- OpenAI Lock-in)

**What it is**: Production evolution of Swarm (19k stars, 10.3M downloads). Agent handoff pattern with built-in tracing and guardrails.

**Why to skip**: OpenAI-exclusive model support. You use Claude. Not compatible with your stack.

---

### 10. Mastra (Best TypeScript Option)

**What it is**: TypeScript-first agent framework from the Gatsby team (21.2k stars, v1.0 Jan 2026). Agents, workflows, RAG, and evaluations in one package.

**Key feature for your setup**: ToolSearchProcessor lets agents search and load tools ON DEMAND via `search_tools` and `load_tool` meta-tools. This directly addresses your 233-tool context problem.

**Strengths**: Native MCP authoring and consumption. Human-in-the-loop via storage-backed suspend/resume. 40+ model providers including Anthropic.

**Weakness**: TypeScript-only. Smaller community than Python alternatives. Mastra Cloud is the commercial offering.

---

### 11. Paperclip (Watch Closely -- New Entrant)

**What it is**: Open-source org-chart orchestrator for AI agents (14.2k stars in first week). Assigns goals, tracks costs, enforces approval gates.

**Why it is relevant**: It natively supports Claude Code as an agent type. It manages FLEETS of Claude Code sessions, which is exactly your use case at scale. Budget enforcement, task checkout to prevent double-work, and heartbeat monitoring.

**Weakness**: Brand new (March 2026). No MCP-specific integration documented. Node.js only. Unproven in production.

---

### 12. SmolAgents (Best for Research/Prototyping)

**What it is**: HuggingFace's minimalist agent library (25.5k stars). Core logic fits in ~1,000 lines. Agents write Python code to invoke tools.

**Unique approach**: CodeAgent writes executable Python rather than using JSON tool-calling. Natural composability through function nesting, loops, and conditionals.

**Weakness**: Not designed for production orchestration. No durable execution. Limited state management.

---

### 13. n8n (Already In Use -- Extend It)

**What it is**: Visual workflow automation (72k+ stars). Now supports bidirectional MCP -- consume MCP servers as agent tools AND expose n8n workflows as MCP servers.

**Key insight**: n8n is NOT competing with LangGraph. It is complementary. Use n8n for visual workflow automation (RSS, email, webhooks) and LangGraph for complex agent orchestration. n8n workflows can be MCP tools that LangGraph agents call.

---

### 14. @effect/workflow (Niche but Elegant)

**What it is**: Effect-TS durable workflow system. Type-safe, composable, event-sourced.

**Reality check**: The Effect ecosystem remains niche (~8k stars for the whole library). The workflow package specifically has minimal adoption. While architecturally elegant, the learning curve is steep and community support is thin.

---

### 15. Prefect (Data Pipeline Focus)

**What it is**: Python workflow orchestrator (6M+ monthly downloads). Recently added Pydantic AI agent integration with durable execution.

**Best for**: If your agents are primarily data pipeline workers (ETL, processing, analysis), Prefect is excellent. It wraps agent calls with retries, result caching, and task-level observability.

**Weakness**: Not designed for complex multi-agent coordination. Better for pipeline orchestration than agent orchestration.

---

## Recommendation: Layered Architecture

Given your specific infrastructure (Claude Code primary, 40+ skills, 233 MCP tools, Python + TS, needs production reliability):

### Recommended Stack

```
Layer 4: Paperclip (optional, future)
         - Manage fleet of Claude Code agents
         - Org-chart level orchestration
         - Cost tracking across agents

Layer 3: LangGraph
         - Complex multi-agent workflows
         - State machine orchestration
         - Conditional routing between skills
         - LangSmith observability

Layer 2: Anthropic Agent SDK
         - Inner agent loop (think-act-observe)
         - Native MCP tool access (your 233 tools)
         - Claude Code capabilities
         - Custom tools via @tool decorator

Layer 1: Temporal (for critical workflows)
         - Durable execution guarantee
         - Crash recovery via event replay
         - Long-running workflow support
         - Cross-language SDK support

Layer 0: n8n (already in use)
         - Visual workflow automation
         - Expose as MCP server for agents
         - Webhook/trigger management
         - Non-agent automation
```

### Implementation Priority

1. **Immediate (this week)**: Install Anthropic Agent SDK (`pip install claude-agent-sdk`). Start wrapping existing skills as `@tool`-decorated functions. This is the lowest-risk, highest-value step since it formalizes what you already do.

2. **Short-term (next 2 weeks)**: Add LangGraph for any workflow requiring state persistence or multi-step coordination. Use `langchain-mcp-adapters` to expose your MCP tools to LangGraph agents. Set up LangSmith for observability.

3. **Medium-term (next month)**: Evaluate Temporal for long-running or mission-critical workflows (e.g., monitoring pipelines, data ingestion). Only if you have workflows that MUST survive crashes.

4. **Watch list**: Paperclip (for managing multiple Claude Code agents), Pydantic AI (for type-safe Python agents), Mastra (if you shift toward TypeScript-first development).

### What NOT to Adopt

- **OpenAI Agents SDK**: OpenAI-locked. Incompatible with Claude.
- **AutoGen/AG2**: Community fragmentation makes it risky. Pick one side or neither.
- **SmolAgents**: Great for research, not for production orchestration.
- **@effect/workflow**: Too niche for the investment required.
- **Prefect**: Only if you have heavy data pipeline needs (not agent orchestration).

---

## Key Industry Trends (2026)

1. **MCP is the standard**. Every major framework now supports it. Your 233 MCP tools are a strategic asset.
2. **A2A (Agent-to-Agent) protocol** is emerging alongside MCP. Pydantic AI and Google ADK support both.
3. **Convergence toward graph-based orchestration**. CrewAI, AutoGen v0.4, and others are adopting graph/workflow models pioneered by LangGraph.
4. **Durable execution is table stakes**. Pydantic AI, LangGraph, Mastra, and Temporal all offer it. Agents without crash recovery are not production-grade.
5. **Gartner predicts 40% of enterprise apps will feature AI agents by end of 2026**, but also warns 40% of agentic AI projects will be canceled by 2027 due to cost/value misalignment.

---

## Sources

- [LangGraph Official](https://www.langchain.com/langgraph) | [GitHub](https://github.com/langchain-ai/langgraph)
- [CrewAI GitHub](https://github.com/crewAIInc/crewAI) | [MCP Docs](https://docs.crewai.com/en/mcp/overview)
- [Anthropic Agent SDK](https://github.com/anthropics/claude-agent-sdk-python) | [Docs](https://platform.claude.com/docs/en/agent-sdk/overview)
- [Temporal AI Solutions](https://temporal.io/solutions/ai) | [Multi-Agent Blog](https://temporal.io/blog/using-multi-agent-architectures-with-temporal)
- [Pydantic AI](https://ai.pydantic.dev/) | [GitHub](https://github.com/pydantic/pydantic-ai)
- [Google ADK](https://google.github.io/adk-docs/) | [GitHub](https://github.com/google/adk-python)
- [Mastra](https://mastra.ai/) | [GitHub](https://github.com/mastra-ai/mastra)
- [Agno](https://www.agno.com/) | [GitHub](https://github.com/agno-agi/agno)
- [SmolAgents](https://smolagents.org/) | [GitHub](https://github.com/huggingface/smolagents)
- [Paperclip](https://paperclip.ing/) | [GitHub](https://github.com/paperclipai/paperclip)
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/) | [GitHub](https://github.com/openai/swarm)
- [AutoGen](https://github.com/microsoft/autogen) | [AG2](https://github.com/ag2ai/ag2)
- [n8n MCP Integration](https://blog.n8n.io/ai-agent-orchestration-frameworks/)
- [Prefect AI Teams](https://www.prefect.io/ai-teams)
- [Firecrawl Framework Comparison](https://www.firecrawl.dev/blog/best-open-source-agent-frameworks)
- [Softmax Definitive Guide](https://blog.softmaxdata.com/definitive-guide-to-agentic-frameworks-in-2026-langgraph-crewai-ag2-openai-and-more/)
- [AIToolsKit Comparison](https://www.aitoolskit.io/agents/agent-frameworks-compared)
- [OpenAgents Comparison](https://openagents.org/blog/posts/2026-02-23-open-source-ai-agent-frameworks-compared)
- [DEV Community AutoGen vs LangGraph vs CrewAI](https://dev.to/synsun/autogen-vs-langgraph-vs-crewai-which-agent-framework-actually-holds-up-in-2026-3fl8)
- [Turing AI Agent Frameworks](https://www.turing.com/resources/ai-agent-frameworks)
