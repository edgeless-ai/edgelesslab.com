import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agentic OS — Building Autonomous AI Infrastructure",
  description:
    "A 6-part series on building autonomous AI infrastructure: multi-agent orchestration, knowledge pipelines, security, and self-healing systems.",
  alternates: {
    canonical: "/series/agentic-os/",
  },
};

const src = "/series/agentic-os/index.html";

export default function AgenticOSPage() {
  return (
    <iframe
      src={src}
      title="Agentic OS series"
      className="h-[calc(100dvh-64px)] w-full border-0"
      sandbox="allow-scripts allow-same-origin"
      loading="lazy"
    />
  );
}
