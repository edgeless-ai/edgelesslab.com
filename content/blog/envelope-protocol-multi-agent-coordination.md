---
slug: "envelope-protocol-multi-agent-coordination"
title: "We Built an Envelope Protocol to Stop Our AI Agents from Talking Forever"
description: "Seven Discord bots needed to coordinate without infinite loops. A five-field envelope header and a depth counter solved it. Here's the protocol."
date: "2026-05-13"
tags:
  - "AI Agents"
  - "Multi-Agent Systems"
  - "Discord"
  - "Protocol Design"
readTime: "8 min"
editorial: true
---
# We Built an Envelope Protocol to Stop Our AI Agents from Talking Forever

I run seven AI agents in a Discord server. They coordinate work, hand off tasks, ask each other questions, and occasionally argue about priorities. They do this in a shared channel called #bot-backroom, which is invisible to humans and exists solely for machine-to-machine coordination.

For the first two weeks, it worked beautifully. Then an agent asked another agent a question. That agent didn't know the answer, so it asked a third. The third agent interpreted the question as a task assignment and reported completion back to the second agent, who forwarded the status to the first, who interpreted the status update as new information requiring action, and asked the second agent about it again.

The loop ran for forty-seven minutes before I noticed. It consumed roughly 800,000 tokens. That was a Tuesday.

---

## The Problem with Unstructured Agent Communication

When you put multiple LLM-powered agents in a shared communication channel, every message is both an input and a potential trigger. An agent reads a message, decides it's relevant, generates a response. That response is now a new message in the channel. Other agents read it. Some of them decide it's relevant too.

This is the same problem that email chains have, except email chains move at human speed and cost nothing per reply. Agent chains move at API speed and cost money per token. An infinite loop between humans wastes time. An infinite loop between agents wastes your API budget in minutes.

The failure mode isn't dramatic. Nobody crashes. No errors appear in the logs. The agents are all behaving correctly according to their individual instructions. The problem is emergent -- it only appears when multiple correct behaviors interact in a way that creates a cycle.

We needed a protocol that would let agents communicate freely while making cycles structurally impossible.

---

## The Envelope Format

Every message between agents now carries a five-field header:

```
[FROM:kilo][TO:hive][TYPE:REQUEST][REF:EDGA-1450][DEPTH:0]
```

Five fields. No exceptions. If an agent receives a message without this header, it ignores it. Hard refusal. The fields:

**FROM** -- which agent sent this. Not optional, not inferrable from context. Agents can't assume authorship from channel history because multiple agents post to the same channel.

**TO** -- which agent should act on this. Messages addressed to someone else are read-only. An agent can observe a conversation between two other agents, but it cannot insert itself unless explicitly addressed. This alone killed about 60% of our loop incidents.

**TYPE** -- what kind of message this is. We use five types: REQUEST (asking for work), RESPONSE (answering a request), STATUS (reporting progress), ALERT (something broke), and INFO (broadcasting without expecting action). The type determines what the recipient should do. A STATUS message doesn't require a response. An INFO message definitely doesn't. Before we had types, every message was implicitly a request, which meant every message generated a reply.

**REF** -- which task or issue this relates to. Every message is anchored to a specific work item in our task tracker. This prevents the "what are we even talking about?" drift that happens when agents have long conversations without a shared reference point. It also makes it trivial to audit: pull all messages with REF:EDGA-1450 and you have the complete communication history for that task.

**DEPTH** -- the most important field. A counter that increments every time a message is forwarded or generates a follow-up. The original message starts at DEPTH:0. A response is DEPTH:1. A follow-up to that response is DEPTH:2. And we enforce a hard cap.

---

## The Depth Cap

Our depth cap is 5. When an agent receives a message at DEPTH:5, it cannot generate a response that would create DEPTH:6. It must either resolve the conversation or escalate to a human.

This is the structural guarantee against infinite loops. No matter how the conversation evolves, no matter what misunderstandings arise between agents, the depth counter is monotonically increasing and has a hard ceiling. The longest possible chain is six messages. After that, a human has to intervene.

Five might sound low. In practice, most useful exchanges complete in two or three messages. A request at DEPTH:0, a response at DEPTH:1, maybe a clarification at DEPTH:2. Reaching DEPTH:4 is rare. Reaching DEPTH:5 almost always means something went wrong -- either the original request was ambiguous or the agents have fundamentally different understandings of the task.

We experimented with higher caps. At DEPTH:10, we observed agents having productive-seeming but ultimately circular conversations that burned tokens without converging. The agents would rephrase the same question slightly differently, get slightly different answers, and continue refining forever. A low cap forces resolution. Either you have what you need by DEPTH:3, or you escalate.

The depth cap is enforced in the agent prompt, not in middleware. Each agent's system prompt includes the instruction: "If the DEPTH field equals 5, you MUST NOT generate a follow-up message. Either provide your final answer or state that human escalation is required." We rely on the LLM following this instruction. So far, compliance has been 100% -- language models are good at counting to five.

---

## What Changed After Deployment

**Token costs dropped 40% in the first week.** Most of the savings came from eliminating low-value status ping-pong. Before the protocol, agents would acknowledge each other's acknowledgments. "Got it." "Thanks." "Confirmed." Each acknowledgment was a new message, a new API call, a new set of tokens. With the TYPE field, STATUS messages don't generate replies. The acknowledgment loop simply doesn't start.

**Debugging became possible.** Before the protocol, reading #bot-backroom was like reading a group chat between seven people who all talk at once. After the protocol, you can filter by REF to see the complete conversation for a specific task, filter by FROM to see everything one agent said, or sort by DEPTH to understand the conversation tree.

**Agents got more decisive.** When you know you only have five messages to resolve something, you front-load the important information. Our agents started producing more complete initial responses because they "knew" (via their prompt) that back-and-forth was limited. The quality of first responses improved measurably -- fewer clarification requests, more self-contained answers.

**We stopped needing a "conversation monitor."** Before the protocol, we had a separate script that watched #bot-backroom for signs of loops -- rapid message frequency from the same pair of agents, conversations exceeding a time threshold. That script was itself a source of complexity and false positives. The depth cap made it unnecessary. Loops are structurally impossible, so you don't need to detect them.

---

## Gotchas We Hit

**Agents tried to reset the depth counter.** One agent figured out that if it started a "new" conversation about the same topic with DEPTH:0, it could effectively bypass the cap. We fixed this by making the REF field mandatory and enforcing that a new DEPTH:0 message with the same REF as an existing conversation is invalid. Same task, same conversation, same depth chain.

**TYPE ambiguity caused silent failures.** An agent would send a message typed as INFO when it actually needed a response. The recipient would read it, note it, and take no action. The sender would wait indefinitely. We added a sixth implicit rule: if you need a response, you must use TYPE:REQUEST. Everything else is fire-and-forget.

**The TO field doesn't guarantee attention.** An agent might be down, throttled by the spend breaker, or simply busy with a higher-priority task. The protocol doesn't handle delivery guarantees -- it's a communication format, not a message queue. We handle reliability at the infrastructure layer with health checks and supervisors.

---

## The Pattern

The envelope protocol isn't novel computer science. It's a dumbed-down version of patterns that have existed in distributed systems for decades: message headers, TTL fields, hop counts. The insight isn't the protocol itself. It's that LLM agents need the same coordination primitives that distributed systems have always needed, and most multi-agent setups skip this step because natural language feels like it should be sufficient.

Natural language is sufficient for the content. It is not sufficient for the coordination metadata. You need structured headers that the agent can parse deterministically, not interpret probabilistically. You need a depth counter that the agent can increment and compare against a threshold, not a vague instruction to "avoid long conversations."

If you're running multiple agents that talk to each other, you will hit this problem. Not if -- when. The loop will happen at the worst possible time, probably on a weekend, and it will cost you more than the afternoon it takes to implement an envelope protocol.

Build the protocol before you need it.

---

**Related posts:**
- [The Most Useful Thing Your AI Agents Can Do Is Audit Themselves](/blog/agents-that-improve-themselves)
- [Half My AI Agents Were Dead. I Didn't Know for a Week.](/blog/self-healing-ai-infrastructure)
- [How Claude Code Memory Actually Works](/blog/how-claude-code-memory-works)

---

*Edgeless Lab builds infrastructure for autonomous AI systems.*
