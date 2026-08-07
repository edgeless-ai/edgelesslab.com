# Edgeless Lab Content Pipeline

This document defines the content types, templates, and quality gates for every piece of content published on edgelesslab.com.

## Content Types

### 1. Editorial / Field Notes
Long-form, narrative posts about infrastructure, agent systems, and engineering lessons. These are the default content type. They do not directly sell a product — they establish authority, share lessons, and build trust.

- **Tone**: First-person, specific, honest. "Here's what broke and how I fixed it."
- **Length**: 1500-2500 words
- **Structure**: Hook → Setup → Problem → Resolution → Lesson
- **CTA**: Optional. Usually a `ctaHook` in the YAML frontmatter, not a hard sell.

### 2. Pre-Sold Posts (NEW)
Blog posts structured to pre-sell a product before the reader ever sees a product page. These posts do three things, in order: **Repel, Dissolve, Invite**.

Use this template for any post that precedes or links to a product landing page.

---

## Pre-Sold Post Template

### Structure (Mandatory)

**Section 1: REPEL — Qualify the reader (300-500 words)**

Use inside language — the exact dialogue running inside your perfect future client's head. This is not describing their situation from the outside. It is quoting the conversation they have with themselves.

- Lead with a specific pain / fear / frustration, stated as a first-person thought
- "I'm so tired of [thing that drains them]"
- "Have you ever thought to yourself: [exact internal dialogue]?"
- Name the specific failure mode they recognize immediately
- This section repels the wrong reader (the "energy vampires" who aren't committed) and magnetizes the right one

**Key test**: A reader who is NOT your target should feel mildly uncomfortable. A reader who IS your target should feel seen.

**Section 2: DISSOLVE — Remove their fears (400-600 words)**

Address the three objections that keep them from acting:

1. **"I don't have enough time."** — Show how this fits into their existing workflow. Be specific about time commitment.
2. **"I need to think about it."** — Pre-emptively resolve the uncertainty. What are they actually unsure about? Name it and address it.
3. **"I need to speak to [partner/boss/team]."** — Give them the language to make the case. Provide a one-sentence pitch they can forward.

For each objection:
- Name the fear explicitly ("You might be worried that...")
- Show evidence that it's unfounded (case study, data point, counter-example)
- Provide a concrete resolution

**Key test**: After reading this section, the reader should have no remaining reason to say "I need to think about it."

**Section 3: INVITE — Sell from the back foot (200-300 words)**

This is not a hard sell. It is an invitation.

- Frame it as "this is for people who [the qualification criteria from Section 1]"
- Do not convince. Simply state what the product is and what it does
- "If that sounds like you, here's the link."
- End with the reader's choice, not the price

**Key test**: The reader should feel like they are choosing to buy, not being sold to.

### Tone
- First-person, direct, conversational
- No marketing fluff, no "revolutionize your workflow"
- Use the same language your reader uses internally
- Short sentences. Punchy paragraphs.

### Length
- Total: 900-1400 words
- Repel: 300-500
- Dissolve: 400-600
- Invite: 200-300

### Examples

**Repel line (inside language):**
> "I'm so tired of sending hundreds of DMs every day only to get told 'I just need to think about it.'"

**Dissolve section (fear addressed):**
> "You might be worried this will take too long. It won't. Here's exactly what the first week looks like: 15 minutes on day one to set up the config, 5 minutes a day after that. The system does the rest."

**Invite closing:**
> "This is for anyone who's tired of the DM grind and wants to build a system that pre-sells instead. If that's you, here's the link. If not, no hard feelings."

### Product Mapping

| Product | Pre-Sold Post Topic | Repel Hook |
|---------|-------------------|------------|
| agent-safety-patterns | "I lost $252 because my agent did what I asked, not what I meant" | "I just need to think about it" / fear of agent mistakes |
| hooks-deep-dive | "My hooks shut down damage before I could" | "I'm tired of finding out about agent mistakes from the damage report" |
| n8n-ai-workflows | "I spent 3 days wiring an automation that should have taken 30 minutes" | "I don't have time to learn another tool" |
| production-mcp-kit | "My MCP server leaked an API key in production" | "I can't afford for this to break in production" |
| multi-agent-blueprint | "My agents keep stepping on each other" | "I tried running two agents and they fought over the same task" |
| gen-art-starter | "My plotter spent 4 hours drawing something that looked terrible" | "I keep generating art that looks good on screen but terrible on paper" |
| launch-toolkit | "I shipped a product that nobody bought" | "I'm tired of shipping products that don't sell" |
| always-on-agent | "My agent forgets everything when I close the laptop" | "I keep re-explaining context to my AI assistant every morning" |
| claude-code-cheat-sheet | "I'm hunting through Claude Code docs while my session expires" | "I keep forgetting the exact command I need" |
| agent-starter-kit | "I spent 3 weeks setting up a swarm and it still doesn't work" | "I want to run multiple agents but the setup is overwhelming" |

---

## Checklist Gate

**Any blog post that precedes or links to a product page MUST use the Pre-Sold Post template OR document in the post's `processNote` or a comment why it does not.**

### Why this gate exists

A reader who lands on a blog post about a problem and then clicks through to a product page has already been sold by the content. The pre-sold structure ensures the sale happens in the content itself, not on the product page. If a post links to a product but does not use the template, the reader arrives at the product page cold — and that's where "I just need to think about it" lives.

### Gate enforcement

1. Before publishing any post, check: *Does this post link to a product page?*
2. If yes: verify the post follows the Repel → Dissolve → Invite structure.
3. If it does not: add a note in `processNote` or the post body explaining why the template was skipped (e.g., "This post is a pure engineering postmortem — linking to the product as a reference, not as a close.")
4. Posts that fail the gate without documentation will be rejected at review.

### Exceptions

- Editorial posts that mention a product in passing (not as the main subject) do not need the template.
- Field notes that link to a product in the "sources" or "related" section do not need the template.
- Pure technical documentation (API references, migration guides) can skip the template if documented.

---

## Existing Blog Posts Audit

| Post | Links to Product? | Uses Pre-Sold Template? | Status |
|------|------------------|------------------------|--------|
| The Gateway That Broke | No | N/A | Editorial — OK |
| 710 Tasks and the Bottleneck That Wasn't | No | N/A | Editorial — OK |
| The Monitor That Cried Wolf | No | N/A | Editorial — OK |
| Kimi K3 | No | N/A | Editorial — OK |
| The Night Our Swarm Tried to Bankrupt Itself | No | N/A | Editorial — OK |
| Turning Audio Into a Resonant Plate | No | N/A | Editorial — OK |
| SkillOpt | No | N/A | Editorial — OK |
| The Harness Is the Moat | No | N/A | Editorial — OK |
| The Prove-It Economy | No | N/A | Editorial — OK |

No existing posts link to product pages. The gate will apply to future posts.