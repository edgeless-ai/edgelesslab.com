export interface MarimoDemo {
  slug: string;
  title: string;
  description: string;
  category: "Finance/GPU" | "Generative" | "Algorithms" | "Reactive";
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
];
