---
id: task-105
title: Integrate Claude Agent SDK into Xcode for native AI-assisted app development
epic: 1-kernel
status: pending
priority: P2
depends_on: []
blocks: []
created: 2026-02-03
owner: david
estimated_effort: 3-4 hours
tags: [xcode, sdk, mobile-dev, beginner-friendly, visual-verification]
---

# Task 105: Xcode Claude Agent SDK Integration

## Goal
Set up and learn to use the Claude Agent SDK integration in Xcode 26.3, enabling AI-assisted app development with visual verification and autonomous coding capabilities directly in Apple's IDE.

## Context
**BRAND NEW**: Apple announced Xcode 26.3 today (Feb 3, 2026) with native Claude Agent SDK integration. This brings the full power of Claude Code directly into Xcode—including subagents, background tasks, and plugins—without leaving the IDE.

**Important**: User has never coded an app before, so this task includes both setup AND learning the basics of app development workflow.

### Key Capabilities
- **Visual Verification**: Claude can capture Xcode Previews to see what it's building
- **Autonomous Development**: Search docs, explore files, update project settings
- **MCP Integration**: Can use Claude Code CLI to integrate with Xcode over MCP
- **Iterative Development**: Claude identifies issues visually and iterates through builds

### Availability
- Release Candidate available now for Apple Developer Program members
- Full release coming soon on App Store

## Why This Matters
This could unlock app development even for non-coders. If Claude can see what it's building via Previews and iterate autonomously, it removes the traditional barriers to iOS/macOS app creation.

Related to task-94 (Happy Coder DX) - this could be a breakthrough for delightful mobile coding experience.

## Step-by-Step Instructions

### Step 1: Verify Prerequisites
Check requirements:
```bash
# Check macOS version
sw_vers

# Check if enrolled in Apple Developer Program
# (May need free enrollment or paid $99/year)
open https://developer.apple.com/programs/

# Check current Xcode version
xcodebuild -version
```

Document findings in research session.

### Step 2: Install Xcode 26.3 Release Candidate
Download and install:
```bash
# Option A: Via Apple Developer portal
open https://developer.apple.com/download/

# Option B: Via xcode-select (if available)
# Follow Apple's installation instructions
```

Verify installation:
```bash
xcodebuild -version  # Should show 26.3
```

### Step 3: Configure Claude Agent SDK Integration
Follow Anthropic's setup guide:
- Read: https://www.anthropic.com/news/apple-xcode-claude-agent-sdk
- Install any required extensions or plugins
- Configure API keys if needed
- Test basic connection

Document the setup process for future reference.

### Step 4: Create a "Hello World" Test Project
Start simple to learn the workflow:
```bash
# Create a basic SwiftUI app project
# Let Claude help build it through Xcode
```

Test capabilities:
1. Ask Claude to create a simple UI
2. Use visual verification to see Preview
3. Let Claude iterate on the design
4. Build and run the app

### Step 5: Explore MCP Integration (Optional)
Test bidirectional integration:
```bash
# From Claude Code CLI, connect to Xcode over MCP
# Capture Previews without leaving terminal
# Test the workflow for mobile development
```

Compare: Xcode-native vs CLI+MCP approach

### Step 6: Document Learning Path
Create guide for app development as a beginner:
- What worked well?
- What was confusing?
- What patterns did Claude suggest?
- What should a non-coder know before starting?

Research session: `/claude-vault/03-Knowledge/Research-Sessions/2026-02-03-xcode-claude-sdk-setup.md`

### Step 7: Identify Use Cases
Brainstorm what to build:
- Personal productivity apps?
- Data visualization tools?
- Integration with existing systems (backlog, vault, trading bots)?
- Mobile interfaces for current projects?

Prioritize based on value + feasibility.

---

## Acceptance Criteria
- [ ] Xcode 26.3 RC installed and verified
- [ ] Claude Agent SDK integration configured
- [ ] "Hello World" app created with Claude's help
- [ ] Visual verification tested (Xcode Previews working)
- [ ] Setup documented for reproducibility
- [ ] Learning path documented for beginners
- [ ] 3+ potential app ideas identified

---

## Verification Checklist
- [ ] Can invoke Claude Agent within Xcode
- [ ] Claude can capture and analyze Xcode Previews
- [ ] Successfully built and ran at least one app
- [ ] Research session document exists with findings
- [ ] Setup guide written for future reference
- [ ] (Optional) MCP integration tested from CLI

---

## Artifacts
- Research session: `claude-vault/03-Knowledge/Research-Sessions/2026-02-03-xcode-claude-sdk-setup.md`
- Setup guide: `claude-vault/05-Solutions/xcode-claude-integration-guide.md`
- Sample project: Could be stored in new `/Users/djm/xcode-projects/` directory
- App ideas list: Can spawn new tasks if promising

## Technical Resources
- Anthropic announcement: https://www.anthropic.com/news/apple-xcode-claude-agent-sdk
- Apple newsroom: https://www.apple.com/newsroom/2026/02/xcode-26-point-3-unlocks-the-power-of-agentic-coding/
- TechCrunch coverage: https://techcrunch.com/2026/02/03/agentic-coding-comes-to-apples-xcode-26-3-with-agents-from-anthropic-and-openai/

## Questions to Answer
- How does the visual verification actually work?
- Can Claude handle complex UI layouts autonomously?
- How does error handling work when builds fail?
- Is this better than traditional Xcode for beginners?
- Can existing CLI workflows integrate with Xcode projects?
- What's the performance like compared to Claude Code CLI?

## Success Metric
User can comfortably start a new app project and use Claude to build meaningful functionality, even without prior iOS development experience.

## Notes
- This is VERY new (announced today) - expect bugs and evolving documentation
- Community will be learning alongside you - good time to experiment
- Consider documenting discoveries publicly (blog post, tweet thread)
- May want to join Apple Developer Program ($99/year) if not already enrolled
- This could fundamentally change mobile development workflow (relates to task-94)

## Risks / Considerations
- RC software may have bugs
- Claude Agent SDK integration is brand new - features may be limited initially
- Learning curve for Xcode itself (separate from Claude integration)
- May need to learn Swift/SwiftUI basics even with AI assistance
- MCP integration might not be ready in initial RC

## Related Tasks
- task-94: Happy Coder DX exploration (this could be the answer!)
- Future: Specific app ideas could spawn new tasks in Epic 6 (Creative)
