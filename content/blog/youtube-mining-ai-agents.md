---
slug: youtube-mining-ai-agents
title: I Pointed 7 AI Agents at My YouTube History. They Found What I Couldn't See.
description: '7 agents analyzed 1,062 YouTube videos and found 14 things they should
  be doing that they weren''t. Topic clusters, channel ROI, knowledge gaps, and the
  meta-move: agents auditing themselves.'
date: '2026-05-12'
tags:
- AI Agents
- YouTube
- Knowledge Mining
- Automation
readTime: 10 min
editorial: true
---

# I Pointed 7 AI Agents at My YouTube History. They Found What I Couldn't See.

Seven agents read 1,062 videos' worth of my YouTube watch history and told me things about how I think that I couldn't see myself.

Not "recommendations." Not "you might also like." Actual structural analysis of what I've been consuming, what I've been building, and the gaps between the two. The kind of mirror you can only get when something with no ego reads your data and tells you what it means.

What happened when I stopped watching YouTube and started mining it.

---

## The Raw Material

Over the past several months, I've liked 1,062 YouTube videos. Not casually; I use the like button as a bookmark, a "this was worth my time" signal. Every liked video gets pulled into my Obsidian vault automatically: transcript extracted, topics tagged, channel metadata captured, duration logged.

By May 2026, I had 1,062 vault notes sitting in `claude-vault/03-Knowledge/YouTube/`. Each one structured identically: title, channel, published date, duration, transcript (full or summary), and a topic tag array averaging 5.3 tags per video. That's roughly 2,858 unique topics across 299 channels.

This is a dataset. A personal knowledge corpus that nobody had ever analyzed as a whole.

So I built a pipeline to do exactly that.

The alternative was to keep scrolling. Watch the next recommendation. Let the algorithm decide what I should know. But I already had the data; structured, tagged, searchable. The question wasn't "what should I watch next?" It was "what does my entire watch history reveal about how I think?"

---

## 7 Agents, 7 Angles

I didn't run one analysis. I ran seven, in parallel, each attacking the dataset from a different angle. The agents processed videos in batches of 10, with each analysis writing its results to a structured output file.

What each agent did:

**1. Topic Co-occurrence Analysis**
Which topics appear together? Not just "what do I watch" but "what concepts cluster in my mind?" This used Jaccard similarity and pairwise co-occurrence counts across all 1,061 multi-topic notes.

**2. Temporal Signal Detection**
What am I watching *more* of over time? What's declining? This compared topic share between Q1 and Q2 2026 to find acceleration and decay patterns.

**3. Channel ROI Scoring**
Not all channels are equal. I scored 46 channels (those with 3+ videos) on four dimensions: substance (did I get full transcripts?), relevance (overlap with my active projects), depth (average video duration), and diversity (topic spread). Weighted formula: substance(0.3) + relevance(0.3) + depth(0.2) + diversity(0.2).

**4. Knowledge Gap Analysis**
The big one. Cross-referenced my 2,858 YouTube topics against my 15 active project domains. What am I building that I'm not studying? What am I studying that I'm not building?

**5. Agentic Workflows Bridge Map**
Specifically compared vault knowledge about agentic workflows against my actual infrastructure: 55 cron scripts, 168 skills, 7 Hermes agents, 3 n8n workflows. Where does the vault suggest automations that don't exist yet?

**6. Content Digest Generation**
Summarized the findings into a briefing document, prioritized by actionability.

**7. ChromaDB Sync**
Embedded all analysis artifacts into the vector database so future agents can query the findings.

Total processing time for all seven: one session. The agents ran in parallel. By the time I finished my coffee, the analysis was done.

Why seven analyses and not one big report? Because each agent operates with a fresh context window and a narrow objective. A single agent trying to do topic clustering *and* temporal analysis *and* gap detection would run out of context or lose focus. Seven agents with seven objectives produce cleaner results. This is the Ralph Wiggum pattern we use throughout the stack: one task, one context, one output, move on.

---

## What the Agents Found

### 8 Dense Topic Clusters

The co-occurrence analysis found 8 clusters where topics are tightly interconnected; every topic in the cluster co-occurs with every other topic at least 3 times.

The most connected cluster: **ai-agents + anthropic + claude-code + open-source** (84 topics in the broader connected component). This wasn't surprising; it's my primary domain. But the structure was revealing. The cluster has clear sub-modules:

- **Cluster 1**: ai-agents, anthropic, claude-code, open-source (the core)
- **Cluster 2**: agentic-coding, context-engineering, developer-tooling, prompt-engineering (the craft)
- **Cluster 3**: knowledge-management, obsidian, productivity (the second brain)
- **Cluster 6**: ai-alignment, ai-safety, superintelligence (the philosophy)

Then there were the unexpected ones:

- **Cluster 5**: black-holes, quantum-gravity, theoretical-physics (pure curiosity)
- **Cluster 7**: computer-graphics, physics-simulation, research-papers (the visual fascination)

I knew I watched physics videos. I didn't know they formed a structurally distinct island in my knowledge graph, completely disconnected from my work clusters. The Jaccard similarity between the physics clusters and my work clusters was effectively zero. These are parallel intellectual lives that never intersect; at least not yet.

The tightest coupling in the entire graph? `knowledge-management` and `obsidian` at 0.38 Jaccard similarity. When I watch one, I almost always watch the other. That pair is more strongly linked than `ai-agents` and `claude-code` (0.05). My second-brain obsession is more concentrated than my AI obsession.

### The Fastest-Accelerating Topic

Agentic engineering: +322% share growth from Q1 to Q2 2026. Not just "AI agents" broadly (that's actually declining in share at -1.8pp); specifically the *engineering* of agentic systems. The tooling, the architecture, the craft.

Other accelerators: hermes-agent (+1,949%, from 1 note to 17; I started watching content about my own project's problem space), mathematics (+262%), nvidia (+382%).

The declining topics tell a story too: ai-benchmarks (-2.6pp), vibe-coding (-1.1pp), context-engineering (-1.5pp). I'm moving from *evaluating* AI to *building with* AI. The consumption pattern tracks the shift from research to practice.

The temporal analysis also caught something I'd missed entirely: mathematics surged +262% from Q1 to Q2, with 16 of 26 total math videos consumed in May alone. I'm unconsciously compensating for the AI-heavy diet with pure abstraction. The agents don't speculate on *why*; they just surface the pattern and let me make sense of it.

### Channel ROI: The Hidden Gems

The highest-ROI channel wasn't any of the big names. It was **Ben Davis** (ROI: 0.790); 4 videos, 100% full transcripts, 68% topic overlap with my active projects. Every video was directly applicable to what I'm building.

The top 5 by ROI:

| Channel | Videos | ROI | Why |
|---------|--------|-----|-----|
| Ben Davis | 4 | 0.790 | Deep agentic-coding, Effect-TS, TypeScript |
| Greg Isenberg | 3 | 0.757 | AI agents in business, long-form interviews |
| Every | 6 | 0.754 | Agentic coding deep dives, Claude Code workflows |
| 3Blue1Brown | 34 | 0.685 | Mathematics, high substance, beautiful explanations |
| ColeMedin | 87 | 0.662 | AI agents, coding tools, high volume but consistent |

Meanwhile, I've watched 123 WesRoth videos and 87 SabineHossenfelder videos. High substance, but relevance scores of 0.02 and 0.01 respectively. That's entertainment consumption masquerading as research. The agents don't judge; they just show you the numbers.

### The Biggest Blind Spot

Discord and community tooling: **3 YouTube videos** mapped to my discord-infra project. Three. I'm running a 7-agent Discord swarm with 5 specialized bots, and I've watched almost nothing about Discord bot development, community management, or bot-to-bot coordination patterns.

The knowledge gap analysis ranked it as my biggest blind spot. Not because the project is failing (it works) but because I'm building it entirely from first principles with zero external input. That's either impressive or reckless, depending on your perspective.

For contrast: my `agentic-os` domain maps to 1,131 YouTube videos. My `knowledge-system` domain maps to 150. Discord infrastructure maps to 3. The ratio of consumption-to-build-effort is wildly inverted for Discord compared to everything else.

The remediation is obvious: search YouTube for Discord bot development, community automation, bot-to-bot coordination. The agents even suggested specific search terms. They aren't only finding gaps; they're writing the prescription.

---

## The Meta-Move: Agents Auditing Themselves

This is where it gets interesting. The agentic workflows bridge analysis cross-referenced what the vault *knows* against what the infrastructure *does*. It found 14 automation gaps: things the vault's knowledge suggests I should be automating but aren't. This is the same loop behind [agents that improve themselves](/blog/agents-that-improve-themselves/), pointed at my own stack.

Fourteen things my agents should be doing that they weren't.

The vault had notes about webhook-triggered agent sessions, rubric-based output validation, self-improving expertise files, and multi-model cascade patterns. My actual infrastructure had none of these implemented. The knowledge was sitting in the vault, tagged and searchable, while the agents ran on static system prompts and unchecked cron outputs.

This is the AI equivalent of having a bookshelf full of unread books. Except now the books can read themselves and file bug reports.

The 14 gaps fell into three categories: validation gaps (agents producing unchecked output), learning gaps (agents not accumulating knowledge between sessions), and integration gaps (systems that should talk to each other but don't). The bridge analysis literally drew a diagram showing where vault knowledge pointed to automations that spanned both n8n (event-driven) and the agentic OS (code-driven) but didn't exist in either. ([The knowledge-base circulation audit](/blog/kb-audit-circulation/) picks up this thread and quantifies it.)

---

## 5 Quick Wins, One Session

We didn't just analyze. We shipped. In the same session that produced the analysis, we implemented 5 of the 14 identified gaps:

**1. Rubric Validation for Cron Jobs**
Added `scripts/lib/rubric_validator.py`; takes a cron job output plus a YAML rubric, calls Claude to grade pass/fail, alerts on failure. The morning briefing and digest analyzer now validate their own output quality.

**2. Self-Improving Expertise YAML**
Hermes agents (Kilo, Hive, Beau) now maintain `expertise.yaml` files that update after every build cycle. Domain knowledge accumulates between sessions instead of dying with the context window.

**3. Skill Orchestrators**
Added orchestrator skills that compose existing atomic skills into multi-step workflows. Instead of the human chaining `skill_A` then `skill_B` then `skill_C`, an orchestrator handles the sequence with error handling and checkpointing.

**4. Objective-Function RALP Loops**
Ralph Wiggum loops (our recursive autonomous task pattern) now have explicit objective functions. Instead of "do the thing until it seems done," each loop has a measurable completion criterion and a grading rubric.

**5. Webhook Agent Dispatch**
n8n can now trigger Claude Code sessions via webhook. External events (email arrival, RSS match, GitHub webhook) write structured task files to `.claude/inbox/`, and a cron job dispatches headless agent sessions per task.

Five gaps closed. Nine remaining. The analysis produced its own roadmap.

The remaining nine are bigger lifts: things like multi-model cascade routing for different analysis types, automated A/B testing for agent system prompts, and a feedback loop where ChromaDB query patterns inform which YouTube topics to actively seek out. Each one has a vault note that describes the pattern and a gap in the infrastructure where the implementation should live.

---

## The Biggest Finding

This is the thing that stopped me cold.

The vault contains 1,062 videos about AI agents, knowledge management, coding tools, physics, and philosophy. My YouTube consumption is sophisticated; I'm watching 3Blue1Brown explain topology, Geoffrey Huntley break down recursive agent loops, and Anthropic engineers discuss alignment.

But my *practice* is more sophisticated than my *consumption*.

I'm running a 25-agent swarm with Kantian invariants (ethical constraints that agents cannot override), a 3-layer memory system (ChromaDB + PyTorch + Vault), file-based and API-based inter-agent communication, session poisoning detection, and automated self-improvement loops.

Nobody on YouTube is teaching this. The videos I watch cover *pieces* of what I've built, but the system as a whole (the integration, the failure modes, the operational knowledge) doesn't exist in any channel's content. My consumption feeds my practice, but my practice has outrun my consumption.

The agents found the gap by looking at the data. I couldn't see it because I was too close.

There's an irony here. I'm building systems more sophisticated than the content I consume about building such systems. The Kantian invariants, the multi-layer memory architecture, the inter-agent communication protocols: these aren't patterns I learned from YouTube. They emerged from operational necessity. The YouTube consumption gave me *vocabulary* and *components*, but the architecture is original.

That gap between consumption and practice might be the most important thing the agents found. It means I'm not only applying what I learn. I'm synthesizing something new. And the only way I could see that was by having agents analyze the delta.

---

## How to Do This Yourself

You don't need 1,062 videos. You need a structured dataset of *something you consume* (articles, podcasts, bookmarks, tweets) and a way to tag and analyze it.

The pipeline I built is open source:

**[YouTube Intelligence Pipeline](https://github.com/thedavidmurray/youtube-intelligence)**: the extraction, tagging, and analysis pipeline. Takes YouTube liked videos, pulls transcripts, generates structured vault notes, runs the 7-analysis battery.

**[Edgeless Stack](https://github.com/thedavidmurray/edgeless-stack)**: the full agent infrastructure. Hermes, Discord swarm, cron automations, memory system, skills library. Everything the agents run on.

The key insight isn't the code. It's the *approach*: treat your consumption data as a dataset, not a feed. Run structural analysis, not recommendations. Look for gaps between what you know and what you do.

The agents didn't tell me what to watch next. They told me what I was avoiding, what I was over-indexing on, and where my practice had outgrown my sources.

That's worth more than any recommendation algorithm.

Start with whatever you already have. If you use YouTube likes, that's your corpus. If you star GitHub repos, that's your corpus. If you save articles to Pocket or Readwise, that's your corpus. The point isn't the source; it's the structural analysis. Tag everything. Count the co-occurrences. Map against what you actually build. The gaps will be obvious once you look.

---

## What's Next

This is part of the Agentic OS series. Related posts:

- [The $12 AI Team](/blog/12-dollar-ai-operations-team)
- [Agents That Talk to Each Other](/blog/agents-that-talk-to-each-other)
- [How Claude Code Memory Works](/blog/how-claude-code-memory-works)
- [Self-Healing AI Infrastructure](/blog/self-healing-ai-infrastructure)
- [The Hook That Saved My Codebase](/blog/the-hook-that-saved-my-codebase)

Follow me on [X](https://x.com/qt_djm) for updates, or check out the repos linked above.

---

*David runs Edgeless Lab, a solo creative technology practice. He has 25 AI agents, 168 skills, and 1,062 YouTube vault notes. The agents now audit their own knowledge gaps. He's not sure who's running the operation anymore.*