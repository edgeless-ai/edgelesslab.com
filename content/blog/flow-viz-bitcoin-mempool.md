---
slug: "flow-viz-bitcoin-mempool"
title: "Flow Viz: Watching the Bitcoin Mempool Breathe"
description: "Live transaction data becomes fluid particle simulation. Flow Viz turns the Bitcoin fee market into something you can watch with your eyes."
date: "2026-05-20"
tags:
  - "Field Notes"
  - "Creative Coding"
  - "Data Visualization"
  - "Bitcoin"
  - "p5.js"
readTime: "6 min"
editorial: true
---
# Flow Viz: Watching the Bitcoin Mempool Breathe

I keep building tools that make invisible systems visible. The pen plotter turns algorithms into ink on paper. Total Serialism turns music theory into 98 visual generators. Tartanism turns Scottish heritage into a 48-color computational palette. These are all field notes apps -- standalone HTML files you open in a browser, no build step, no dependencies, no server. Just the thing itself.

Flow Viz is the fourth. It turns live data streams into fluid particle visualizations. The first demo is the Bitcoin mempool.

---

## What the Mempool Actually Is

Every Bitcoin transaction starts in the mempool. It's a waiting room. Transactions sit there, unconfirmed, until a miner picks them up and includes them in a block. The mempool is not a single place -- every node maintains its own version -- but the aggregate state across the network tells you something real about demand for block space.

What makes the mempool interesting to visualize is the fee market. Transactions compete for inclusion by attaching fees. Higher fees get picked up faster. When the mempool is congested, fees spike. When a block is found, hundreds of transactions drain out simultaneously. The mempool fills, empties, fills again. It breathes.

The data source is mempool.space, which exposes a WebSocket API that pushes real-time transaction and block data. No API key needed. Connect, subscribe, and the data starts flowing.

---

## How Flow Viz Renders It

The visualization maps the fee market onto a fluid particle system built with p5.js. The mapping works like this:

**Fee buckets become gravitational wells.** The mempool.space API reports transactions grouped by fee rate -- how many sat/vB each transaction is willing to pay. Flow Viz maps each fee tier to a position on the canvas. Low-fee transactions drift toward the edges. High-fee transactions cluster near the center. The tiers act as attractors in a force field, pulling particles into orbits.

**Transactions become particles.** When a new transaction enters the mempool, a particle spawns. Its size maps to the transaction's weight in virtual bytes. A 250-vB standard transfer is a small dot. A 50,000-vB batch consolidation is a visible mass. The particle's color comes from the design system palette -- cyan for low fees, indigo for mid-range, violet for priority.

**Blocks drain the pool.** When a new block is found, the transactions it confirmed are removed from the mempool. In the visualization, the corresponding particles accelerate toward a drain point and disappear. A block confirmation looks like a sudden exhalation -- hundreds of particles streaming out of the field at once, leaving the remaining particles to settle into new equilibrium.

The fluid engine handles the physics: velocity, acceleration, drag, inter-particle repulsion to prevent overlap. Particles don't just sit at their attractor points. They orbit, jostle, drift. The system is always in motion because the data is always in motion.

---

## The Architecture

Flow Viz is built with a plugin architecture because the Bitcoin mempool is just the first data source. The system has three layers:

```
Data Source Adapter  -->  Event Bus  -->  Fluid Engine + Renderer
```

**Data source adapters** normalize external data into a common event format. The mempool adapter connects to the mempool.space WebSocket, parses transaction and block events, and emits normalized objects:

```javascript
{
  type: 'particle-add',
  id: txid,
  mass: vsize,
  tier: feeBucket,
  timestamp: Date.now()
}
```

```javascript
{
  type: 'drain',
  ids: [txid, txid, ...],  // confirmed in block
  blockHeight: 894201
}
```

**The event bus** decouples data ingestion from rendering. The adapter publishes events. The fluid engine subscribes. This means you can swap data sources without touching the renderer, or run the renderer with recorded data for testing. The bus also handles reconnection -- if the WebSocket drops, the adapter reconnects and the visualization continues with whatever state it has. No crash, no blank screen. Just a pause in new particles until the connection recovers.

**The fluid engine** manages the particle simulation. Each frame, it applies forces (gravitational attraction to fee tier wells, drag, inter-particle repulsion), integrates velocities, and updates positions. The renderer draws the result. The engine runs at 60fps independent of data arrival rate -- new data adds or removes particles, but the simulation is continuous.

The whole thing is a single HTML file. Open it in a browser. That's it.

---

## What You Actually See

When the mempool is calm -- say, a Sunday morning -- the particle field is sparse. Small clusters orbit their fee tier attractors lazily. The movement is slow, organic. You can watch individual particles drift.

When demand spikes -- a popular exchange does a batch withdrawal, or an NFT mint triggers a fee war -- the field floods with particles. The high-fee attractors pull hard. The low-fee tier empties as transactions resubmit with higher fees. The canvas gets dense and turbulent.

Then a block is found. The drain animation fires. Two hundred particles stream toward the exit. The field loosens. Remaining particles redistribute. For a few seconds, there's visible space in the field. Then new transactions start arriving and the cycle begins again.

The ten-minute block interval creates a natural rhythm. Accumulation, tension, release. It's genuinely compelling to watch during periods of high activity. You can see fee pressure building and resolving in a way that a chart of numbers never communicates.

---

## Why Standalone HTML

Every field notes app ships as a single HTML file. No npm install. No build step. No framework. Open the file, it works.

This is a deliberate constraint. The pen plotter app has 65 algorithms and 44,000 rendered specimens -- all in standalone HTML with LocalStorage for presets. Total Serialism runs 98 generative music algorithms the same way. Tartanism renders 48 tartan colorways with zero dependencies.

The constraint forces a certain kind of engineering. You can't reach for a state management library when you don't have a build step. You write vanilla JavaScript that manages its own state. You use the platform APIs -- Canvas, WebSocket, LocalStorage, requestAnimationFrame -- directly. The result is software that loads instantly, runs anywhere, and will still work in ten years because it depends on nothing except the browser.

For Flow Viz specifically, the standalone constraint means the WebSocket connection, the particle engine, the force simulation, the rendering pipeline, and the event bus all live in one file. It's about 1,200 lines of JavaScript. Not small, but comprehensible. You can read it top to bottom and understand every piece.

---

## Watch Systems Breathe

The thread connecting all four field notes apps is the same: take a system that operates invisibly and give it a visual body. Pen plotter algorithms make mathematical functions visible as ink. Total Serialism makes music theory visible as pattern. Tartanism makes cultural encoding visible as color. Flow Viz makes economic pressure visible as fluid motion.

There's a specific kind of understanding that comes from watching a system rather than querying it. A mempool fee chart tells you the current median fee is 14 sat/vB. The particle visualization tells you the mempool is calm, slowly accumulating, with a loose cluster in the mid-fee range and almost nothing in the priority tier. Same data, different comprehension. The chart answers a question. The visualization builds intuition.

I want to add more data sources -- network packet flows, container orchestration churn, API traffic patterns. Anything that has a natural rhythm of accumulation and release. The plugin architecture is ready for it. The fluid engine doesn't care where the particles come from.

For now, you can watch Bitcoin breathe.

---

**Related posts:**
- [From Algorithm to Ink: How We Turn Generative Code into Physical Art](/blog/generative-art-pen-plotter-pipeline)
- [We Built an Envelope Protocol to Stop Our AI Agents from Talking Forever](/blog/envelope-protocol-multi-agent-coordination)

---

*Edgeless Lab builds infrastructure for autonomous AI systems. And sometimes, tools for watching them.*
