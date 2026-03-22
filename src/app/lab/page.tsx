import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { LabHeader, LabGrid } from "@/components/lab-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lab",
  description: "Generative systems, data visualizations, and agent interfaces. Prototypes at the edge of what ships.",
  alternates: { canonical: "https://edgelesslab.com/lab" },
};

const experiments = [
  {
    title: "Strange Attractors",
    category: "Generative",
    description:
      "Lorenz, Rossler, and Chen attractor systems rendered as SVG paths for pen plotting. Real-time parameter exploration with live preview.",
    status: "105+ variants",
    slug: "strange-attractors",
  },
  {
    title: "Knowledge Graph",
    category: "Data",
    description:
      "Force-directed visualization of 7,000+ documents across ChromaDB collections, Obsidian vault links, and semantic similarity edges.",
    status: "Live",
    slug: "knowledge-graph",
  },
  {
    title: "Total Serialism",
    category: "Audio",
    description:
      "Algorithmic music composition using serialist techniques. Generates both audio output and visual score notation from tone rows.",
    status: "Live",
    slug: "total-serialism",
    href: "https://djmclaudeassistant-web.github.io/total-serialism/",
  },
  {
    title: "Tartanism",
    category: "Generative",
    description:
      "Generative tartan pattern explorer. Procedural plaid generation with historical clan data, color theory, and interactive weaving visualization.",
    status: "Live",
    slug: "tartanism",
    href: "https://djmclaudeassistant-web.github.io/tartanism/",
  },
  {
    title: "Mastra Orchestrator",
    category: "Agents",
    description:
      "Visual dashboard for multi-agent task routing. Real-time display of agent states, message passing, and consensus formation.",
    status: "Live",
    slug: "mastra-orchestrator",
  },
  {
    title: "Pen Plotter Art",
    category: "Generative",
    description:
      "Generative SVG art pipeline with AI scoring. Over 75 unique generators producing flow fields, attractors, tessellations.",
    status: "105+ experiments",
    slug: "pen-plotter-art",
  },
  {
    title: "Excalidraw Diagrams",
    category: "Data",
    description:
      "Auto-generated architecture diagrams. 54 diagrams indexed covering system topology, data flows, and agent interactions.",
    status: "54 diagrams",
    slug: "excalidraw-diagrams",
  },
];

export default function LabPage() {
  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
      <Nav />

      <section className="px-6 pt-40 pb-16">
        <div className="max-w-[1280px] mx-auto">
          <LabHeader />
        </div>
      </section>

      <section className="px-6 pb-24 flex-1">
        <div className="max-w-[1280px] mx-auto">
          <LabGrid experiments={experiments} />
        </div>
      </section>

      <Footer />
    </div>
  );
}
