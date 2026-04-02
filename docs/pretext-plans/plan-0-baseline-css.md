# PreText Phase 0 -- baseline CSS polish

Goal:
Establish the best non-PreText baseline so we know where PreText actually adds value.

Target surfaces:
- homepage hero headline
- section intro headlines
- product cards
- lab cards
- longer intro paragraphs

Actions:
1. Apply text-wrap: balance to hero and section headlines where supported.
2. Apply text-wrap: pretty to longer intro copy where it improves rag quality.
3. Tighten card spacing and use line-clamp for teaser text where appropriate.
4. Audit ugly wraps, dead zones, and weak vertical rhythm across breakpoints.
5. Capture before/after screenshots for desktop and mobile.

Deliverables:
- short CSS improvement note
- screenshot comparison set
- list of places where CSS alone is good enough
- list of places where CSS still feels constrained

Acceptance criteria:
- obvious wrapping problems are materially improved
- card scanability improves without JS layout logic
- there is a clear list of unresolved layout opportunities

Decision gate:
If CSS solves the problem cleanly, do not force PreText into that surface.
