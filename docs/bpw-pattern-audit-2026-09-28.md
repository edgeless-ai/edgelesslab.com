# “Badass personal website” pattern audit

Audited: 2026-09-28

Reference: interaction and information-architecture patterns observed on bellapivo.com, bella.garden, and cos.bellapivo.com. This implementation adapts patterns only; it does not reuse Bella Pivo’s copy, imagery, or code.

## What already exists

Edgeless Lab already has a strong visual system, a specific first-person point of view, public Field Notes, live browser studies, case studies, and a service enquiry path. The missing layer was connective tissue: a visitor could see separate outputs, but not quickly understand what is live, how the work relates, or which contact path fits their intent.

## Pattern audit

| Pattern | Current state before this change | Gap | Effort | Expected impact | Decision |
|---|---|---|:---:|---|---|
| Confrontational hero, rotating keyword, social proof above fold | Strong editorial hero and a live generative artifact; no rotating keyword or compact proof line | The prior niche statement named three broad domains rather than the problem David is hired to solve | S–M | High: faster positioning and stronger first-screen comprehension | Refine the niche sentence now; defer rotating copy until there is evidence it improves comprehension |
| Polished / unfiltered “flip the switch” | Dark/light theme exists, but it changes palette rather than editorial voice | A second content mode would double copy maintenance and risks feeling performative | L | Medium: memorable, but not clearly useful for this studio | Defer |
| Draggable “what I build” cards linked to live work | Static case-study cards existed lower on the homepage | Visitors could not distinguish a live artifact from a case study or source | M | High: demonstrates working output instead of listing services | **Ship** |
| “How it all connects” project map / digital garden | Projects, Field Notes, live studies, and the shop existed as separate navigation destinations | No concise explanation of the studio’s observe → systematize → play → materialize loop | M | High: turns a mixed portfolio into one legible practice | **Ship** |
| Topic explorer with questions that show how the author thinks | Blog and Field Notes expose thinking through finished pieces | No question-first browsing surface | M | Medium: good archive discovery, but needs a maintained question taxonomy | Defer pending archive taxonomy |
| “Deal me one” random archive card | Search and curated recent posts exist | No serendipitous archive entry point | S | Medium-low: delightful but less useful than clarifying current work and contact paths | Backlog candidate |
| Interactive media kit with animated numbers | About, project counts, and status labels exist | No press-ready facts or downloadable assets | M | Medium: valuable after press demand is demonstrated | Defer |
| Contact index by intent | About page had generic Work / GitHub / Email links; service page had one scoped mail path | Speaking, partnerships, commissions, and systems work all collapsed into generic email | S | High: fewer decisions and better enquiries without publishing rates | **Ship** |

## Top-three selection

Selected by expected impact divided by implementation and maintenance cost:

1. **Live workbench cards** — uses real existing case studies, field reports, live artifacts, and the public Edgeless Stack repository. Cards are draggable at desktop widths and become a normal, no-overflow stack on mobile.
2. **Connections map** — uses real site routes to explain how Field Notes, agent systems, live studies, and physical editions form one loop. It is static-export compatible and needs no backend.
3. **Contact index by intent** — routes private-AI builds to the existing scoped service page and pre-fills email subjects for creative commissions, speaking/workshops, and press/partnership enquiries. No rates are published.

## Consultant-positioning checklist

- **One-line niche above the fold:** improved to “I design resilient AI agent infrastructure and generative systems that survive contact with reality.”
- **No public rate card:** preserved; the homepage explicitly asks for the constraint before a scope is proposed.
- **Sell the person and expertise, not a service list:** preserved through first-person framing, evidence, field reports, and live artifacts. The contact routes are intent-based rather than package-based.

## Source integrity

Customer-facing links and claims come from repository-owned site data and existing exported routes:

- Project case studies: `src/lib/data.ts`
- Field Notes index and live study routes: `src/lib/field-notes.server.ts`, `src/lib/creative-demos.ts`
- Live static artifacts: `/pen-plotter/`, `/total-serialism/app/`, `/tartanism/app/`
- Public source repository already referenced in product data: `https://github.com/edgeless-ai/edgeless-stack`
- Contact address already used by the About, Terms, and service pages: `david@edgelesslab.com`
