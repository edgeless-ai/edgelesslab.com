# Pricing Decision Worksheet

Answer these questions for your product, then use the decision matrix to find your price tier.

---

## Product Details

**Product name:** ___

**One-sentence description:** ___

**Primary deliverable type:**
- [ ] Template(s) / config file(s)
- [ ] Code boilerplate / starter kit
- [ ] Guide + supporting files
- [ ] Design assets / system components
- [ ] Workflow automation / scripts
- [ ] Other: ___

---

## Key Questions

### 1. Time-to-value
How long does it take the buyer to get value after unzipping?

- [ ] Under 5 minutes (drop-in file)
- [ ] 5-30 minutes (some customization needed)
- [ ] 30-60 minutes (guide reading + setup)
- [ ] Over 1 hour

### 2. File count and depth
How many distinct deliverable files (excluding README/CHANGELOG)?

- [ ] 1-3 files
- [ ] 4-8 files
- [ ] 9-15 files
- [ ] 16+ files

### 3. Time saved for the buyer
How long would it take the buyer to build this from scratch?

- [ ] 1-2 hours
- [ ] 3-8 hours (half day to full day)
- [ ] 1-2 full days
- [ ] A week or more

### 4. Specificity
How narrow is the problem this solves?

- [ ] Very narrow (one tool, one config, one scenario)
- [ ] Moderate (one workflow, multiple files)
- [ ] Broad (full system or multi-tool setup)

### 5. Competition
What else is available for free or paid?

- [ ] Nothing comparable exists
- [ ] Free alternatives exist but are incomplete or outdated
- [ ] Paid alternatives exist at a higher price
- [ ] Paid alternatives exist at a similar price

### 6. Your audience
Who is buying this?

- [ ] Hobbyist developers / students
- [ ] Professional developers / engineers
- [ ] Team leads / managers making tool decisions
- [ ] Non-technical creators

---

## Decision Matrix

| Factor | Points toward $9 | Points toward $19 | Points toward $29-39 |
|--------|------------------|--------------------|----------------------|
| Time-to-value | Under 5 min | 5-30 min | 30-60 min |
| File count | 1-3 | 4-8 | 9+ |
| Time saved | 1-2 hours | 3-8 hours | 1+ days |
| Specificity | Very narrow | Moderate | Broad |
| Competition | Free alternatives exist | Free but incomplete | Nothing comparable |
| Audience | Hobbyists | Professional devs | Team leads |

**Count where most of your answers cluster. That is your tier.**

---

## Your Decision

**Tier:** $___

**Reasoning (2-3 sentences):**
> ___

**Will you offer multiple tiers?**
- [ ] No, single tier at $___
- [ ] Yes, 2 tiers: Entry ($___) and Standard ($___) 
- [ ] Yes, 3 tiers: Entry ($___), Standard ($___), Premium ($___)

**Tier differentiation (if applicable):**
- Entry: ___
- Standard: ___
- Premium: ___

---

## Worked Example

**Product:** API Boilerplate Kit (Express + TypeScript)

| Question | Answer |
|----------|--------|
| Time-to-value | 15 min (clone, npm install, configure .env) |
| File count | 11 files (routes, middleware, configs, tests) |
| Time saved | 6-8 hours |
| Specificity | Moderate (one framework, full setup) |
| Competition | Free boilerplates exist but lack auth, rate limiting, error handling |
| Audience | Professional developers |

**Cluster:** Most answers point to $19-$29.

**Decision:** $24 single tier. The file count and time saved justify mid-range pricing. A second tier at $29 could include a deploy-to-AWS guide, but I will wait for buyer feedback before adding it. No $39 tier because the scope is one framework, not a multi-framework system.

**Reasoning:** Professional developers earning $75+/hour will not hesitate at $24 for something that saves 6+ hours. The free alternatives lack the production-readiness features (auth, rate limiting, structured error handling) that make this worth paying for.
