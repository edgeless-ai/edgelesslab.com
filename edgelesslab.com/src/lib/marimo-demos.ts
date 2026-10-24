export const marimoDemos = [
  {
    title: "Clean accuracy is not adversarial robustness",
    slug: "2610.08936-clean-vs-robustness",
    category: "AI evaluation",
    tags: [
      "video classification",
      "adversarial robustness",
      "benchmarking",
      "published data"
    ],
    summary: "Explore why VCR-Bench's clean-accuracy leader is not its robust-accuracy leader, and stress-test the ranking under an explicitly hypothetical ASR multiplier.",
    sourcePaper: {
      title: "VCR-Bench: A Modular Open-Source Benchmark for Video Classification Robustness",
      url: "https://arxiv.org/abs/2610.08936",
      version: "v1",
      doi: "10.1145/3767308.3834753"
    },
    sourceFile: "/Users/djm/claude-projects/projects/marimo-notebooks/2610.08936-clean-vs-robustness/2610.08936-clean-vs-robustness.py",
    bundle: "/Users/djm/claude-projects/output/marimo-public/2610.08936-clean-vs-robustness/",
    site: "/Users/djm/claude-projects/output/marimo-public/2610.08936-clean-vs-robustness/site/",
    screenshot: "/Users/djm/claude-projects/output/marimo-public/2610.08936-clean-vs-robustness/screenshot-desktop-after-control.png",
    narrowScreenshot: "/Users/djm/claude-projects/output/marimo-public/2610.08936-clean-vs-robustness/screenshot-narrow.png",
    validationReceipt: "/Users/djm/claude-projects/output/marimo-public/2610.08936-clean-vs-robustness/VALIDATION-RECEIPT.md",
    licenseNotes: "Original demo code is CC0-1.0. Table 2 facts are cited; no paper figure, repository code, videos, weights, attacks, or benchmark assets are redistributed. Generated runtime assets retain upstream licenses.",
    limitations: "Published aggregate-table reproduction plus hypothetical sensitivity analysis. No attack execution, item-level data, video model, Kinetics data, CUDA run, defense evaluation, statistical significance test, or deployment security claim.",
    galleryFile: "edgelesslab.com/src/lib/marimo-demos.ts",
    intendedUrl: "https://marimo.edgelesslab.com/2610.08936-clean-vs-robustness/",
    reviewHandoff: {
      criticCard: "t_3ffa7bd2",
      nextReviewer: "verifier"
    },
    state: "published",
    publishedUrl: "https://marimo.edgelesslab.com/2610.08936-clean-vs-robustness/"
  },
  {
    title: "RoLaQ Cache Accounting",
    slug: "2610.20686-rolaq-cache-accounting",
    category: "AI systems",
    tags: [
      "KV cache",
      "quantization",
      "MLA",
      "inference",
      "storage accounting"
    ],
    summary: "Reproduces the storage accounting analysis from Appendix A.3 of the RoLaQ paper, showing 2-bit content coding achieves 3.96x effective capacity over baseline KV cache storage.",
    sourcePaper: {
      title: "RoLaQ: Low-Bit Quantization for KV Cache",
      url: "https://arxiv.org/abs/2610.20686",
      version: "v1"
    },
    sourceFile: "/Users/djm/claude-projects/projects/marimo-notebooks/2610.20686-rolaq-cache-accounting/2610.20686-rolaq-cache-accounting.py",
    bundle: "/Users/djm/claude-projects/output/marimo-public/2610.20686-rolaq-cache-accounting/",
    site: "/Users/djm/claude-projects/output/marimo-public/2610.20686-rolaq-cache-accounting/site/",
    screenshot: "/Users/djm/claude-projects/output/marimo-public/2610.20686-rolaq-cache-accounting/screenshot-desktop-after-control.png",
    narrowScreenshot: "/Users/djm/claude-projects/output/marimo-public/2610.20686-rolaq-cache-accounting/screenshot-narrow-after-control.png",
    validationReceipt: "/Users/djm/claude-projects/output/marimo-public/2610.20686-rolaq-cache-accounting/VALIDATION-RECEIPT.md",
    licenseNotes: "Original demo code is CC0-1.0. No paper figure, repository code, videos, weights, or benchmark assets are redistributed. Generated runtime assets retain upstream licenses.",
    limitations: "This demo reproduces storage arithmetic only. It does not run RoLaQ, quantize activations, evaluate accuracy, execute CUDA/SGLang, measure allocator behavior, reproduce protected-window overhead, or validate the author-run capacity and throughput experiments. Non-default control values are hypothetical sensitivity analysis.",
    galleryFile: "edgelesslab.com/src/lib/marimo-demos.ts",
    intendedUrl: "https://marimo.edgelesslab.com/2610.20686-rolaq-cache-accounting/",
    reviewHandoff: {
      criticCard: "t_4614093c",
      nextReviewer: "verifier"
    },
    state: "published",
    publishedUrl: "https://marimo.edgelesslab.com/2610.20686-rolaq-cache-accounting/"
  },
  {
    title: "S_C^eff Scaling Principle: When Reality Outpaces Cognition",
    slug: "2610.20764-sc-eff-scaling",
    category: "AI evaluation",
    tags: [
      "arxiv-2610",
      "attention-efficiency",
      "co4",
      "sc-eff",
      "reliability",
      "complexity-scaling"
    ],
    summary: "Explore how environmental speed S_R erodes cognitive reliability, and how Co^4's O(N+k^2) attention extends the reliable operating regime by up to 10x over Transformer O(N^2). Two sliders control the reliability threshold tau and the context length N.",
    sourcePaper: {
      title: "When Reality Outpaces Cognition: A New Scaling Principle for Reliable Intelligence",
      url: "https://arxiv.org/abs/2610.20764",
      version: "v1",
      doi: "10.48550/arXiv.2610.20764"
    },
    sourceFile: "/Users/djm/claude-projects/projects/marimo-notebooks/2610.20764-sc-eff-scaling/2610.20764-sc-eff-scaling.py",
    bundle: "/Users/djm/claude-projects/output/marimo-public/2610.20764-sc-eff-scaling/",
    site: "/Users/djm/claude-projects/output/marimo-public/2610.20764-sc-eff-scaling/site/",
    screenshot: "/Users/djm/claude-projects/output/marimo-public/2610.20764-sc-eff-scaling/screenshot-desktop-after-control.png",
    narrowScreenshot: "/Users/djm/claude-projects/output/marimo-public/2610.20764-sc-eff-scaling/screenshot-narrow.png",
    validationReceipt: "/Users/djm/claude-projects/output/marimo-public/2610.20764-sc-eff-scaling/VALIDATION-RECEIPT.md",
    licenseNotes: "Original demo code is MIT. Paper remains under its authors' and arXiv's terms (CC BY-NC-ND 4.0); no paper figure, repository code, videos, weights, or benchmark assets are redistributed. Generated marimo/Pyodide runtime assets retain upstream licenses.",
    limitations: "Synthetic mechanism illustration using bundled published numbers from Table 1 of arXiv:2610.20764v1. No Co^4 code, model, environment, or simulator is run. The tau slider interpolates reward-to-S_C^eff using a proxy metric; the paper's reported S_C^eff values use a separate reliability measure and are annotated for reference. Complexity speedup is asymptotic; constant factors are idealized.",
    galleryFile: "edgelesslab.com/src/lib/marimo-demos.ts",
    intendedUrl: "https://marimo.edgelesslab.com/2610.20764-sc-eff-scaling/",
    reviewHandoff: {
      criticCard: "t_357353ca",
      nextReviewer: "verifier"
    },
    state: "published",
    publishedUrl: "https://marimo.edgelesslab.com/2610.20764-sc-eff-scaling/"
  }
];