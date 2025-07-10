# FZF Quick Start Guide

## 🚀 Get Started in 2 Minutes

### 1. Install FZF (if not already done)
```bash
brew install fzf
/opt/homebrew/opt/fzf/install --all
```

### 2. Reload Your Shell
```bash
source ~/.zshrc  # or source ~/.bashrc
```

### 3. Load Helper Functions
```bash
source /Users/djm/claude-projects/tools/core/fzf-helpers.sh
```

### 4. Add to Shell Config (Permanent)
```bash
echo 'source /Users/djm/claude-projects/tools/core/fzf-helpers.sh' >> ~/.zshrc
```

## 🎯 Essential Commands to Try Now

### Global Shortcuts (Work Anywhere)
- **CTRL-T** - Find any file in current directory
- **CTRL-R** - Search command history
- **ALT-C** - Change to any directory

### Our Custom Commands
- **fo** - Open any vault note
- **ft** - Run any Python tool
- **fm** - Browse Serena memories
- **fkb** - Find KB articles
- **fhelp** - Show all commands

## 💡 Quick Examples

```bash
# Find and edit today's session notes
fs  # Then type today's date

# Run an ingestion tool
fi  # Select tool, then enter URL

# Quality check an email
fq  # Select file to check

# Open email documentation
fkb  # Type "email"

# Find a specific tool
ft  # Type "ingestion" or "quality"
```

## 📚 Full Documentation
- [[KB-FZF-Fuzzy-Finder-Integration]] - Complete guide
- [[Solution-FZF-Workflow-Integration]] - Workflow examples
- Memory: `fzf-fuzzy-finder-integration` - Quick reference

---
**FZF = Fuzzy Finder = Find Anything Fast! 🚀**