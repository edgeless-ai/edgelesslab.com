# Swarm Control Room — Design Doc (`swarmctl`)

> Build-ready design for a control room that would have prevented/instantly resolved the model+provider+auth failures fought manually on 2026-06-17. Authored from the full failure context of that session.

## 1. Problem statement
Every fire this session was one of five recurring classes, all invisible until a human poked a log:

- **A. Config corruption** — Desktop rewrote `config.yaml` into invalid YAML (orphaned `fallback_providers`); gateways silently fell back or failed at next restart.
- **B. Environment drift** — Desktop rebuilt the shared venv minus `python-telegram-bot`; stale in-memory modules ImportError'd after in-place code updates. Both silent until restart.
- **C. Provider death cascades** — OpenCode 100%, Fireworks/FirePass deprecated, Nous `invalid_grant`. The killer variant: **primary healthy but auxiliary/fallback/vision still pointed at a dead key** → "Provider authentication failed" with no indication of *which role*.
- **D. Auth/topology divergence** — `hermes auth nous` writes GLOBAL auth only; gateways read per-profile auth. Gateways split across `gui/501` and `user/501` launchd domains. No map of either.
- **E. No telemetry** — model latency (283s vs 3s), rate-limit headroom, cost, per-role provider — all dark. Discovered each by curl + log grep.

Root cause underneath all five: **model+auth config is scattered across N profiles × ~10 roles with hardcoded keys, untyped, unvalidated, and unobserved.** Fix the data model and the observability and these stop being incidents.

## 2. What it monitors (`swarmctl status` / `doctor`)
Per gateway, one row: up/down + PID + **launchd domain** (probe both); process-start vs hermes-agent code mtime → **STALE** flag (catches stale-module); config.yaml valid + schema-check model/fallback/aux; **per role** (primary, fallback, vision, web_extract, compression, title_generation, triage, kanban_decomposer, mcp, curator…): model · provider · **auth-valid?** · last latency; platform connect state (discord/telegram/photon); loadavg/swap/free RAM.

Fleet-level **provider canary panel** — one synthetic 1-token call per distinct (provider, auth) pair (deduped, 60s cache): `nvidia ✓ 9s | nous ✓ 3s | opencode ✗ 429 | fireworks ✗ 401`. This single panel explains every cascade instantly.

**venv integrity** (`doctor`): assert every runtime/`messaging` extra imports in the venv (`python-telegram-bot==22.6`, `discord.py`, …).

## 3. What it controls (`swarmctl <verb>`)
- `apply` — recompile every profile's model/fallback/**aux** blocks from the registry and splice in. Fleet-wide or `--profile`.
- `swap <role> <logical-model> [--profile X|--all]` — validate (canary target) → edit → restart. One command moves all roles or one.
- `restart [--all]` — **paced, domain-aware, loadavg-gated** rolling restart (skip-if loadavg>N, 8s spacing, `gui/`vs`user/` auto-detected).
- `auth sync` — propagate valid global `auth.json` tokens into each profile (or run `hermes --profile X auth <p>`). Fixes D.
- `revert [--profile X]` — restore last-known-VALID config snapshot.
- `doctor --fix` — restore corrupt config from snapshot, reinstall missing venv deps.

Every mutating verb: dry-run default, `--yes` to execute, auto-snapshot before write.

## 4. Architecture
- **Engine:** single Python CLI `swarmctl` in repo (`tools/swarmctl/`), runs against `~/.hermes/`. No daemon — stateless, idempotent, invoked by cron + human + Discord.
- **Config writes WITHOUT yaml.dump:** registry compiler emits ONLY managed model sections between sentinels (`# >>> swarmctl:model BEGIN … <<< END`); everything outside stays byte-identical; `yaml.safe_load` validate before `os.replace`. Sidesteps the no-yaml.dump rule and the corruption class for managed regions.
- **Provider health probe:** cheap 1-token completion per distinct (provider, auth), 60s TTL cache; records latency + auth-valid + rate-limit headers.
- **Surface — ONE primary: push monitoring to Telegram/Discord, control via CLI.** David is mobile-first; 80% of value is *seeing* failure first.
  - **Phase 1:** `swarmctl digest` cron → `#swarm-health` Discord + Telegram, on-change and 2×/day. No new UI.
  - **Power tool:** `swarmctl status` TUI; wrap in `system-status` skill.
  - **Phase 3:** thin command bot (`@control swap hive fast-free`, `@control restart trader`) — deferred (moving part near swarm loop risks).
  - **NOT a web app** — hosting/auth overhead for one operator.
- **Integration (extend, don't rebuild):** hook `swarmctl doctor` into the `project_system_manifest` 6:15am cron; emit degradation as OTel spans → Jaeger and auto-open a Paperclip issue; concrete first feature of `project_edgeless_otel_command`.

## 5. Canonical model registry (`~/.hermes/registry/providers.yaml`)
Single source of truth, git-tracked. Keys live here once (or `keychain:`/`env:` refs), never hardcoded across 35 profiles.

```yaml
providers:
  nvidia:  { base_url: https://integrate.api.nvidia.com/v1, api_mode: chat_completions,
             auth: {type: api_key, ref: keychain:NVIDIA_API_KEY}, status: live,
             health: {probe: meta/llama-3.3-70b-instruct} }
  nous:    { base_url: https://inference-api.nousresearch.com/v1, api_mode: chat_completions,
             auth: {type: oauth, manager: hermes-nous, per_profile: true}, status: live,
             health: {probe: nvidia/nemotron-3-ultra:free} }
  opencode:{ status: dead }   # flip one word → all roles reroute everywhere

models:                       # logical name → concrete route
  fast-chat: {provider: nvidia, model: meta/llama-3.3-70b-instruct}     # 9s
  smart:     {provider: nvidia, model: minimaxai/minimax-m3}            # slow, multimodal
  fast-free: {provider: nous,   model: nvidia/nemotron-3-ultra:free, expires: 2026-06-18T20:00-04:00}

roles:                        # role → ordered preference (primary→fallbacks)
  primary:          [fast-chat, smart]
  fallback:         [smart, fast-chat]
  vision:           [smart]            # must be multimodal-capable
  web_extract:      [fast-chat]
  compression:      [fast-chat]
  title_generation: [fast-chat]
  triage:           [fast-chat]
  kanban_decomposer:[fast-chat]

profiles:
  default: {}                          # inherits roles
  hive:    {primary: [fast-chat]}      # interactive override
```

Compiler resolves `role → logical model → provider → {base_url, model, api_mode, auth}` for **every role including auxiliaries**, capability-checks (vision must be multimodal; tool roles must support tools), and scaffolds. **Structurally eliminates Class C** ("primary fixed but aux dead"): one place records a provider's deadness; `apply` reroutes all roles in all profiles. `expires` lets `doctor` warn before `:free` windows close.

## 6. Phased build plan
- **Phase 1 — Observability (a weekend, near-zero risk).** Read-only `swarmctl status` + `doctor` + provider canary + venv check + stale-module check + config validator + Telegram/Discord `digest` cron. Surfaces every failure before the user notices. Ship first.
- **Phase 2 — Registry + safe control (≈1 week, medium risk).** `providers.yaml` + compiler with sentinel splicing; `apply`/`swap`/`auth sync`/`revert`; paced domain-aware `restart`; snapshots. Mitigations: dry-run default, validate-before-write, auto-snapshot, canary-before-swap.
- **Phase 3 — Mobile + auto-remediation (≈1 week, higher risk).** TG/Discord control commands; auto-failover behind kill switch + manual-approve default + rate limit.

## 7. Effort/risk
| Phase | Effort | Risk | Guardrail |
|---|---|---|---|
| 1 Observability | weekend | ~none (read-only) | — |
| 2 Registry+control | ~1 wk | medium (writes+restarts) | sentinels, validate, snapshot, dry-run, canary |
| 3 Mobile+auto-heal | ~1 wk | high (autonomous mutation) | kill switch, approve-default, rate limit |

**Build Phase 1 now** — converts this class of work from reactive log-archaeology into a glance, for a weekend of read-only code.
