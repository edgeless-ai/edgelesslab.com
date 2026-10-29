export interface MarimoDemo {
  slug: string;
  title: string;
  description: string;
  published_url?: string | null;
  category: "Finance/GPU" | "Generative" | "Algorithms" | "Reactive" | "Research" | "AI evaluation" | "AI training";
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

  // Research explainers (continued)
  {
    slug: "2610.20686-rolaq-cache-accounting",
    title: "RoLaQ Cache Accounting",
    description: "See how 2-bit content codes, FP32 group metadata, and a BF16 positional key combine into RoLaQ's whole-cache precision and capacity ratio.",
    category: "Research",
    tags: ["KV cache", "quantization", "MLA", "inference", "storage accounting"],
    published_url: "https://marimo.edgelesslab.com/2610.20686-rolaq-cache-accounting/",
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
  {
    slug: "borwein-falsifier",
    title: "Borwein Falsifier Demo",
    published_url: "https://marimo.edgelesslab.com/borwein-falsifier/",
    description:
      "Interactive demonstration of Borwein-Borwein 2001 exact falsification — adjust n and tolerance to observe the precise n=7 deficit where the pattern breaks, with live validation and reactive controls.",
    category: "Research",
    tags: ["Mathematics", "Falsification", "Counterexample"],
  },

  {
    slug: "2609.30489-bioeval-audit-sensitivity",
    title: "When hard benchmark items are the warning signal",
    description: "Recompute BioEVAL's 16/20 versus 5/20 expert-audit result and test how the enrichment changes under explicit counterfactual hard-item counts.",
    category: "Research",
    tags: ["benchmark audit", "item quality", "Fisher exact test", "bioengineering"],
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
  {
    slug: "2610.08936-clean-vs-robustness",
    title: "Clean accuracy is not adversarial robustness",
    published_url: "https://marimo.edgelesslab.com/2610.08936-clean-vs-robustness/",
    description: "Explore why VCR-Bench's clean-accuracy leader is not its robust-accuracy leader, and stress-test the ranking under an explicitly hypothetical ASR multiplier.",
    category: "AI evaluation",
    tags: ["video classification", "adversarial robustness", "benchmarking", "published data"],
  },
  {
    slug: "2609.26911-twincheck-zero-harm-bound",
    title: "TwinCheck: What Does Zero Observed Harm Bound?",
    description:
      "Reproduce TwinCheck's 0/71 harmful-intervention confidence bound and explore how zero-event evidence tightens with sample size.",
    category: "Research",
    tags: ["agent safety", "statistical bounds", "tool agents", "verification"],
  },
  {
    slug: "2610.04198-alodlm-depth-allocation",
    title: "ALoDLM Token-Depth Allocator",
    description: "Explore how entropy commitment and cumulative halting allocate recurrent depth across deterministic synthetic token positions, with paper-anchored layer accounting and explicit speed-claim boundaries.",
    category: "Research",
    tags: ["diffusion language models", "adaptive compute", "recurrence", "inference"],
  },
  {
    slug: "2609.38201-speculative-tool-exec",
    title: "When does speculative tool execution pay?",
    description: "Break-even analysis for overlapping tool execution",
    published_url: "https://marimo.edgelesslab.com/2609.38201-speculative-tool-exec/",
    category: "Research",
    tags: ["agents", "tool use", "speculative execution", "latency"],
  },
  {
    slug: "2608.02123-pctree-budget",
    title: "Parent-Conditioned Tree Budget Explorer",
    description: "Compare one-chain, parent-blind tree, and parent-conditioned tree proposals under the same verification-node budget in a deterministic mechanism model.",
    category: "Research",
    tags: ["speculative decoding", "tree search", "inference", "budgeting"],
  },
  {
    slug: "2610.20838-srq-endpoint-weight",
    title: "SRQ Endpoint Weight",
    description: "Explore how executed-trial count and trial/final quality determine the share of PGRR's slot-averaged SRQ that comes from repeated endpoint evidence.",
    category: "Research",
    tags: ["robotics", "recovery metrics", "sensitivity analysis", "benchmark design"],
    published_url: "https://marimo.edgelesslab.com/2610.20838-srq-endpoint-weight/",
  },
  {
    slug: "build-a-chip-bench-multiscoring",
    title: "Build-A-Chip-Bench: Multiplicative Scoring in Chip Design",
    description: "Explore how Build-A-Chip-Bench's multiplicative scoring formula (Gate1 × Gate2 × PPA) makes PPA the decisive factor despite gate pass rates. Adjust Fable 5.1's PPA quality to see where it breaks even with Astra.",
    category: "AI evaluation",
    tags: ["benchmarks", "chip-design", "agent-evaluation", "hardware", "vendor-claim", "multiplicative-scoring"],
    published_url: "https://marimo.edgelesslab.com/build-a-chip-bench-multiscoring/",
  },
  {
    slug: "embodied-playground-suite-gap",
    title: "Embodied Playground: Where the Suite Gap Comes From",
    description:
      "Explore how Tower and Lock planning performance drives most of the equal-suite-weighted EP-100 gap, while Cube remains a shared fine-manipulation bottleneck.",
    category: "AI evaluation",
    tags: ["robotics", "benchmarks", "agent-evaluation", "long-horizon", "planning", "embodied-ai"],
    published_url: "https://marimo.edgelesslab.com/embodied-playground-suite-gap/",
  },
  {
    slug: "2609.05439-criticgen-risk-frontier",
    title: "CriticGen: Price the Risk of a Bad Rewrite",
    description:
      "Price answer regressions explicitly and see why the highest improvement rate is not always the best refinement policy.",
    category: "AI evaluation",
    tags: ["llm-evaluation", "refinement", "decision-analysis", "risk", "rubrics"],
    published_url: "https://marimo.edgelesslab.com/2609.05439-criticgen-risk-frontier/",
  },
  {
    slug: "2609.09458-contracteval-denominator",
    title: "ContractEval: Expose the Procedural Denominator",
    description:
      "Inject a hidden procedural failure, tune semantic matching, and watch query-active obligations turn it into a diagnostic fingerprint.",
    category: "AI evaluation",
    tags: ["agent-evaluation", "procedural-conformance", "graph-matching", "calibration", "auditability"],
    published_url: "https://marimo.edgelesslab.com/2609.09458-contracteval-denominator/",
  },
  {
    slug: "2609.38385-goldimask-context-weighting",
    title: "GoldiMask: Reveal Context Without Erasing Supervision",
    description:
      "Choose which tokens become context, then watch capped water-filling redistribute supervision across the targets that survive.",
    category: "AI training",
    tags: ["diffusion-language-models", "fine-tuning", "submodular-optimization", "context-selection", "target-weighting"],
    published_url: "https://marimo.edgelesslab.com/2609.38385-goldimask-context-weighting/",
  },
  {
    slug: "2609.35806-sfia-extraction-baselines",
    title: "SFIA Extraction Decision Frontier",
    description:
      "Filter five published skill-extraction strategies by latency and level error to see when agentic RAG earns its cost.",
    category: "AI evaluation",
    tags: ["retrieval", "agentic-rag", "taxonomy-extraction", "decision-frontier"],
    published_url: "https://marimo.edgelesslab.com/2609.35806-sfia-extraction-baselines/",
  },

  // Research explainers (overnight expansion continued)
  {
    slug: "2608.05245-search2skill",
    title: "Search2Skill Compounding Library",
    description:
      "Compare direct inference, one-task evidence caching, and reusable skill distillation on one shared synthetic task stream.",
    category: "Research",
    tags: ["skill-distillation", "agent-memory", "search", "reinforcement-learning"],
    published_url: "https://marimo.edgelesslab.com/2608.05245-search2skill/",
  },
  {
    slug: "2609.24343-bandwidth-thermal-envelope",
    title: "Volumetric DRAM: Bandwidth vs Thermal Headroom",
    description:
      "Cap the useful bandwidth of three published volumetric-DRAM designs by a workload ceiling and see when extra interfaces add heat without useful throughput.",
    category: "Research",
    tags: ["dram", "hbm", "gpu-memory", "thermal-design", "bandwidth", "systems-co-design"],
    published_url: "https://marimo.edgelesslab.com/2609.24343-bandwidth-thermal-envelope/",
  },
  {
    slug: "2610.26754-tokengate-prefill-envelope",
    title: "TokenGate Prefill: Retained-Token Budget vs. Work Cost",
    description:
      "Sweep retained-token budget K from 2,000 to 8,000 and watch the tokengate prefill envelope shift. An analytic sensitivity model for token-pruning work cost; author-run speed claims are synthetic and kept separate from this estimate.",
    category: "Research",
    tags: ["llm-inference", "long-context", "token-pruning", "prefill", "performance-modeling"],
  },
  {
    slug: "2203.07895-ghost-floor-shortcut",
    title: "The Ghost Floor",
    description:
      "Grow a synthetic test domain and watch a coordinate-based learned-simulator shortcut create a ghost floor while a local obstacle representation transfers more cleanly.",
    category: "Research",
    tags: ["graph-networks", "physics-simulation", "generalization", "distribution-shift"],
    published_url: "https://marimo.edgelesslab.com/2203.07895-ghost-floor-shortcut/",
  },
];

// A published URL is added only after live verification. Keep legacy/unpublished
// records above for restoration, but never infer a runnable URL from a slug.
export type PublishedMarimoDemo = MarimoDemo & { published_url: string };
export const publishedMarimoDemos = marimoDemos.filter(
  (demo): demo is PublishedMarimoDemo => Boolean(demo.published_url),
);

   export const marimoCategories: MarimoDemo["category"][] = [
     "Finance/GPU",
     "Generative",
     "Algorithms",
     "Reactive",
     "Research",
     "AI evaluation",
     "AI training",
   ];
