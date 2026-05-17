---
id: 167
title: Install and integrate Obsidian CLI tools (official + notesmd-cli)
epic: 5-product
status: done
priority: P2
depends_on: []
blocks: []
created: 2026-02-04
owner: david
estimated_effort: 3-4 hours
tags: [obsidian, cli, automation, vault-integration, scripting, notesmd-cli]
---

# Task 167: Obsidian CLI Tools Integration (Dual Approach)

## Goal
Install and integrate BOTH the official Obsidian CLI and the community notesmd-cli tool to enable comprehensive vault automation with complementary capabilities.

## Context
There are TWO CLI tools available for Obsidian automation, each with different strengths:

### 1. Official Obsidian CLI (Released Feb 10, 2026, FREE as of Feb 27, 2026)
**NOW FREE FOR ALL USERS**: Official command-line interface shipped in version 1.12.4 (Feb 27, 2026).

**Strengths:**
- Over 100 commands for vault operations
- Plugin management (enable/disable/configure)
- JavaScript execution in Obsidian context
- Template application via Templater/Core plugins
- Task management integration
- Interactive TUI with autocomplete
- Trigger Obsidian-specific features (Dataview queries, etc.)
- **FREE** - no license required (as of v1.12.4)

**Limitation:**
- **Requires Obsidian app running** (client-server architecture)

### 2. NotesMD CLI (Community Tool)
**Community-developed** Go-based CLI that was renamed from "Obsidian CLI" to avoid confusion.

**Strengths:**
- **Works WITHOUT Obsidian running** (fully standalone)
- Comprehensive note operations (create, read, update, delete, move)
- Fuzzy search and content search
- YAML frontmatter management
- Daily notes with templates
- Editor integration (open in vim/VSCode/etc.)
- Free and open-source
- Fast (written in Go)

**Limitation:**
- Cannot trigger Obsidian-specific features (plugins, indexes)
- No access to Templater/Dataview/plugin functionality

### Complementary Strategy: Use Both (Now with Zero Cost Barrier!)
- **notesmd-cli**: For automation that doesn't need Obsidian (file operations, cron jobs, headless scripts)
- **Official CLI**: For operations requiring Obsidian features (plugin triggers, complex templates)

**IMPORTANT UPDATE (Feb 27, 2026):** Official CLI is now **FREE** for all users in v1.12.4+. No more cost decision - just install both and use the right tool for each job!

### Key Capabilities
- **Over 100 commands** for vault operations
- **Template application** from command line
- **Task management** automation
- **Plugin management** (enable/disable/configure)
- **JavaScript execution** in Obsidian context
- **Interactive TUI** with autocomplete and command history
- **Client-server architecture** (CLI communicates with running Obsidian app)

### Current State
- Vault operations require manual GUI interaction
- Automation scripts can read/write markdown but can't trigger Obsidian features
- Templates, tasks, plugins must be managed manually
- No programmatic way to refresh indexes or trigger plugin actions

## Why This Matters
With Obsidian CLI, we can:
- ✅ Automate vault template application (session logs, research notes, task files)
- ✅ Trigger Obsidian refreshes after external file changes
- ✅ Manage tasks programmatically (create, update, complete)
- ✅ Configure plugins via scripts
- ✅ Execute Dataview/Templater commands from hooks
- ✅ Build unified workflows (backlog → vault, memory → vault)
- ✅ Integrate with existing automation (hooks, skills, cron jobs)

## Step-by-Step Instructions

### Step 1: Install NotesMD CLI (Community Tool, No Dependencies)
Start with the standalone tool since it has no prerequisites:

```bash
# Install via Homebrew (macOS)
brew install yakitrak/notesmd-cli/notesmd-cli

# Verify installation
notesmd --version
notesmd --help

# Set default vault
notesmd set-default /Users/djm/claude-projects/claude-vault

# Test basic operations
notesmd list
notesmd search "memory"
```

**Document:**
- Installation method used
- Default vault configuration
- Available commands

### Step 2: Test NotesMD CLI Operations
Systematically test capabilities:

```bash
# List notes
notesmd list

# Search by name (fuzzy)
notesmd search "session"

# Search by content
notesmd search --content "backlog"

# Create new note
notesmd new "Test Note" --folder "04-Sessions/2026-02"

# Read note
notesmd read "Test Note"

# Update note (add frontmatter)
notesmd update "Test Note" --field "status:completed"

# Open in default editor
notesmd open "Test Note" --editor

# Create daily note
notesmd daily
```

Document what works well and any limitations encountered.

### Step 3: Update Obsidian and Enable Official CLI (Now FREE!)
The official CLI is now included in Obsidian v1.12.4+ for all users:

```bash
# Check if Obsidian is installed
which obsidian || ls /Applications/Obsidian.app

# Open Obsidian
open -a Obsidian

# Update to v1.12.4 or later:
# Obsidian → Check for updates (should auto-update)
# Or download latest from obsidian.md

# Enable CLI:
# Settings → General → Command line interface → Enable

# Verify CLI is available
obsidian --version
obsidian --help
```

**Key change:** CLI is now **built-in** to Obsidian 1.12.4+. Just enable it in settings - no separate installation needed!

### Step 4: Test Official CLI is Working
Verify the official CLI:

```bash
# Start Obsidian application (required for client-server)
open -a Obsidian

# Test basic commands
obsidian status
obsidian vault list
obsidian --help  # See all available commands
```

Document exact version and available commands.

### Step 5: Configure Official Obsidian CLI
Set up CLI to communicate with Obsidian:

```bash
# Start Obsidian application (required for client-server)
open -a Obsidian

# Configure vault path
obsidian config set vault-path /Users/djm/claude-projects/claude-vault

# Test basic connection
obsidian status
obsidian vault list
```

### Step 6: Compare Capabilities Side-by-Side
Create comparison table:

| Operation | NotesMD CLI | Official CLI | Winner | Notes |
|-----------|-------------|--------------|--------|-------|
| Create note | ✅ `notesmd new` | ✅ `obsidian file create` | NotesMD | Works offline |
| Read note | ✅ `notesmd read` | ✅ `obsidian file read` | Tie | Both work well |
| Search | ✅ Fuzzy + content | ✅ Various methods | Tie | Different strengths |
| Frontmatter | ✅ `--field` flag | ✅ YAML operations | Tie | Both capable |
| Templates | ⚠️ Basic support | ✅ Full Templater | Official | Plugin integration |
| Daily notes | ✅ `notesmd daily` | ✅ Via plugin | Tie | Both work |
| Plugin control | ❌ N/A | ✅ Full access | Official | Unique capability |
| Requires Obsidian | ❌ No | ✅ Yes | NotesMD | Major advantage |
| Speed | ✅ Very fast (Go) | ? Untested | ? | Test needed |
| Editor integration | ✅ `--editor` | ⚠️ Opens Obsidian | NotesMD | Opens any editor |
| Cost | ✅ Free | ✅ Free | Tie | Both are free as of Obsidian v1.12.4 |

Document findings and determine which tool for which use case.

### Step 7: Explore Official CLI Commands
Systematically test command categories:

**Core Commands:**
```bash
# Vault operations
obsidian vault list
obsidian vault open claude-vault
obsidian vault info

# File operations
obsidian file list
obsidian file create
obsidian file read
obsidian file update

# Template operations
obsidian template list
obsidian template apply

# Task operations
obsidian task list
obsidian task create
obsidian task update
obsidian task complete

# Plugin operations
obsidian plugin list
obsidian plugin enable
obsidian plugin disable
obsidian plugin settings

# Search/Query
obsidian search "query"
obsidian dataview "query"
```

Document all available commands with examples.

### Step 8: Test Official CLI Interactive TUI
Try the interactive terminal interface:

```bash
# Launch interactive mode
obsidian interactive

# Test:
# - Command autocomplete
# - Command history
# - Multi-command workflows
```

Evaluate if TUI or CLI commands are better for automation.

### Step 9: Identify Integration Opportunities (Both Tools)
Map capabilities to workflows, choosing the right tool for each:

**Backlog Integration (Use NotesMD - works offline):**
```bash
# When creating task-XXX.md via backlog system:
# 1. Write markdown file (existing)
# 2. Add frontmatter (NEW via notesmd)
notesmd update task-167 --field "status:pending" --field "epic:5-product"
# 3. Create vault link (NEW via notesmd if needed)
```

**Session Logging (Use NotesMD for simple cases, Official for Templater):**
```bash
# Simple daily note:
notesmd daily  # Creates with date, basic template

# Complex template with Templater:
obsidian template apply session-log --file 04-Sessions/2026-02/session-2026-02-04.md
```

**Memory System (Use NotesMD - no Obsidian needed):**
```bash
# When saving research session:
notesmd new "2026-02-04-obsidian-cli" --folder "03-Knowledge/Research-Sessions"
notesmd update "2026-02-04-obsidian-cli" --field "tags:obsidian,cli,automation"
```

**Hook Integration (Use NotesMD for reliability - no dependency on Obsidian running):**
```bash
# Post-task-completion hook:
notesmd update "task-167" --field "status:completed"
notesmd new "task-167-completion" --folder "04-Sessions/2026-02"
```

**Cron Jobs (Use NotesMD - headless, no GUI required):**
```bash
# Daily automated tasks:
notesmd daily  # Create daily note
notesmd search --content "TODO" > /tmp/todos.txt  # Extract TODOs
```

**Plugin Operations (Use Official CLI only):**
```bash
# When Obsidian IS running and plugin features needed:
obsidian plugin refresh dataview
obsidian dataview query "LIST WHERE status = 'pending'"
obsidian template apply complex-template  # Uses Templater plugin
```

### Step 10: Create Utility Scripts (Dual Tool Strategy)
Build wrapper scripts that use the right tool for each job:

**Location:** `/Users/djm/claude-projects/scripts/obsidian-utils/`

**Script 1: `create-session-log.sh` (Uses NotesMD - works offline)**
```bash
#!/bin/bash
# Create new session log - works without Obsidian running
DATE=$(date +%Y-%m-%d)
MONTH=$(date +%Y-%m)
notesmd new "session-$DATE" --folder "04-Sessions/$MONTH"
notesmd update "session-$DATE" \
  --field "created:$DATE" \
  --field "type:session_log" \
  --field "tags:session"
echo "Created: 04-Sessions/$MONTH/session-$DATE.md"
```

**Script 2: `create-research-session.sh` (Uses NotesMD - works offline)**
```bash
#!/bin/bash
# Create research session note
TOPIC=$1
DATE=$(date +%Y-%m-%d)
notesmd new "$DATE-$TOPIC" --folder "03-Knowledge/Research-Sessions"
notesmd update "$DATE-$TOPIC" \
  --field "created:$DATE" \
  --field "type:research_session" \
  --field "topic:$TOPIC"
echo "Created: 03-Knowledge/Research-Sessions/$DATE-$TOPIC.md"
```

**Script 3: `refresh-vault-index.sh` (Uses Official - requires Obsidian)**
```bash
#!/bin/bash
# Trigger Obsidian to refresh vault indexes
# Only works if Obsidian is running
if pgrep -x "Obsidian" > /dev/null; then
  obsidian vault refresh
  obsidian dataview refresh
  echo "Vault refreshed"
else
  echo "Warning: Obsidian not running, skipping refresh"
fi
```

**Script 4: `update-task-status.sh` (Uses NotesMD - reliable for automation)**
```bash
#!/bin/bash
# Update task status - works offline
TASK_ID=$1
STATUS=$2
notesmd update "task-$TASK_ID" --field "status:$STATUS"
echo "Updated task-$TASK_ID status to $STATUS"
```

**Script 5: `apply-complex-template.sh` (Uses Official - requires Templater)**
```bash
#!/bin/bash
# Apply complex template requiring Templater plugin
FILE=$1
TEMPLATE=$2
if pgrep -x "Obsidian" > /dev/null; then
  obsidian template apply "$TEMPLATE" --file "$FILE"
else
  echo "Error: Obsidian must be running for Templater templates"
  exit 1
fi
```

### Step 11: Integrate with Existing Hooks (Prefer NotesMD for Reliability)
Add CLI calls to hooks, using NotesMD for automation (no Obsidian dependency):

**`post-task-completion.sh`** (add):
```bash
# Update vault after task completion - uses NotesMD (works offline)
notesmd update "task-$TASK_ID" --field "status:completed"

# Optional: Refresh Obsidian if running
if pgrep -x "Obsidian" > /dev/null; then
  obsidian vault refresh
fi
```

**`session-start.sh`** (add):
```bash
# Create session log with NotesMD (reliable, no Obsidian needed)
./scripts/obsidian-utils/create-session-log.sh
```

**`research-capture.sh`** (add):
```bash
# Create research session note with NotesMD
./scripts/obsidian-utils/create-research-session.sh "$TOPIC"
```

### Step 12: Install and Configure Both CLIs (Both FREE Now!)
Since both tools are now free, install and configure both:

**NotesMD CLI setup:**
```bash
brew install yakitrak/notesmd-cli/notesmd-cli
notesmd set-default /Users/djm/claude-projects/claude-vault
notesmd list  # Test it works
```

**Official CLI setup:**
```bash
# Update Obsidian to v1.12.4+
# Enable in Settings → General → Command line interface
obsidian --version  # Verify it works
```

**Document which situations to use each tool in.**

### Step 13: Test End-to-End Workflows
Validate integrated workflows using both tools:

**Workflow 1: Create Research Note (NotesMD - Works Offline)**
```bash
# 1. Create note with metadata
notesmd new "2026-02-04-test-research" --folder "03-Knowledge/Research-Sessions"

# 2. Add frontmatter
notesmd update "2026-02-04-test-research" \
  --field "type:research" \
  --field "tags:testing,cli"

# 3. Verify created
notesmd list | grep "test-research"
```

**Workflow 2: Session Log Automation (NotesMD - Reliable)**
```bash
# 1. Run utility script
./scripts/obsidian-utils/create-session-log.sh

# 2. Verify in vault
notesmd read "session-$(date +%Y-%m-%d)"

# 3. (Optional) Open in Obsidian if running
notesmd open "session-$(date +%Y-%m-%d)"  # Opens in Obsidian if available
```

**Workflow 3: Task Status Update (NotesMD - Automation-Friendly)**
```bash
# 1. Update task status
./scripts/obsidian-utils/update-task-status.sh 167 "in_progress"

# 2. Verify change
notesmd read "task-167" | grep "status"
```

**Workflow 4: Plugin Management (Official CLI - If Enabled)**
```bash
# Only if official CLI is enabled and Obsidian is running:
# Disable plugins before maintenance
obsidian plugin disable dataview
obsidian plugin disable templater

# Re-enable after
obsidian plugin enable dataview
obsidian plugin enable templater
```

### Step 14: Document Usage Patterns (Both Tools)
Create comprehensive guide:

**Location:** `/Users/djm/claude-projects/docs/obsidian-cli-guide.md`

**Sections:**
1. **Tool Selection Matrix**
   - When to use NotesMD CLI
   - When to use Official CLI
   - Decision flowchart

2. **NotesMD CLI Guide**
   - Installation and setup
   - Common commands
   - Editor integration
   - Automation patterns

3. **Official CLI Guide**
   - Enablement and configuration
   - Plugin operations
   - Templater integration
   - TUI mode usage

4. **Integration with Existing Workflows**
   - Backlog system
   - Session logging
   - Research capture
   - Hook integration

5. **Utility Scripts Reference**
   - What each script does
   - Which CLI tool it uses
   - When to use each

6. **Troubleshooting**
   - NotesMD: Works offline, no issues
   - Official: Requires Obsidian running
   - Common errors and fixes

7. **Best Practices**
   - Prefer NotesMD for automation (reliability)
   - Use Official only when plugins needed
   - Always check if Obsidian running before Official CLI
   - Fallback strategies

### Step 15: Update Memory System
Store configuration in memory:

```bash
# Create memory file
# Location: .serena/memories/obsidian-cli-setup.md

# Include:
# - Installation steps
# - Available commands
# - Integration points
# - Utility script locations
# - Common usage patterns
```

---

## Acceptance Criteria
- [ ] NotesMD CLI installed and verified
- [ ] Official Obsidian CLI enabled in v1.12.4+ (now FREE!)
- [ ] Can execute NotesMD operations (create, read, update, search)
- [ ] Can execute official CLI operations (plugin management, templates)
- [ ] Created comparison table (capabilities side-by-side)
- [ ] Created at least 4 utility scripts using appropriate tool
- [ ] Integrated with at least 2 existing hooks
- [ ] End-to-end workflows tested (at least 3)
- [ ] Documentation guide created with tool selection matrix
- [ ] Memory system updated
- [ ] Verified both CLIs work as expected

---

## Verification Checklist
- [ ] `notesmd --version` returns valid version
- [ ] Can create notes offline (no Obsidian running)
- [ ] Can update frontmatter from command line
- [ ] Can search notes by content
- [ ] If official CLI enabled: `obsidian --version` works
- [ ] If official CLI enabled: can trigger vault refresh
- [ ] Utility scripts execute without errors
- [ ] Scripts use correct tool for each operation
- [ ] Integration doesn't break existing workflows
- [ ] Documentation clearly explains tool selection
- [ ] Hooks work even when Obsidian isn't running (NotesMD)

---

## Artifacts
- Usage guide: `/Users/djm/claude-projects/docs/obsidian-cli-guide.md`
- Utility scripts: `/Users/djm/claude-projects/scripts/obsidian-utils/`
- Memory file: `.serena/memories/obsidian-cli-setup.md`
- Integration examples: In hooks directory
- Research session: `claude-vault/03-Knowledge/Research-Sessions/2026-02-04-obsidian-cli-integration.md`

## Technical Resources

### NotesMD CLI (Community Tool)
- GitHub Repo: https://github.com/Yakitrak/notesmd-cli
- Installation: `brew install yakitrak/notesmd-cli/notesmd-cli`
- Written in Go, fully standalone

### Official Obsidian CLI
- Official CLI docs: https://help.obsidian.md/cli
- Changelog (v1.12.0 Early Access): https://obsidian.md/changelog/2026-02-10-desktop-v1.12.0/
- **v1.12.4 FREE Release**: Feb 27, 2026 - CLI now free for all users
- Community guide: https://deepakness.com/raw/obsidian-cli/
- Complete guide: https://frankanaya.com/obsidian-cli/
- Setup guide: https://zenn.dev/sora_biz/articles/obsidian-cli-setup-guide?locale=en

## Questions to Answer

### NotesMD CLI
- [x] Requires Obsidian running? NO (major advantage)
- [ ] How fast is it compared to official CLI?
- [ ] Does editor integration work well?
- [ ] Can it handle large vaults efficiently?
- [ ] Are there any missing features we need?

### Official CLI
- [x] Requires Obsidian running? YES (client-server)
- [x] Licensing situation? Early access started with Catalyst, but CLI is free for all users in v1.12.4+
- [ ] What's the exact installation method?
- [ ] Can it trigger plugin-specific commands?
- [ ] Does it support multiple vaults simultaneously?
- [ ] How does error handling work?
- [ ] Are there any feature limitations after the free release?
- [ ] Which official commands are stable enough for automation use?

### Integration
- [ ] Which tool is faster for automation?
- [ ] Can both be used together seamlessly?
- [ ] Do they conflict in any way?
- [ ] What's the reliability comparison?

## Success Metrics
**Before:** Manual vault operations, no programmatic control

**After:**
- Automated note creation (works offline with NotesMD)
- Programmatic frontmatter updates
- Seamless tool integration
- Reduced manual steps in workflows
- Automation that works even when Obsidian closed

**Validation:**
- Can create session log from command line in <5 seconds (NotesMD)
- Hooks trigger vault operations reliably
- Automation works in headless/cron environments
- Can update task status without opening Obsidian
- Have clear guidelines on which tool to use when

## Notes
**Dual Tool Strategy:**
- NotesMD CLI is the PRIMARY tool (free, works offline, reliable)
- Official CLI is OPTIONAL enhancement (if plugin features needed)
- Start with NotesMD, evaluate official CLI need later

**NotesMD CLI:**
- Free and open-source
- Works without Obsidian running (huge for automation)
- Fast (written in Go)
- Covers 80-90% of automation needs
- Perfect for cron jobs and headless scripts

**Official CLI:**
- Released Feb 10, 2026 (Early Access), **FREE for all users as of Feb 27, 2026 (v1.12.4)**
- Built into Obsidian - just enable in Settings
- Client-server architecture means Obsidian app must be running
- Essential for plugin-specific features (Dataview, Templater)
- Over 100 commands for comprehensive control

**Joan Westenberg Check:**
- Is this solving real bottleneck? YES - manual vault operations are tedious
- Genuine productivity gain? YES - especially with NotesMD (no Obsidian dependency)
- Risk of over-engineering? LOW with NotesMD (simple file operations)
- Risk of over-engineering? MEDIUM with Official CLI (start simple, expand if needed)

## Risks / Considerations

### NotesMD CLI (Low Risk)
- **Community Tool**: Not officially supported by Obsidian
- **Feature Parity**: May lag behind Obsidian's features
- **Maintenance**: Depends on community maintainer
- **Plugin Access**: Cannot trigger plugin-specific features

### Official CLI (Lower Risk Now)
- **Free**: No cost barrier as of v1.12.4 (Feb 27, 2026)
- **Built-in**: Included in Obsidian, just enable in settings
- **Dependency**: Requires Obsidian app running (not standalone)
- **Learning Curve**: Over 100 commands to learn
- **Maturity**: Released recently, may have edge cases
- **Platform Support**: Available on macOS/Linux/Windows

### Mitigation Strategy (Updated)
- Install BOTH tools (both are free now!)
- Use NotesMD for automation that doesn't need Obsidian
- Use Official CLI for plugin features and Obsidian-specific operations
- Build critical automation on NotesMD (works offline)
- Use Official CLI as enhancement when Obsidian is running
- Create fallback strategies in scripts (check if Obsidian is running)

## Related Tasks
- task-118: Canonical template location (CLI can help apply them)
- task-119: Vault taxonomy cleanup (CLI can help reorganize)
- task-131: BluePrinting pipeline (could use CLI for deliverable templates)
- Future: Automated task creation workflows
- Future: Session log automation
- Future: Research session template application

## Integration Points
- **Hooks**: Post-task-completion, session-start, research-capture
- **Backlog**: Task creation and template application
- **Memory System**: Research session note generation
- **Templates**: Automated application across workflows
- **Vault Management**: Programmatic index refreshes
- **Plugins**: Enable/disable based on context

---

**Sources:**
- [Obsidian CLI Documentation](https://help.obsidian.md/cli)
- [Obsidian 1.12.0 Changelog](https://obsidian.md/changelog/2026-02-10-desktop-v1.12.0/)
- [Obsidian CLI Overview](https://deepakness.com/raw/obsidian-cli/)
- [Obsidian CLI Setup Guide](https://zenn.dev/sora_biz/articles/obsidian-cli-setup-guide?locale=en)
