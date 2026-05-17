---
id: 337
title: "Owl Alpha Eval: NGA-Scout curates 5 generative art inspirations"
status: completed
priority: P1
epic: owl-alpha-eval
agent: nga-scout
depends_on: []
blocks: []
created: 2026-05-03
---

# Owl Alpha Eval: NGA-Scout Art Research

## Objective
Evaluate Owl Alpha's web research and curation capability by having NGA-Scout perform its core job — sourcing generative art inspiration.

## Task
NGA-Scout should:
1. Search the NGA open access API (https://api.nga.gov) for artworks relevant to generative/algorithmic art (e.g., geometric abstraction, op art, color field painting)
2. Search fxhash or Art Blocks for trending generative art projects
3. Curate 5 inspirations — each with: title, artist, source URL, why it's relevant to our creative practice, and a specific technique idea it inspires
4. Save the curated list to `claude-vault/03-Knowledge/NGA-Scout/owl-eval-inspiration-set.md`
5. Cross-reference against existing vault content to avoid duplicates

## Acceptance Criteria
- [ ] 5 curated inspirations with all required fields
- [ ] At least 2 from NGA/museum sources, at least 1 from on-chain generative art
- [ ] Source URLs are real and accessible (no hallucinated links)
- [ ] Each entry includes a concrete technique idea (not generic "this is inspiring")
- [ ] No duplicates with existing vault content
- [ ] Completes within 10 minutes

## Eval Scoring
- **Pass**: All 5 entries complete, URLs verified, technique ideas are specific and actionable
- **Partial**: Entries exist but some URLs are dead or technique ideas are vague
- **Fail**: Hallucinated URLs, generic "this is cool" curation, or can't access APIs


## Completion
- Completed by agent **** on 2026-05-05
- Paperclip issue: EDGA-1067
- QA review: Approved by Ombudsman
