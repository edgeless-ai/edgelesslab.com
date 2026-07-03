---
slug: arxiv-to-interactive-demo-marimo
title: From arXiv Paper to Interactive Demo in 20 Minutes
description: We built a live multi-armed bandit simulator from a research paper using
  marimo; reactive Python notebooks that run in the browser. Why this changes how
  we consume research.
date: '2026-05-18'
tags:
- marimo
- Research
- Interactive Computing
- AI Agents
- Python
readTime: 6 min
editorial: true
---

# From arXiv Paper to Interactive Demo in 20 Minutes

I read a lot of papers. Most of them sit in a tab until I forget why I opened them. The ones that stick are the ones I can *play with*: tweak a parameter, see the curve shift, develop an intuition for why the method works.

The problem: turning a paper into a playground usually takes hours. Jupyter notebooks are stateful JSON blobs that break when you look at them wrong. Streamlit apps are one-off scripts that don't compose. And most "reproducibility" efforts are Docker containers that take 30 minutes to build and require a GPU you don't have.

Last week we tried something different. We took the classic multi-armed bandit problem — the explore/exploit dilemma that underlies [every routing decision our agents make](/blog/plan-with-opus-build-with-gemini/) — and built an interactive demo in about 20 minutes. The tool is **marimo**, and it's now part of our research pipeline.

---

## What marimo Actually Is

marimo is a reactive Python notebook environment. Unlike Jupyter, marimo notebooks are plain .py files with a reactive DAG execution model. Change a slider, and every cell that depends on it re-runs automatically. No manual re-execution, no hidden state, no "run all cells" anxiety.

The killer features for us:

- **Notebooks are .py files** — they diff cleanly in git, they run as CLI scripts, they import like normal modules
- **Reactive execution** — cells auto-update when their dependencies change, like a spreadsheet but for code
- **Script mode** — the same notebook runs headless (for cron jobs or batch experiments) or interactively (in the browser)
- **WASM deployment** — notebooks can run entirely in the client's browser via Pyodide, zero server cost

---

## The Demo: Multi-Armed Bandits

The paper concept is simple: you have K slot machines ("arms") with unknown payout distributions. Each pull gives you a sample from one arm. Your goal is to maximize total reward over N pulls.

The tension is between **exploration** (trying arms to learn their payouts) and **exploitation** (pulling the arm you currently believe is best). This is the same trade-off every AI agent faces when choosing which skill to invoke, which data source to query, or which market to trade.

We built a notebook comparing three strategies:

- **Greedy**: Always pull the arm with the highest sample mean. Zero exploration. Gets stuck in local optima.
- **$\epsilon$-Greedy**: Explore randomly with probability $\epsilon$, exploit otherwise. Works but wastes pulls on obviously bad arms.
- **Thompson Sampling**: Maintain a Bayesian posterior over each arm's mean, sample from the posterior, and pull the winner. Naturally balances exploration and exploitation.

The notebook has sliders for arm count, exploration rate, number of pulls, and Monte Carlo runs. Hit "Run Experiment" and it produces two plots: cumulative regret over time, and a bar chart of average regret in the final window.

The results are immediate and visceral. Thompson Sampling consistently achieves 30-60% lower cumulative regret than Greedy. You can see why: Greedy agents lock onto the first decent arm they find and never question it. Thompson Sampling maintains uncertainty and lets high-variance arms compete until the evidence is clear.

---

## What This Means for Edgeless

We now have a pipeline:

1. **Intake**: Beau or Hive spots an interesting paper during RSS/YouTube triage
2. **Fetch**: AlphaXiv gives us structured markdown of the paper (no PDF parsing)
3. **Demo**: marimo auto skill picks the core concept and builds an interactive notebook
4. **Publish**: The notebook goes into our vault, indexed by ChromaDB, linked to related KB articles
5. **Deploy**: WASM-compatible demos can be embedded in blog posts or shared as standalone URLs, alongside [the interactive demos collection](/blog/creative-demos-collection/)

You can already see this running live: the pen-plotter autoresearch loop ships its marimo dashboards in the lab, starting with the [Tuning Playground](/lab/pen-plotter-autoresearch/01_tuning_playground.html).

The implications:

**For research**: We don't just read papers; we *instrument* them. Every paper in our KB can have a live demo attached. The knowledge becomes actionable instead of archived.

**For clients**: We can build interactive dashboards and training tools in marimo instead of Streamlit or custom web apps. The same notebook that trains a model can become the client's monitoring dashboard with zero extra work.

**For the swarm**: Our cron jobs can be marimo notebooks. When they break, we open them in the browser, adjust a slider, and debug interactively instead of reading log files.

---

## What's Next

We're building demos for three more paper categories:

- **Direct Preference Optimization (DPO)** — skip the reward model, optimize directly from preferences. The math is clean and the comparison to RLHF is visually striking.
- **Group Relative Policy Optimization (GRPO)** — DeepSeek's approach to reasoning without a critic. The core insight (group rewards replace individual value estimates) is perfect for a toy grid-world demo.
- **Self-Evolving Agent Memory** — population-based memory broadcast without weight updates. Relevant to our swarm's memory architecture.

Each demo is a .py file that runs standalone, lives in our vault, and links back to the paper metadata via ChromaDB.

---

## Try It

The bandit notebook is a single file: [bandit-strategies.py](https://github.com/thedavidmurray/marimo-demos/blob/main/bandit-strategies.py)

Run it locally:

```bash
uv run --with marimo --with numpy --with matplotlib marimo run bandit-strategies.py
```

Or open it in the browser as a WASM app (no install, no server):

[Open in molab](https://molab.marimo.io/github/thedavidmurray/marimo-demos/blob/main/bandit-strategies.py)

The source repo has the full set of skills we use to build these demos automatically from arXiv IDs.

---

**The point:** Research shouldn't be read-only. Every paper that matters to your work should have a live, interactive demo attached. marimo makes that practical at scale.