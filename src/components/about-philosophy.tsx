"use client";

import { EditorialBlock } from "@/components/ui/pretext-pull-quote";

const philosophyParagraphs = [
  "Most AI companies are building demos. This lab builds infrastructure that runs 24/7. The knowledge pipeline indexes thousands of documents. The MCP servers handle real queries from real agents. The hooks catch mistakes before they cost real money.",
  "The lab exists at the intersection of AI, craft, and systems thinking. Every project ships. Every tool gets used. If it doesn\u2019t work in production, it doesn\u2019t exist.",
  "The best AI tools are built by people who use them every day. Everything here is dogfooded. The orchestration layer routes my own work. The memory system stores my own knowledge. The hooks guard my own agents.",
];

const philosophyPullQuotes = [
  {
    text: "Infrastructure that runs 24/7.",
    side: "right" as const,
    yOffset: 20,
    width: 240,
  },
  {
    text: "If it doesn\u2019t work in production, it doesn\u2019t exist.",
    side: "right" as const,
    yOffset: 200,
    width: 260,
  },
];

const fadeInStyle = (delay = 0): React.CSSProperties => ({
  animation: `fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}s both`,
});

export function Philosophy() {
  return (
    <div className="max-w-2xl">
      <h2
        className="text-sm font-mono uppercase tracking-[0.15em] mb-8"
        style={{ color: "var(--text-tertiary)", ...fadeInStyle(0) }}
      >
        Philosophy
      </h2>
      <div style={fadeInStyle(0.1)}>
        <EditorialBlock
          paragraphs={philosophyParagraphs}
          pullQuotes={philosophyPullQuotes}
          font='300 18px "Geist"'
          lineHeight={30}
          quoteFont='600 22px "Geist"'
          quoteLineHeight={30}
          className="text-lg font-light"
          style={{ color: "var(--text-secondary)" }}
        />
      </div>
    </div>
  );
}
