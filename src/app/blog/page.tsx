import { ArrowRight } from "lucide-react";
import { posts } from "@/lib/blog";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { BlogPostCard } from "@/components/blog-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description: "Notes on building AI agents, MCP servers, generative art, and developer tools.",
  alternates: { canonical: "https://edgelesslab.com/blog" },
};

export default function BlogPage() {
  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
      <Nav />

      <main className="pt-28 pb-20 px-6">
        <div className="max-w-[800px] mx-auto">
          <h1
            className="text-3xl font-bold tracking-tight mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            Blog
          </h1>
          <p
            className="text-sm mb-12"
            style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}
          >
            Notes on building AI agents, generative art, and developer tools.
          </p>

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
