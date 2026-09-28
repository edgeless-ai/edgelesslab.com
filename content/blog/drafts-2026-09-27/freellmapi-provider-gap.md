# The FreeLLMAPI Router Is 497 Commits Behind and Breaking Everything

**Date:** 2026-09-27
**Status:** Draft — humanizer pass complete
**Source:** `claude-vault/03-Knowledge/swarm/2026-09-27-freellmapi-provider-gap-audit.md`

---

## The problem in one line

Our model router is stale, and most worker runs are hitting rate limits because of it.

## What's actually broken

The FreeLLMAPI router checkout sits far behind upstream. It declares far fewer providers in its adapter list than the model catalog references. Seven provider adapter files are completely missing — the router literally doesn't know they exist.

The practical result: when a worker tries to dispatch on one of those missing providers, it gets rate-limited. The run requeues. It doesn't count as a failure, so the lane keeps spinning instead of tripping. You end up with a growing backlog of cards stuck in `ready` and many rate-limited runs — all because the router can't route to providers it doesn't know about.

## What we're actually paying for

We hold API keys for many providers. Only a handful carry real traffic. Kilo alone handles the majority of successful requests.

The rest are either depleted or broken:

| Provider | Status |
|----------|--------|
| Google | Prepayment required |
| HuggingFace | Credits exhausted |
| Cohere | Rate-limited |
| Zhipu | Rate-limited |
| Cerebras | Free tier gone |

## The fix (short version)

1. **Upgrade the router** — pull the many missing commits, add the missing adapter files
2. **Add a Nous deepseek-v4.1-flash fallback** — before runtime-local, on several specialist agents
3. **Sign up for free-tier providers** — many accept keys without a credit card. GitHub Models works with the existing `GITHUB_TOKEN`.

## Why this matters

Until the router is upgraded, every kanban task is a coin flip on whether it'll actually run. The backlog is growing. The fix is mechanical — upgrade, add adapters, add a fallback — but it's blocked on the same quota wall that's causing the rate limits in the first place.

---

**Next step:** Upgrade FreeLLMAPI, add the missing adapters, and wire the Nous fallback before the next dispatch cycle.// freellmapi-provider-gap.md
