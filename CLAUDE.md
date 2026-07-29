# Claude Master Configuration

## Hard Rules (Read First)

1. **Check before building.** Before creating ANY infrastructure (tokens, bots, cron jobs, scripts, configs), verify it doesn't already exist: check memory files, `crontab -l`, existing scripts. If unsure, ask. Never rebuild what's already running.
2. **Verify before claiming.** Never claim a service or tool is broken without running a verification command in the same turn. If it errored once, try again before declaring it down.
3. **Save credentials immediately.** When ANY credential, token, or infrastructure ID is generated or revealed, write it to a memory file IN THAT SAME RESPONSE. Don't defer. Sessions die without warning.
4. **No browser goose chases.** Never send the user to click through settings pages. Exhaust all CLI/API options first. If browser action is truly required, give ONE exact URL with ONE exact click — then pivot if it fails.
5. **Match frequency to consumer.** When setting cron/polling frequencies, ask: "Who consumes this output, and how often?" Set frequency to match the consumer, not the producer.
6. **Gate external actions.** Drafting is not authorization to act. Do not send email or DMs, publish posts, submit forms or applications, approve queued outreach, or execute financial transactions unless David explicitly authorized that action in the current request or a version-controlled automation mandate names the exact action, destination, limits, and kill switch. Never turn a review queue into auto-approval. Tests must be offline by default; an authorized live test may use only David-owned allowlisted destinations and must be visibly labeled as a test.

---

## Memory System

The former `.claude/memory/session_initializer.py`, memory query script, and
memory-system skill are retired. Do not invoke or recreate them. Use:

- `claude-vault/` for durable human-readable knowledge;
- `scripts/swarm_memory.py` for structured working memory;
- Chroma collection `knowledge_spine` through
  `scripts/lib/chroma_config.py` for semantic recall.

Never put credentials or reversible secret fingerprints into Vault, working
memory, or Chroma.

## FreeLLMAPI Gateway

FreeLLMAPI is the launchd-owned local gateway at
`http://127.0.0.1:3001/v1`. Before service, credential, model-route, license,
Docker, or recovery work, use
`.Codex/skills/freellmapi-operations/SKILL.md` and read
`docs/freellmapi-operations.md`. Never inline or print its credential values.

## EdgelessLab Production Deployment

The canonical local checkout is `/Users/djm/claude-projects/edgelesslab.com`.
The repository that owns and publishes the `edgelesslab.com` custom domain is
`https://github.com/edgeless-ai/edgelesslab.com`.

`https://github.com/thedavidmurray/edgelesslab.com` is a personal fork. A green
Pages deployment there does not update production. Never infer the production
target from a remote named `origin`. Query the GitHub Pages API and require
`cname: edgelesslab.com` before publishing.

Read `docs/runbooks/edgelesslab-github-pages-deployment.md` and the repository's
`docs/deployment-runbook.md` before any EdgelessLab deploy.

## JavaScript Dependency Management

Use **pnpm** instead of npm or yarn for JavaScript dependency management wherever practical. Configure pnpm with `minimumReleaseAge: 1440` so that newly published package versions cannot be installed until they are at least 24 hours old.

## Pre-commit Smoke Tests (EDGA-962)

**DO NOT bypass with `--no-verify` unless you're certain.**

The pre-commit hook runs smoke tests on Python/shell file changes:
- **Compile check**: `python -m compileall` catches syntax errors
- **Import check**: Validates all entry points in `scripts/preflight/entry_points.txt`
- **Skill frontmatter**: Checks `.claude/skills/*/skill.md` for valid YAML with name/title
- **Shell syntax**: `bash -n` validates all `scripts/cron/*.sh`

### Run Smoke Tests Manually

```bash
# Run full smoke test suite
python scripts/preflight/smoke_test.py

# Run with verbose output
python scripts/preflight/smoke_test.py --verbose

# Run falsifier test (verifies smoke test catches errors)
python scripts/preflight/falsifier_test.py
```

### Adding New Entry Points

When adding new importable modules, update `scripts/preflight/entry_points.txt`:

```
# === scripts.lib (library modules) ===
scripts.lib.my_new_module
```

### Bypassing (Emergency Only)

```bash
# If you KNOW the failure is a false positive
git commit --no-verify
```

## Project Commands (Justfile)

Use `just --list` to see all available project commands. Common shortcuts:
```bash
just                    # List all commands
just memory-init        # Initialize memory for session
just backlog-count      # Count active backlog tasks
just test               # Run test suite
just cron-health        # Check cron health
```

## Tiered Skill Loading (EDGA-89)

CLAUDE.md loads **31 general-tier skills** by default (always relevant). Task-specific skills (47 across 7 domains) are loaded on-demand to reduce context by ~94k tokens.

### Domains
| Domain | Skills | Load Command |
|--------|--------|--------------|
| creative | 13 | `python .claude/skills/load-task-skills.py creative` |
| ingestion | 2 | `python .claude/skills/load-task-skills.py ingestion` |
| knowledge | 3 | `python .claude/skills/load-task-skills.py knowledge` |
| observability | 1 | `python .claude/skills/load-task-skills.py observability` |
| product | 11 | `python .claude/skills/load-task-skills.py product` |
| tooling | 17 | `python .claude/skills/load-task-skills.py tooling` |

### Usage
```bash
# Load skills for current task domain
python .claude/skills/load-task-skills.py <domain> --output /tmp/task-skills.md

# List available domains
python .claude/skills/load-task-skills.py --list

# Measure token impact
python .claude/skills/load-task-skills.py --measure
```

See `.claude/skills/_manifest.md` for full skill index with applicability metadata.

## Pipeline & Infrastructure References

**Load on demand**: `docs/reference/pipeline-details.md` covers Email (EDGA-246), RSS security (EDGA-245), VPS access, YouTube triage (task-281), RSS triage (task-297), Multi-Agent Swarm ops.

**Quick refs**: Email → `send_email_to_david()` (secure wrapper) | Hetzner VPS (89.167.52.198): ALIVE but SSH access GONE (keys denied 2026-07-01, host key unchanged = still ours) — do NOT deploy; David to check Hetzner console/billing | Old Hostinger (62.72.32.53) is DEAD

## Obsidian CLI

```bash
~/.local/bin/obsidian <command> key=value 2>/dev/null
```
- Requires Obsidian app running (client-server arch)
- Full docs: `docs/obsidian-cli-guide.md`

---

## Claude Code Surfaces (CLI vs Desktop)

Both surfaces share `~/.claude/` and `.claude/` config — same skills, hooks, MCP, memory, this CLAUDE.md. Pick a surface by job shape:

- **Desktop = orchestrator.** Use `mcp__ccd_session__spawn_task` to fan out parallel work, `mcp__ccd_session_mgmt__search_session_transcripts` to find prior work, `mcp__ccd_session__mark_chapter` to keep long sessions navigable. Desktop auto-creates a worktree per session (`.worktreeinclude` carries gitignored files like `.env`).
- **CLI = hot loop.** Tight feedback, shell-adjacent work (`rtk`, `qmd`, `gws`, telegram), long-lived sessions with `ScheduleWakeup` / `CronCreate`, worktree opt-out (`-w` to enable). Promote to Desktop with `/desktop` when a session goes long.
- **Hermes / cron / pm2 = headless.** Surface-agnostic; never tries to use Desktop UI tools. Uses `Agent` tool for in-process subagents, shells out to `claude -p` for fire-and-forget workers, writes Hermes Kanban tasks for durable task handoff. See `~/.hermes/scripts/recall.py` for the Hermes-side past-session search.

User-side `/recall <query>` slash command wraps `search_session_transcripts` for interactive use across surfaces.

---

## Swarm COO — Claude (Primary), Edgeless CC (Acting)

When this Claude Code session is active (David at the CLI), **Claude is Primary COO** — final arbiter on architecture, standards, and cross-system decisions ("what is right" for how things should run). When this session is offline, **Edgeless CC plays Acting COO** and defers when the interactive session re-engages. Coordination via the shared experience store at `experiments/harnesses/coo-sweep-*`.

**Claude's lane** (route work here when it matches): multi-file workflows & orchestration (the Wave A→E pattern: Workflow + ultracode + adversarial verify + snapshot/rollback) · cross-system reasoning spanning Hermes + Kanban + Vault + Chroma + cron + edgeless-deploy · adversarial review before commit (the "are you sure?" lane) · long-context investigations (50+ file audits, swarm drift detection).

**NOT Claude's lane**: raw intake (Beau) · live execution routing (Hive) · direct implementation (Builder) · per-domain specialist work (Trader, Cypher, Minter, etc.).

**Route to Claude:**
- **Kanban**: `hermes kanban assign <task-id> claude` (board `edgeless`). Surfaces next session David opens.
- **Discord**: `@claude` in `#bot-backroom` (5-min backroom cooldown applies; reads when next active).
- **Discord post-as**: `discord-post-webhook.sh <channel> Claude "<message>"` — honors EDGA-983 backroom rate-limit protocol.

**Engagement model**: just-in-time. No cron, no scheduled heartbeat. Active only when David opens Claude Code.

---

## Anti-Pattern: Building in Isolation

**ALWAYS check existing infrastructure before proposing new patterns.**

| Infrastructure | Location | Purpose |
|---------------|----------|---------|
| **Obsidian Vault** | `claude-vault/` | Persistent markdown knowledge |
| **Hooks** | `.claude/hooks/` | 10 active automation hooks |
| **Memory** | `.claude/memory/` | 3-layer system (ChromaDB + PyTorch + Vault) |
| **Hermes Kanban** | `/Users/djm/.hermes/kanban.db` (CLI `hermes kanban`) | Task/issue management (was Paperclip `:3100`) |
| **Skills** | `.claude/skills/` | 75 skill categories |

---

## Task Management

**Primary system: Hermes-native Kanban** — create new tasks with `hermes kanban create`, not markdown backlog files or Paperclip issues. Load the `hermes-kanban` skill (`.claude/skills/hermes-kanban/SKILL.md`) for the full CLI, state model, and worker-spawn details.

- CLI: `hermes kanban {create,list,assign,dispatch,show,complete,block,link,schedule,swarm}` | default board: `edgeless`
- Board state: `/Users/djm/.hermes/kanban.db` (per-board: `/Users/djm/.hermes/kanban/boards/<slug>/kanban.db`) | config: the `kanban:` block in `/Users/djm/.hermes/config.yaml`
- List/inspect: `hermes kanban list [--status ready] [--assignee <profile>]` · `hermes kanban show <id>`
- **Dispatch runs in-gateway**: a dispatcher coroutine (every `dispatch_interval_seconds`=300) claims `ready` tasks and spawns a clean worker `hermes -p <profile> chat -q "work kanban task <id>"`. Tasks are assigned to **Hermes profiles** (not Paperclip agents).
- Legacy markdown backlog (`backlog/tasks/`) and Paperclip (`:3100`, read-only fallback until cutover) are both deprecated for new work
- **NEVER** create tasks in: `/claude-vault/backlog/tasks/` or `/.backlog/`

---

## Canonical Locations (Single Source of Truth)

Do NOT create duplicates in other locations.

| Category | Canonical Location | Deprecated (DO NOT USE) |
|----------|-------------------|------------------------|
| **Tasks** | Hermes Kanban (`hermes kanban`, board `edgeless`) | Paperclip `:3100` (retired → read-only fallback), `/backlog/tasks/` (legacy), vault/backlog/tasks/, /.backlog/ |
| **Config** | `/config/`, `/.claude/` | 05-config/, _legacy-05-config/ |
| **Docs** | `/docs/` | 02-docs/ |
| **Backups** | `/backups/` | *-backup/ scattered dirs |
| **Vault Sessions** | `/claude-vault/04-Sessions/` | 01-Sessions/ |
| **Vault Agents** | `/claude-vault/02-Agents/` | 04-Agents/, 12-Agents/ |
| **Vault Reports** | `/claude-vault/13-Reports/` | 10-Reports/ |
| **Archives** | `/claude-vault/99-Archive/` | 03-archive/, archive/ |
| **Templates** | `/claude-vault/_system/templates/` | .claude/skills/*/templates/, scattered template folders |
| **Chroma** | `/chroma-data/` | chroma_data/, chroma_db/, ad hoc .chroma copies |
| **Runtime State** | `/.runtime/` | root-level .paperclip*, .hive*, .backroom* files |
| **Agent Inboxes** | `/.inboxes/` | ad hoc inbox/queue folders |
| **Generated Artifacts** | `/captures/`, `/generated/`, `/output/` | vault root, docs root |
| **Legacy Workspace Material** | `/_deprecated/`, `/_legacy-01-tools/` | new work in legacy trees |

**Directory policy**: `DIRECTORY-POLICY.md` at project root. Read before creating directories or cloning repos.

**Workspace cleanup source of truth**: `reports/claude-projects-structure-remediation-2026-04-28.md` and `reports/claude-projects-cleanup-manifest-2026-04-28.md`.

**Vault taxonomy source of truth**: `claude-vault/_system/TAXONOMY.md`. Current QC drift includes duplicate vault prefixes `02-*`, `05-*`, and `09-*`; do not create new duplicate numbered folders.

**Hook Protection**: `.claude/hooks/patterns.yaml` is enforced by `.claude/hooks/damage-control.py`, wired as a PreToolUse hook in `.claude/settings.json` (re-armed 2026-07-01 after the original consumer was deleted uncommitted, leaving patterns.yaml dead for weeks). Blocks dangerous bash patterns (incl. `rsync --delete`, `crontab` writes, `yaml.dump` on Hermes configs) and writes to deprecated/zero-access paths.

---

## Completion Verification (MANDATORY)

**NEVER declare a task complete without verification.**
```bash
python .claude/hooks/verify-completion.py --type task-XXX --verbose
```

## Triage Pipelines (task-281, task-297, task-298)

**Do NOT build parallel ingestion paths — extend existing ones.** Full details in `docs/reference/pipeline-details.md`.

- **YouTube**: `scripts/lib/youtube_triage_scorer.py` | extend via `SIGNALS` dict
- **RSS**: `scripts/lib/rss_triage_scorer.py` | does NOT auto-create tickets (safer default)
- **Shared**: `scripts/lib/triage_core.py` — `Route`, `ScoreBreakdown`, `route()`, `append_archive_jsonl()`. Do NOT reimplement idempotency inline.

## MCP Servers

Active config: `.mcp.json` | Retired: `claude-mcp-config.json` → `99-Archive/` (2026-05-05) | Full audit: `docs/mcp-server-audit.md`

The `paperclip` MCP server remains configured but is a **read-only fallback pending retirement** (task system moved to Hermes Kanban, 2026-06/07). Do not route new work through it.

## Skills Library

**Canonical location**: `.claude/skills/` (161+ skills)

**Historical note**: Some skills symlinked from `.agents/skills/` (36 entries). The `.agents/` path is legacy; all new skills go directly to `.claude/skills/`.

**Two-system pattern resolved**: Skills were split between `.agents/skills/` and `.claude/skills/` (EDGA-963). Consolidated to `.claude/skills/` as single source of truth.

---
*Updated: 2026-05-06 | Task management migrated to Hermes-native Kanban*

<!-- hyperresearch:start -->
## Research Base (hyperresearch)

> ⚠️ 2026-07-01: the CLI at `/Users/djm/.hermes/hermes-agent/venv/bin/hyperresearch` is MISSING (verified — no such file). The venv was likely rebuilt without it. Reinstall before relying on the commands below; until then, note-taking paths in `research/` still apply but fetch/search commands will fail.

**CLI path: `/Users/djm/.hermes/hermes-agent/venv/bin/hyperresearch`** — use this exact path for every hyperresearch command. It may not be on your system PATH.

**Paths in this document are relative to your current working directory**, not to the CLI binary's location. Use `research/notes/final_report_<vault_tag>.md` (not a prefix with the binary path) when you save files.

This project uses hyperresearch as an agent-driven research knowledge base. The `research/` directory contains markdown notes collected from web sources and original research. Append `--json` to any command for structured output.

### How to do research

**Run a research session with `/hyperresearch <query>`.** This invokes the V8 16-step pipeline. The entry skill at `.claude/skills/hyperresearch/SKILL.md` is a thin ROUTER. The 16 step procedures live in their own skills (`hyperresearch-1-decompose` through `hyperresearch-16-readability-audit`) and are loaded fresh into context via the `Skill` tool when each step runs. This solves V7's context-compaction problem: each step's procedure lands in context only when needed. Read the entry skill before you start a research session; it explains the chain mechanics.

Step 1 classifies the query into one of two tiers (`light` or `full`) and the rest of the pipeline scales accordingly — short bounded queries skip the depth investigations, critics, and patcher (~30-40 min); argumentative deep-research queries run all 16 steps with adversarial review (~1.5-2.5 hours).

**Do NOT use WebFetch for source pages** — use `/Users/djm/.hermes/hermes-agent/venv/bin/hyperresearch fetch` instead. The skill files explain when to fetch vs. search.

### What the skill files own

The skill files own everything about how to research. That includes:
- The pipeline phases and what each phase does
- Which subagents exist and what each one is for (fetcher, loci-analyst, depth-investigator, 4 critics, patcher, polish-auditor)
- The tool-lock invariant (patcher and polish-auditor can only Read + Edit, never Write)
- The subagent spawn contract (every Task call passes the verbatim research_query + pipeline position + inputs)
- Artifact locations (`research/scaffold.md`, `research/prompt-decomposition.json`, `research/loci.json`, `research/comparisons.md`, interim notes, patch / polish logs)
- The curation pass after every research session

If you need to know how hyperresearch works, read the skill file. This document does NOT duplicate that content — when the skill file and this file disagree, the skill file wins.

### Canonical research query

In a normal run, the canonical research query is the user's verbatim prompt. In wrapped runs, if `research/prompt.txt` exists, that file is gospel and overrides any wrapping instructions. The pipeline persists the query as `research/query-<vault_tag>.md` with YAML frontmatter — this is the canonical query reference for all downstream layers. Wrapper requirements (save path, citation format, terminal sections) are a separate contract, captured in the scaffold — not pasted into the `## User Prompt (VERBATIM — gospel)` section.

### Academic APIs before web search

For any topic with a research literature, hit academic APIs BEFORE running web searches. They return citation-ranked canonical papers; web search returns derivative commentary.

- **Semantic Scholar:** `https://api.semanticscholar.org/graph/v1/paper/search?query=<q>&fields=title,year,citationCount,externalIds&limit=10` — then citation-chain the top papers forward + backward.
- **arXiv:** `https://export.arxiv.org/api/query?search_query=cat:cs.LG+AND+all:<q>&sortBy=relevance&max_results=25`
- **OpenAlex:** `https://api.openalex.org/works?search=<q>&sort=cited_by_count:desc&per-page=15&mailto=research@example.com`
- **PubMed:** `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=<q>&retmode=json&retmax=20`

After the academic sweep, run web searches for context, news, non-academic angles, and at least one adversarial search ("criticism of X", "limitations of X").

### PDFs fetch directly

`/Users/djm/.hermes/hermes-agent/venv/bin/hyperresearch fetch` auto-detects PDF URLs (arXiv, NBER, SSRN, direct `.pdf` links) and extracts full text via pymupdf. Fetch them aggressively. Raw PDFs land in `research/raw/<note-id>.pdf` and the note's frontmatter links back via `raw_file:`.

### Searching the vault

```bash
/Users/djm/.hermes/hermes-agent/venv/bin/hyperresearch search "query" --json                # Full-text search
/Users/djm/.hermes/hermes-agent/venv/bin/hyperresearch search "query" --tag ml --json       # Filter by tag / status / date / parent
/Users/djm/.hermes/hermes-agent/venv/bin/hyperresearch search "query" --include-body --json # Full-body search, not just titles
/Users/djm/.hermes/hermes-agent/venv/bin/hyperresearch note show <id> --json                # Read one note
/Users/djm/.hermes/hermes-agent/venv/bin/hyperresearch note show <id1> <id2> <id3> --json   # Batch-read notes in one call
/Users/djm/.hermes/hermes-agent/venv/bin/hyperresearch note list --json                     # List all notes with summaries
/Users/djm/.hermes/hermes-agent/venv/bin/hyperresearch tags --json                          # Existing tag vocabulary
```

### Images, screenshots, and assets

```bash
/Users/djm/.hermes/hermes-agent/venv/bin/hyperresearch fetch "<url>" --tag <topic> --save-assets -j   # Saves screenshot + top images
/Users/djm/.hermes/hermes-agent/venv/bin/hyperresearch assets list --note <note-id> --json            # Assets for a specific note
/Users/djm/.hermes/hermes-agent/venv/bin/hyperresearch assets path <note-id> --type screenshot -j     # Get screenshot path (viewable with Read)
```

### Authenticated crawling

Login-gated content (LinkedIn, Twitter, paywalled news) needs a browser profile. Set up once via `/Users/djm/.hermes/hermes-agent/venv/bin/hyperresearch setup` or `crwl profiles`. Config in `.hyperresearch/config.toml` under `[web]`: `profile = "research"`, `magic = true`. LinkedIn / Twitter / Facebook / Instagram / TikTok auto-use a visible browser to avoid session kills.

If a fetch returns a login wall, tell the user to run `/Users/djm/.hermes/hermes-agent/venv/bin/hyperresearch setup` and create a login profile.

### Curate after every session

Every research session must end with a curation pass:

```bash
/Users/djm/.hermes/hermes-agent/venv/bin/hyperresearch note list --status draft -j                                        # Find unprocessed notes
/Users/djm/.hermes/hermes-agent/venv/bin/hyperresearch note show <id> -j                                                  # Read the content
/Users/djm/.hermes/hermes-agent/venv/bin/hyperresearch note update <id> --summary "<specific summary>" --add-tag <t> -j   # Add summary + tags
/Users/djm/.hermes/hermes-agent/venv/bin/hyperresearch lint -j                                                            # Find missing tags / summaries / broken links
/Users/djm/.hermes/hermes-agent/venv/bin/hyperresearch repair -j                                                          # Auto-fix broken links, rebuild indexes
/Users/djm/.hermes/hermes-agent/venv/bin/hyperresearch status -j                                                          # Overall vault health
```

Lifecycle: `draft` → `review` → `evergreen` (or `stale` → `deprecated` → `archive` for outdated material).

Summaries must be specific — "Mamba achieves linear-time sequence modeling via selective state spaces" beats "Paper about Mamba". Reuse the existing tag vocabulary (`/Users/djm/.hermes/hermes-agent/venv/bin/hyperresearch tags -j`) rather than inventing new tags.

### Key conventions

- Notes live in `research/notes/` as markdown with YAML frontmatter
- Link notes with `[[note-id]]` syntax
- After editing `.md` files directly, run `/Users/djm/.hermes/hermes-agent/venv/bin/hyperresearch sync` to update the index
- Run `/Users/djm/.hermes/hermes-agent/venv/bin/hyperresearch --help` for the full command list
<!-- hyperresearch:end -->
