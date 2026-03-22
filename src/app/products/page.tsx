import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Products",
  description:
    "Developer tools and templates for AI agent infrastructure. Built from production systems.",
  alternates: { canonical: "https://edgelesslab.com/products" },
};

const products = [
  {
    name: "Claude Memory Kit Pro",
    price: "$29",
    description:
      "The complete memory system for Claude Code power users. 12 templates, 5 stack libraries, advanced patterns guide, and CLAUDE.md templates.",
    features: [
      "12 ready-to-customize memory templates",
      "Stack libraries: React/Next.js, Python/FastAPI, Go, Rails, Rust",
      "Advanced patterns: multi-project, team memory, CI integration",
      "CLAUDE.md templates for solo and monorepo projects",
    ],
    href: "https://edgelessai.gumroad.com/l/claude-memory-kit",
    badge: "New",
  },
  {
    name: "The Prompt Engineering OS",
    price: "$29",
    description:
      "The complete system for writing AI prompts that work in production. 30 chapters, 8 template schemas, 100+ templates.",
    features: [
      "30 chapters covering every prompt pattern",
      "8 template schemas with fill-in-the-blank structure",
      "100+ production-tested prompt templates",
      "Covers Claude, GPT-4, Gemini, and open models",
    ],
    href: "https://edgelessai.gumroad.com/l/prompt-engineering-os",
    badge: null,
  },
  {
    name: "Claude Memory Kit",
    price: "Free",
    description:
      "Drop-in memory template for Claude Code. Persists context, feedback, and project knowledge across conversations.",
    features: [
      "4 memory types: user, feedback, project, reference",
      "MEMORY.md index auto-loaded each session",
      "CLAUDE.md snippet for instant setup",
      "Real-world examples included",
    ],
    href: "https://github.com/edgeless-ai/claude-memory-kit",
    badge: "Open Source",
  },
];

export default function ProductsPage() {
  return (
    <div
      className="flex flex-col min-h-full"
      style={{ background: "var(--bg-base)" }}
    >
      <Nav />

      <section className="pt-28 pb-20 px-6">
        <div className="max-w-[1080px] mx-auto">
          <h1
            className="text-3xl sm:text-4xl font-bold tracking-tight mb-3"
            style={{ color: "var(--text-primary)" }}
          >
            Products
          </h1>
          <p
            className="text-lg font-light max-w-[600px] mb-12"
            style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}
          >
            Developer tools built from production agent infrastructure. Every
            template comes from a system running 24/7.
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <a
                key={product.name}
                href={product.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex flex-col rounded-xl border p-6 transition-colors hover:border-white/20"
                style={{
                  background: "var(--bg-raised)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                {product.badge && (
                  <span
                    className="absolute top-4 right-4 px-2 py-0.5 text-[10px] font-mono rounded-md"
                    style={{
                      background:
                        product.price === "Free"
                          ? "rgba(34,197,94,0.15)"
                          : "var(--accent-muted)",
                      color:
                        product.price === "Free"
                          ? "var(--green)"
                          : "var(--accent)",
                    }}
                  >
                    {product.badge}
                  </span>
                )}

                <div className="flex items-baseline gap-2 mb-3">
                  <h2
                    className="text-lg font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {product.name}
                  </h2>
                </div>

                <span
                  className="text-2xl font-bold font-mono mb-3"
                  style={{
                    color:
                      product.price === "Free"
                        ? "var(--green)"
                        : "var(--accent)",
                  }}
                >
                  {product.price}
                </span>

                <p
                  className="text-sm mb-5 flex-1"
                  style={{
                    color: "var(--text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  {product.description}
                </p>

                <ul className="space-y-2 mb-6">
                  {product.features.map((feature) => (
                    <li
                      key={feature}
                      className="text-xs flex items-start gap-2"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      <span
                        className="mt-1 w-1 h-1 rounded-full flex-shrink-0"
                        style={{ background: "var(--accent)" }}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div
                  className="flex items-center gap-1 text-sm font-medium group-hover:text-white transition-colors"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {product.price === "Free" ? "View on GitHub" : "Get it on Gumroad"}
                  <ArrowUpRight size={14} />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
