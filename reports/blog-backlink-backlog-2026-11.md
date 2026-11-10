# Blog Markdown Backlink Backlog - 2026-11

Context: the live `/blog/` post bodies render from the TypeScript registry
(`src/lib/blog.ts`, `src/lib/blog-new-posts.ts`). The `content/blog/*.md`
copies were resynced to the registry body exactly (see `check:blog-integrity`).
The July enrichment pass `27d3ad522` added internal `/blog/` backlinks that
existed only in Markdown. Links whose anchor phrase appears **verbatim** in the
registry sentence were re-inserted into both the registry and the Markdown.
The links below could not be re-inserted without changing registry words, so they
are dropped from the Markdown copy and recorded here for editorial re-authoring.

Ported into registry + Markdown: **28** links.
Already present in the registry (unchanged): 12.
Deferred (anchor not verbatim in registry): **101**.

## Deferred internal backlinks (slug, target, anchor, reason)

| slug | target | anchor | reason |
|---|---|---|---|
| 12-dollar-ai-operations-team | /blog/ai-agent-never-sleeps-hermes-vps/ | Hermes runs 24/7 on a $5 VPS | anchor not verbatim in registry |
| 12-dollar-ai-operations-team | /blog/self-healing-ai-infrastructure/ | agents that die silently | anchor not verbatim in registry |
| 12-dollar-ai-operations-team | /blog/agents-that-talk-to-each-other/ | the dispatch/worker topology | anchor not verbatim in registry |
| 12-dollar-ai-operations-team | /blog/real-cost-ai-agents-production-2026/ | what production agents cost at enterprise scale | anchor not verbatim in registry |
| agent-grounding-problem-hermes | /blog/the-hook-that-saved-my-codebase/ | a verify-completion hook | anchor not verbatim in registry |
| agent-grounding-problem-hermes | /blog/agent-lost-252-dollars/ | an agent once reported lost funds as "in transit" | anchor not verbatim in registry |
| agent-lost-252-dollars | /blog/agent-grounding-problem-hermes/ | Agents confabulate reassuring explanations | anchor not verbatim in registry |
| agent-lost-252-dollars | /blog/the-hook-that-saved-my-codebase/ | a pre-execution hook that blocks dangerous actions | anchor not verbatim in registry |
| agent-lost-252-dollars | /blog/claude-code-hooks-harness-engineering/ | the harness engineering that would have caught it | anchor not verbatim in registry |
| agents-that-improve-themselves | /blog/kb-audit-circulation/ | the full knowledge-base circulation audit | anchor not verbatim in registry |
| agents-that-talk-to-each-other | /blog/12-dollar-ai-operations-team/ | the full cost breakdown of running this team | anchor not verbatim in registry |
| agents-that-talk-to-each-other | /blog/building-ai-agent-infrastructure-solo/ | the infrastructure stack underneath | anchor not verbatim in registry |
| agents-that-talk-to-each-other | /blog/swarm-tried-to-bankrupt-itself/ | what happens when dispatch limits aren't actually enforced | anchor not verbatim in registry |
| ai-agent-never-sleeps-hermes-vps | /blog/hermes-curator-skill-lifecycle/ | Curator, the agent that prunes stale skills | anchor not verbatim in registry |
| ai-agent-never-sleeps-hermes-vps | /blog/agent-grounding-problem-hermes/ | how Hermes knows what's real | anchor not verbatim in registry |
| ai-agent-never-sleeps-hermes-vps | /blog/12-dollar-ai-operations-team/ | the $12/week operations team it anchors | anchor not verbatim in registry |
| ai-newsletter-reads-like-database-dump | /blog/meta-ai-style-guide/ | banning stock phrases by name | anchor not verbatim in registry |
| ai-newsletter-reads-like-database-dump | /blog/writing-prompts-that-survive-production/ | prompts that survive production | anchor not verbatim in registry |
| ai-newsletter-reads-like-database-dump | /blog/n8n-workflows-ai-business/ | the agent pipeline that assembles it | anchor not verbatim in registry |
| anthropic-enterprise-agent-playbook-multi-agent-systems | /blog/kb-audit-circulation/ | auditing our own knowledge base for context quality | anchor not verbatim in registry |
| anthropic-enterprise-agent-playbook-multi-agent-systems | /blog/agents-that-improve-themselves/ | compounding feedback loops in practice | anchor not verbatim in registry |
| anthropic-enterprise-agent-playbook-multi-agent-systems | /blog/harness-is-the-moat/ | the harness is the moat | anchor not verbatim in registry |
| arxiv-to-interactive-demo-marimo | /blog/creative-demos-collection/ | the interactive demos collection | anchor not verbatim in registry |
| autonomous-perp-trading-stack | /blog/arxiv-to-interactive-demo-marimo/ | our paper-to-code pipeline | anchor not verbatim in registry |
| autonomous-perp-trading-stack | /blog/agent-lost-252-dollars/ | the $252 lesson in letting agents touch money | anchor not verbatim in registry |
| autonomous-perp-trading-stack | /blog/multi-agent-goal-loops-theory-and-practice/ | the goal loops that drive the swarm | anchor not verbatim in registry |
| building-ai-agent-infrastructure-solo | /blog/mcp-servers-unix-pipes-of-ai/ | MCP servers as the Unix pipes of AI | anchor not verbatim in registry |
| building-ai-agent-infrastructure-solo | /blog/how-claude-code-memory-works/ | file-based memory across sessions | anchor not verbatim in registry |
| building-ai-agent-infrastructure-solo | /blog/agents-that-talk-to-each-other/ | how the agents coordinate | anchor not verbatim in registry |
| building-ai-agent-infrastructure-solo | /blog/the-hook-that-saved-my-codebase/ | the hook that saved my codebase | anchor not verbatim in registry |
| chladni-waveform-visualizer | /blog/monolith-drummer/ | Monolith Drummer, another audio-reactive study | anchor not verbatim in registry |
| chladni-waveform-visualizer | /blog/creative-demos-collection/ | the creative demos collection | anchor not verbatim in registry |
| claude-code-hooks-harness-engineering | /blog/the-hook-that-saved-my-codebase/ | the damage-control hook in action | anchor not verbatim in registry |
| claude-code-hooks-harness-engineering | /blog/harness-is-the-moat/ | why the harness is the moat | anchor not verbatim in registry |
| claude-dynamic-workflows | /blog/agents-that-talk-to-each-other/ | a dispatch/worker topology you control yourself | anchor not verbatim in registry |
| claude-dynamic-workflows | /blog/real-cost-ai-agents-production-2026/ | how multi-agent overhead multiplies token burn | anchor not verbatim in registry |
| claude-dynamic-workflows | /blog/plan-with-opus-build-with-gemini/ | mixed-provider orchestration | anchor not verbatim in registry |
| creative-demos-collection | /blog/generative-art-algorithms-that-work/ | the 10 algorithms that actually look good | anchor not verbatim in registry |
| creative-demos-collection | /blog/ninety-six-algorithms-one-constraint/ | the 98-algorithm taxonomy | anchor not verbatim in registry |
| creative-demos-collection | /blog/when-plaid-becomes-tartan/ | the Tartanism field notes | anchor not verbatim in registry |
| cursor-swarm-brush | /blog/generative-art-algorithms-that-work/ | flow fields and noise-driven algorithms | anchor not verbatim in registry |
| cursor-swarm-brush | /blog/creative-demos-collection/ | the full demos collection | anchor not verbatim in registry |
| edgeless-memory-v1-passive-recall | /blog/one-file-memory-system/ | The one-file memory pattern this grew out of | anchor not verbatim in registry |
| edgeless-memory-v1-passive-recall | /blog/how-claude-code-memory-works/ | file-based memory for Claude Code | anchor not verbatim in registry |
| edgeless-memory-v1-passive-recall | /blog/kb-audit-circulation/ | our knowledge-base circulation audit | anchor not verbatim in registry |
| edgeless-memory-v1-passive-recall | /blog/building-ai-agent-infrastructure-solo/ | the SQLite + ChromaDB + vault stack | anchor not verbatim in registry |
| generative-art-algorithms-that-work | /blog/creative-demos-collection/ | 37 interactive demos to explore | anchor not verbatim in registry |
| generative-art-algorithms-that-work | /blog/ninety-six-algorithms-one-constraint/ | The full 98-algorithm taxonomy | anchor not verbatim in registry |
| generative-art-algorithms-that-work | /blog/generative-art-pen-plotters/ | the pen plotter technical primer | anchor not verbatim in registry |
| generative-art-pen-plotters | /blog/when-plaid-becomes-tartan/ | The tartan generator's SVG export | anchor not verbatim in registry |
| generative-art-pen-plotters | /blog/ninety-six-algorithms-one-constraint/ | a taxonomy of 98 plotter-safe algorithms | anchor not verbatim in registry |
| generative-art-pen-plotters | /blog/generative-art-algorithms-that-work/ | the 10 algorithms that scored highest | anchor not verbatim in registry |
| google-agentic-stack | /blog/mcp-servers-unix-pipes-of-ai/ | MCP as the Unix pipes of AI | anchor not verbatim in registry |
| google-agentic-stack | /blog/mcp-servers-break-in-production/ | the five ways MCP servers fail in production | anchor not verbatim in registry |
| hermes-curator-skill-lifecycle | /blog/ai-agent-never-sleeps-hermes-vps/ | Hermes 24/7 on a VPS | anchor not verbatim in registry |
| how-claude-code-memory-works | /blog/kb-audit-circulation/ | a knowledge base your agents can't even see | anchor not verbatim in registry |
| how-claude-code-memory-works | /blog/one-file-memory-system/ | the one-file memory system | anchor not verbatim in registry |
| infrastructure-nightmare | /blog/harness-is-the-moat/ | the harness mattering more than the model | anchor not verbatim in registry |
| infrastructure-nightmare | /blog/mcp-servers-break-in-production/ | the same failure modes that break MCP servers in production | anchor not verbatim in registry |
| kb-audit-circulation | /blog/agents-that-improve-themselves/ | the self-improvement loop post | anchor not verbatim in registry |
| kinetic-type-physics | /blog/creative-demos-collection/ | the creative demos collection | anchor not verbatim in registry |
| mcp-servers-break-in-production | /blog/building-ai-agent-infrastructure-solo/ | my solo agent infrastructure | anchor not verbatim in registry |
| mcp-servers-break-in-production | /blog/self-healing-ai-infrastructure/ | self-healing infrastructure | anchor not verbatim in registry |
| mcp-servers-break-in-production | /blog/mcp-servers-unix-pipes-of-ai/ | why MCP servers are the Unix pipes of AI | anchor not verbatim in registry |
| mcp-servers-unix-pipes-of-ai | /blog/mcp-servers-break-in-production | real ways MCP servers fail in production | anchor not verbatim in registry |
| meta-ai-style-guide | /blog/writing-prompts-that-survive-production | prompts that survive production | anchor not verbatim in registry |
| meta-ai-style-guide | /blog/ai-newsletter-reads-like-database-dump | the newsletter that read like a database dump | anchor not verbatim in registry |
| monolith-drummer | /blog/chladni-waveform-visualizer | Chladni Visualizer | anchor not verbatim in registry |
| monolith-drummer | /blog/creative-demos-collection | creative demos collection | anchor not verbatim in registry |
| multi-agent-goal-loops-theory-and-practice | /blog/autonomous-perp-trading-stack | autonomous perp trading stack | anchor not verbatim in registry |
| multi-agent-goal-loops-theory-and-practice | /blog/agents-that-talk-to-each-other | how the agents actually talk to each other | anchor not verbatim in registry |
| n8n-workflows-ai-business | /blog/ai-newsletter-reads-like-database-dump | my AI newsletter read like a database dump | anchor not verbatim in registry |
| ninety-six-algorithms-one-constraint | /blog/generative-art-pen-plotters | pen plotter primer | anchor not verbatim in registry |
| ninety-six-algorithms-one-constraint | /blog/generative-art-algorithms-that-work | the 10 algorithms that actually look good | anchor not verbatim in registry |
| one-file-memory-system | /blog/edgeless-memory-v1-passive-recall | Edgeless Memory v1 | anchor not verbatim in registry |
| plan-with-opus-build-with-gemini | /blog/claude-dynamic-workflows/ | dynamic workflows | anchor not verbatim in registry |
| plan-with-opus-build-with-gemini | /blog/real-cost-ai-agents-production-2026/ | what AI agents really cost in production | anchor not verbatim in registry |
| pricing-ai-agent-services-solo-studio | /blog/real-cost-ai-agents-production-2026/ | what agents actually cost to run in production | anchor not verbatim in registry |
| real-cost-ai-agents-production-2026 | /blog/12-dollar-ai-operations-team/ | $12/week operations team | anchor not verbatim in registry |
| real-cost-ai-agents-production-2026 | /blog/plan-with-opus-build-with-gemini/ | plan-with-Opus, build-with-Gemini | anchor not verbatim in registry |
| scroll-chromatic-excavation | /blog/cursor-swarm-brush/ | Cursor Swarm Brush | anchor not verbatim in registry |
| scroll-chromatic-excavation | /blog/creative-demos-collection/ | the creative demos collection | anchor not verbatim in registry |
| scroll-isometric-dissolution | /blog/kinetic-type-physics/ | Kinetic Type Physics | anchor not verbatim in registry |
| scroll-isometric-dissolution | /blog/creative-demos-collection/ | the creative demos collection | anchor not verbatim in registry |
| self-healing-ai-infrastructure | /blog/how-we-debugged-a-stuck-multi-agent-swarm-without-touching-the-production-pipeline/ | debugging a stuck multi-agent swarm without touching the production pipeline | anchor not verbatim in registry |
| self-healing-ai-infrastructure | /blog/12-dollar-ai-operations-team/ | the $12/week operations team | anchor not verbatim in registry |
| self-healing-ai-infrastructure | /blog/agent-grounding-problem-hermes/ | the agent grounding problem | anchor not verbatim in registry |
| serial-permutation-canvas | /blog/ninety-six-algorithms-one-constraint/ | the 98-algorithm taxonomy | anchor not verbatim in registry |
| skillopt-self-evolving-agent-skills | /blog/agents-that-improve-themselves/ | agents that improve themselves | anchor not verbatim in registry |
| skillopt-self-evolving-agent-skills | /blog/hermes-curator-skill-lifecycle/ | an agent whose whole job is pruning them | anchor not verbatim in registry |
| stanford-genai-worth-2026 | /blog/plan-with-opus-build-with-gemini/ | routing across providers | anchor not verbatim in registry |
| stanford-genai-worth-2026 | /blog/real-cost-ai-agents-production-2026/ | what agents cost to run in production | anchor not verbatim in registry |
| swarm-tried-to-bankrupt-itself | /blog/12-dollar-ai-operations-team/ | the whole operations team cheap | anchor not verbatim in registry |
| tartan-weave-synth | /blog/creative-demos-collection/ | the creative demos collection | anchor not verbatim in registry |
| the-hook-that-saved-my-codebase | /blog/claude-code-hooks-harness-engineering/ | harness engineering | anchor not verbatim in registry |
| the-hook-that-saved-my-codebase | /blog/agent-lost-252-dollars/ | one of mine lost $252 of real money | anchor not verbatim in registry |
| what-portland-businesses-need-from-ai | /blog/n8n-workflows-ai-business/ | a simple workflow | anchor not verbatim in registry |
| when-plaid-becomes-tartan | /blog/tartan-weave-synth/ | Tartan Weave Synth | anchor not verbatim in registry |
| writing-prompts-that-survive-production | /blog/ai-newsletter-reads-like-database-dump/ | newsletter pipeline rewrite | anchor not verbatim in registry |
| youtube-mining-ai-agents | /blog/kb-audit-circulation/ | The knowledge-base circulation audit | anchor not verbatim in registry |
| youtube-mining-ai-agents | /blog/agents-that-improve-themselves/ | agents that improve themselves | anchor not verbatim in registry |

## Dropped Markdown-only embeds (not ported)

| slug | dropped markup |
|---|---|
| arxiv-to-interactive-demo-marimo | demo/lab link /lab/pen-plotter-autoresearch/01_tuning_playground.html |
| chladni-waveform-visualizer | demo/lab link /lab/chladni-visualizer |
| creative-demos-collection | demo/lab link /creative-demos/; demo/lab link /creative-demos/cursor-swarm-brush/; demo/lab link /creative-demos/kinetic-type-physics/; demo/lab link /creative-demos/liquid-decryption/; demo/lab link /creative-demos/monolith-drummer/; demo/lab link /creative-demos/percussive-archaeology/; demo/lab link /creative-demos/scroll-chromatic-excavation/; demo/lab link /creative-demos/scroll-isometric-dissolution/; demo/lab link /creative-demos/serial-permutation-canvas/; demo/lab link /creative-demos/tartan-weave-synth/ |
| cursor-swarm-brush | demo/lab link /creative-demos/cursor-swarm-brush/ |
| generative-art-algorithms-that-work | demo/lab link /lab/generative-ascii |
| generative-art-pen-plotters | demo/lab link /lab/pen-plotter-autoresearch; demo/lab link /lab/pen-plotter-pipeline |
| kinetic-type-physics | demo/lab link /creative-demos/kinetic-type-physics/ |
| monolith-drummer | demo/lab link /creative-demos/monolith-drummer/ |
| ninety-six-algorithms-one-constraint | demo/lab link /lab/total-serialism |
| percussive-archaeology | demo/lab link /creative-demos/percussive-archaeology/ |
| pretext-typography-that-thinks | demo/lab link /lab/generative-ascii |
| scroll-chromatic-excavation | demo/lab link /creative-demos/scroll-chromatic-excavation/ |
| scroll-isometric-dissolution | demo/lab link /creative-demos/scroll-isometric-dissolution/ |
| serial-permutation-canvas | demo/lab link /creative-demos/serial-permutation-canvas/ |
| tartan-weave-synth | demo/lab link /creative-demos/tartan-weave-synth/ |

## Ported backlinks (for reference)

| slug | anchor | target |
|---|---|---|
| agent-grounding-problem-hermes | my 24/7 agent running on a VPS in Helsinki | /blog/ai-agent-never-sleeps-hermes-vps/ |
| arxiv-to-interactive-demo-marimo | every routing decision our agents make | /blog/plan-with-opus-build-with-gemini/ |
| claude-code-hooks-harness-engineering | File-system memory | /blog/how-claude-code-memory-works/ |
| claude-code-hooks-harness-engineering | an agent lost $252 of real money | /blog/agent-lost-252-dollars/ |
| harness-is-the-moat | Institutional memory that survives sessions | /blog/how-claude-code-memory-works/ |
| harness-is-the-moat | Verification gates that catch errors before they ship | /blog/claude-code-hooks-harness-engineering/ |
| hermes-curator-skill-lifecycle | manual audits of the skill directory | /blog/kb-audit-circulation/ |
| hermes-curator-skill-lifecycle | the self-improvement loop | /blog/agents-that-improve-themselves/ |
| how-we-debugged-a-stuck-multi-agent-swarm-without-touching-the-production-pipeline | auto-recovered it | /blog/self-healing-ai-infrastructure/ |
| how-we-debugged-a-stuck-multi-agent-swarm-without-touching-the-production-pipeline | automated website goal loop | /blog/multi-agent-goal-loops-theory-and-practice/ |
| infrastructure-nightmare | Self-triages failures | /blog/self-healing-ai-infrastructure/ |
| kb-audit-circulation | the Knowledge Base Loop | /blog/12-dollar-ai-operations-team/ |
| mcp-servers-unix-pipes-of-ai | agents to send messages to each other | /blog/agents-that-talk-to-each-other |
| meta-ai-style-guide | post-mortem about an agent that lost $252 | /blog/agent-lost-252-dollars |
| n8n-workflows-ai-business | my VPS services | /blog/building-ai-agent-infrastructure-solo |
| percussive-archaeology | Scroll-Chromatic Excavation | /blog/scroll-chromatic-excavation/ |
| prove-it-economy | agent infrastructure | /blog/building-ai-agent-infrastructure-solo/ |
| prove-it-economy | knowledge base architecture | /blog/kb-audit-circulation/ |
| reality-mux-iterative-planning | Self-evaluating goal loops | /blog/multi-agent-goal-loops-theory-and-practice/ |
| shipped-7-products-in-7-days | an agent actually lost $252 | /blog/agent-lost-252-dollars/ |
| shipped-7-products-in-7-days | we actually run 4+ MCP servers | /blog/mcp-servers-unix-pipes-of-ai/ |
| shipped-7-products-in-7-days | we've actually run 105+ experiments | /blog/generative-art-pen-plotters/ |
| swarm-tried-to-bankrupt-itself | a cost watchdog | /blog/self-healing-ai-infrastructure/ |
| swarm-tried-to-bankrupt-itself | coordinated on a shared task board | /blog/agents-that-talk-to-each-other/ |
| tartan-weave-synth | The field notes | /blog/when-plaid-becomes-tartan/ |
| the-hook-that-saved-my-codebase | "I'm done" problem | /blog/agent-grounding-problem-hermes/ |
| what-portland-businesses-need-from-ai | the tooling is commoditized | /blog/pricing-ai-agent-services-solo-studio/ |
| when-plaid-becomes-tartan | pen plotters | /blog/generative-art-pen-plotters/ |
