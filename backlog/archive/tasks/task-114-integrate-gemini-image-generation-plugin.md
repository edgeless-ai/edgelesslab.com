---
id: task-114
title: Integrate DAIR.AI Gemini image generation plugin for Claude Code
epic: 1-kernel
status: pending
priority: P2
depends_on: []
blocks: []
created: 2026-02-03
owner: david
estimated_effort: 1-2 hours
tags: [image-generation, gemini-api, plugins, automation, visual-assets]
---

# Task 114: Integrate Gemini Image Generation Plugin

## Goal
Install and configure the DAIR.AI Academy image-generator plugin for Claude Code, enabling autonomous text-to-image generation directly from the terminal using Google's Gemini API.

## Context
The DAIR.AI Academy provides a Claude Code plugin that enables "Agentic Image Generation" - Claude can autonomously generate, evaluate, and refine images through iterative loops without manual intervention.

### Key Capabilities
- **Text-to-Image**: Generate images from text descriptions
- **Image Editing**: Modify existing images with instructions
- **Multi-Image Composition**: Combine multiple images
- **High Resolution**: Supports up to 4K resolution
- **Autonomous Refinement**: Claude iteratively improves images based on evaluation
- **Format Control**: Specify dimensions, aspect ratios (16:9, 1:1, etc.)

### Use Cases
- Blog cover images for articles/posts
- Product mockups and visualizations
- Logos and brand assets
- Social media graphics (various aspect ratios)
- Architecture diagrams and flowcharts
- Background removal and photo editing
- Visual aids for documentation

## Why This Matters
Currently, creating visual assets requires:
- Switching to external tools (Figma, Photoshop, DALL-E UI)
- Manual iteration and refinement
- Context switching away from terminal workflow

With this plugin:
- ✅ Generate images without leaving Claude Code
- ✅ Autonomous refinement loops (no manual feedback)
- ✅ Consistent terminal-based workflow
- ✅ Free tier available (Google Gemini API)
- ✅ Integrates with existing automation (could generate task thumbnails, backlog visualizations, etc.)

## Step-by-Step Instructions

### Step 1: Add DAIR.AI Plugins Marketplace
Configure Claude Code to access the plugin marketplace:

```bash
# Follow instructions at:
# https://academy.dair.ai/blog/agentic-context-engineering

# This likely involves adding a plugin registry to Claude Code config
# Document the exact steps taken
```

### Step 2: Install Image Generator Plugin
Install the plugin from marketplace:

```bash
# Command will be something like:
# claude-code plugins install image-generator

# Or via marketplace UI in Claude Code
# Document actual installation method
```

### Step 3: Obtain Google Gemini API Key
Get a free API key from Google AI Studio:

```bash
# 1. Visit Google AI Studio
open https://aistudio.google.com/

# 2. Create/sign in to account
# 3. Generate API key
# 4. Copy the key (starts with "AIza...")
```

Document any limits or quotas on free tier.

### Step 4: Configure API Key
Add the API key to your environment:

```bash
# Add to shell profile (zsh)
echo 'export GEMINI_API_KEY="your-key-here"' >> ~/.zshrc
source ~/.zshrc

# Verify it's set
echo $GEMINI_API_KEY
```

### Step 5: Test Basic Image Generation
Create a simple test image:

```bash
# Example prompt (adjust based on actual plugin syntax)
# "Generate a simple geometric logo with the letters 'DJ' in a modern style"

# Save to test directory
mkdir -p ~/claude-projects/test-images/
```

Document:
- Actual command syntax
- Generation time
- Image quality
- File format and size

### Step 6: Test Advanced Features
Try more complex scenarios:

**Test 1: Blog Cover (16:9)**
```
Generate a blog cover image for an article about AI coding assistants.
- 16:9 aspect ratio
- Modern, tech aesthetic
- Include abstract representation of code and AI
- Color scheme: blues and purples
```

**Test 2: Diagram/Flowchart**
```
Create a flowchart showing the backlog task lifecycle:
pending → in_progress → completed → archived
```

**Test 3: Autonomous Refinement**
```
Generate a product mockup for a mobile app.
Let Claude iterate to improve quality based on evaluation.
```

Document:
- Which features work well
- What limitations exist
- Image quality vs DALL-E / Midjourney
- Iteration behavior (how many loops?)

### Step 7: Identify Integration Opportunities
Brainstorm where this could add value to existing workflows:

**Immediate Use Cases:**
- Generate cover images for research session notes
- Create diagrams for technical documentation
- Visualize system architectures
- Social media assets for sharing insights

**Automation Opportunities:**
- Hook to auto-generate task thumbnails?
- Create visual backlog dashboards?
- Generate preview images for vault articles?
- Automate social media image creation?

**Creative Opportunities:**
- Pen plotter artwork generation (convert to SVG?)
- NFT trait generation (FC Pro, Qt Bags projects)
- Trading bot performance visualizations
- Data dashboards with custom graphics

### Step 8: Document Usage Patterns
Create a quick reference guide:

Location: `/Users/djm/claude-projects/docs/gemini-image-generation-guide.md`

Include:
- Installation recap
- Common prompts/templates
- Best practices for good results
- Limitations and workarounds
- Cost considerations (API quotas)
- Integration examples

### Step 9: Update Memory System
Store configuration in memory for future sessions:

```bash
# Create memory file
# Location: .serena/memories/gemini-image-generation-setup.md

# Include:
# - API key location
# - Plugin installation path
# - Common usage patterns
# - Known issues/workarounds
```

---

## Acceptance Criteria
- [ ] DAIR.AI marketplace added to Claude Code
- [ ] Image-generator plugin installed
- [ ] Google Gemini API key obtained and configured
- [ ] Successfully generated test image
- [ ] Tested advanced features (aspect ratios, refinement)
- [ ] Documented usage patterns and limitations
- [ ] Created quick reference guide
- [ ] Identified 3+ integration opportunities
- [ ] Memory system updated

---

## Verification Checklist
- [ ] Can generate images from terminal without errors
- [ ] API key is properly configured (persists across sessions)
- [ ] Generated images are acceptable quality
- [ ] Understand cost/quota limits
- [ ] Quick reference guide exists and is useful
- [ ] At least one real use case tested (e.g., blog cover)

---

## Artifacts
- Quick reference: `/Users/djm/claude-projects/docs/gemini-image-generation-guide.md`
- Test images: `~/claude-projects/test-images/gemini-tests/`
- Memory file: `.serena/memories/gemini-image-generation-setup.md`
- (Optional) Integration examples: Could spawn new tasks

## Technical Resources
- Tutorial: https://academy.dair.ai/blog/agentic-context-engineering
- DAIR.AI Academy: https://academy.dair.ai/
- Google AI Studio: https://aistudio.google.com/
- Gemini API Docs: https://ai.google.dev/gemini-api/docs

## Questions to Answer
- What's the actual model name? (Article mentions "gemini-3-pro-image-preview")
- What are the API rate limits on free tier?
- How long does generation take per image?
- Can it read/edit existing images in the vault?
- Does it support batch generation?
- Can output be piped to other tools (e.g., imagemagick)?
- Does it cache results or always regenerate?
- What happens if API quota is exceeded?
- Can it generate SVG (useful for pen plotter)?
- How does quality compare to DALL-E 3 / Midjourney?

## Success Metrics
**Setup Phase:**
- Plugin installed and functional within 30 minutes
- First image generated successfully

**Usage Phase:**
- Can generate usable assets without external tools
- Iteration is faster than manual design
- Quality is acceptable for blog/documentation use

**Integration Phase:**
- Used in at least one real project within 2 weeks
- Saves time compared to previous workflow

## Notes
- Google Gemini API has free tier - start there before committing
- This is a relatively new plugin - may have rough edges
- Focus on practical applications over perfection
- Consider Joan Westenberg's warning (task-113 meta): Is this solving real bottleneck or "cool tech" procrastination?

**Honest assessment needed:**
- Do I actually need programmatic image generation?
- Or is this avoiding harder work (writing, coding, shipping)?
- If it saves 5+ minutes per image and I create 10+ images/month, it's worth it
- If I'm creating excuses to generate images, it's procrastination

## Risks / Considerations
- **API Costs**: Free tier may have limits; could incur costs at scale
- **Quality**: Gemini image quality may not match DALL-E 3 / Midjourney
- **Learning Curve**: May take time to write effective prompts
- **Dependency**: Adds another external service dependency
- **Maintenance**: Plugin may break with Claude Code updates
- **Over-reliance**: Could become crutch instead of learning basic design skills

## Related Tasks
- task-94: Happy Coder DX (terminal-based workflow improvements)
- Future: Could enable automated visual content for vault articles
- Future: Integration with pen plotter projects (SVG generation?)
- Future: NFT trait generation automation (FC Pro, Qt Bags)

## Integration Points
- **Vault**: Auto-generate cover images for research sessions
- **Backlog**: Visual task thumbnails or epic illustrations
- **Social**: Automate Twitter/LinkedIn image creation
- **Documentation**: Diagrams for technical docs
- **Creative Projects**: Pen plotter, NFT generation, trading visualizations
