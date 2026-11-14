---
slug: studio-notes-correctness-before-speed
title: "Studio Notes: Correctness Before Speed"
description: "Seven source-described studio notes on correctness, generative work, and print preparation, followed by a proposed typographic tolerance-sheet experiment that has not been physically tested."
date: '2026-11-01'
tags:
- Studio Notes
- Generative Art
- Typography
- Print
readTime: 5 min
editorial: true
---
The rendering post by Matt DesLauriers names correctness and print workflows as priorities; the Glyph Drawing Club guide describes preparing files for print. That is this week's thread: generating something is not the same as deciding it is ready to leave the screen. The output needs an acceptance rule, not another adjective.

## Brian Eno's 'The Ship' - A Generative Film (2016)

[Source](http://naotokui.net/projects/brian-eno-the-ship/)

The title calls Brian Eno's 'The Ship' a generative film. Use that designation as a demand on your own documentation: name what can vary and what must remain fixed. 'Generative' is a category, not an explanation of your decisions.

## SPACE TYPE GENERATOR

[Source](https://spacetypegenerator.com/)

The description identifies SPACE TYPE GENERATOR as a kinetic type generator from kielm. For a maker, the useful assignment is to define a typographic parameter precisely enough to compare two settings. Keep the parameter change accountable; don't let the tool's category stand in for a concept.

## Tweet by @_danlever

[Source](https://twitter.com/_danlever/status/1617853361822498816)

The caption supplies 'Day 24 — Textile' and creative-coding tags. A numbered prompt gives production a boundary: finish a response, record the rule, move on. Treat 'Textile' as the stated brief, not evidence of a material or construction method.

## Dev Valladares on Instagram: 'Machine-Learning + typography!! …'

[Source](https://www.instagram.com/p/CNO016hJuut/)

Dev Valladares's caption dates the machine-learning-and-typography work to a May 2020 thesis launch video and adds, 'Learnt a lot since then.' Keep that admission in the studio archive. A dated experiment is more useful than a portfolio that pretends every decision remains your final position.

## Matt DesLauriers on X @mattdesl

[Source](https://x.com/mattdesl/status/2070470499772080512?s=46&t=RVhjef0w0e9lRruybcGtTg)

DesLauriers's post says the Rust+WASM rendering engine is 'not yet the fastest' and names correctness, flexibility and print workflows as goals. For this assignment, put correctness before speed: define a correct output before optimizing its delivery. The caption's performance and image-quality claims are specifications to test, not results verified here.

## Tweet by @mccoyspace

[Source](https://x.com/mccoyspace/status/2038835924059271354?s=20)

Kevin McCoy's announcement describes autocritic as an open-source system using classic art theory to evaluate images and steer generative systems. Before borrowing that premise, write down which judgments you would delegate and which you would refuse. An evaluation criterion becomes a production constraint when it steers the next output.

## How to clean up your glyph drawing in Adobe Illustrator

[Source](https://blog.glyphdrawing.club/how-to-clean-up-your-glyph-drawing-in-adobe-illustrator/)

The description of 'How to clean up your glyph drawing in Adobe Illustrator' explicitly concerns print-ready files from Glyph Drawing Club. Put file preparation inside the creative brief, with its own acceptance test. Otherwise 'finished' means only that you stopped looking at the screen.

## Remix prompt

Proposed experiment, not physically tested. David: make a typographic tolerance sheet, taking SPACE TYPE GENERATOR as the source-described typographic-generator reference and How to clean up your glyph drawing in Adobe Illustrator as the source-described print-preparation reference. These are conceptual references, not instructions attributed to either source. The assignment is to test whether a precisely specified change survives physical output.

1. Use A4 portrait paper, 210 × 297 mm, and one black 0.3 mm plotting pen on uncoated paper. Set the origin at the lower-left corner; all coordinates are in millimetres. Permit pen-down coordinates only within x = 15–195 and y = 15–282.
2. Arrange six columns and four rows, with c = 0 through 5 and r = 0 through 3. Set each glyph's anchor to (x, y) = (25 + 30c, 40 + 60r).
3. Construct a skeletal E from four separate straight segments: spine from (x, y) to (x, y + 32); bottom bar from (x, y) to (x + 14, y); top bar from (x, y + 32) to (x + 14, y + 32); middle bar from (x, y + 16) to (x + L, y + 16).
4. For even c, set L = 14.00 mm. For odd c, set L = 13.58 mm: 14.00 × 0.97, exactly 3% shorter. Change nothing else. Columns (0, 1), (2, 3) and (4, 5) form three control/test pairs per row, giving 12 pairs total.
5. Before plotting, check that the file contains 24 glyphs and 96 segments, with actual extents x = 25–189 and y = 40–252, entirely inside the permitted rectangle. Traverse rows in ascending r, then columns in ascending c; draw spine, bottom, top and middle in that order, lifting the pen between segments. Use no fills or retracing passes.
6. Stop after the 96th segment; abort rather than clip if any coordinate fails the bounds check. Record whether David can distinguish the shortened middle bars on paper, then record any visible output defects separately. Do not assume the 0.42 mm difference will be perceptible or that touching strokes will physically merge. The ritual is the work: keep the parameter sheet beside the plotted result.

## Question

What counts as a failed output when the coordinates are correct but the intended difference cannot be seen?
