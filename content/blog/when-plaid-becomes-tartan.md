---
slug: "when-plaid-becomes-tartan"
title: "When Does Generated Plaid Become Tartan?"
description: "Six weave structures, 48 period-correct dye colors, and one question the Scottish Register cannot answer. A field journal on building a generative tartan engine."
date: "2026-04-16"
tags:
  - "Generative Art"
  - "Creative Coding"
  - "Textiles"
  - "SVG"
readTime: "7 min"
editorial: true
productSlug: "gen-art-starter"
ctaHook: "10 generators, parameter guides, and the scoring rubric from 105+ experiments."
---
A tartan is thirty characters of notation and three centuries of someone wearing it. The notation is the part a machine can learn. The wearing is not.

I built a generator that produces tartans indistinguishable from registered ones. Thread count notation, warp-and-weft interlacement, period-correct dye palettes sourced from historical records. The Scottish Register of Tartans would accept the output, pending a clan petition and a two-year review.

The interesting question was never whether the machine could produce the right pixels. It was whether the result deserves the word.

## Thread Count Notation

Every tartan is defined by a thread count: a string like `B24 G4 B4 G4 B4 G24 R6` that specifies the sequence and width of colored stripes. The notation is mirrored (a "pivot" pattern) or repeated (a "half-sett"), and the same thread count defines both warp and weft.

This is a compression scheme invented before anyone called it that. Thirty characters encode a pattern that tiles infinitely. The generator reads this notation and builds a 2D grid of colored threads that interlace according to the selected weave structure.

The notation has a crucial property for generation: it is a formal grammar. You can enumerate valid thread counts algorithmically. Random generation that respects the structure produces patterns that look plausible, because the grammar itself constrains the output toward visual coherence.

## Weave Structures

A tartan is not a flat grid of colored squares. It is woven fabric, and the weave structure determines which threads pass over or under at each crossing. The simplest weave, 2/2 twill, produces the diagonal ribbing visible in most traditional tartans.

I implemented six weave structures: plain weave, 2/2 twill, herringbone, hopsack, satin, and broken twill. Each changes the visual texture dramatically. The same thread count rendered in herringbone versus satin looks like a different tartan entirely.

The implementation detail that surprised me: the weave matrix is just a repeating binary pattern applied to the crossing grid. Plain weave is a 2x2 matrix alternating 0 and 1. Twill is a 4x4 matrix with a diagonal. Satin is an 8x8 matrix with distributed crossing points. The entire visual difference between weave types reduces to which matrix you tile across the grid.

## The 48 Colors

Historical tartans use a restricted palette tied to natural dye sources available in the Scottish Highlands. Indigo for blue. Weld and broom for yellow. Cochineal and madder for red. Woad for dark blue. Lichens for purples and browns.

I compiled 48 period-correct colors from tartan reference books and the Scottish Tartans Authority database, organized into six families: Hunting (dark, muted), Dress (bright, formal), Government (military), Ancient (faded, weathered), Modern (vivid chemical dyes), and Muted (between ancient and modern).

The palette restriction turned out to be a design feature, not a limitation. Unrestricted color makes bad tartans. Three hundred years of textile tradition already solved the palette design problem. Using historically constrained colors means almost any generated thread count produces something that looks right.

## Where the Generator Breaks

The generator fails in specific, instructive ways.

Thread counts below four colors look like striped fabric, not tartan. The visual complexity of tartan requires at least four distinct threads interacting across the weave. Below that threshold, the eye reads "stripes" instead of "plaid."

Very high complexity (12+ stripe colors) produces visual noise. The pattern becomes too dense for the eye to track the repeat. Traditional tartans rarely exceed 8 distinct colors, and the best ones use 4-6.

Scale interacts with weave structure non-obviously. A herringbone weave needs wider stripes than a plain weave to read correctly, because the diagonal disruption breaks up narrow stripes into visual static. The generator adjusts scale per weave type, but the mapping was found empirically, not derived.

## SVG Export and Physical Output

The generator exports SVG with individual threads rendered as separate elements. This matters for pen plotters: each thread becomes a stroke, and the weave determines which strokes are drawn on top. The SVG layering matches the physical over-under pattern of the fabric.

Plotted tartans have a quality that screen renderings cannot match. The slight variation in ink density where threads cross, the way the pen catches differently on warp versus weft strokes, the physical texture of layered ink. A plotted tartan at close range looks more like woven cloth than a digital rendering does.

## The Question

The Scottish Tartans Authority maintains a register of over 7,000 tartans. Registration requires a name, a thread count, a sponsoring body (usually a clan), and a two-year public comment period.

The generator produces thread counts that are structurally identical to registered tartans. The weave is authentic. The dye palette is period-correct. The only thing missing is three hundred years of someone wearing it.

At what point does generated plaid become tartan? I do not have an answer. But the question is worth a field journal, and the [full editorial with interactive generator](/tartanism/) is the journal.
