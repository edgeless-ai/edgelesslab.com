import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import {
  AboutHeader,
  Philosophy,
  Timeline,
  Manifesto,
  ConnectGrid,
} from "@/components/about-client";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "About David Murray and Edgeless Lab",
  description: "David Murray builds agent infrastructure, generative art, and creative technology through Edgeless Lab.",
  path: "/about",
  keywords: ["about Edgeless Lab", "David Murray", "creative technology studio", "AI-native developer tools"],
});

const timeline = [
  {
    period: "2026",
    title: "A public research studio",
    description:
      "Brought autonomous systems, generative studies, Field Notes, and physical editions into one public lab. Current work focuses on resilient model routing, agent coordination, and creative systems that can leave the screen.",
  },
  {
    period: "2025",
    title: "Agent infrastructure",
    description:
      "Built safety hooks, persistent memory, model-provider fallback, and the coordination patterns used across daily agent work.",
  },
  {
    period: "2024",
    title: "Creative technology",
    description:
      "Started the pen plotter pipeline, generative SVG studies, and Total Serialism. The browser became a sketchbook for work designed to become physical.",
  },
];

const links = [
  { label: "Work with David", href: "/services/private-ai-systems", description: "Bring a difficult system or creative technology problem" },
  { label: "GitHub", href: "https://github.com/edgeless-ai", description: "Open source projects and tools" },
  { label: "Email", href: "mailto:david@edgelesslab.com", description: "david@edgelesslab.com" },
];

export default function About() {
  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
      <Nav />

      <section className="px-6 pt-32 pb-16 sm:pb-20">
        <div className="max-w-[1080px] mx-auto">
          <AboutHeader />
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
          <Manifesto />
        </div>
      </section>

      <section className="px-6 py-24" style={{ background: "var(--bg-surface)" }}>
        <div className="max-w-[1280px] mx-auto">
          <ConnectGrid links={links} />
        </div>
      </section>

      <Footer />
    </div>
  );
}
