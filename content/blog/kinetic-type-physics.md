---
slug: kinetic-type-physics
title: Kinetic Type Physics
description: Physics-driven typography where letters have mass, velocity, and collision.
  Mouse repulsion and gravity well.
date: '2026-06-10'
tags:
- Creative
- Generative Art
- Physics
- Typography
readTime: 3 min
---

# Kinetic Type Physics

Typography is usually static. Letters are placed, aligned, and left alone. This demo treats each letter as a physical body with mass, velocity, and collision.

See it live: [Kinetic Type Physics](/creative-demos/kinetic-type-physics/) — push the letters around with your cursor and watch the word fight to reassemble.

## The Physics Engine

Each letter is a rectangle with mass proportional to its area. The physics is Verlet integration: position, previous position, and implicit velocity. Forces include:

- **Gravity**: a constant downward force
- **Mouse repulsion**: the cursor pushes letters away with inverse-square falloff
- **Spring force**: each letter is connected to its original position by a spring, pulling it back toward the word
- **Collision**: circle-circle collision with restitution 0.7

## The Typography

The word is "PHYSICS" in a bold sans-serif. Each letter starts at its correct position, then gravity pulls it down. The spring force pulls it back up. The mouse repulsion disturbs the equilibrium. The collision keeps letters from overlapping.

The result is a word that is always trying to be a word but is constantly disturbed. Letters bounce off each other, slide past each other, and occasionally get stuck. The word is legible but restless.

## The Design Decision

The spring force is critical. Without it, the letters would fall and scatter. With it, they return to the word but with memory of their disturbance. The spring constant is tuned so that the return is slow, not immediate. The word reassembles over seconds, not frames.

The color is monochrome: black letters on white, with a subtle gray trail showing each letter's recent path. The trail is not a motion blur. It is a deliberate record of the letter's recent positions.

## What It Teaches

Physics-driven typography is not about realism. It is about giving text a material presence. The audience knows that letters are not physical. But when they behave physically, the text feels more present, more tangible. The physics is not accurate. It is expressive.

The lesson: use physics as a metaphor, not a simulation. The goal is not to simulate real bodies. It is to give abstract text a sense of weight and resistance.

More studies like this live in [the creative demos collection](/blog/creative-demos-collection/).