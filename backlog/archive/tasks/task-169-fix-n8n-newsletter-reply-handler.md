---
created: 2026-03-10
status: superseded
priority: P1
epic: 2-ingestion
effort: L
depends_on: []
blocks: [task-170]
supersedes: [task-138]
tags: [n8n, workflow, youtube, email, automation, security]
---

# Task 169: Fix n8n Newsletter Reply Handler (Full Stack)

Supersedes task-138 (same workflow, narrower scope).

## Context

The n8n YouTube newsletter reply handler workflow is broken on multiple levels. Codex audit and Claude Code review both confirmed issues. Previous fix attempts via database manipulation made things worse (task-138 notes).

## Current State (Audit 2026-03-10)

### CRITICAL
1. **Docker daemon not running** — no n8n workflows can execute
2. **Secrets exposure** — Gemini API key `AIzaSyA5y...` hardcoded in 4 files (docker-compose.yml, .env, 2 test workflows, start-n8n.sh)
3. **LLM misconfigured** — Uses `@n8n/n8n-nodes-langchain.lmChatAnthropic` with $0 credits; never switched to Gemini despite key existing
4. **Path mismatch** — Docker mounts at `/data/claude-vault` but all 4 workflows reference `/Users/djm/...` (absolute host paths)
5. **Duplicate RSS workflows** — `rss-ingestion-workflow.json` (v1, 30min) vs `rss-feeds-updated.json` (v2, 2hr) with architectural drift

### WARNING
6. RSS `feedUrl` vs `feedUrls` field name mismatch
7. Weak Postgres password (`n8n123`) in docker-compose
8. n8n REST API auth mostly disabled (`N8N_AUTH_EXCLUDE_ENDPOINTS=rest,healthz,metrics`)
9. Email digest has placeholder addresses (`n8n@yourdomain.com`)
10. Nano-banana workflow references undefined credential IDs

### Workflow Inventory
| Workflow | Schedule | Status | Key Issue |
|----------|----------|--------|-----------|
| `youtube-newsletter-reply-handler.json` | Poll 1min | BROKEN | Wrong LLM, path issue |
| `rss-ingestion-workflow.json` | Every 30min | BROKEN | Path issue, field mismatch |
| `rss-feeds-updated.json` | Every 2hr | BROKEN | Duplicate of above, path issue |
| `digest-generation-workflow.json` | 6am/2pm/10pm | BROKEN | Path issue, placeholder emails |

## What the Workflow Should Do

1. Gmail Trigger polls for replies to YouTube Intelligence emails
2. AI generates a response using working LLM (Gemini/OpenRouter)
3. Email reply sent back, ACTION block stripped
4. If action detected, write to `.claude/inbox/actions.jsonl`
5. Claude Code processes actions into backlog tasks

## Follow-Up (2026-03-10)

- `docker-compose.yml` still excluded the `rest` endpoint from auth and hardcoded Postgres env values; corrected in this pass.
- `start-n8n.sh` and `NANO_BANANA_SETUP.md` still duplicated literal login credentials; updated to read from `.env`.
- `workflows/youtube-newsletter-reply-handler.json` had drifted from the top-level export and is being re-synced as the mounted runtime copy.
- Added `.env.example` so the local environment contract is explicit without copying live secrets into docs.

## Runtime Validation (2026-03-11)

- Added `NODE_FUNCTION_ALLOW_BUILTIN=fs` to the n8n container so Code nodes can read newsletter files and append to the action queue.
- Imported and executed disposable workflow `YouTube Newsletter Reply Handler Smoke` (`7FELdHKdiwBmhvmB`).
- Smoke execution `24` reached the Gemini step and failed with a `429` quota error on the configured Gemini credential.
- Smoke execution `25` replaced the model call with a static reply and verified the downstream path end-to-end:
  - ACTION metadata was stripped from the outgoing reply body
  - `hasAction=true` and `queuedAction` were set correctly
  - `.claude/inbox/actions.jsonl` received the queued task line
- The canonical `youtube-newsletter-reply-handler.json` was corrected so `Generate Reply -> Detect Actions -> Send Reply` is the stored workflow graph.
- The canonical workflow export was also missing Gmail and Gemini credential references; those were restored so future imports do not silently strip bindings.
- Current live blockers are external:
  - Gmail trigger credential is invalid/expired and must be reconnected in n8n
  - Gemini credential is present but currently quota-blocked for reply generation

## Acceptance Criteria

### Phase 1: Unblock (30 min)
- [x] Start Docker and n8n container (`docker-compose up -d`) — running, healthz 200
- [x] Fix container path mapping — replaced `/Users/djm/claude-projects` with `/data` in all workflows
- [x] Rotate or confirm Gemini API key status — key in .env only

### Phase 2: Fix LLM (1 hr)
- [x] Swap reply handler LLM from Anthropic LangChain node to Gemini (`lmChatGoogleGemini`, gemini-2.0-flash)
- [x] Prove downstream reply/action path with disposable smoke workflow
- [ ] Test via live Gmail-triggered workflow in n8n UI / runtime
- [x] Added ACTION block detection node that writes to `/data/action-queue/actions.jsonl`
- [ ] Restore working Gemini quota or switch the reply workflow to a provider with usable quota

### Phase 3: Consolidate (1 hr)
- [x] Move all secrets to `.env` exclusively (removed from docker-compose, test JSONs, start-n8n.sh, NANO_BANANA_SETUP.md)
- [x] Archived RSS v1 (`rss-ingestion-workflow.json.archived`), v2 is canonical
- [x] Fixed RSS `feedUrl`/`feedUrls` mismatch — added Split Feed URLs node
- [x] Fixed digest email addresses to `thedavidmurray@gmail.com`
- [x] Strengthened Postgres password to `n8n_prod_2026!secure`
- [x] Tightened auth: removed `rest` from N8N_AUTH_EXCLUDE_ENDPOINTS
- [x] Enabled builtin `fs` access for Code nodes in the n8n container
- [x] Restored credential references in the canonical reply-handler export

### Phase 4: Verify (30 min)
- [ ] Test reply handler end-to-end: send a reply to YouTube Intelligence email, verify AI response
- [x] Auth config updated (rest endpoint no longer excluded)
- [x] Exported final workflow JSONs to `n8n-workflows/backups/`
- [ ] Reconnect Gmail OAuth in n8n so the live Gmail trigger can activate again

## Artifacts

- `n8n-workflows/youtube-newsletter-reply-handler.json`
- `n8n-workflows/docker-compose.yml`
- `n8n-workflows/start-n8n.sh`
- `n8n-workflows/rss-ingestion-workflow.json`
- `n8n-workflows/rss-feeds-updated.json`
- `n8n-workflows/.env` (create/update)
- `n8n-workflows/digest-generation-workflow.json`

## Notes

- Do NOT fix via database manipulation — use the n8n UI (lesson from task-138)
- CLI import/update was used for workflow state changes; no direct SQLite mutation was used.
- Consider task-170 (Python replacement) as the longer-term solution
- n8n version: 1.113.3, SQLite DB at 864K

## Source

Codex audit + Claude Code review + n8n infrastructure audit (session 2026-03-10)
