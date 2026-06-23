# swarmctl Phase 1 — Implementer Contract

This document is the single source of truth for function signatures, dataclass
fields, and invariants that every check module MUST honour. The CLI (`cli.py`)
depends on these contracts. Breaking them breaks the render pipeline.

---

## The Cardinal Rule

**This codebase is READ-ONLY.** No module may:
- Write to `~/.hermes/` (configs, auth.json, profile dirs)
- Restart or kill any process
- Call `launchctl bootstrap/bootout/kickstart` with mutating flags
- Write any file outside of an explicit Phase 2 snapshot directory

The only exception: `checks/providers.py` MAY make outbound HTTP requests
(1-token canary calls, 60s TTL cache) to probe provider health. It must never
store results to disk.

---

## Dataclass Fields (`types.py`)

### `GatewayHealth`
| Field | Type | Description |
|---|---|---|
| `launchd_label` | `str` | Full launchd label, e.g. `ai.hermes.gateway-hive` |
| `profile` | `str` | Short profile name, e.g. `hive` |
| `domain` | `LaunchdDomain` | `GUI` (`gui/501`) or `USER` (`user/501`) |
| `pid` | `Optional[int]` | OS PID; `None` = not running |
| `state` | `GatewayState` | UP / DOWN / STALE / UNKNOWN |
| `process_start` | `Optional[datetime]` | When the process started (tz-aware) |
| `code_mtime` | `Optional[datetime]` | mtime of `~/.hermes/hermes-agent/` dir (tz-aware) |
| `stale` | `bool` | `True` iff `code_mtime > process_start` |
| `config_valid` | `bool` | `False` if `config.yaml` failed to parse or schema-check |
| `config_errors` | `list[str]` | Human-readable config problems (empty = valid) |
| `roles` | `list[RoleStatus]` | One entry per role present in config |
| `platform_connected` | `Optional[dict[str, bool]]` | `{"discord": True, …}` or `None` if N/A |

### `RoleStatus`
| Field | Type | Description |
|---|---|---|
| `role` | `str` | Role name: `primary`, `fallback`, `vision`, `web_extract`, `compression`, `title_generation`, `triage`, `kanban_decomposer`, `mcp`, `curator`, `skills_hub`, `approval` |
| `model` | `Optional[str]` | Concrete model string from config |
| `provider` | `Optional[str]` | Provider name from config |
| `base_url` | `Optional[str]` | Provider base URL |
| `auth_state` | `AuthState` | VALID / INVALID / UNKNOWN / UNTESTED |
| `last_latency_s` | `Optional[float]` | Latency of last real call in seconds; `None` = never seen |

### `ProviderStatus`
| Field | Type | Description |
|---|---|---|
| `provider` | `str` | Logical name, e.g. `nvidia/custom`, `nous`, `openai-codex` |
| `base_url` | `str` | Full base URL probed |
| `api_key_prefix` | `str` | First 8 chars of key for display; use `<oauth>` for token-based auth |
| `state` | `ProviderState` | LIVE / DEGRADED / DOWN / UNKNOWN / UNCHECKED |
| `latency_s` | `Optional[float]` | Round-trip latency of canary call; `None` = failed/unchecked |
| `http_status` | `Optional[int]` | HTTP status code of canary response |
| `error_detail` | `Optional[str]` | Short error string safe for display (no secrets) |
| `cached` | `bool` | `True` if result came from 60s TTL in-memory cache |
| `probed_at` | `Optional[datetime]` | When this probe ran (tz-aware) |

### `SystemStatus`
| Field | Type | Description |
|---|---|---|
| `load_avg_1m` | `float` | 1-minute load average |
| `load_avg_5m` | `float` | 5-minute load average |
| `load_avg_15m` | `float` | 15-minute load average |
| `swap_used_mb` | `float` | Swap used in MiB |
| `swap_total_mb` | `float` | Total swap in MiB |
| `ram_free_mb` | `float` | Free RAM in MiB |
| `ram_total_mb` | `float` | Total RAM in MiB |
| `cpu_count` | `int` | Logical CPU count |
| `load_per_cpu` | `float` | `load_avg_1m / cpu_count`; >1.0 = overloaded |
| `sampled_at` | `Optional[datetime]` | When sample was taken (tz-aware) |

### `Report`
| Field | Type | Description |
|---|---|---|
| `gateways` | `list[GatewayHealth]` | One per known launchd label |
| `providers` | `list[ProviderStatus]` | One per distinct (provider, base_url, key_prefix) |
| `system` | `Optional[SystemStatus]` | Host resource snapshot |
| `venv_ok` | `bool` | `True` if all required venv packages importable |
| `venv_issues` | `list[str]` | Missing-package strings |
| `generated_at` | `Optional[datetime]` | When report was assembled (tz-aware) |
| `warnings` | `list[str]` | Cross-cutting human-readable warnings |

---

## Check Module Signatures

### `checks/gateways.py`
```python
def check() -> list[GatewayHealth]: ...
```
- Probe both `gui/501` and `user/501` launchd domains via `launchctl list`.
- Use `psutil.Process(pid).create_time()` for `process_start`.
- Use `os.path.getmtime(~/.hermes/hermes-agent/)` for `code_mtime`.
- Set `stale = (code_mtime > process_start)` iff both are non-None.
- Populate `roles` from the profile's `config.yaml` (model + fallback_model + auxiliary.*).
- Set `platform_connected` by checking whether the profile's plist contains discord/telegram toolset config.

### `checks/configs.py`
```python
def check() -> dict[str, list[str]]: ...
```
- Key `"__global__"` = `~/.hermes/config.yaml` errors.
- Key `<profile_name>` = `~/.hermes/profiles/<profile>/config.yaml` errors.
- Empty list value = valid config.
- Use `yaml.safe_load`; catch `yaml.YAMLError`.
- Required top-level keys to validate: `model`, `model.default`, `model.provider`.
- Detect orphaned `fallback_providers` entries (list items without `provider` key).
- Detect auxiliary blocks with empty `api_key` when provider is not `auto`.

### `checks/providers.py`
```python
def check() -> list[ProviderStatus]: ...
```
- Walk all active profile `config.yaml` files; extract every `(base_url, api_key)` pair from `model`, `fallback_model`, `fallback_providers[*]`, and `auxiliary.*` blocks.
- Deduplicate by `(base_url, api_key[:8])`.
- For each unique pair: POST a minimal chat completion (`max_tokens=1`).
- Record latency, HTTP status, and classify into `ProviderState`.
- 60s in-memory TTL cache keyed on `(base_url, api_key[:8])`.
- NEVER log or display full API keys.
- Classify `ProviderState.DEGRADED` when latency > 30s but HTTP 200.

### `checks/system.py`
```python
def check() -> SystemStatus: ...
```
- Use `psutil.getloadavg()`, `psutil.virtual_memory()`, `psutil.swap_memory()`.
- `cpu_count = os.cpu_count() or 1`.
- `load_per_cpu = load_avg_1m / cpu_count`.

### `telemetry.py`
```python
def emit_report(report: Report) -> None: ...
```
- Must not raise — wrap everything in `try/except`.
- No-op if `opentelemetry-sdk` not installed or Jaeger unreachable.
- Span name convention: `swarmctl.gateway` (one per gateway), `swarmctl.fleet_status` (one summary).
- Span attributes: `profile`, `state`, `pid`, `stale`, `config_valid`, `load_per_cpu`.

---

## Launchd Discovery Rules

Gateways are identified by plist files at `~/Library/LaunchAgents/ai.hermes.gateway-*.plist`
(active plists, i.e. filename does NOT end in `.disabled`, `.DISABLED`, `.tier2-disabled`,
`.tier3-disabled`, `.bak`, or a date suffix like `.2026-06-01`). A plist is active iff its
filename matches exactly `ai.hermes.gateway-<name>.plist` (no suffix after `.plist`).

Profile name is extracted from label: `ai.hermes.gateway-<profile>`.

Launchd domain detection: probe `gui/501` first (most gateways run there per Aqua session type
in plists); fall back to `user/501`. A gateway with a PID in either domain is UP.

---

## 60s Provider Cache

`checks/providers.py` should maintain a module-level dict:
```python
_CACHE: dict[tuple[str, str], tuple[ProviderStatus, float]] = {}
# key = (base_url, api_key_prefix), value = (status, time.monotonic() at probe)
```
Return cached result when `time.monotonic() - cache_time < 60`.

---

## Security

- Never log, print, or embed full API keys anywhere in output or spans.
- `api_key_prefix` MUST be truncated to first 8 characters maximum.
- For OAuth-based providers (Nous): use the string `<oauth>` as the prefix.
- The `error_detail` field must not contain key material.
