---
id: task-119
title: "Vault taxonomy cleanup v3 - resolve duplicate folder numbers and gaps"
epic: 5-product
status: done
priority: P2
depends_on: []
blocks: []
created: 2026-02-04
owner: david
estimated_effort: 3-4 hours
tags: [vault, taxonomy, cleanup, obsidian, hooks]
---

# Task 119: Vault Taxonomy Cleanup v3 - Fix Duplicate Numbers and Gaps

## Goal
Resolve all duplicate folder numbers, fill numbering gaps, consolidate the three reports locations into one, number currently unnumbered folders, and enforce the taxonomy with a validation hook so it never drifts again.

## Context
The vault taxonomy has accumulated several issues across previous cleanup attempts (Jan 2026 and earlier). The current state has these problems:

### Current Issues

**Duplicate Numbers:**
1. `04-Agents` and `04-Sessions` both use number 04
2. `10-Meta` and `10-Reports` both use number 10

**Unused Gaps:**
3. Number `02` is unused (gap)
4. Number `12` is unused (gap)

**Reports Fragmentation:**
5. Three separate reports locations exist:
   - `10-Reports/`
   - `10-Meta/Reports/` (nested inside Meta)
   - `13-Reports/`

**Unnumbered Folders:**
6. `backlog/`, `Excalidraw/`, `scripts/`, `tests/` have no number prefix

### Previous Cleanup Attempts
- **Jan 2026**: Consolidated some locations but left duplicate numbers unresolved
- CLAUDE.md was updated with canonical locations table but the underlying folders still conflict
- `damage-control.py` hook blocks writes to deprecated locations but does not validate numbering

## Step-by-Step Instructions

### Step 1: Full Taxonomy Audit
List every top-level folder in the vault and categorize:

```bash
ls -d /Users/djm/claude-projects/claude-vault/*/
```

Document the current state including:
- Every numbered folder and its purpose
- Every unnumbered folder and its purpose
- Contents of each reports-related folder
- Any folders that are effectively dead/empty

### Step 2: Propose New Numbering Scheme
Design a clean numbering scheme that:
- Resolves all duplicate numbers
- Fills gaps logically
- Consolidates reports to one location
- Assigns numbers to currently unnumbered folders
- Groups related folders (e.g., operational folders together, knowledge folders together)

**Proposed approach** (to be refined after audit):
```
00-Inbox/          # Quick capture
01-Projects/       # Active project notes
02-[TBD]/          # Fill gap - assess what fits
03-Knowledge/      # Research, references, knowledge base
04-Sessions/       # Session logs (resolve conflict - Sessions wins over Agents)
05-Agents/         # Agent definitions, personas (renumber from 04)
06-[existing]/     # Keep if exists
07-[existing]/     # Keep if exists
08-[existing]/     # Keep if exists
09-[existing]/     # Keep if exists
10-Meta/           # Meta documentation (resolve - Meta keeps 10)
11-[existing]/     # Keep if exists
12-[TBD]/          # Fill gap
13-Reports/        # ALL reports consolidated here (single location)
...
99-Archive/        # Archive
_system/           # Underscore prefix = system folders (templates, config)
```

### Step 3: Consolidate Reports
Merge all three reports locations into one:

1. Audit contents of `10-Reports/`, `10-Meta/Reports/`, and `13-Reports/`
2. Deduplicate any overlapping files
3. Move all unique reports to the chosen canonical reports folder
4. Update any internal wiki links (`[[report-name]]`) that reference old locations
5. Remove empty source folders

### Step 4: Execute the Renumbering
For each folder rename:

```bash
# Example (actual commands depend on Step 2 outcome)
cd /Users/djm/claude-projects/claude-vault
git mv "04-Agents" "05-Agents"
# etc.
```

**Critical**: Use `git mv` to preserve history.

After renaming, update all internal links:
- Obsidian wiki links (`[[folder/note]]`)
- CLAUDE.md canonical locations table
- Memory system references
- Hook scripts that reference vault paths
- Any hardcoded paths in `.claude/` configs

### Step 5: Number the Unnumbered Folders
Assign numbers to `backlog/`, `Excalidraw/`, `scripts/`, `tests/`:

- Consider whether these belong in the numbered taxonomy or should use underscore prefix (`_backlog/`) to indicate system folders
- `Excalidraw/` is Obsidian plugin-managed and may need special handling
- `scripts/` and `tests/` might belong under `_system/`

### Step 6: Update CLAUDE.md Canonical Locations
Update the canonical locations table in CLAUDE.md to reflect new numbering:

```markdown
| Category | Canonical Location | Notes |
|----------|-------------------|-------|
| **Vault Sessions** | `/claude-vault/XX-Sessions/` | Renumbered |
| **Vault Agents** | `/claude-vault/XX-Agents/` | Renumbered |
| **Vault Reports** | `/claude-vault/XX-Reports/` | Consolidated |
...
```

### Step 7: Create Taxonomy Validation Hook
Create a hook that validates folder numbering on write operations:

```python
# .claude/hooks/validate-taxonomy.py
# Runs on file write operations to vault
# Checks:
# 1. No duplicate numbers in top-level folders
# 2. No gaps in numbering sequence
# 3. Writes don't go to deprecated/removed folders
# 4. Reports only go to canonical reports location
```

This hook should:
- Parse vault top-level directory structure
- Validate no number collisions
- Warn (not block) on writes to unnumbered folders
- Block writes to deprecated report locations
- Run as part of the existing hook framework

### Step 8: Document the Final Taxonomy
Create or update a taxonomy reference document:

```markdown
# Vault Taxonomy v3
# Location: claude-vault/_system/TAXONOMY.md
# Lists every folder, its number, purpose, and what goes there
```

## Acceptance Criteria
- [ ] No duplicate folder numbers in vault top-level directories
- [ ] No gaps in the numbering sequence (or gaps are intentional and documented)
- [ ] All reports consolidated to exactly one `XX-Reports/` folder
- [ ] Previously unnumbered folders (`backlog/`, `Excalidraw/`, `scripts/`, `tests/`) are addressed
- [ ] Validation hook exists at `.claude/hooks/validate-taxonomy.py` and catches violations
- [ ] CLAUDE.md canonical locations table updated with new numbering
- [ ] All internal wiki links updated to reflect new folder names
- [ ] `_system/TAXONOMY.md` documents the complete folder structure

## Verification Checklist
- [ ] `ls -d claude-vault/*/` shows no duplicate numbers
- [ ] `python .claude/hooks/validate-taxonomy.py --check` exits 0
- [ ] `grep -r "04-Agents\|10-Reports\|10-Meta/Reports" CLAUDE.md` returns nothing (old refs gone)
- [ ] All reports files are in one location
- [ ] `git log --diff-filter=R --summary` shows clean renames with history preserved
- [ ] Obsidian opens vault without broken links (check graph view)

## Artifacts
- Renamed vault folders (via `git mv`)
- Hook: `.claude/hooks/validate-taxonomy.py`
- Taxonomy doc: `claude-vault/_system/TAXONOMY.md`
- Updated: `CLAUDE.md` canonical locations table
- Updated: Any hook/memory scripts with vault path references

## Risks / Considerations
- **Obsidian links**: Obsidian uses wiki links; renaming folders may break `[[links]]` unless Obsidian's auto-update is enabled. Test with a single folder first.
- **Git history**: Use `git mv` to preserve file history across renames
- **Plugin folders**: `Excalidraw/` is managed by the Excalidraw plugin and may recreate itself with the default name if renamed
- **Hooks referencing old paths**: `damage-control.py` and other hooks hardcode vault paths; these must be updated simultaneously
- **Session in progress**: If a session log is being written to `04-Sessions/` during the rename, it could fail. Do this during a clean session.
- **Previous failed attempts**: This is v3 for a reason. The hook enforcement is the key differentiator - without it, taxonomy will drift again within weeks.

## Dependencies
- No hard dependencies, but should coordinate with task-118 (template consolidation) since both modify vault structure

## Related Tasks
- task-118: Canonical template location (also modifies vault structure)
- CLAUDE.md consolidation (Jan 2026) - previous cleanup that left these issues
