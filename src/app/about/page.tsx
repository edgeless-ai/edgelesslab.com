import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import {
  AboutHeader,
  StatsGrid,
  Philosophy,
  Timeline,
  ConnectGrid,
} from "@/components/about-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "One-person creative technology studio building agents, pipelines, and tools that run in production.",
  alternates: { canonical: "https://edgelesslab.com/about" },
};

const stats = [
  { label: "Agents deployed", value: "7" },
  { label: "Documents indexed", value: "6,889" },
  { label: "Generative experiments", value: "105+" },
  { label: "MCP servers", value: "4" },
];

const timeline = [
  {
    period: "2026",
    title: "Edgeless Labs",
    description:
      "Formalized the lab. Launched the Prompt Engineering OS, MCP server toolkit, and multi-agent orchestration layer. Mastra-based routing across Claude, Gemini, and local models.",
  },
  {
    period: "2025",
    title: "Agent infrastructure",
    description:
      "Built Pamela (autonomous Polymarket trader), the 3-layer memory system (ChromaDB + PyTorch + Obsidian vault), and the unified LLM client with automatic provider fallback.",
  },
  {
    period: "2024",
    title: "Creative technology",
    description:
      "Started the pen plotter art pipeline, generative SVG experiments, and the knowledge graph visualization. Explored algorithmic composition with Total Serialism.",
  },
];

const links = [
  { label: "GitHub", href: "https://github.com/edgeless-ai", description: "Open source projects and tools" },
  { label: "Gumroad", href: "https://edgelessai.gumroad.com", description: "Digital products and templates" },
  { label: "Email", href: "mailto:hello@edgelesslab.com", description: "hello@edgelesslab.com" },
];

export default function About() {
  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
      <Nav />

      <section className="px-6 pt-32 pb-20">
        <div className="max-w-[1280px] mx-auto">
          <AboutHeader />
        </div>
      </section>

      <section className="px-6 py-16" style={{ background: "var(--bg-surface)" }}>
        <div className="max-w-[1280px] mx-auto">
          <StatsGrid stats={stats} />
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="max-w-[1280px] mx-auto">
          <Philosophy />
        </div>
      </section>

      <section className="px-6 py-20" style={{ background: "var(--bg-surface)" }}>
        <div className="max-w-[1280px] mx-auto">
          <Timeline items={timeline} />
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="max-w-[1280px] mx-auto">
          <ConnectGrid links={links} />
        </div>
      </section>

      <Footer />
    </div>
  );
}
