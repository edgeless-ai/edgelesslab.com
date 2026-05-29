---
slug: "35000-specimens-computational-aesthetics"
title: "35,000 Specimens: What We Learned About Computational Aesthetics"
description: "A data-driven analysis of 41,572 algorithmic artworks, their scores, and what they reveal about the nature of machine-generated beauty."
date: "2026-05-16"
tags:
  - "Generative Art"
  - "Pen Plotter"
  - "Computational Aesthetics"
  - "Data Analysis"
readTime: "8 min"
editorial: true
---

*A data-driven analysis of 41,572 algorithmic artworks, their scores, and what they reveal about the nature of machine-generated beauty.*

---

## The Numbers

Over six weeks, Edgeless Lab's generative art platform produced **41,572 unique specimens** across **187 distinct algorithmic factories**. Each specimen was evaluated by an automated scoring system measuring seven dimensions: ink coverage, line complexity, composition, entropy, uniqueness, feasibility, and an overall composite score from 0-100.

The results tell a striking story about the difficulty of algorithmic excellence:

| Metric | Value |
|--------|-------|
| Total Specimens | 41,572 |
| Unique Factories | 187 |
| Mean Score | 64.9 |
| Score Ceiling | **89.1** |
| Specimens >= 80 | **721** (1.7%) |
| Specimens >= 85 | **16** (0.04%) |

The ceiling of 89.1 is revealing. Despite exploring 187 different algorithmic approaches, our system has not produced a single specimen scoring 90+. This isn't a calibration issue -- it's a fundamental property of the current scoring architecture. The 721 specimens that scored 80+ represent a mere 1.7% success rate. Achieving 85+ is a 1-in-2,600 event.

This is the **aesthetic scarcity problem** in computational art: when you automate generation at scale, excellence doesn't become more common -- it reveals itself as statistically rare by design.

---

## What Scores High, and Why

The top-performing factories paint a clear picture of what our scoring system values:

| Factory | High Scorers (>=80) | % of Total High Scorers |
|---------|-------------------|------------------------|
| moire | 213 | 29.5% |
| rayscape | 197 | 27.3% |
| hatchcolor | 149 | 20.7% |
| hatching | 69 | 9.6% |
| squiggle | 22 | 3.1% |
| optic | 16 | 2.2% |
| lewitt | 16 | 2.2% |

Three factories -- moire, rayscape, and hatchcolor -- account for 77.5% of all high-scoring specimens. This concentration suggests that certain algorithmic structures are fundamentally more amenable to aesthetic scoring than others.

### What these factories share

1. **Controlled complexity**: They operate in the narrow band between chaos and order. Too simple = boring. Too complex = unreadable. The sweet spot requires precision tuning.

2. **Emergent pattern**: The high-scoring specimens often contain patterns that are not explicitly coded but arise from the interaction of simple rules. The moire factory's interference patterns, rayscape's angular convergence, and hatchcolor's layered color interactions all produce visual depth without explicit depth algorithms.

3. **Ink efficiency**: High scorers tend to use 30-60% of the page's ink. Below 20% feels empty; above 70% feels muddy. The scoring system rewards density without clutter.

4. **Scale independence**: The best specimens work at multiple scales. They look coherent as a thumbnail and reveal new detail when zoomed. This is a proxy for the "good composition" metric that human curators value.

---

## The Scoring Ceiling

Why 89.1 and not higher? The scoring system is not capped at 90. The 89.1 is an empirical ceiling -- the best our current 187 factories have achieved. This is important because it suggests two things:

**First**, the ceiling is not a bug. It is a feature of the current algorithmic space. Our 187 factories are not random -- they are the result of deliberate curation, community contribution, and systematic exploration. The fact that the ceiling has held steady for 10,000+ specimens suggests we are near the top of this particular hill.

**Second**, the path to 90+ probably requires a new algorithmic paradigm, not more tuning of existing factories. The factories that cluster near 80-85 are all variations on the same structural themes (interference, layering, hatching). A 90+ specimen might require a fundamentally different approach -- perhaps one that introduces temporal or interactive elements, or one that combines multiple factory types in a single composition.

---

## What This Means for Generative Art Practice

1. **Quality does not scale linearly with quantity.** Our 41,572 specimens did not produce proportionally more high scorers than our first 10,000. The high-scorer rate stayed flat at ~1.7%. This means the production pipeline is the easy part. The curation pipeline is the hard part.

2. **Algorithmic diversity matters more than parameter tuning.** We spent weeks tuning individual factories. The returns were marginal. The biggest gains came from adding new factory types, not from optimizing existing ones.

3. **The scoring system is a design tool, not just a filter.** The seven metrics (ink coverage, line complexity, composition, entropy, uniqueness, feasibility, overall) give us a language for talking about why one specimen works and another doesn't. This is more valuable than the binary pass/fail of the threshold.

4. **The gap between 85 and 90 is the hardest.** The 721 specimens at 80+ are good. The 16 at 85+ are exceptional. The jump from 85 to 90 is larger than the jump from 70 to 85. This is the "final mile" problem of computational aesthetics.

---

## Next Steps

We are exploring three paths to break the ceiling:

1. **Hybrid factories**: Combining the top 3 factory types (moire, rayscape, hatchcolor) in single compositions.
2. **Human-in-the-loop curation**: Using the scoring system as a pre-filter, then applying human judgment to the top 5% to find the hidden gems.
3. **Temporal extension**: Adding animation or time-based parameters to see if the scoring ceiling changes when the medium is not static.

The 89.1 ceiling is not a failure. It is a map. It tells us where the current algorithmic space ends and where the next one begins.

---

*Edgeless Lab runs a generative art platform for pen plotter and computational art. Our scoring system is open-source and documented at [edgelesslab.com/pen-plotter](https://edgelesslab.com/pen-plotter).*
