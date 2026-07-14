---
name: edgeless-gtm
author: Edgeless Lab
category: product
title: Edgeless GTM Skill
status: incomplete
---

# Edgeless GTM Skill (edgeless-gtm)

## Purpose
The Edgeless GTM Skill (edgeless-gtm) automates SEO/GEO page analysis for edgelesslab.com and brands the generated content to keep it on-brand and authentic. It integrates DataForSEO MCP for competitive intelligence and implements the "compare N skills then distill" workflow pattern for quality content generation.

## Description
This skill handles the pattern of:

1. **SEO/GEO Analysis**: Uses DataForSEO MCP to analyze page performance, keywords, and competitive positioning
2. **Brand Consistency**: Proactively scrapes the live site (Firecrawl) to extract colors/fonts/voice and applies them to generated content
3. **Skill Distillation**: Generates 3-4 content variants from different community skills, compares them, then creates a single self-contained skill via skill-creator
4. **Content Integration**: Generates blog posts, social media variants, and web content for the edgelesslab ecosystem

## Technical Implementation

### Core Features
- **DataForSEO Integration**: API-only, ~$10 monthly, provides keyword research and competitive intelligence
- **Firecrawl Site Scraping**: Extracts brand assets (colors, fonts, voice) for on-brand generation
- **Skill Creator Pattern**: Compare N skills then distill - generate multiple variants, compare, then crystallize
- **Content Pipeline**: Full end-to-end from analysis to publication across platforms
- **Obsidian Integration**: Structured knowledge management for SEO insights

### MCP Tools
- **DataForSEO**: SEO/GEO analysis, keyword research, SERP analysis
- **Apollo/Clay**: Lead enrichment, ICP research for marketing intelligence
- **Firecrawl**: Brand asset extraction, site scraping for voice/colors/fonts

### Workflow Steps
1. **Input**: URL or page identifier for analysis
2. **Analysis**: Run DataForSEO on the target page
3. **Brand Extraction**: Scrape site for brand assets using Firecrawl
4. **Content Generation**: Use multiple community skills to generate content variants
5. **Comparison**: Compare outputs for quality and relevance
6. **Distillation**: Create a single, polished skill via skill-creator
7. **Application**: Apply distilled skill to generate blog posts, social content, etc.
8. **Quality Gate**: Review through brand-review-content skill before publication

### Dependencies
- DataForSEO API key (~$10/month)
- Firecrawl for site scraping
- skill-creator capability
- Access to edgelesslab.com codebase
- Obsidian integration for content storage

### Configuration
```yaml
required_tools:
  - DataForSEO
  - Firecrawl
  - skill-creator
  
site_url: "https://edgelesslab.com"
brand_assets_path: "/src/brand-assets/"
obsidian_vault_path: "~/claude-vault/03-Knowledge/"
"```

## Usage
```bash
# Run skill with target URL
python skill_runner.py --skill edgeless-gtm --input "https://edgelesslab.com/blog/seo-basics"

# Run specific analysis
python skill_runner.py --skill edgeless-gtm --mode "seo-analysis" --target "competitor.com"

# Generate brand review
action="edgeless-gtm" task="brand-analysis" config="salesforce"
"```

## Status
- ❌ DataForSEO MCP integration - PENDING EVALUATION
- ❌ Brand asset extraction - IN PROGRESS
- ❌ Skill distillation workflow - PLANNED
- ❌ Content pipeline - PLANNED
- ❌ Obsidian integration - PLANNED

## Next Steps
1. [ ] Evaluate and configure DataForSEO MCP
2. [ ] Implement Firecrawl site scraping for brand assets
3. [ ] Set up skill comparison and distillation pattern
4. [ ] Integrate with content-publishing pipeline
5. [ ] Complete Obsidian integration for insights
6. [ ] Run quality tests and validation
7. [ ] Deploy and monitor operations

## Context Integration
This skill works with:
- `content-publishing` skill for post distribution
- `brand-voice` skill for voice consistency
- `skill-creator` for distillation
- `social-media-draft-post` for initial content
- `twitter-posting` for social distribution

## References
- [DataForSEO](https://dataforseo.com/) - Professional SEO API
- [Firecrawl](https://www.firecrawl.dev/) - Site scraping and analysis
- [skill-creator](.Codex/skills/tooling/skill-creator/SKILL.md) - Skill distillation pattern
- [Obsidian Integration](../knowledge/obsidian/README.md) - Knowledge management
- [YouTube Enrichment](03-Knowledge/YouTube/) - Content pipeline examples

## Workflows
The skill implements the "EDGA-10567 workflow pattern":
1. **Multiple Community Skills Generation**: Leverage existing skills for SEO, content, and brand analysis
2. **Comparative Evaluation**: Compare outputs for quality and relevance
3. **Distillation**: Extract the best patterns and create a refined, self-contained skill
4. **Continual Improvement**: Log insights back to Obsidian for future refinement
- Output: A sharpened edgeless-gtm skill ready for edge cases and user launches
"```

## Testing
```bash
# Test SEO analysis capability
python skill_tester.py --test edgeless-gtm --scenario "seo-analysis"

# Test brand extraction
python skill_tester.py --test edgeless-gtm --scenario "brand-scrape"

# Test skill distillation
python skill_tester.py --test edgeless-gtm --scenario "skill-distillation"
"```

## Performance Metrics
- **SEO Analysis Time**: < 2 seconds per page
- **Brand Scraping Time**: < 5 seconds
- **Skill Distillation**: 3-4 iterations, ~10 seconds total
- **Quality Score**: Target > 85% consistency

## Issue Resolution
When Skill Distillation encounters inconsistencies:
1. **Fallback Pattern**: Use the highest-scoring skill variant directly
2. **Quality Review**: Deploy to brand-review-content for manual validation
3. **Community Feedback**: Log variations to Obsidian for community contribution
4. **Documentation Update**: Document the successful patterns for future iterations

## Future Enhancements
- **Multi-Keyword Analysis**: Batch processing for multiple target keywords
- **Competitor Comparison**: Automated competitive intelligence gathering
- **A/B Testing**: Direct integration with edgelesslab.com conversion tracking
- **Real-time Monitoring**: Continuous SEO health monitoring
- **AI-powered Recommendations**: Machine learning insights for optimization
```
