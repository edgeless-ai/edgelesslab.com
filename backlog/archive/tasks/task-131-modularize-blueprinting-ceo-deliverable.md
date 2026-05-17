---
id: 131
title: Modularize BluePrinting CEO Deliverable Pipeline (Stage 4)
status: pending
priority: P1
effort: M
epic: 2-ingestion
created: 2026-02-04
depends_on: []
blocks: []
tags: [blueprinting, modularization, azure-devops, ceo-deliverable]
completion_criteria:
  required:
    - file_exists: "Blue Printing/CEODeliverable/generate_deliverable.py"
      description: "Modular deliverable generator exists"
    - file_exists: "Blue Printing/CEODeliverable/profiles/"
      description: "Client profiles directory exists"
    - file_exists: "Blue Printing/CEODeliverable/templates/"
      description: "Reusable templates exist"
    - command: "python generate_deliverable.py --profile wealthspire --dry-run"
      description: "Can generate Wealthspire deliverable from profile"
---

# Task 131: Modularize BluePrinting CEO Deliverable Pipeline (Stage 4)

## Context

During the Wealthspire CEO deliverable session (2026-02-04), we built target confidence one-pagers for 3 business lines using multi-agent AI council, transcript evidence mining, and professional DOCX generation. The process worked but was entirely ad-hoc. This task modularizes it into a repeatable Stage 4 of the BluePrinting pipeline.

## Current State (Ad-Hoc)

```
Manual transcript mining (grep + context reading)
    → Manual evidence organization (by BU + theme)
    → Manual DD hypothesis creation
    → Manual confidence assessment
    → generate_docx.py (parameterized but hardcoded data)
    → 4 DOCX files
```

## Target State (Modular Pipeline)

```
CEODeliverable/
├── generate_deliverable.py          # CLI entry point
├── profiles/
│   ├── wealthspire.json             # Client-specific config
│   ├── chicago.json                 # Next client
│   └── template.json                # Profile template
├── templates/
│   ├── executive_overview.py        # Reusable cover page builder
│   ├── bu_onepager.py               # Reusable BU one-pager builder
│   └── styles.py                    # Shared DOCX styling constants
├── services/
│   ├── evidence_extractor.py        # Mine transcripts for themes
│   ├── confidence_assessor.py       # Rate findings vs DD hypotheses
│   ├── hypothesis_validator.py      # DD prediction vs reality comparison
│   └── quote_organizer.py           # Organize quotes by BU + theme
├── models/
│   ├── bu_assessment.py             # BU data model
│   ├── dd_hypothesis.py             # DD hypothesis data model
│   └── evidence.py                  # Evidence/quote data model
└── tests/
    ├── test_evidence_extractor.py
    ├── test_confidence_assessor.py
    └── test_docx_generation.py
```

## Client Profile Schema (JSON)

```json
{
  "client_name": "Wealthspire Advisors",
  "engagement_date": "2026-02",
  "business_lines": [
    {
      "name": "Institutional",
      "subtitle": "Retirement Ops, TPA, ERISA, Performance, Middle Office",
      "sessions_count": "20+",
      "roles_count": 42,
      "transcript_dirs": ["institutional-*", "performance-analytics"],
      "dd_hypotheses": [...],
      "mining_patterns": ["manual", "automat", "outsourc", "Excel", "spreadsheet"]
    }
  ],
  "output_dir": "outputs/{client}/ceo-deliverable/",
  "style": {
    "primary_color": "#1B2A4A",
    "accent_color": "#2980B9"
  }
}
```

## Implementation Steps

### Phase 1: Extract and Templatize (from Wealthspire)
1. Move `generate_docx.py` styling into `templates/styles.py`
2. Extract `build_bu_onepager()` into `templates/bu_onepager.py`
3. Extract `build_executive_overview()` into `templates/executive_overview.py`
4. Create `models/` with data classes for BU assessment, DD hypothesis, evidence
5. Create `profiles/wealthspire.json` from current hardcoded data

### Phase 2: Build Services
6. Build `evidence_extractor.py` - automated transcript mining (currently manual grep)
7. Build `confidence_assessor.py` - rule-based confidence from evidence count + type
8. Build `hypothesis_validator.py` - DD vs reality comparison logic
9. Build `quote_organizer.py` - group quotes by BU and cross-cutting theme

### Phase 3: CLI and Testing
10. Build `generate_deliverable.py` CLI with --profile, --output, --dry-run
11. Write tests for each service
12. Run against Wealthspire data to validate output matches current deliverables

### Phase 4: Azure DevOps Integration
13. Create azure-pipelines.yml for CEO deliverable generation
14. Configure artifact publishing to Azure Blob Storage
15. Document in Blue Printing README

## Acceptance Criteria

### Functional
- [ ] `python generate_deliverable.py --profile wealthspire` produces 4 DOCX files matching current output
- [ ] Adding a new client requires only a new JSON profile + transcript data
- [ ] Evidence extraction runs automatically against transcript directories
- [ ] Confidence levels are computed from evidence (not manually assigned)

### Observability
- [ ] CLI outputs progress log (sessions scanned, quotes found, confidence levels)
- [ ] Dry-run mode shows what would be generated without creating files

### Documentation
- [ ] Profile schema documented with examples
- [ ] README explains how to create deliverable for new client
- [ ] Architecture diagram showing Stage 4 integration with Stages 1-3

## Artifacts
- CEODeliverable/ directory in Blue Printing repo
- azure-pipelines.yml for CI/CD
- Serena memory: retro-2026-02-04-ceo-deliverable-pipeline
- ChromaDB: retro-2026-02-04-ceo-pipeline-blueprint

## Notes
- Current `generate_docx.py` is ~80% reusable already -- main work is service extraction
- OrgInventory's JSON profile pattern is the model to follow
- ProductivityPipeline has 2 critical bugs (grouping + column mapping) that should be fixed separately
- The multi-agent AI council pattern (GPT + Gemma + Claude subagents) could also be proceduralized but is lower priority
