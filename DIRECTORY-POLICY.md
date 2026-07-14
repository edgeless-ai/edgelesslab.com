# claude-projects Directory Policy

**Date**: 2026-05-15
**Applies to**: All agents (Claude Code, Codex, Hermes, Scribe)

Canonical rules for where files and repos go in claude-projects. All agents must read this before creating directories or cloning repos.

---

## 1. Canonical Locations

| Directory | Purpose |
|-----------|---------|
| `products/` | David's own shippable repos and products |
| `projects/` | Active work-in-progress project directories |
| `github-repos/` | ALL third-party clones and forks |
| `mcp-servers/` | MCP server repos |
| `tools/` | Utility repos and tools |
| `src/` | Reusable source modules |
| `scripts/` | Operational scripts (cron, bridge, maintenance) |
| `docs/` | System documentation |
| `config/` | Shared configuration |
| `claude-vault/` | Obsidian knowledge vault (NO code repos, NO node_modules) |
| `chroma-data/` | Canonical Chroma vector store |
| `.claude/` | Agent config, hooks, skills, memory runtime |
| `.inboxes/` | Multi-agent message bus |
| `.coord/` | Bot-to-bot coordination |
| `.runtime/` | Process state files (.paperclip-*, .hive-*, .backroom-*, .semantic-*) |
| `backups/` | Backup archives |
| `_deprecated/` | Quarantined legacy material |
| `captures/`, `generated/`, `output/` | Generated artifacts and media |

---

## 2. Clone Rules

- NEVER clone repos at the project root. Always clone into the appropriate subdirectory.
- Before cloning, check if the repo already exists:
  ```
  grep -r "url = <remote-url>" $(find . -name config -path "*/.git/*" -maxdepth 4)
  ```
- Third-party repos go in `github-repos/`.
- David's own product repos go in `products/`.
- MCP servers go in `mcp-servers/`.

---

## 3. No Code in Vault

- `claude-vault/` is for knowledge, notes, documents, and references.
- Never put git repos, node_modules, .venv, or project source code in the vault.
- If a project needs vault notes, put a link or reference in the vault pointing to the project location.

---

## 4. Runtime State

- All runtime state files go in `.runtime/` (not at project root).
- This includes .paperclip-*, .hive-*, .backroom-*, .semantic-* files.
- Agents must write state to `.runtime/`, not to the project root.

---

## 5. One Clone Per Remote

- Each GitHub remote URL should have exactly one local clone.
- If you need a second working copy, use `git worktree`, not a second clone.

---

## 6. Naming Conventions

- Directory names use lowercase-kebab-case.
- No spaces in directory names.
- Prefix quarantined or deprecated directories with `_`.

---

## 7. Vault Manifest Sync

- Any new numbered directory in `claude-vault/` requires updating `10-Meta/CLAUDE.md` in the same session.
- Numbering follows NN-PascalCase format (00-99).
- Number 12 is reserved/unused.
- Prefixes 14-18 are allocated as `14-Knowledge-Bases`, `15-Products`,
  `16-Projects`, `17-Websites`, and `18-Evals`.
