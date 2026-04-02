module.exports=[93695,(a,b,c)=>{b.exports=a.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},44152,a=>{"use strict";a.s(["Nav",()=>b]);let b=(0,a.i(6533).registerClientReference)(function(){throw Error("Attempted to call Nav() from the server but Nav is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"[project]/claude-projects/edgeless-website/src/components/nav.tsx <module evaluation>","Nav")},81084,a=>{"use strict";a.s(["Nav",()=>b]);let b=(0,a.i(6533).registerClientReference)(function(){throw Error("Attempted to call Nav() from the server but Nav is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"[project]/claude-projects/edgeless-website/src/components/nav.tsx","Nav")},29348,a=>{"use strict";a.i(44152);var b=a.i(81084);a.n(b)},81578,a=>{"use strict";a.s(["Footer",()=>b]);let b=(0,a.i(6533).registerClientReference)(function(){throw Error("Attempted to call Footer() from the server but Footer is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"[project]/claude-projects/edgeless-website/src/components/footer.tsx <module evaluation>","Footer")},78973,a=>{"use strict";a.s(["Footer",()=>b]);let b=(0,a.i(6533).registerClientReference)(function(){throw Error("Attempted to call Footer() from the server but Footer is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"[project]/claude-projects/edgeless-website/src/components/footer.tsx","Footer")},31287,a=>{"use strict";a.i(81578);var b=a.i(78973);a.n(b)},525,(a,b,c)=>{"use strict";function d(a){if("function"!=typeof WeakMap)return null;var b=new WeakMap,c=new WeakMap;return(d=function(a){return a?c:b})(a)}c._=function(a,b){if(!b&&a&&a.__esModule)return a;if(null===a||"object"!=typeof a&&"function"!=typeof a)return{default:a};var c=d(b);if(c&&c.has(a))return c.get(a);var e={__proto__:null},f=Object.defineProperty&&Object.getOwnPropertyDescriptor;for(var g in a)if("default"!==g&&Object.prototype.hasOwnProperty.call(a,g)){var h=f?Object.getOwnPropertyDescriptor(a,g):null;h&&(h.get||h.set)?Object.defineProperty(e,g,h):e[g]=a[g]}return e.default=a,c&&c.set(a,e),e}},51918,(a,b,c)=>{let{createClientModuleProxy:d}=a.r(6533);a.n(d("[project]/claude-projects/edgeless-website/node_modules/next/dist/client/app-dir/link.js <module evaluation>"))},17165,(a,b,c)=>{let{createClientModuleProxy:d}=a.r(6533);a.n(d("[project]/claude-projects/edgeless-website/node_modules/next/dist/client/app-dir/link.js"))},78413,a=>{"use strict";a.i(51918);var b=a.i(17165);a.n(b)},39102,(a,b,c)=>{"use strict";Object.defineProperty(c,"__esModule",{value:!0});var d={default:function(){return i},useLinkStatus:function(){return h.useLinkStatus}};for(var e in d)Object.defineProperty(c,e,{enumerable:!0,get:d[e]});let f=a.r(525),g=a.r(67286),h=f._(a.r(78413));function i(a){let b=a.legacyBehavior,c="string"==typeof a.children||"number"==typeof a.children||"string"==typeof a.children?.type,d=a.children?.type?.$$typeof===Symbol.for("react.client.reference");return!b||c||d||(a.children?.type?.$$typeof===Symbol.for("react.lazy")?console.error("Using a Lazy Component as a direct child of `<Link legacyBehavior>` from a Server Component is not supported. If you need legacyBehavior, wrap your Lazy Component in a Client Component that renders the Link's `<a>` tag."):console.error("Using a Server Component as a direct child of `<Link legacyBehavior>` is not supported. If you need legacyBehavior, wrap your Server Component in a Client Component that renders the Link's `<a>` tag.")),(0,g.jsx)(h.default,{...a})}("function"==typeof c.default||"object"==typeof c.default&&null!==c.default)&&void 0===c.default.__esModule&&(Object.defineProperty(c.default,"__esModule",{value:!0}),Object.assign(c.default,c),b.exports=c.default)},95873,a=>{"use strict";a.s(["posts",0,[{slug:"building-ai-agent-infrastructure-solo",title:"Building AI Agent Infrastructure as a Solo Developer",description:"How I built a multi-agent system with MCP servers, vector memory, and autonomous trading -- all running 24/7 from a single VPS.",date:"2026-03-21",tags:["Agents","MCP","Infrastructure"],readTime:"8 min",content:`
When people hear "multi-agent system," they picture a team of engineers, months of planning, and enterprise infrastructure. I built one by myself, and it runs on a single $15/month VPS.

This post covers the architecture decisions, the tools that made it possible, and the parts that surprised me.

## The Stack

The system has five layers:

**Claude Code** sits at the top. It's not just a coding assistant -- it's the primary agent runtime. Skills, hooks, and memory give it persistent context across sessions.

**MCP Servers** provide the tool layer. Instead of hardcoding capabilities, each tool is a standalone server that any agent can call. Search the knowledge vault? That's an MCP tool. Dispatch a task to another agent? MCP tool. Check VPS health? MCP tool.

**ChromaDB** handles vector memory. Every document, conversation summary, and learned pattern gets embedded and stored. When an agent needs context, it queries by semantic similarity rather than keyword matching.

**Obsidian** is the knowledge vault -- 7,000+ markdown files organized by topic. It's the human-readable layer that agents can also query through MCP.

**Hetzner VPS** runs the always-on processes. The trading bot, the Telegram gateway, the cron jobs -- everything that needs to persist beyond a terminal session.

## Why MCP Changes Everything

Before MCP, giving an AI agent access to tools meant writing custom integrations for each model provider. MCP standardizes the protocol: define your tool once, and any MCP-compatible client can use it.

I have servers for ChromaDB search, Obsidian vault queries, backlog management, and inter-agent messaging. Adding a new capability means writing one server, not modifying every agent.

The Effect-TS implementation makes the servers composable and type-safe. Error handling is built into the type system rather than scattered across try-catch blocks.

## Memory That Actually Works

The biggest challenge with AI agents isn't reasoning -- it's memory. A conversation ends, and everything learned evaporates.

I open-sourced the basic version as the [Claude Memory Kit](https://github.com/edgeless-ai/claude-memory-kit) and built a [Pro version](https://edgelessai.gumroad.com/l/claude-memory-kit) with stack-specific libraries and advanced patterns.

The solution is a three-layer memory system:

1. **ChromaDB** for semantic search across all stored knowledge
2. **File-based memory** for structured facts (user preferences, project context, feedback)
3. **Obsidian vault** for human-curated knowledge that agents can also access

Each layer serves a different retrieval pattern. ChromaDB handles "find me something similar to X." File memory handles "what did the user tell me about Y." The vault handles "what's the canonical documentation for Z."

## The Trading Bot

Pamela, the autonomous trading agent, was the forcing function for getting the infrastructure right. A trading bot that loses money because it forgot its strategy is worse than no bot at all.

She runs 24/7 on the VPS, monitored by PM2. Her architecture:

- **Market scanning**: Polymarket API for contract discovery
- **Analysis**: ML-driven probability estimation
- **Position sizing**: Kelly criterion with configurable risk limits
- **Execution**: Automated order placement and management
- **Reporting**: Daily P&L summaries via Telegram

The key insight: the bot doesn't need to be smart about everything. It needs to be smart about a few things and disciplined about the rest.

## Lessons Learned

**Start with one agent, not three.** Multi-agent orchestration sounds impressive but adds complexity. Get one agent working end-to-end before adding coordination.

**MCP servers are the right abstraction.** Tools as services, not libraries. This makes testing, deployment, and access control straightforward.

**Memory is infrastructure, not a feature.** Treat it like a database -- with schemas, retention policies, and access patterns.

**VPS beats serverless for always-on agents.** When your agent needs to maintain state, respond to events, and run cron jobs, a $15 VPS is simpler than a constellation of Lambda functions.

**The tools exist.** Claude Code, MCP, ChromaDB, PM2 -- the building blocks for agent infrastructure are production-ready today. The bottleneck isn't technology, it's architecture.

## What's Next

The system keeps growing. Current priorities: improving inter-agent communication (an "agent bus" for real-time messaging), better memory consolidation (merging redundant knowledge), and more sophisticated trading strategies.

The goal isn't to build the most complex system. It's to build the most useful one, with the least moving parts.
    `.trim()},{slug:"how-claude-code-memory-works",title:"How Claude Code Memory Actually Works",description:"Claude forgets everything between sessions. Here's how file-based memory fixes that, and why it changes how you work with AI.",date:"2026-03-21",tags:["Claude Code","Memory","Developer Tools"],readTime:"6 min",content:`
Every Claude Code session starts the same way: a blank slate. No memory of yesterday's architecture decisions. No recall of your coding conventions. No idea that you spent three hours debugging that OAuth flow last week.

This is the single biggest friction point in AI-assisted development. Not model capability. Not context windows. Memory.

## The Problem Is Structural

Claude Code reads instructions from a file called \`CLAUDE.md\` at the start of every session. That's it. There's no built-in persistence layer. No session history. No learning from past interactions.

So every session, you repeat yourself: "We use TypeScript, not JavaScript." "The API lives in \`src/api/\`, not \`api/\`." "Don't use default exports." "We already tried approach X and it failed because Y."

This isn't a minor annoyance. It's a compounding tax on every interaction.

## File-Based Memory Fixes This

The solution is surprisingly simple: structured markdown files that Claude reads automatically at session start.

No databases. No vector stores. No infrastructure. Just files in your repo that Claude already knows how to read.

The memory system layers on top of Claude Code's built-in \`CLAUDE.md\` hierarchy. Claude loads these files automatically. You don't need plugins or configuration.

## The 4 Memory Types

After running this pattern in production across multiple projects, I've found four distinct memory types that cover every use case.

### 1. User Memory

Who you are and how you work. Follows you across every project.

\`\`\`yaml
name: User Role
type: user
---
Senior backend engineer, 8 years Go.
New to React frontend in this project.
Prefer explanations mapping frontend concepts to backend analogues.
\`\`\`

### 2. Feedback Memory

Corrections that stick. The highest-value memory type -- every correction makes every future session better.

\`\`\`yaml
name: No mocking in integration tests
type: feedback
---
Integration tests must hit a real database, not mocks.
Why: Mocked tests passed but prod migration failed last quarter.
\`\`\`

### 3. Project Memory

Architecture decisions, conventions, and infrastructure specific to one codebase.

\`\`\`yaml
name: API Migration Freeze
type: project
---
No breaking API changes until 2026-03-15 (mobile release cut).
Any endpoint modifications must be backwards-compatible.
\`\`\`

### 4. Reference Memory

Pointers to where things live. Tools, APIs, dashboards.

\`\`\`yaml
name: Bug Tracker
type: reference
---
Production bugs: Linear project "PLATFORM"
Feature requests: Linear project "ROADMAP"
Design specs: Figma workspace "Product Design 2026"
\`\`\`

## What Changes in Practice

With memory in place, sessions start differently. Instead of 10 minutes of context-setting, you jump straight into the work.

Claude remembers that your test suite uses Vitest, not Jest. It knows the deploy script is at \`scripts/deploy.sh\`, not \`deploy.sh\`. It recalls that you tried Redis caching last month and hit connection pooling issues.

After a month of accumulated feedback memory, Claude makes roughly 60% fewer mistakes that require correction. That's not a benchmark -- that's from tracking corrections across my own projects.

## The Maintenance Problem

Raw memory files work, but they accumulate cruft. Outdated entries. Contradictory instructions. Files that grow past useful size.

The discipline: review monthly, archive aggressively, keep each file under 200 lines. Memory that's too long defeats the purpose -- Claude spends context window on stale instructions instead of your actual task.

## Get Started

I've open-sourced the base memory kit with templates for all four memory types, a starter CLAUDE.md structure, and setup instructions.

**Free:** [Claude Memory Kit on GitHub](https://github.com/edgeless-ai/claude-memory-kit)

The free version covers 90% of use cases. For production patterns including stack-specific libraries (React/Next.js, Python/FastAPI, Go, Rails, Rust), multi-project memory architectures, and CLAUDE.md templates:

**Pro ($29):** [Claude Memory Kit Pro on Gumroad](https://edgelessai.gumroad.com/l/claude-memory-kit)

The best time to set up memory is before your next session. Takes 15 minutes, saves hours every week.
    `.trim()}]])},99370,a=>{"use strict";var b=a.i(67286),c=a.i(95873);a.i(3547);var d=a.i(92886),e=a.i(39102),f=a.i(29348),g=a.i(31287),h=a.i(7025);async function i({params:a}){let{slug:b}=await a,d=c.posts.find(a=>a.slug===b);if(!d)return{};let e=`${d.title} | Edgeless Labs`;return{title:{absolute:e},description:d.description,keywords:d.tags,openGraph:{title:e,description:d.description,type:"article",publishedTime:d.date,url:`https://edgelesslab.com/blog/${d.slug}`},alternates:{canonical:`https://edgelesslab.com/blog/${d.slug}`},twitter:{card:"summary_large_image",title:e,description:d.description,images:["/og-image.png"]}}}async function j({params:a}){let{slug:i}=await a,l=c.posts.find(a=>a.slug===i);return l||(0,d.notFound)(),(0,b.jsxs)("div",{className:"flex flex-col min-h-full",style:{background:"var(--bg-base)"},children:[(0,b.jsx)(f.Nav,{}),(0,b.jsx)(h.JsonLd,{data:{"@context":"https://schema.org","@type":"BlogPosting",headline:l.title,description:l.description,datePublished:l.date,author:{"@type":"Person",name:"David Murray"},publisher:{"@type":"Organization",name:"Edgeless Labs",url:"https://edgelesslab.com"},url:`https://edgelesslab.com/blog/${l.slug}`}}),(0,b.jsx)("article",{className:"pt-28 pb-20 px-6",children:(0,b.jsxs)("div",{className:"max-w-[680px] mx-auto",children:[(0,b.jsxs)("div",{className:"mb-12",children:[(0,b.jsxs)("div",{className:"flex items-center gap-3 mb-4",children:[(0,b.jsx)("time",{className:"text-xs font-mono",style:{color:"var(--text-tertiary)"},dateTime:l.date,children:new Date(l.date+"T00:00:00").toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}),(0,b.jsx)("span",{className:"text-xs font-mono",style:{color:"var(--text-tertiary)"},children:l.readTime})]}),(0,b.jsx)("h1",{className:"text-3xl sm:text-4xl font-bold tracking-tight leading-[1.2] mb-4",style:{color:"var(--text-primary)"},children:l.title}),(0,b.jsx)("p",{className:"text-lg font-light",style:{color:"var(--text-secondary)",lineHeight:1.7},children:l.description}),(0,b.jsx)("div",{className:"flex flex-wrap gap-2 mt-4",children:l.tags.map(a=>(0,b.jsx)("span",{className:"px-2.5 py-1 text-xs font-mono rounded-md",style:{background:"var(--accent-muted)",color:"var(--accent)"},children:a},a))})]}),(0,b.jsx)("div",{className:"prose-custom",dangerouslySetInnerHTML:{__html:l.content.split("\n\n").map(a=>{let b=a.trim();if(!b)return"";if(b.startsWith("## "))return`<h2>${b.slice(3)}</h2>`;if(b.startsWith("### "))return`<h3>${b.slice(4)}</h3>`;if(b.startsWith("1. ")||b.startsWith("- ")){let a=b.startsWith("1. ")?"ol":"ul",c=b.split("\n").filter(a=>a.trim()).map(a=>{let b=a.replace(/^\d+\.\s+/,"").replace(/^-\s+/,"");return`<li>${k(b)}</li>`}).join("");return`<${a}>${c}</${a}>`}return`<p>${k(b)}</p>`}).join("\n")}}),(0,b.jsx)("div",{className:"mt-16 pt-8 border-t",style:{borderColor:"var(--border-subtle)"},children:(0,b.jsx)(e.default,{href:"/blog",className:"text-sm font-medium transition-colors hover:text-white",style:{color:"var(--text-secondary)"},children:"← All posts"})})]})}),(0,b.jsx)(g.Footer,{})]})}function k(a){return a.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/`(.+?)`/g,"<code>$1</code>").replace(/\[(.+?)\]\((.+?)\)/g,'<a href="$2">$1</a>')}a.s(["default",0,j,"generateMetadata",0,i,"generateStaticParams",0,function(){return c.posts.map(a=>({slug:a.slug}))}])},63622,a=>{a.n(a.i(99370))}];

//# sourceMappingURL=%5Broot-of-the-server%5D__0h3~fs1._.js.map