# PreText Phase 4 -- componentization and rules

Goal:
If earlier phases win clearly, turn PreText into a bounded design-system capability.

Potential components:
- EditorialHero
- WrappedNarrativeBlock
- RichInlineFlow
- BalancedHeadlineAdvanced

Rules to define:
- where PreText is allowed
- where CSS must be preferred
- fallback behavior without JS
- breakpoint handling
- accessibility guardrails
- performance guardrails

Actions:
1. Write component rules.
2. Define API boundaries for each approved component.
3. Document fallback behavior.
4. Add usage examples and anti-patterns.
5. Decide whether PreText remains experimental or becomes standard.

Deliverables:
- component and rules document
- approved component list
- anti-pattern list
- final recommendation on long-term adoption

Acceptance criteria:
- PreText usage is bounded and intentional
- fallback behavior is clear
- the site does not become dependent on PreText for ordinary layout

Decision gate:
If there are fewer than two strong wins from earlier phases, keep PreText experimental only.
