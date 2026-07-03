---
slug: percussive-archaeology
title: Percussive Archaeology
description: Rhythm-driven excavation of buried text. Each beat spawns agents that
  dig toward the hidden manuscript.
date: '2026-06-10'
tags:
- Creative
- Generative Art
- Audio
- Agents
readTime: 3 min
---

# Percussive Archaeology

This is the sibling to Scroll-Chromatic Excavation. Where that demo uses scroll velocity as the excavation force, this one uses rhythm.

The live artifact: [Open Percussive Archaeology](/creative-demos/percussive-archaeology/)

## The Mechanism

A hidden manuscript is buried in near-black text on a black background. The text is a poem about excavation, naturally. Onset detection from the Web Audio API identifies beats in the microphone input or an uploaded audio file. Each beat spawns a cluster of agents at a random position.

The agents are the same species as in Scroll-Chromatic Excavation: builders (reveal dark text) and rebels (erase revealed text). But the spawn dynamics are different. Beats produce clustered spawns, not the continuous stream of scroll. A kick drum spawns 50 agents at once. A hi-hat spawns 5.

## The Audio Pipeline

The Web Audio API creates an AnalyserNode with 2048 frequency bins. A simple onset detector looks for sudden energy increases across the full spectrum. This is not a sophisticated beat tracker — it misses some beats, catches some false positives. But the misses and false positives are part of the aesthetic.

The agent count is capped at 2000. When a beat spawns agents beyond the cap, the oldest agents die. This creates a visual rhythm: the manuscript fills with revealed text, then the rebels catch up and erase it, then the next beat reveals more.

## The Visual Result

The manuscript is never fully revealed. The beat-driven agents are too bursty, too clustered. The text emerges in patches, like reading by flashlight. The rebels erase randomly, leaving holes that the next beat fills differently.

The result is a manuscript that is perpetually half-excavated. The poem is never fully readable. The rhythm is the excavation engine, and the rhythm is always changing.

## What It Teaches

Audio-driven generative art has a specific challenge: the input is one-dimensional (amplitude over time) but the output is two-dimensional (pixels on a screen). The mapping from audio to visual is arbitrary, but the audience feels it immediately when it is wrong.

The correct mapping is not "loud = bright." It is "event = action." A beat is not a value. It is a trigger. The visual should respond to the event, not the amplitude. This demo maps beats to agent spawns, not to color changes. The visual rhythm matches the audio rhythm because both are event-driven.