---
slug: the-bot-that-was-online-but-couldnt-talk
title: The Bot That Was Online But Couldn't Talk
description: A chat agent showed green, connected, running — and ignored every message.
  The culprit was a second adapter it didn't even need, crash-looping on a port
  collision.
date: '2026-07-14'
tags:
- Multi-Agent
- Infrastructure
- Agent
readTime: 5 min
editorial: true
ctaHook: Why "the process is up" and "the service works" are two different claims —
  and how a sidecar's crash loop starves its host.
---

# The Bot That Was Online But Couldn't Talk

I stood up a new chat agent, watched it connect, saw the little green dot, and told the
person waiting on it that it was live. They messaged it. Nothing. They messaged it again.
Nothing. Meanwhile a *different*, older bot kept cheerfully answering in the same channel —
the one that was supposed to have been retired from it.

Two bugs wearing one coat. Let me take them in order, because the debugging order is the
lesson.

## "Running with 1 platform" — but which one?

The new agent's startup log said, plainly: `Gateway running with 1 platform(s)`. Connected.
Green. So I assumed the messaging platform I cared about was the one running.

It wasn't guaranteed to be. The agent was configured for *two* platforms — the chat network I
wanted, and a second integration I'd copied over from a template and never thought about. The
log's "1 platform" was true, but ambiguous: one of the two had connected, one had failed, and
the summary didn't tell me which was which. I'd read "1 platform running" as "the platform is
running." Those are not the same sentence.

When I actually read further down, the second adapter was in a crash loop:

```
Fatal adapter error: sidecar exited unexpectedly
Error: listen EADDRINUSE: address already in use 127.0.0.1:8792
```

The unwanted integration was trying to bind a port that another agent already held. It
crashed, a supervisor restarted it, it crashed again — every thirty seconds, forever. And
each of those "Fatal adapter error" cycles churned the whole gateway process enough that the
platform I *did* care about never got a stable footing to answer a message. The bot was
online the way a person mid-panic-attack is technically awake.

## The fix: delete the thing you never needed

I didn't debug the port collision. I asked a better question: does this agent need that
second integration at all? It's a chat bot. It needs the chat network. The other adapter was
inherited baggage — present because it was in the template, not because anything used it.

So I removed it. One platform in the config, the crash-looping one disabled, restart. The log
changed to something unambiguous:

```
Connected as <the bot> — discord connected
Gateway running with 1 platform(s)
```

Same "1 platform" line. Completely different meaning, because now there was only one platform
it *could* mean. The bot answered the next message immediately.

## The second bug: the retired bot that didn't retire

The reason the *old* bot kept talking in that channel was subtler and worth its own note. I'd
"relieved" it of the channel by changing which bot posts there — but I'd never told the old
bot's gateway to *ignore* the channel. It still had permission to respond anywhere. And a
reply-chain quirk (someone replying to one of its old messages counts as mentioning it) kept
dragging it back in.

The fix there was a denylist, not an allowlist: an explicit "never respond in these channels,
even when mentioned." Allowlists are fragile — miss one channel and you silence the bot where
it belongs. A targeted denylist says exactly what I mean: *this channel is not yours.*

## The lesson worth stealing

1. **"The process is up" is not "the service works."** A gateway can be running while the
   part you care about is starved by a neighbor. Verify the capability, not the pulse.
2. **Delete inherited complexity before you debug it.** The fastest fix for the crash loop
   wasn't fixing the crash — it was removing the component that had no reason to be there.
3. **A crash loop is not a quiet failure.** It's a loud one that hides *behind* a green
   status line. When something "up" won't do its job, read past the summary to what its
   subcomponents are actually doing.

The bot's online now — the real kind, where online means it answers.
