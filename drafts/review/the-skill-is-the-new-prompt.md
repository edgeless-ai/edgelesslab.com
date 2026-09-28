---
slug: the-skill-is-the-new-prompt
title: 'The Skill Is the New Prompt: Four Videos, One Pattern'
description: 'Four videos landed the same week — Matt Pocock on authoring agent skills, tldraw shipping skills with an offline app, Nate B Jones split-testing Codex against Fable, and Cole Medin walking through Vercel Eve. Different products, same hidden subject: agent skills are becoming the unit of work for the whole industry. Here is the pattern, the two ways to get it wrong, and what it means for a stack that already runs a skill library in the triple digits.'
date: '2026-08-07'
tags:
- AI Agents
- Agent Skills
- Multi-Agent
- YouTube
readTime: 6 min
editorial: true
summary: 'Four videos, one pattern: prompts are being replaced by agent skills — folders of markdown that teach an AI to do one thing well. The pattern, the two contrasting takes, and what it means for a stack that already runs a skill library in the triple digits.'
ctaHook: 'Prompts are conversations. Skills are infrastructure. Watch the canonical video, read the other three, and steal the four-part rubric this week.'
---

# The Skill Is the New Prompt: Four Videos, One Pattern

Four videos landed the same week — Matt Pocock's skill-authoring manual, tldraw's offline app launch, Nate B Jones split-testing Codex against Fable, and Cole Medin walking through Vercel's Eve framework. A TypeScript educator, a canvas-software company, an automation YouTuber, and an agent-framework walkthrough. Different formats, different audiences, different products. Same hidden subject in all four:

**Agent skills — the folder of markdown and instructions that teaches an AI to do one thing well — are becoming the unit of work for the whole industry.**

Nobody said it in the same words. Pocock called it the path out of "skill hell." tldraw shipped a menu item that installs skills into your coding harness. Nate's entire experiment was about packaging a workflow as a skill. Eve made "the whole agent is a folder" into a product. They're all pointing at the same wall: prompts are getting replaced by something more durable, more inspectable, and more tradeable.

## Why four videos converged on the same pattern

Start with the context problem. Pocock's talk opens with a market failure: thousands of freely downloadable agent skills, and no shared rubric for telling good ones from bad. He calls it "skill hell" — everyone is shipping skills, almost nobody knows how to write one that reliably works. His answer is a four-part checklist: design the trigger, structure steps versus reference, steer with leading words, and prune no-ops.

The trigger question alone is a design decision most people skip. Model-invoked skills carry their description in the agent's context on every request — token cost, plus unpredictability, because the model can simply fail to follow the context pointer. User-invoked skills are invisible to the model until a human calls them — the cost shifts to cognitive load on the pilot. Neither is free; you have to choose deliberately, per skill.

Then the craft. Keep SKILL.md as small as possible and push single-branch reference material behind a context pointer into a bundled file. Steer with dense "leading words" — phrases like "vertical slice" that the agent repeats back in its reasoning trace, which changes behavior far more reliably than a paragraph of prohibitions. And when a step keeps getting shortchanged, split the skill so the agent only sees one phase at a time. Then prune: run a deletion test on every paragraph — if removing it doesn't change agent behavior, it was a no-op.

tldraw's video is the same thesis from the distribution side. The offline app is a file-based desktop tool — documents save as `.tldraw` files that bundle pages, images, and assets, shareable like any normal file — and it ships first-party agent skills via a "develop → install agent skills" menu so Claude Code or Codex can drive the canvas: list open files, screenshot the canvas, read and write embedded scripts, run JavaScript inside the editor. The skill isn't a footnote; it's a launch feature. The company that makes a canvas app now ships instructions for AI harnesses as part of the product.

Nate's video shows why. He runs a head-to-head where the challenge is problem selection, not prompting: Codex and Fable each get free rein over his local files and Slack, and must come back with a problem definition, a root-cause story, and a built automation. The thesis: in 2026 you ask the AI to pick the problem, because what people say their business pain is diverges from what their behavior shows. And the whole experiment gets packaged as a reusable skill — an "automagic button" that audits your behavioral fingerprint, digs to second- and third-level causation, and builds the fix completely. Skills are how you make a one-off experiment into something you run every week.

Cole's video closes the loop: Vercel's Eve makes the entire production agent a folder of markdown and TypeScript — instructions, agent definition, skills, tools, sandbox, channels, connections, subagents, schedules, evals — compiled by one command into a single manifest with everything wired up. The same "drop a skill.md in a folder and it just works" magic that made Claude Code skills popular, extended to a deployable, autoscaling agent with durable sessions, sandboxing, human-in-the-loop approval gates, and evals as a deploy gate.

## Two contrasting takes

**Take one: skills are craft — and the bar is high.**

Pocock's whole talk is a quality argument: the ecosystem is drowning in skills, and the differentiator is discipline. Write the trigger deliberately, keep the file minimal, steer with leading words, prune relentlessly. The skill is a durable artifact — it gets reused, shared, and audited — so it deserves the same care as code. This is the "skills are the new libraries" view: eventually, curation and quality gates decide which skills win.

**Take two: skills are disposable scaffolding — ship the environment, invite the hacking.**

tldraw takes the opposite stance, and it's not an accident: because the offline app is file-based and recoverable, arbitrary code execution is acceptable — "worst case you break a recoverable file" — so tldraw deliberately *invites the hacking*. The demo's earthquake-globe script was never even read before it ran; the embedded code is slop-tolerant by design, because the file-based environment makes unreviewed generated code safe in a way a SaaS could never be. The skill matters less than the environment around it: if the workspace is recoverable, the generated code can be disposable.

These aren't actually in conflict — they're about different layers. The skill *interface* (the trigger, the SKILL.md) has to be tight: that's what the model reads and what gets reused. But the code the agent writes *inside* the environment can be slop, as long as the environment is file-based and recoverable. Tight interface, disposable implementation. Most teams get this backwards: they spend hours polishing generated code nobody will ever read, and ship a trigger description that costs tokens on every request and fires unpredictably.

The second contrast is about where intelligence lives.

**Take one: split the brain across models.**

Nate's result splits cleanly: Codex was the better harness — one run, zero issues, no permission nagging, finished completely — but even in Ultra mode it picked a bounded, "voiced" problem it could wrap its arms around. Fable was a hassle, with repeated permission dialogs, but showed what Nate calls "big model smell": it identified that the hardest job in a storytelling business is choosing which story to tell, and proposed a pre-pipelining tool that makes ideas easier to choose. His verdict: Codex's tool was "fine, I'll probably use it"; Fable's was "essential." The pattern he recommends: run both simultaneously for diversity, let Fable do strategic problem discovery, implement with the cheaper harness. And ship the whole thing with an explicit "don't think small" clause, because Codex defaults to bounded scope.

**Take two: compile everything into one folder.**

Eve's answer is the opposite: the intelligence lives in the structure, not the model choice. The agent is a folder; agent.ts is minimal (model plus API key); the skills, tools, subagents, and channels are just files in their folders; one command resolves it all into a manifest. You don't need a second model to find the strategic problem — you drop a token-heavy "investigator" subagent into the subagents folder, and the framework dispatches the hard reasoning to it. Diversity of perspective is a folder, not a fleet of subscriptions.

Both are true at different scales. Nate is describing the frontier of a single autonomous run — where model strengths genuinely diverge and you want both in the loop. Eve is describing the standardization layer underneath: once the agent is a folder, swapping which model thinks is a config change, and adding a strategic-discovery subagent is a file drop. Nate's split-brain is the workflow; Eve's folder is the packaging that makes it repeatable.

## What it means for our stack

This isn't abstract for us. We run a skill library in the triple digits, a swarm that hands work between agents across sessions, and our own tldraw tooling. Every video above maps onto infrastructure we already have — and tells us where the next upgrade is.

- **The rubric is an audit pass waiting to happen.** Pocock's checklist — trigger design, steps-versus-reference structure, leading words, deletion tests — is exactly the QC pass our skill authoring should absorb, and it gives our tiered skill loading (task-specific skills loaded on demand to save ~94k tokens of context) a sharper vocabulary: that's the model-invoked-description cost he warns about, managed at scale. Worth running his checklist over our highest-traffic skills as an audit.
- **The canvas is already in our stack.** We run an offline tldraw instance with agents authoring files via a spec pipeline — a write-only loop. The official offline app ships the piece we lack: a screenshot feedback loop and first-party agent skills. And the "canvas as agreed symbolic environment" pattern — model draws the workflow, human rearranges it, model syncs changes back — is a direct fit for visualizing swarm ops topology (kanban flows, cron graphs).
- **The split-brain is already our division of labor.** Nate's finding — Codex executes bounded problems flawlessly, Claude does cross-system reasoning — is exactly how we run: Codex CLI for bounded execution, Claude for problem framing and the strategic lanes. What we should steal is the explicit "don't think small — pick by leverage, then build completely" clause for open-ended discovery prompts, and the walls-first rule: fence off data the agent may not touch before any behavioral audit.
- **The folder is already our architecture.** Eve is, frankly, our swarm productized: skills auto-discovered from skill files, hooks, per-folder profiles, subagent dispatch. The interesting delta is the compile-to-manifest step — an explicit compiled manifest instead of runtime scanning — and evals as a deploy gate, which maps onto our verification work. Their human-in-the-loop approval buttons are the same approval-desk pattern we run, and a good candidate for Discord approve/deny buttons.

The common thread across all four: as models get better, the right move is to raise the **interface quality** — the trigger, the file, the folder, the environment — and treat the generated code inside as disposable. Prompts are conversations. Skills are infrastructure.

## Start here

Start with the canonical video — [Building Great Agent Skills: The Missing Manual](https://www.youtube.com/watch?v=UNzCG3lw6O0) (Matt Pocock, via AI Engineer). It's the cleanest statement of the core claim — the ecosystem is in skill hell, and there's a rubric — and the most actionable checklist (trigger → structure → steering → pruning) you can steal this week.

Then the other three, in order of depth:

- [introducing tldraw offline](https://www.youtube.com/watch?v=vCyENfxgyYA) — tldraw — a free desktop app that ships first-party agent skills and treats the canvas as a scriptable, file-based environment; the "invite the hacking" pattern in action.
- [Codex vs Fable: Which AI Agent Picked the Better Problem?](https://www.youtube.com/watch?v=uCWKXIyvM_8) — Nate B Jones — why problem selection, not prompting, is the frontier, and why you want two models in the loop.
- [This Completely Changes the Way We Build Production AI Agents (Vercel Eve)](https://www.youtube.com/watch?v=m8VC2SV2igM) — Cole Medin — the agent-as-folder pattern compiled into a production-deployable standard.

And our existing work, so you can see the pattern applied:

- [SkillOpt: Stop Writing Agent Skills, Start Optimizing Them](/blog/skillopt-self-evolving-agent-skills/) — the optimizer that treats a skill as trainable state, because reading a skill can't tell you whether it works.
- [Hermes Curator: The Agent That Cleans Up After Your Agents](/blog/hermes-curator-skill-lifecycle/) — the skill-lifecycle counterpart to the pruning step in Pocock's rubric.
- [Writing Prompts That Survive Production](/blog/writing-prompts-that-survive-production/) — what prompts are for, and where skills take over.
- [Plan with Opus, Build with Gemini](/blog/plan-with-opus-build-with-gemini/) — split-brain model routing, the same pattern Nate measured.

The models keep changing. That's not going to stop. Skills — the layer you actually control — are where the engineering happens now. Tighten the interface. Make the environment recoverable. Split the thinking across models where it pays. And package every workflow you repeat more than three times into a folder.

That's agent skills. It's the new systems programming.

<!-- Synthesis marker: yt-synth:agent-skills:067290c1e8:content -->
