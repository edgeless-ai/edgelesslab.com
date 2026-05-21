---
title: "Agent-Based Swarm Systems"
description: "Multi-agent flocking, ant colonies, and slime mold simulations producing emergent visual complexity."
date: 2026-04-17
tags: ["generative-art", "agents", "swarm", "boids"]
---

Multi-agent systems produce complexity through simple rules executed by many autonomous agents. No central controller directs the outcome—patterns emerge from local interactions.

## Boids Flocking

Craig Reynolds' three rules produce convincing flocking behavior:
1. **Separation**: steer to avoid crowding
2. **Alignment**: steer toward average heading of neighbors
3. **Cohesion**: steer toward average position of neighbors

## Slime Mold (Physarum)

The single-celled *Physarum polycephalum* can solve maze problems and build efficient networks. Digital simulations use:
- Trail deposition (agents leave pheromone trails)
- Trail following (agents sense and follow trails)
- Decay (trails evaporate over time)

This produces network structures resembling Tokyo rail systems—emergent optimization without central planning.

## Stigmergy

Indirect coordination through environment modification. Agents modify the environment, and subsequent agents respond to those modifications. Wikipedia, ant trails, and open-source development all exhibit stigmergic behavior.
