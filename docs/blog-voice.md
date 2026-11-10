# Blog voice: writing for people outside the room

## Reader and purpose

Write for an engineer, designer or independent builder who has never seen our board, agent roster or internal notes. Give them enough context to understand the problem, what we observed and why it matters to their own work. A post is not a progress report or a vault export.

## The standard

- Open with a concrete problem, observation or argument. Explain the system and its stakes before using its internal name.
- Translate internal shorthand: task IDs, routing language, status labels, team-specific profile names, retro references and unexplained acronyms do not belong in public copy. Expand necessary technical acronyms on first use.
- Remove private paths, credentials, sensitive customer details and internal-only links. A public citation should let the reader inspect the relevant source.
- Keep first-person experience, specific supported numbers, and a clear failure → response → lesson. Distinguish an observed failure, a proposed fix and a verified result. Never turn a plan into an accomplished fact.
- Keep uncertainty and dates where they affect a claim. If evidence is missing, qualify or cut the claim; don't fill the gap with a plausible story. Explain tradeoffs rather than proclaiming a universal winner.
- Preserve the original slug and publication date. Don't remove useful technical detail simply because it is technical; explain it.

## Before and after

These examples come from the published posts in this repository. The revised wording avoids asserting more than the underlying source establishes.

1. **Heartbeat post** — Before: “For four hours, the shared coordination file claimed Hive was online. It wasn't.” After: “A scheduled job repeatedly wrote the coordinator's heartbeat, making its status look current even though the status did not establish that the coordinator itself was running.” The source establishes untrusted authorship, not that the coordinator was offline.
2. **Open-source evaluation post** — Before: “We evaluated 9 open-source replacements across three categories. Three made the cut.” After: “We reviewed nine projects and shortlisted three for further investigation.” The underlying evaluation recommends follow-up; it doesn't establish deployment.
3. **CRT shader post** — Before: “All of it runs in a single fragment shader pass. No post-processing stack.” After: “The project uses multiple rendering passes to combine signal and display effects.” Its source describes a multi-pass pipeline.

## Final editorial check

Can an outsider state what happened, distinguish evidence from interpretation, follow a source, and use the lesson without knowing our internal systems? If not, revise before publishing. A good voice cannot rescue a factual claim that lacks support.
