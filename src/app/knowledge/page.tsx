import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { KnowledgeExplorer } from "@/components/knowledge-client";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Knowledge Base",
  description:
    "Search across curated knowledge from YouTube deep dives, research sessions, and tool documentation. AI agents, MCP servers, generative art, and more.",
  path: "/knowledge",
  keywords: [
    "knowledge base",
    "AI agents",
    "MCP servers",
    "generative art",
    "RAG",
    "prompt engineering",
  ],
});

export default function KnowledgePage() {
  return (
    <div
      className="flex flex-col min-h-full"
      style={{ background: "var(--bg-base)" }}
    >
      <Nav />

      <main id="main-content">
      <section className="px-6 pt-40 pb-12">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex items-center gap-2.5 mb-6">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--accent)" }}
            />
            <span
              className="text-xs font-mono uppercase tracking-[0.14em]"
              style={{ color: "var(--text-tertiary)" }}
            >
              Knowledge
            </span>
          </div>

          <h1
            className="text-4xl sm:text-5xl font-bold tracking-tight mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Knowledge Base
          </h1>
          <p
            className="text-base max-w-xl"
            style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}
          >
            Curated notes from YouTube deep dives, research sessions, and tool
            documentation. Searchable, tagged, and organized by source.
          </p>
        </div>
      </section>

      <section className="px-6 pb-24 flex-1">
        <div className="max-w-[1280px] mx-auto">
          <KnowledgeExplorer />
        </div>
      </section>
      </main>

      <Footer />
    </div>
  );
}
