import { posts } from "@/lib/blog";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { BlogSearch } from "@/components/blog-client";
import { JsonLd } from "@/components/json-ld";
import { createPageMetadata } from "@/lib/metadata";

// Normalize tag for consistent grouping
function normalizeTag(tag: string) {
  return tag.toLowerCase().replace(/\s+/g, "-");
}

export const metadata = createPageMetadata({
  title: "Blog",
  description:
    "Field notes from one developer running 4 services 24/7. New post every product launch.",
  path: "/blog",
  keywords: [
    "AI engineering blog",
    "MCP servers",
    "Claude Code",
    "developer tools",
  ],
});

export default function BlogPage() {
  // Pre-compute tag counts on server
  const rawTagCounts = posts.reduce<Record<string, number>>((acc, post) => {
    for (const tag of post.tags) {
      const normalized = normalizeTag(tag);
      // Use normalized as key but keep original display tag
      if (!acc[normalized]) acc[normalized] = 0;
      acc[normalized]++;
    }
    return acc;
  }, {});

  // Map back to display tags
  const tagDisplayMap = new Map<string, string>();
  posts.forEach((post) => {
    for (const tag of post.tags) {
      const normalized = normalizeTag(tag);
      if (!tagDisplayMap.has(normalized)) {
        tagDisplayMap.set(normalized, tag);
      }
    }
  });

  const tagCounts = Object.entries(rawTagCounts).map(
    ([normalized, count]) => ({
      tag: tagDisplayMap.get(normalized) || normalized,
      count,
    })
  );

  // Sort posts by date descending (newest first)
  const sortedPosts = [...posts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div
      className="flex flex-col min-h-full"
      style={{ background: "var(--bg-base)" }}
    >
      <Nav />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Edgeless Lab Blog",
          description:
            "Field notes from one developer running AI agents, MCP servers, and generative art pipelines in production.",
          numberOfItems: sortedPosts.length,
          itemListElement: sortedPosts.map((post, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `https://edgelesslab.com/blog/${post.slug}`,
            name: post.title,
          })),
        }}
      />

      <BlogSearch allPosts={sortedPosts} tagCounts={tagCounts} />

      <Footer />
    </div>
  );
}
