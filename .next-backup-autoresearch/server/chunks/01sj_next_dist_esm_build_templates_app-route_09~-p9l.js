module.exports=[20583,e=>{"use strict";var t=e.i(79056),a=e.i(98451),s=e.i(3966),r=e.i(25728),i=e.i(41785),o=e.i(95310),n=e.i(5790),l=e.i(56672),c=e.i(34444),d=e.i(17444),u=e.i(71718),h=e.i(84059),m=e.i(96737),p=e.i(81825),g=e.i(89862),y=e.i(93695);e.i(37794);var f=e.i(85813),v=e.i(50221);let b=[{slug:"pamela",title:"Pamela",description:"Autonomous prediction market agent. ML-driven position sizing, live on Polymarket 24/7.",longDescription:"Pamela is an autonomous trading agent that monitors prediction markets on Polymarket, identifies mispriced contracts using ML-driven sentiment analysis and probability estimation, and executes trades with intelligent position sizing. Built in TypeScript, deployed on a Hetzner VPS, managed by PM2 for 24/7 uptime.",tags:["TypeScript","ML","Polymarket","PM2"],category:"Agents",snippet:`$ pm2 status pamela
│ online │ 47h │ 0 restarts

P&L: +$247.30 (7d)`,stack:["TypeScript","Node.js","PM2","Hetzner VPS","Polymarket API"],status:"Live"},{slug:"mcp-servers",title:"MCP Servers",description:"Production servers for ChromaDB, knowledge search, and multi-agent orchestration.",longDescription:"A suite of Model Context Protocol servers that give AI agents access to structured knowledge. Includes ChromaDB vector search, Obsidian vault querying, semantic memory retrieval, and multi-agent task dispatch. Built with Effect-TS for type-safe, composable server definitions.",tags:["MCP","Effect-TS","ChromaDB","TypeScript"],category:"Infrastructure",snippet:`server.tool("search", {
  query: z.string(),
  collection: z.enum([
    "vault", "memory"
  ])
})`,stack:["TypeScript","Effect-TS","ChromaDB","Zod","MCP SDK"],status:"Live"},{slug:"pen-plotter-art",title:"Pen Plotter Art",description:"105+ generative art experiments scored by an AI judge. SVG to physical media pipeline.",longDescription:"A generative art pipeline that produces SVG artwork optimized for pen plotters. Over 105 experiments exploring strange attractors, Hilbert curves, Voronoi tessellations, and flow fields. Each piece is scored by an AI judge on composition, line quality, and visual interest. The best pieces get plotted on an AxiDraw with archival ink on cotton paper.",tags:["Generative Art","Python","SVG","AxiDraw"],category:"Creative",snippet:`<svg viewBox="0 0 400 400">
  <path d="M200,50 C350,100
    350,300 200,350" />
</svg>`,stack:["Python","SVG","AxiDraw","Pillow","NumPy"],status:"Active"},{slug:"mastra-orchestrator",title:"Mastra Orchestrator",description:"Multi-agent routing and task dispatch across Claude, Gemini, and local models.",longDescription:"A Mastra-based orchestration layer that routes tasks to the best-fit AI model. Claude Opus handles deep reasoning, Gemini Flash handles search and fast queries, and local models handle drafting. Includes a 10-tool API for reading/writing backlog items, searching the knowledge vault, dispatching tasks to agents, and monitoring VPS services.",tags:["Mastra","Multi-Agent","TypeScript"],category:"Agents",snippet:`router → claude-opus (thinking)
router → gemini-flash (search)
router → local-llama (draft)
✓ consensus reached`,stack:["TypeScript","Mastra","OpenRouter","PM2"],status:"Live"},{slug:"knowledge-api",title:"Knowledge API",description:"Semantic search across 7,000+ documents. ChromaDB + Obsidian + vector embeddings.",longDescription:"A unified search API that queries across ChromaDB vector embeddings, Obsidian vault markdown files, and PyTorch-generated memory tensors. Supports natural language queries with configurable similarity thresholds and collection filtering. Powers the knowledge retrieval layer for all agents in the system.",tags:["ChromaDB","Python","API","Embeddings"],category:"Infrastructure",snippet:`qmd search "agent orchestration"
  --collection claude-vault
  --top-k 10 --min-score 0.6
  # 6,889 documents indexed`,stack:["Python","ChromaDB","FastAPI","Sentence Transformers"],status:"Live"},{slug:"llm-client",title:"LLM Client",description:"Unified client with automatic fallback across OpenRouter, Gemini, Anthropic, and OpenAI.",longDescription:"A Python client that abstracts away provider differences and implements intelligent fallback. Tries OpenRouter first (widest model access), falls back to Gemini, then Anthropic, then OpenAI. Handles rate limiting, quota exhaustion, and provider outages transparently. Used by every Python-based tool in the system.",tags:["Python","OpenRouter","Multi-Provider"],category:"Infrastructure",snippet:`client = UnifiedLLM()
result = client.complete(
  "analyze this market",
  model="auto"  # best available
)`,stack:["Python","OpenRouter","Gemini API","Anthropic SDK"],status:"Live"}],w=[{slug:"strange-attractors",title:"Strange Attractors",description:"Lorenz, Rossler, and Chen attractor systems rendered as SVG paths for pen plotting. Real-time parameter exploration with live preview.",category:"Generative",status:"105+ variants"},{slug:"knowledge-graph",title:"Knowledge Graph",description:"Force-directed visualization of 7,000+ documents across ChromaDB collections, Obsidian vault links, and semantic similarity edges.",category:"Data",status:"Live"},{slug:"total-serialism",title:"Total Serialism",description:"Algorithmic music composition using serialist techniques. Generates both audio output and visual score notation from tone rows and transformation matrices.",category:"Audio",status:"Live",href:"https://djmclaudeassistant-web.github.io/total-serialism/"},{slug:"tartanism",title:"Tartanism",description:"Generative tartan pattern explorer. Procedural plaid generation with historical clan data, color theory, and interactive weaving visualization.",category:"Generative",status:"Live",href:"https://djmclaudeassistant-web.github.io/tartanism/"},{slug:"mastra-orchestrator",title:"Mastra Orchestrator",description:"Visual dashboard for multi-agent task routing. Real-time display of agent states, message passing, and consensus formation across Claude, Gemini, and local models.",category:"Agents",status:"Live"},{slug:"pen-plotter-art",title:"Pen Plotter Art",description:"Generative SVG art pipeline with AI scoring. Over 75 unique generators producing work across flow fields, attractors, tessellations, and algorithmic calligraphy.",category:"Generative",status:"105+ experiments"},{slug:"excalidraw-diagrams",title:"Excalidraw Diagrams",description:"Auto-generated architecture diagrams using a custom Excalidraw generator. 54 diagrams indexed covering system topology, data flows, and agent interactions.",category:"Data",status:"54 diagrams"}],k=[{slug:"building-ai-agent-infrastructure-solo",title:"Building AI Agent Infrastructure as a Solo Developer",description:"How I built a multi-agent system with MCP servers, vector memory, and autonomous trading -- all running 24/7 from a single VPS.",date:"2026-03-21",tags:["Agents","MCP","Infrastructure"],readTime:"8 min",content:`
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
    `.trim()}],P="force-static";function C(){return[{url:"https://edgelesslab.com",lastModified:new Date,changeFrequency:"weekly",priority:1},{url:"https://edgelesslab.com/projects",lastModified:new Date,changeFrequency:"weekly",priority:.9},{url:"https://edgelesslab.com/lab",lastModified:new Date,changeFrequency:"weekly",priority:.8},{url:"https://edgelesslab.com/products",lastModified:new Date,changeFrequency:"weekly",priority:.9},{url:"https://edgelesslab.com/blog",lastModified:new Date,changeFrequency:"weekly",priority:.9},{url:"https://edgelesslab.com/about",lastModified:new Date,changeFrequency:"monthly",priority:.7},{url:"https://edgelesslab.com/privacy",lastModified:new Date,changeFrequency:"yearly",priority:.3},{url:"https://edgelesslab.com/terms",lastModified:new Date,changeFrequency:"yearly",priority:.3},...b.map(e=>({url:`https://edgelesslab.com/projects/${e.slug}`,lastModified:new Date,changeFrequency:"monthly",priority:.8})),...w.map(e=>({url:`https://edgelesslab.com/lab/${e.slug}`,lastModified:new Date,changeFrequency:"monthly",priority:.6})),...k.map(e=>({url:`https://edgelesslab.com/blog/${e.slug}`,lastModified:new Date(e.date),changeFrequency:"monthly",priority:.8}))]}e.s(["default",0,C,"dynamic",0,P],63642);var A=e.i(90073);async function T(){let e=await C(),t=(0,A.resolveRouteData)(e,"sitemap");return new v.NextResponse(t,{headers:{"Content-Type":"application/xml","Cache-Control":"public, max-age=0, must-revalidate"}})}e.s(["GET",0,T],4415),e.i(4415),e.i(63642),e.s(["GET",0,T,"dynamic",0,P],38072);var M=e.i(38072);let R=new t.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/sitemap.xml/route",pathname:"/sitemap.xml",filename:"sitemap--route-entry",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/claude-projects/edgeless-website/src/app/sitemap--route-entry.js",nextConfigOutput:"export",userland:M}),{workAsyncStorage:x,workUnitAsyncStorage:S,serverHooks:D}=R;async function I(e,t,s){s.requestMeta&&(0,r.setRequestMeta)(e,s.requestMeta),R.isDev&&(0,r.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let v="/sitemap.xml/route";v=v.replace(/\/index$/,"")||"/";let b=await R.prepare(e,t,{srcPage:v,multiZoneDraftMode:!1});if(!b)return t.statusCode=400,t.end("Bad Request"),null==s.waitUntil||s.waitUntil.call(s,Promise.resolve()),null;let{buildId:w,params:k,nextConfig:P,parsedUrl:C,isDraftMode:A,prerenderManifest:T,routerServerContext:M,isOnDemandRevalidate:x,revalidateOnlyGenerated:S,resolvedPathname:D,clientReferenceManifest:I,serverActionsManifest:E}=b,q=(0,n.normalizeAppPath)(v),O=!!(T.dynamicRoutes[q]||T.routes[D]),N=async()=>((null==M?void 0:M.render404)?await M.render404(e,t,C,!1):t.end("This page could not be found"),null);if(O&&!A){let e=!!T.routes[D],t=T.dynamicRoutes[q];if(t&&!1===t.fallback&&!e){if(P.adapterPath)return await N();throw new y.NoFallbackError}}let F=null;!O||R.isDev||A||(F="/index"===(F=D)?"/":F);let L=!0===R.isDev||!O,j=O&&!L;E&&I&&(0,o.setManifestsSingleton)({page:v,clientReferenceManifest:I,serverActionsManifest:E});let G=e.method||"GET",B=(0,i.getTracer)(),H=B.getActiveScopeSpan(),U=!!(null==M?void 0:M.isWrappedByNextServer),V=!!(0,r.getRequestMeta)(e,"minimalMode"),_=(0,r.getRequestMeta)(e,"incrementalCache")||await R.getIncrementalCache(e,P,T,V);null==_||_.resetRequestCache(),globalThis.__incrementalCache=_;let z={params:k,previewProps:T.preview,renderOpts:{experimental:{authInterrupts:!!P.experimental.authInterrupts},cacheComponents:!!P.cacheComponents,supportsDynamicResponse:L,incrementalCache:_,cacheLifeProfiles:P.cacheLife,waitUntil:s.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,s,r)=>R.onRequestError(e,t,s,r,M)},sharedContext:{buildId:w}},$=new l.NodeNextRequest(e),K=new l.NodeNextResponse(t),W=c.NextRequestAdapter.fromNodeNextRequest($,(0,c.signalFromNodeResponse)(t));try{let r,o=async e=>R.handle(W,z).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let a=B.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==d.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let s=a.get("next.route");if(s){let t=`${G} ${s}`;e.setAttributes({"next.route":s,"http.route":s,"next.span_name":t}),e.updateName(t),r&&r!==e&&(r.setAttribute("http.route",s),r.updateName(t))}else e.updateName(`${G} ${v}`)}),n=async r=>{var i,n;let l=async({previousCacheEntry:a})=>{try{if(!V&&x&&S&&!a)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let i=await o(r);e.fetchMetrics=z.renderOpts.fetchMetrics;let n=z.renderOpts.pendingWaitUntil;n&&s.waitUntil&&(s.waitUntil(n),n=void 0);let l=z.renderOpts.collectedTags;if(!O)return await (0,h.sendResponse)($,K,i,z.renderOpts.pendingWaitUntil),null;{let e=await i.blob(),t=(0,m.toNodeOutgoingHttpHeaders)(i.headers);l&&(t[g.NEXT_CACHE_TAGS_HEADER]=l),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==z.renderOpts.collectedRevalidate&&!(z.renderOpts.collectedRevalidate>=g.INFINITE_CACHE)&&z.renderOpts.collectedRevalidate,s=void 0===z.renderOpts.collectedExpire||z.renderOpts.collectedExpire>=g.INFINITE_CACHE?void 0:z.renderOpts.collectedExpire;return{value:{kind:f.CachedRouteKind.APP_ROUTE,status:i.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:s}}}}catch(t){throw(null==a?void 0:a.isStale)&&await R.onRequestError(e,t,{routerKind:"App Router",routePath:v,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:j,isOnDemandRevalidate:x})},!1,M),t}},c=await R.handleResponse({req:e,nextConfig:P,cacheKey:F,routeKind:a.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:T,isRoutePPREnabled:!1,isOnDemandRevalidate:x,revalidateOnlyGenerated:S,responseGenerator:l,waitUntil:s.waitUntil,isMinimalMode:V});if(!O)return null;if((null==c||null==(i=c.value)?void 0:i.kind)!==f.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==c||null==(n=c.value)?void 0:n.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});V||t.setHeader("x-nextjs-cache",x?"REVALIDATED":c.isMiss?"MISS":c.isStale?"STALE":"HIT"),A&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let d=(0,m.fromNodeOutgoingHttpHeaders)(c.value.headers);return V&&O||d.delete(g.NEXT_CACHE_TAGS_HEADER),!c.cacheControl||t.getHeader("Cache-Control")||d.get("Cache-Control")||d.set("Cache-Control",(0,p.getCacheControlHeader)(c.cacheControl)),await (0,h.sendResponse)($,K,new Response(c.value.body,{headers:d,status:c.value.status||200})),null};U&&H?await n(H):(r=B.getActiveScopeSpan(),await B.withPropagatedContext(e.headers,()=>B.trace(d.BaseServerSpan.handleRequest,{spanName:`${G} ${v}`,kind:i.SpanKind.SERVER,attributes:{"http.method":G,"http.target":e.url}},n),void 0,!U))}catch(t){if(t instanceof y.NoFallbackError||await R.onRequestError(e,t,{routerKind:"App Router",routePath:q,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:j,isOnDemandRevalidate:x})},!1,M),O)throw t;return await (0,h.sendResponse)($,K,new Response(null,{status:500})),null}}e.s(["handler",0,I,"patchFetch",0,function(){return(0,s.patchFetch)({workAsyncStorage:x,workUnitAsyncStorage:S})},"routeModule",0,R,"serverHooks",0,D,"workAsyncStorage",0,x,"workUnitAsyncStorage",0,S],20583)}];

//# sourceMappingURL=01sj_next_dist_esm_build_templates_app-route_09~-p9l.js.map