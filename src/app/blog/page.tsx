import { Rss, ArrowUpRight } from "lucide-react";
import { posts } from "@/lib/blog";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { BlogPostCard } from "@/components/blog-client";
import { JsonLd } from "@/components/json-ld";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Blog",
  description: "Field notes from one developer running 4 services 24/7. New post every product launch.",
  path: "/blog",
  keywords: ["AI engineering blog", "MCP servers", "Claude Code", "developer tools"],
});

export default function BlogPage() {
  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
      <Nav />

      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Edgeless Lab Blog",
        "description": "Field notes from one developer running AI agents, MCP servers, and generative art pipelines in production.",
        "numberOfItems": posts.length,
        "itemListElement": posts.map((post, i) => ({
          "@type": "ListItem",
          "position": i + 1,
          "url": `https://edgelesslab.com/blog/${post.slug}`,
          "name": post.title,
        })),
      }} />

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-[800px] mx-auto">
          <div className="flex items-center gap-2.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
            <span
              className="text-[11px] font-mono uppercase tracking-[0.14em]"
              style={{ color: "var(--text-tertiary)" }}
            >
              Field notes
            </span>
          </div>

          <div className="flex items-baseline justify-between flex-wrap gap-4 mb-4">
            <h1
              className="text-5xl sm:text-6xl font-bold tracking-tight leading-[0.92]"
              style={{ color: "var(--text-primary)" }}
            >
              Blog
            </h1>
            <span
              className="text-xs font-mono"
              style={{ color: "var(--text-tertiary)" }}
            >
              {posts.length} posts &middot; new on every product launch
            </span>
          </div>

          <p
            className="text-base mb-8 max-w-xl"
            style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}
          >
            Shipping logs from a solo AI studio. Claude Code agents, MCP servers, pen plotter runs, and whatever broke last week.
          </p>

          <div className="flex items-center gap-4 mb-10">
            <a
              href="/feed.xml"
              className="inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full border transition-colors hover:text-white"
              style={{ color: "var(--text-secondary)", borderColor: "var(--border-subtle)" }}
            >
              <Rss size={11} /> RSS feed <ArrowUpRight size={11} />
            </a>
          </div>

          {/* Tag counts (Simon Willison-style: count is the proof) */}
          <div className="mb-12 pb-8 border-b" style={{ borderColor: "var(--border-subtle)" }}>
            <h2
              className="text-[10px] font-mono uppercase tracking-[0.14em] mb-4"
              style={{ color: "var(--text-tertiary)" }}
            >
              Topics
            </h2>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {Object.entries(
                posts.reduce<Record<string, number>>((acc, post) => {
                  for (const tag of post.tags) acc[tag] = (acc[tag] ?? 0) + 1;
                  return acc;
                }, {}),
              )
                .sort((a, b) => b[1] - a[1])
                .slice(0, 14)
                .map(([tag, count]) => (
                  <span
                    key={tag}
                    className="text-[13px] font-mono"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {tag.toLowerCase().replace(/\s+/g, "-")}{" "}
                    <span style={{ color: "var(--accent)" }}>{count}</span>
                  </span>
                ))}
            </div>
          </div>

          <div className="space-y-1">
            {posts.map((post) => (
              <BlogPostCard key={post.slug} post={post} />
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
