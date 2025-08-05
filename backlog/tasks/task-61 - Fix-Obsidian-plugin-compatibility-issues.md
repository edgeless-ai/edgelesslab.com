---
tags: backlog

Metadata:
  Status: open
  Priority: medium
  Assignee: unassigned
  Created: 2025-08-04
  Updated: 2025-08-04
  Sprint: 
  Points: 5

---

# Fix Obsidian plugin compatibility issues

## Description
Multiple Obsidian plugin issues have been reported by the community. We need to investigate and fix compatibility issues affecting our workflow.

## Context
- Multiple RSS articles reported various Obsidian plugin issues
- These issues may be affecting our knowledge management system
- 78 plugin updates are available that might fix some issues

## Acceptance Criteria
- [ ] Fix Obsidian Tasks plugin parameter recognition issue
- [ ] Debug and fix Dataview file.cday function
- [ ] Resolve broken internal link autocompletion
- [ ] Fix external image links not displaying in notes
- [ ] Address full path internal link problems
- [ ] Test Web Clipper with different interpreters (o4-mini issue)
- [ ] Update all 78 available plugin updates
- [ ] Document any workarounds or fixes

## Technical Details
Issues to investigate:
1. Tasks plugin not recognizing parameters
2. Dataview `file.cday` returning undefined
3. Internal link autocompletion broken
4. External image URLs not rendering
5. Full path links causing issues
6. Web Clipper errors with o4-mini

## Dependencies
- Obsidian desktop app
- Access to plugin settings
- Test vault for safe testing

## Notes
- Consider creating automated tests for plugin compatibility
- May need to report bugs to plugin developers
- Some issues might be related to recent Obsidian updates