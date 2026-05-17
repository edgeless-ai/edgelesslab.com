# Skill Manifest

Auto-generated index of all skills with applicability metadata.
**Total skills**: 93 | **General**: 32 | **Task-specific**: 58 | **MCP-derived**: 4 | **Unclassified**: 0

## General Skills

Broadly useful in most sessions.

| Skill | Domain | When to Apply |
|-------|--------|---------------|
| `autoreason` | kernel | When the user wants to iteratively improve something qualitative -- writing, design dec... |
| `f-thread` | kernel | When making high-stakes decisions, architecture choices, or complex analysis requiring m... |
| `backlog-sync` | kernel | When refreshing the task list, finding the next available task ID, or checking overall... |
| `capture-state` | kernel | When documenting a bug, preserving UI state for a report, or capturing a snapshot of th... |
| `cleanup` | product | When a codebase has accumulated dead code, unused imports, or bloated dependencies that... |
| `code-review` | product | Proactively after writing a significant function, class, or module before telling the u... |
| `commit-hygiene` | product | Before every git commit to validate message quality and detect oversized commits that s... |
| `dev-docs` | product | When generating README files, API documentation, architecture decision records, or inli... |
| `learning-system` | knowledge | After discovering a non-obvious fix, important pattern, or 'gotcha' that should persist... |
| `link-ingest` | ingestion | When the user pastes a URL and asks to save, archive, or ingest it into the knowledge base |
| `memory-system` | kernel | When initializing a new session, recalling past context, searching across previous sess... |
| `newsletter-reply-handler` | kernel | When processing replies to YouTube Intelligence newsletters to extract commands and syn... |
| `retrospective-learning` | kernel | At the end of a significant coding session or after completing a complex feature to ext... |
| `session-planning` | kernel | When a task has 3 or more distinct phases, involves complex multi-step work, or risks g... |
| `skill-creator` | kernel | When creating a new skill, updating an existing skill's frontmatter, or converting docu... |
| `superpowers-brainstorming` | workflow | Before any creative work — designing features, components, or new functionality — to ex... |
| `superpowers-dispatching-parallel-agents` | workflow | When facing 2 or more independent tasks that can be investigated without shared state o... |
| `superpowers-executing-plans` | workflow | When a written implementation plan exists and needs to be executed in a separate sessio... |
| `superpowers-finishing-a-development-branch` | workflow | When implementation is complete and all tests pass, to decide how to integrate the work... |
| `superpowers-receiving-code-review` | workflow | When receiving code review feedback before implementing suggestions, especially if feed... |
| `superpowers-requesting-code-review` | workflow | When completing a task or major feature to dispatch a code-reviewer subagent before mer... |
| `superpowers-subagent-driven-development` | workflow | When executing an implementation plan with independent tasks via fresh subagents and tw... |
| `superpowers-systematic-debugging` | workflow | When encountering any bug, test failure, or unexpected behavior before proposing a fix |
| `superpowers-test-driven-development` | workflow | When implementing any feature or bugfix to enforce strict RED-GREEN-REFACTOR cycle befo... |
| `superpowers-using-git-worktrees` | workflow | When starting feature work that needs isolation from the current workspace or before ex... |
| `superpowers-using-superpowers` | workflow | Meta-skill: check this before any response to discover which superpowers skill applies |
| `superpowers-verification-before-completion` | workflow | Before claiming work is complete, fixed, or passing — requires running verification com... |
| `superpowers-writing-plans` | workflow | When given a spec or requirements for a multi-step task before touching any code |
| `superpowers-writing-skills` | workflow | When creating new skills, editing existing skills, or verifying skills work before depl... |
| `system-status` | kernel | When checking overall health of MCP servers, memory systems, hooks, or agent components |
| `test-runner` | product | When running tests, generating test scaffolds, or checking coverage across any project... |
| `verify-completion` | kernel | Before declaring any task complete; evidence-first check that defaults to FAIL |

## Task-Specific Skills

Load on demand for particular domains or use cases.

### Creative

| Skill | When to Apply |
|-------|---------------|
| `21st-dev-components` | When building React/Next.js UIs and wanting to pull in polished, community-built market... |
| `banner-design` | When designing social media banners, ad banners, website hero sections, or print creati... |
| `brand` | When defining brand voice, visual identity standards, messaging frameworks, or reviewin... |
| `ce-gemini-imagegen` | When generating or editing images via the Gemini API — text-to-image, style transfer, l... |
| `design` | When creating brand identity, logos, UI design, banners, slides, social photos, or any... |
| `design-system` | When establishing design tokens, component specs, CSS variable systems, or generating b... |
| `image-enhancer` | When improving image quality, sharpening screenshots, upscaling for print, or batch con... |
| `imagen` | When generating images from text prompts using Gemini imagen-3 for UI mockups, icons, i... |
| `make-interfaces-feel-better` | When a frontend change needs polish, motion, typography, spacing, or interaction-detail... |
| `remotion` | When working with Remotion (React video rendering) code for animations, compositions, o... |
| `slides` | When creating strategic HTML presentations with data visualization, copywriting formula... |
| `ui-styling` | When building accessible UI components with shadcn/ui, Tailwind CSS, or canvas-based vi... |
| `ui-ux-pro-max` | When any task changes how a feature looks, feels, moves, or is interacted with — covers... |

### Ingestion

| Skill | When to Apply |
|-------|---------------|
| `article-extractor` | When extracting clean article content from URLs to remove ads and clutter before ingest... |
| `history-ingest` | When importing a Claude.ai conversation history export into ChromaDB for semantic search |

### Knowledge

| Skill | When to Apply |
|-------|---------------|
| `content-research-writer` | When writing blog posts, articles, or newsletters that require research, outlining, and... |
| `notebooklm-skill` | When querying Google NotebookLM notebooks for source-grounded, citation-backed research... |
| `research-deep` | When researching a complex topic requiring multi-step investigation, web search, and sy... |

### Observability

| Skill | When to Apply |
|-------|---------------|
| `otel-observability` | When adding or improving traces, metrics, OTLP export, or open-source observability wor... |

### Product

| Skill | When to Apply |
|-------|---------------|
| `brainstorming` | When exploring a vague idea, designing a new feature, or needing collaborative dialogue... |
| `changelog-generator` | When preparing release notes, creating weekly update summaries, or documenting changes... |
| `discord-backroom` | When adding or refining Discord bot behavior for private server workflows |
| `interview-mode` | When starting a complex feature to clarify requirements, resolve ambiguity, and documen... |
| `prd-to-criteria` | When converting PRD acceptance criteria into machine-verifiable completion checks |
| `precommit-validation` | Before any git commit or push to catch security issues and code quality problems early |
| `prompt-engineering` | When writing agent instructions, skill prompts, hooks, or any LLM-facing prompt that ne... |
| `pydanticai-agents` | When building or refactoring Python agent workflows around PydanticAI primitives |
| `subagent-driven-development` | When executing an implementation plan with 3+ independent tasks that can be dispatched... |
| `test-driven-development` | When implementing any feature or bugfix — enforce strict RED-GREEN-REFACTOR before writ... |
| `webapp-testing` | When testing local web applications — frontend functionality, UI behavior, browser logs... |

### Tooling

| Skill | When to Apply |
|-------|---------------|
| `ce-agent-browser` | When automating web browser interactions — filling forms, clicking buttons, scraping pa... |
| `ce-agent-native-architecture` | When designing applications where agents are first-class citizens, building MCP tools,... |
| `ce-coding-tutor` | When the user wants personalized coding tutorials that build on their existing knowledg... |
| `ce-compound-docs` | After solving a problem — capture it as categorized documentation with YAML frontmatter... |
| `ce-document-review` | When a brainstorm or plan document exists and needs structured review before proceeding... |
| `ce-dspy-ruby` | When building type-safe LLM applications in Ruby using DSPy.rb signatures, modules, or... |
| `ce-file-todos` | When managing file-based todo tracking in the todos/ directory — creating, triaging, or... |
| `ce-git-worktree` | When managing git worktrees for isolated parallel development — creating, listing, swit... |
| `cerebras-consultation` | When ultra-fast LLM inference is needed — bulk processing, rapid iteration, or speed-cr... |
| `charlie-cfo` | When making strategic financial decisions for a bootstrapped startup — hiring ROI, runw... |
| `chatgpt-consultation` | When the user asks to consult ChatGPT or get GPT's second opinion on a problem |
| `csv-data-summarizer` | When analyzing a CSV file to generate summary statistics and quick visualizations with... |
| `file-organizer` | When a directory is messy, files are scattered, duplicates have accumulated, or folder... |
| `kimi-consultation` | When consulting Kimi K2.5 for a second opinion, especially on coding or reasoning tasks... |
| `openrouter-consultation` | When accessing 367+ models via OpenRouter for model comparison, fallback routing, or fr... |
| `skill-seekers` | When converting documentation websites, GitHub repos, or PDFs into Claude skill files a... |
| `tailored-resume-generator` | When applying for a specific job and needing a resume tailored to that job description... |

### Trading

| Skill | When to Apply |
|-------|---------------|
| `tradingview-pine-automation` | When creating, modifying, or automating Pine Script v5 code for TradingView indicators, strategies, or backtesting |

### Workflow

| Skill | When to Apply |
|-------|---------------|
| `ce-orchestrating-swarms` | When orchestrating multi-agent swarms using Claude Code's TeammateTool and Task system... |
| `ce-resolve-pr-parallel` | When addressing PR review feedback by resolving all comment threads in parallel via sub... |
| `ce-setup` | When configuring which review agents run for a project by setting up compound-engineeri... |
| `n8n-workflows` | When building or modifying n8n workflows — triggers, scheduling, data transformation, o... |

### Edgeless GTM

Sales and go-to-market automation skills adapted from enterprise GTM platforms.

| Skill | When to Apply |
|-------|---------------|
| `data-waterfall-enrichment` | When enriching lead/contact data across multiple data providers with cost-optimized sequential lookup |
| `lead-scoring-routing` | When scoring leads across multiple dimensions and routing to appropriate teams based on qualification |
| `ai-research-agent` | When conducting deep research on companies, people, or markets for sales intelligence |
| `intent-signal-monitoring` | When monitoring target accounts for buying signals like job changes, funding, or tech stack changes |
| `crm-sync-hygiene` | When synchronizing data to/from CRMs with deduplication, validation, and quality monitoring |
| `workflow-automation-engine` | When building trigger-based GTM workflows with conditional logic and multi-step sequences |

### Matt Pocock Skills

Imported from github.com/mattpocock/skills — rigorous engineering fundamentals.

| Skill | When to Apply |
|-------|---------------|
| `diagnose` | When debugging hard bugs or performance regressions — 6-phase disciplined loop |
| `caveman` | When user wants ultra-compressed communication (~75% token reduction) |
| `improve-codebase-architecture` | When finding refactoring opportunities or making code more AI-navigable |
| `zoom-out` | When navigating unfamiliar code and needing high-level perspective |
| `write-a-skill` | When creating new agent skills with proper structure and progressive disclosure |


## MCP-Derived Skills (Progressive Disclosure)

Lazy-loaded wrappers that convert MCP servers to skills. Tool schemas load on-demand,
saving thousands of tokens per session vs direct MCP integration.

| Skill | Source MCP | Tools | Token Savings | Status |
|-------|-----------|-------|---------------|--------|
| `supadata-mcp-skill` | supadata | 6 | ~1,200/session | ✅ Active |
| `paperclip-mcp-skill` | paperclip | 104 | ~20,800/session | ✅ Active |

**Total savings**: ~22,000 tokens per session when both MCP servers used via skill wrappers.

### Usage Pattern

```bash
# Via skill (lazy loaded, ~100 tokens until invoked)
skill_view(name='supadata-mcp-skill')

# Via direct MCP (all 104 paperclip tools load at session start = ~31K tokens)
# In .mcp.json — removed after skill conversion
```

### Implementation

- Proxy script: `.claude/skills/mcp-to-skill-proxy/mcp_to_skill_proxy.py`
- Skill docs: `{skill-name}/skill.md`
- Wrapper: `{skill-name}/{name}_mcp_wrapper.py`

---

## MCP-Derived Skills (Progressive Disclosure)

Lazy-loaded wrappers that convert MCP servers to skills. Tool schemas load on-demand,
saving thousands of tokens per session vs direct MCP integration.

| Skill | Source MCP | Tools | Token Savings | Status |
|-------|-----------|-------|---------------|--------|
| `supadata-mcp-skill` | supadata | 6 | ~1,200/session | ✅ Active |
| `paperclip-mcp-skill` | paperclip | 104 | ~20,800/session | ✅ Active |

**Total savings**: ~22,000 tokens per session when both MCP servers used via skill wrappers
instead of direct MCP integration.

### Tool Verification

- ✅ `supadata_mcp_wrapper.py --list` returns 6 tools
- ✅ `paperclip_mcp_wrapper.py --list` returns 104 tools
- ✅ Both wrappers accept tool calls via stdin (JSON-RPC preserved)

### Implementation Files

- Proxy script: `.claude/skills/mcp-to-skill-proxy/mcp_to_skill_proxy.py` (12KB)
- Supadata skill: `.claude/skills/supadata-mcp-skill/` (6 tools)
- Paperclip skill: `.claude/skills/paperclip-mcp-skill/` (104 tools)
