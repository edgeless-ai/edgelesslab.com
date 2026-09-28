---
slug: the-loop-is-not-the-guarantee
title: 'The Loop Is Not the Guarantee: What Six Old Automation Videos Still Teach'
description: 'My YouTube pipeline flagged six "automation" videos as this week''s trend. They are actually a 2022-2023 IndyDevDan series: five five-minute Notion API tutorials and one VS Code macro video. The trend was a clustering artifact. The lesson still holds: the read, act, mark loop every tutorial ends on does not deliver exactly-once, and the API it was built on has since changed shape.'
date: '2026-09-26'
tags:
- Automation
- Multi-Agent
- YouTube
- Python
readTime: 6 min
editorial: true
summary: 'Six "automation" videos turned out to be one creator''s three-year-old tutorial series. They are still worth watching, because the read, act, mark loop they end on quietly teaches that marking a row makes a job safe to re-run. It does not.'
ctaHook: 'Watch the five-minute auth video, then add a claim step before your loop does anything irreversible.'
---

# The Loop Is Not the Guarantee: What Six Old Automation Videos Still Teach

My YouTube pipeline clusters videos by theme and files a card when enough of them converge. This week it flagged **Automation: six videos**. It looked like a trend.

It wasn't one. All six come from IndyDevDan, and all six are old. Five belong to his "Notion API in 5 Minutes" series, uploaded between January and February 2023. The sixth is a VS Code macros video from July 2022. The clusterer had re-grouped the same backlog for the third time. A convergence score can't distinguish "six people are talking about this now" from "one person made a playlist years ago."

That's the first lesson, and it's about our pipeline, not about automation. The videos are still worth a post, though. Between them they teach a real pattern, and the most useful part is the one they leave out.

## The pattern: five primitives and a loop

The Notion series works as a single dependency chain split into five-minute parts:

1. **Authenticate.** Create an internal integration at developers.notion.com and put its token in `notion-client`. Then do the step everyone forgets: connect the target page to the integration in the Notion UI. If you skip it, a valid token sees nothing, and the error looks like a bad token. Call `client.pages.retrieve()` once to confirm access before you build anything on top.
2. **Write blocks.** `client.blocks.children.append()` with typed payloads for paragraph, heading, callout and to-do. The block type is the key name itself.
3. **Write rows.** `client.pages.create()`, where every value gets wrapped in its column type's shape. A title is a list of text objects, a select is `{"select": {"name": ...}}`, and a date is `{"date": {"start": ...}}`. Notion never accepts a bare string.
4. **Read rows.** Query the database, then use a `safe_get` helper to unwrap those same nested shapes into flat dicts. Flatten right away so your business logic never touches raw Notion JSON.
5. **Read blocks.** Walk `blocks.children.list` recursively. The API returns one level at a time, so a single-level read silently drops nested content. The last video lets Copilot scaffold this recursion while the developer checks the output against the real page.

Put them together and you get the loop every Notion-as-backend tutorial ends on:

```python
for row in get_database_rows(client, db_id):
    if row["status"] != "Delivered":
        act(row)                        # post, send, generate
        mark(client, row["id"], "Delivered")
```

(This is illustrative. It hasn't been run against a live workspace.)

## Two takes on automation

The sixth video looks like it doesn't belong, and the clusterer only grouped it because of the word "automation." Put it next to the other five anyway, because the pair shows two different ideas of what automation means.

**Take one: automate the keystrokes.** The macros video uses the Macro Commander extension to chain editor commands behind a keybinding: start the dev server, wrap a selection in an if-statement, scaffold a component. A human stays in the loop and presses the key. The payoff is speed, and when a macro breaks, you see it happen.

**Take two: automate the system.** The Notion series takes the human out of the loop. A script reads a store, acts on what it finds, and writes back. The payoff is leverage, and a failure can go unnoticed. When a macro fails, the result is a mangled line of code on your screen. When the Notion loop fails, the result is a duplicate tweet at 3 a.m.

The first approach speeds up an operator. The second replaces one, and once nobody is watching, the loop has to be correct on its own.

## What the tutorials leave out

The `mark` step feels like it makes the loop safe to re-run. It only makes that safe in the easy case. Two failure windows remain:

- **Crash after acting, before marking.** The tweet went out, but the row still says pending. The next run sends it again.
- **Two readers.** Two scheduled runs overlap, both read the same pending row, and both act on it. Marking happens after the action, so nothing stops the second run.

Neither of these is Notion's fault. They're what you get whenever the side effect and the bookkeeping happen in separate steps. The fixes are the same everywhere:

- **Claim before you act.** Move the row from `Todo` to `Processing` in one update, with an owner and an expiry. Act only if your claim succeeded, and let a sweeper reclaim claims that expire.
- **Carry an idempotency key.** Derive it from the row id plus the payload, so the downstream system can refuse a duplicate even when your loop sends one.
- **Reconcile.** Periodically compare what the store says happened with what actually happened, and repair any mismatch.

We learned this ourselves. Our swarm doesn't use Notion. Its work queue is a Kanban board in SQLite, but it hit the same class of bug. [Six Dispatchers Where One Is Law](https://edgelesslab.com/blog/six-dispatchers-where-one-is-law/) is about what happens when more than one process thinks it owns dispatch. The fix our board runs today is the claim pattern above: before a worker starts a card, the board records a claim with a lock holder and an expiry, and a stale claim goes back to the queue instead of being run twice.

## One more thing: the API moved

Tutorials age. Notion API version `2025-09-03` added multi-source databases, and [Notion's upgrade guide](https://developers.notion.com/guides/get-started/upgrade-guide-2025-09-03) says most operations that used a `database_id` now need a `data_source_id`. That includes querying a database and creating a page with a database as its parent. The change is not backwards-compatible. Read the 2023 code for its patterns (typed wrappers, flattening, recursion) and not for its exact call signatures. Discover the data source first, then query it.

## What to do with this

- **If you're building on Notion:** start with the [auth video](https://www.youtube.com/watch?v=KyllgpvQFuI). It's five minutes long, and the page-sharing step alone will save you an afternoon. Then watch [database write](https://www.youtube.com/watch?v=JoCdhP0OkAU) and [database read](https://www.youtube.com/watch?v=rQeG6DeUPNs) back to back, since they're mirror images. Check each call against the current upgrade guide.
- **If you're building any read, act, mark loop:** add a claim step before anything irreversible and an idempotency key after it. Watching a loop run cleanly once doesn't prove it's safe.
- **If you run a trend detector:** cap how much a single creator counts toward a cluster, and discount old uploads. Otherwise your "six videos this week" turns out to be one playlist from 2023.

The rest of the series: [Write](https://www.youtube.com/watch?v=KENSTonsiEc), [Read with Copilot](https://www.youtube.com/watch?v=GSPpYqBgIko), and the off-theme but useful [VS Code macros](https://www.youtube.com/watch?v=iieHofTv3cM). For how we keep agent learnings from being rediscovered three times, see [The Knowledge Base Loop](https://edgelesslab.com/blog/knowledge-base-loop/).
