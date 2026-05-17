---
created: 2026-03-11
updated: 2026-03-11
status: done
priority: P1
epic: 2-ingestion
effort: M
depends_on: []
blocks: []
tags: [newsletter, rss, email, digest, ingestion, substack]
cross_refs: [task-169, task-170, task-104]
---

# Task 207: Build Daily Newsletter Digest Pipeline

## Context

User wants a working daily newsletter summary — aggregate ~120 Substack newsletters via RSS and summarize them into a daily digest email. Previous RSS feed approach (n8n) never worked reliably. YouTube intelligence pipeline works, but newsletter/RSS summarizer has never been functional.

## Status

**Phase 1: COMPLETE** — 121 RSS feeds wired up (120 Substacks + Turing Post)
**Phase 2: IN PROGRESS** — Pipeline built and tested, Gmail token needs reauth for email delivery

### What's Working
- `scripts/newsletter_digest.py` — full pipeline script
- Fetches 121 RSS feeds in parallel (20 workers)
- Groups articles into 8 categories (AI, Finance, Culture, Politics, Ideas, Media, Business, Lifestyle)
- LLM summarization via OpenRouter (Gemini 2.0 Flash)
- Beautiful HTML digest email generation
- Deduplication via state file (`config/newsletter_digest_state.json`)
- Dry-run mode for testing
- First successful run: 35 articles from 48h window

### Blocking
- Gmail OAuth token expired — needs browser reauth: `python3 src/tools/email/reauth-gmail.py`
- Once email works, set up daily cron (7am PST)

## Technical Approach

### Phase 1: Newsletter Collection via RSS ✅
- Every Substack has RSS at `{publication}.substack.com/feed`
- 121 feeds registered in `NEWSLETTERS` dict with category tags
- Additional non-Substack feeds in `EXTRA_FEEDS` dict
- Categories: AI/Tech, Finance/Trading, Culture/Art, Politics/Policy, Science/Ideas, Writing/Media, Business/VC, Lifestyle

### Phase 2: Daily Digest Pipeline (90% complete)
- Script: `scripts/newsletter_digest.py`
- Usage: `--hours N` (lookback), `--dry-run` (preview), `--category X` (filter)
- Morning cron (7am PST): `python3 scripts/newsletter_digest.py --hours 24`
- Summarize via LLM (OpenRouter free tier)
- Generate categorized HTML email
- Send to thedavidmurray@gmail.com
- **TODO**: Fix Gmail token, set up cron

### Phase 3: Integration
- Feed summaries into ChromaDB for knowledge graph
- Upload notable articles to NotebookLM for deeper synthesis
- Update Obsidian vault with key insights

### Phase 4: Auto-Backlog Task Creation
- During summarization, detect actionable items (new tools, frameworks, techniques)
- Cross-reference against active backlog to avoid duplicates
- Auto-create backlog tasks for relevant items (with `source: newsletter-digest` tag)
- Include in digest email: "Suggested backlog tasks from this digest" section
- User can approve/reject via Telegram reply

### Newsletter Sources (121 feeds across 8 categories)

**AI/Tech (11)**: ByteByteGo, Last Week in AI, Latent Space (swyx), Elvis Saravia, API First, Dan Abramov, Hugh Zhang, Neuranne, How Things Work, Construction Physics, Nita Farahany, Turing Post

**Finance/Trading (6)**: Michael J. Burry, Awake Invest, Compounding Quality, Unusual Whales, Back of the Envelope, Convex

**Culture/Art (19)**: Do Not Research, Actual Source, Art But Make It Sports, Casual Archivist, Generate Collective, Rothko's Girlfriend, Cult Holdings, Outland Art, Pablo Delcan, Visualize Value, Metalabel, Sublime, Contraptions, Rev Dan Catt, Austin Kleon, Christine Tiballi, Aaron Bondaroff, A1A Beach Club, Culture of Sport, Shawn Kemp, SFTW

**Politics/Policy (13)**: Angela Nagle, Blocked and Reported, Drop Site News, Pirate Wires, Palladium, Public Power Review, Maz M Hussain, Tracing Woodgrains, Default Friend, Samo Burja, Institute for Progress, Sasha Latypova, New_ Public

**Science/Ideas (16)**: Astral Codex Ten, Cultural Tutor, Zvi, Experimental History, Erik Hoel, Noahpinion, Anton Howes, Razib Khan, John Higgs, Convivial Society, The Egg and the Rock, Slavoj Žižek, Branko Milanovic, Sarah Constantin, Leah Prime, Summer Lightning

**Writing/Media (18)**: Chuck Palahniuk, Patti Smith, Poetic Outlaws, Sam Kriss, Jen Pan, Max Read, Numlock News, Alex Dobrenko, Bill Oakley, William Fleitch, Isabel Unraveled, Evie Lync, Joshua Citarella, New Models, Sasha Chapin, Mike Pepi, Kevin Baker, Tao Lin, Embedded

**Business/VC (12)**: a16z, a16z Fintech, Houck, Every (Evan Armstrong), The Agile VC, Sari Azout, David Perell, Dean W. Ball, Quotient, BNet, Rob May, Annie Duke, The Network Company

**Lifestyle/Personal (19)**: 8-Ball, The Authority on Nothing, Felix McNamara, Paul Millerd, Workcraft Life, Kitchen Fridge, Drew Austin, Nate's Newsletter, Russell Max Simon, Idea Space, Curiosity Department, Future by Melissa, XR0AM, Micz, Santi R, Bas Gras, Rina Nicolae, Daniel Setzermann, Dave Rutledge, Substack Team

## Acceptance Criteria

- [x] All user newsletters wired up via RSS (121 feeds)
- [x] Pipeline script built with LLM summarization
- [x] Categorized HTML digest email generation
- [ ] Gmail token reauthed — digest email sending works
- [ ] Daily digest cron running (7am PST)
- [ ] Newsletter content indexed in ChromaDB
- [ ] User can add/remove newsletters via Telegram command

## Source

Telegram messages #261, #282-283, #285 (2026-03-11)
