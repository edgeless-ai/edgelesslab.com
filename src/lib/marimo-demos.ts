export interface MarimoDemo {
  slug: string;
  title: string;
  description: string;
  category: "Finance/GPU" | "Generative" | "Algorithms" | "Reactive" | "Research";
  tags: string[];
}

export const marimoDemos: MarimoDemo[] = [
  // Finance/GPU
  {
    slug: "option-pricing-gpu",
    title: "GPU Option Pricing Monte Carlo",
    description:
      "Monte Carlo option pricing accelerated on the GPU. Adjust strike, volatility, and path count, watch the pricing surface converge in real time.",
    category: "Finance/GPU",
    tags: ["Monte Carlo", "Options", "GPU"],
  },
  {
    slug: "portfolio-optimizer-gpu",
    title: "GPU Portfolio Optimizer",
    description:
      "Mean-variance portfolio optimization with GPU-accelerated matrix ops. Drag risk tolerance and watch the efficient frontier redraw live.",
    category: "Finance/GPU",
    tags: ["Portfolio Theory", "Optimization", "GPU"],
  },

  // Generative
  {
    slug: "3d-generative-forms",
    title: "3D Generative Forms",
    description:
      "Parametric 3D forms generated from reactive sliders — rotate, warp, and re-seed the geometry without touching a render pipeline.",
    category: "Generative",
    tags: ["3D", "Parametric", "Generative Art"],
  },
  {
    slug: "gaussian-sketch",
    title: "Gaussian Sketch Lab",
    description:
      "Sketch with layered 2D Gaussians — position, covariance, and color all become live, reactive parameters instead of pixels.",
    category: "Generative",
    tags: ["Gaussians", "Sketching", "Reactive"],
  },
  {
    slug: "gray-scott-pde",
    title: "Gray-Scott Reaction-Diffusion",
    description:
      "An interactive explainer for the Gray-Scott PDE — the same reaction-diffusion system behind the Field Notes plotter pieces, stepped live in the browser.",
    category: "Generative",
    tags: ["PDE", "Reaction-Diffusion", "Simulation"],
  },

  // Algorithms
  {
    slug: "algorithm-whiteboard",
    title: "Algorithm Whiteboard — Binary Search",
    description:
      "Binary search traced step by step on a live number line. Every comparison is drawn as it happens, no pseudocode required.",
    category: "Algorithms",
    tags: ["Binary Search", "Teaching", "Whiteboard"],
  },
  {
    slug: "bandit-canvas",
    title: "Bandit Decision Canvas",
    description:
      "A multi-armed bandit rendered as a live decision canvas — pull arms, watch reward estimates and confidence bounds update in place.",
    category: "Algorithms",
    tags: ["Multi-Armed Bandit", "Decision Theory", "Interactive"],
  },
  {
    slug: "bandit-strategies",
    title: "Bandit Strategy Comparison",
    description:
      "Epsilon-greedy, UCB, and Thompson sampling racing side by side on the same bandit problem — regret curves update as they run.",
    category: "Algorithms",
    tags: ["Multi-Armed Bandit", "Reinforcement Learning", "Comparison"],
  },
  {
    slug: "labyrinth-walk",
    title: "Labyrinth Walk Explainer",
    description:
      "A random walk through a generated labyrinth, with each step's transition probabilities laid out directly on the maze.",
    category: "Algorithms",
    tags: ["Random Walk", "Maze", "Teaching"],
  },
  {
    slug: "tsp-whiteboard",
    title: "TSP + Excalidraw Whiteboard",
    description:
      "Sketch cities on an Excalidraw-style whiteboard and watch nearest-neighbor and 2-opt tours solve the traveling salesman problem live.",
    category: "Algorithms",
    tags: ["TSP", "Optimization", "Whiteboard"],
  },

  // Reactive (overnight expansion 2026-07-05)
  {
    slug: "reactive-wave-demo",
    title: "Reactive Wave Demo",
    description:
      "Auto-animated superposition of N sine waves with a live phase-vector circle plot — marimo's reactive state model doing the animation loop.",
    category: "Reactive",
    tags: ["Signal Processing", "Animation", "Teaching"],
  },
  {
    slug: "gaussian-probability",
    title: "Gaussian Probability Explorer",
    description:
      "An auto-playing Gaussian PDF/CDF viewer where mean and sigma trace parametric paths — circles, spirals, Lissajous — with a live parameter-space trajectory.",
    category: "Reactive",
    tags: ["Statistics", "Generative Art", "Teaching"],
  },
  {
    slug: "gaussian-path-explorer",
    title: "Gaussian Path Explorer",
    description:
      "A 2D animated path navigator — seven path shapes with play, reset, and manual override — whose position drives a live Gaussian PDF and parameter trace.",
    category: "Reactive",
    tags: ["Statistics", "Animation", "Interactive"],
  },

  // Algorithms (overnight expansion)
  {
    slug: "tsp-nearest-neighbor",
    title: "TSP: The Slider That Closes the Loop",
    description:
      "A nearest-neighbor traveling-salesman tour over twelve random cities, scrubbed step by step with a slider — path-so-far and distance stats update live.",
    category: "Algorithms",
    tags: ["TSP", "Optimization", "Teaching"],
  },

  // Research explainers (overnight expansion)
  {
    slug: "routerarena-scoring",
    title: "RouterArena Score Simulation",
    description:
      "How a single composite benchmark score can hide capability gaps — simulate aggregate vs per-difficulty-band scoring on an LLM-routing benchmark.",
    category: "Research",
    tags: ["LLM Routing", "Benchmarking"],
  },
  {
    slug: "ppl-diff",
    title: "PPL-Diff: When Finetuned Models Overgeneralize",
    description:
      "Perplexity-difference detection between finetuned and reference models, simulated live — why the metric is simple but noisy.",
    category: "Research",
    tags: ["LLM Evaluation", "Finetuning"],
  },
  {
    slug: "contextforge-budget",
    title: "ContextForge: Context Budget vs Full Replay",
    description:
      "Slider-driven comparison of naive full-context replay against a fixed context-recycling budget — accuracy and cumulative token cost over a long conversation.",
    category: "Research",
    tags: ["Long Context", "LLM Cost"],
  },
  {
    slug: "ttt-memory-claims",
    title: "Beyond Perplexity: Behavioral Memory in TTT",
    description:
      "Does test-time-training's perplexity gain reflect genuine behavioral memory? Probe the claim with a support-length slider.",
    category: "Research",
    tags: ["Test-Time Training", "LLM Evaluation"],
  },
  {
    slug: "kimi-k1-5-context",
    title: "Kimi K1.5 — Long Context as Search Space",
    description:
      "The reasoning-token budget trade-off behind Kimi K1.5's long2short distillation — optimal context budget vs answer quality, simulated.",
    category: "Research",
    tags: ["Reasoning", "Distillation"],
  },
  {
    slug: "verifier-guided-decoding",
    title: "Best-of-N + Verifier-Guided Decoding",
    description:
      "Expected total generation cost per successful sample under verifier-guided backtracking versus plain best-of-N sampling.",
    category: "Research",
    tags: ["Decoding", "LLM Cost"],
  },
  {
    slug: "wayfinder-router",
    title: "Deterministic vs Learned Router Economics",
    description:
      "A rule-based deterministic router against a learned router across synthetic workloads — local vs hosted cost trade-offs, visualized.",
    category: "Research",
    tags: ["LLM Routing", "Economics"],
  },
  {
    slug: "persona-belief-probes",
    title: "Roleplaying Persona Belief Probes",
    description:
      "An intervention spectrum for probing whether roleplaying LLM personas hold genuine internal beliefs or surface mimicry.",
    category: "Research",
    tags: ["Interpretability", "Roleplay"],
  },
  {
    slug: "adaptrack-decoding",
    title: "AdapTrack: Constrained Decoding Without Distortion",
    description:
      "How naive grammar constraints distort model intent during constrained decoding — and how adaptive tracking avoids it.",
    category: "Research",
    tags: ["Constrained Decoding", "Interpretability"],
  },

  // Reactive
  {
    slug: "curve-editor",
    title: "Curve Editor Lab",
    description:
      "A reactive Bezier curve editor — drag control points and every downstream cell (arc length, curvature, tangents) recomputes instantly.",
    category: "Reactive",
    tags: ["Bezier", "Curves", "Reactive Widgets"],
  },
  {
    slug: "reactive-animation",
    title: "Reactive Animation",
    description:
      "A minimal demo of marimo's reactive dataflow driving a live animation loop — change one cell, watch the whole graph re-run downstream.",
    category: "Reactive",
    tags: ["Dataflow", "Animation", "marimo"],
  },
];

export const marimoCategories: MarimoDemo["category"][] = [
  "Finance/GPU",
  "Generative",
  "Algorithms",
  "Reactive",
  "Research",
];
