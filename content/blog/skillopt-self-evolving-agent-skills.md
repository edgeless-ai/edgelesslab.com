---
slug: skillopt-self-evolving-agent-skills
title: 'SkillOpt: Stop Writing Agent Skills, Start Optimizing Them'
description: A new optimizer treats an agent's skill document as trainable state,
  accepting edits only when they measurably improve a held-out score, because LLMs
  reading a skill can't tell good from bad.
date: '2026-06-01'
tags:
- AI Agents
- Agent Skills
- Optimization
- Research
readTime: 6 min
editorial: true
---

# SkillOpt: Stop Writing Agent Skills, Start Optimizing Them

If you have shipped an agent with a hand-written skill file, you have run a quiet experiment whose result you never measured. You wrote down some instructions, the agent read them, and you assumed the agent got better. Maybe it did. Maybe the skill made it worse on a third of your tasks and you never noticed, because "the agent has a skill now" felt like progress and you moved on.

That assumption is the thing two new papers take apart. The companion study, *From Raw Experience to Skill Consumption* (arXiv:2605.23899), reports two findings that should change how anyone building agents thinks about skills. First, model-generated skills help in only about 75% of extractor-target pairings the authors test; the other 25% show negative transfer, where the skill makes the consuming model worse (delta below zero). Skills are beneficial on average, but a quarter of the time they actively hurt, and which quarter depends on the domain and the model pairing in ways you cannot eyeball. Second, and this is the load-bearing result, the paper reports that LLM judges are 46.4% worse than chance at telling effective skills from ineffective ones by reading them.

Sit with that. The standard workflow for skills is: write a skill, read it back, decide it looks good, ship it. The papers' evidence says the "read it back and decide it looks good" step is worse than a coin flip. The text of a skill does not tell you whether the skill works. You have to run it.

That is the premise behind *SkillOpt: Executive Strategy for Self-Evolving Agent Skills* (arXiv:2605.23904, Yang et al., submitted 22 May 2026, revised 25 May 2026), and it is the cleanest reframing of agent skills we have seen. SkillOpt stops treating a skill as documentation the agent reads and starts treating it as the trainable external state of a frozen agent. You do not optimize the model's weights. You optimize one skill document by running it against tasks and measuring what happens.

:::metric
52 / 52 | benchmark cells won or tied
+39.0 | biggest single-task lift (OfficeQA)
46.4% | worse than chance at reading skills
:::

## How it works

The mechanism borrows the discipline of weight-space optimization and applies it to text. A separate optimizer model looks at scored rollouts, the agent's actual attempts at tasks with their outcomes, and proposes bounded edits to a single skill document: add a line, delete a line, replace a span. Crucially, an edit is accepted only when it strictly improves a held-out validation score. This is the part that matters. It is not "the optimizer thinks this edit is better." It is "this edit measurably raised the score on held-out tasks, or it does not go in." The validation gate is execution-grounded, which directly answers the SkillLens finding: you cannot judge a skill by reading it, so SkillOpt never asks anything to read it. It runs it and keeps score.

:::flow The SkillOpt optimization loop
run the skill -> score the rollouts -> propose a bounded edit -> test on held-out tasks -> keep only if the score improves
:::

The training loop has a few stability mechanisms worth naming because they are where this stops being a toy. There is a textual learning-rate budget that caps how much the document can change per step, so the skill does not thrash. There is a rejected-edit buffer that remembers what did not work. And there is an epoch-wise slow/meta update that does the equivalent of a coarser, slower correction on top of the per-step edits. If you have trained models, this rhymes: a fast inner loop bounded by a learning rate, plus a slower outer correction, plus memory of failed moves. The novelty is doing it in token space against an execution metric instead of in weight space against a loss.

The payoff at deployment is the cleanest part of the pitch. SkillOpt adds zero inference-time model calls. The optimization cost is paid once, during training. What ships is a compact document, on the order of a few hundred to a couple thousand tokens, that the agent loads like any other skill. No extra orchestration, no judge-in-the-loop at runtime, no added latency.

## The numbers

Across 6 benchmarks, 7 target models, and 3 execution harnesses (direct chat, the Codex agentic loop, and Claude Code), SkillOpt is reported best or tied on all 52 evaluated (model, benchmark, harness) cells. It beats every per-cell competitor the authors line up against: human-written skills, one-shot LLM-generated skills, Trace2Skill, TextGrad, GEPA, and EvoSkill. Winning or tying every single cell is the kind of result that invites suspicion, and we will get to the caveats, but the breadth is the point: this is not a win on one favorable benchmark.

On GPT-5.5 in direct chat, SkillOpt lifts average no-skill accuracy by +23.5 points. Inside the Codex agentic loop the lift is +24.8; inside Claude Code it is +19.1. The per-benchmark direct-chat numbers (drawn from the paper's extracted results rather than the abstract, so treat them as reported figures rather than independently verified) tell the more useful story about where skills help most:

:::bar-chart GPT-5.5 accuracy lift from SkillOpt, direct chat (points over no-skill)
OfficeQA | +39.0
SpreadsheetBench | +38.9
LiveMath | +29.3
DocVQA | +12.4
ALFWorld | +11.9
SearchQA | +9.6
:::

| Benchmark (GPT-5.5, direct chat) | No skill | SkillOpt | Lift |
|---|---|---|---|
| SpreadsheetBench | 41.8 | 80.7 | +38.9 |
| OfficeQA | 33.1 | 72.1 | +39.0 |
| LiveMath | 37.6 | 66.9 | +29.3 |
| DocVQA | 78.8 | 91.2 | +12.4 |
| ALFWorld | 83.6 | 95.5 | +11.9 |
| SearchQA | 77.7 | 87.3 | +9.6 |

The pattern is legible. The biggest gains are on structured, procedural tasks where a model knows the building blocks but botches the process, spreadsheets and office documents nearly double. The smallest gain is on SearchQA, where the task is closer to "retrieve and answer" and there is less procedure to encode. This is a useful prior for your own work: SkillOpt-style optimization will pay off most where your agent fails on *how to do the thing* rather than *whether it knows the thing*.

Smaller models benefit too. The reported average direct-chat lift across all seven models is roughly +17.6 points, and the authors note a small model nearly doubling on DocVQA and tripling on ALFWorld. And the artifacts transfer: an optimized skill reportedly retains value across model scales, between the Codex and Claude Code harnesses, and even to a nearby math benchmark without re-optimization. That is consistent with the idea that what SkillOpt learns is procedural knowledge, and procedure is largely model-agnostic.

## The caveats, stated plainly

A few things keep us honest. The all-52-cells claim includes ties, and the transfer paper flags that some 2-to-5 point cross-harness wins over EvoSkill are plausibly within noise. Several of the most quotable numbers, the per-benchmark table above, the +17.6 all-model average, the per-baseline margins, come from extracted results rather than the verbatim abstracts, so they are second-hand within our reading. The two papers use partly different benchmark and model sets, so the 25% negative-transfer and 46.4%-worse-than-chance figures come from the SkillLens study, not from SkillOpt's own sweep. None of this sinks the thesis. It just means the headline should be the method, not any single delta.

## What this means if you build agents

The actionable takeaway does not require running SkillOpt. It requires adopting its discipline. If you maintain skill files, you are carrying skills you have never validated by execution, and the evidence says roughly a quarter of them may be net-negative on some of your tasks while looking perfectly reasonable on the page. Stop trusting the page. Build a held-out task set for each skill, run the skill against it, and keep the skill only if it beats the no-skill baseline. That is a weekend of harness work, and it converts "we have a skill for that" from a feeling into a measurement.

The deeper shift is conceptual. Treat skills like state you train, not prose you author. The skill document is the cheapest fine-tune you have: no GPUs, no weights, fully inspectable, transferable across models. The discipline that makes weight training trustworthy, a validation gate, a learning rate, memory of failures, ports directly. SkillOpt's contribution is showing that when you bring that discipline to text, the agent gets meaningfully better and pays nothing extra at inference. The maxim is worth taping to your monitor: don't read the skill, run it.