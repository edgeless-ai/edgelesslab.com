import Link from "next/link";
import type { BlogPost } from "@/lib/blog";

/**
 * Displays up to 3 related posts based on shared tags.
 * Falls back to most recent posts if no tag overlap exists.
 */
export function RelatedPosts({
  current,
  allPosts,
  max = 3,
}: {
  current: BlogPost;
  allPosts: BlogPost[];
  max?: number;
}) {
  const candidates = allPosts.filter((p) => p.slug !== current.slug);

  // Score by shared tags
  const scored = candidates.map((post) => {
    const shared = post.tags.filter((t) =>
      current.tags.some((ct) => ct.toLowerCase() === t.toLowerCase())
    ).length;
    return { post, shared };
  });

  // Sort by shared tags desc, then by date desc
  scored.sort((a, b) => {
    if (b.shared !== a.shared) return b.shared - a.shared;
    return b.post.date.localeCompare(a.post.date);
  });

  const related = scored.slice(0, max).map((s) => s.post);

  if (related.length === 0) return null;

  return (
    <section
      className="mt-16 pt-8 border-t"
      style={{ borderColor: "var(--border-subtle)" }}
      aria-label="Related posts"
    >
      <h2
        className="text-sm font-mono uppercase tracking-[0.1em] mb-6"
        style={{ color: "var(--text-tertiary)" }}
      >
        Related Posts
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {related.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group block p-4 rounded-lg border transition-colors"
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <div
              className="text-sm font-semibold mb-1 transition-colors group-hover:text-[var(--text-primary)]"
              style={{ color: "var(--text-primary)" }}
            >
              {post.title}
            </div>
            <div
              className="text-xs line-clamp-2"
              style={{ color: "var(--text-tertiary)", lineHeight: 1.5 }}
            >
              {post.description}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <time
                className="text-label font-mono"
                style={{ color: "var(--text-tertiary)" }}
                dateTime={post.date}
              >
                {new Date(post.date + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
              </time>
              <span
                className="text-label font-mono"
                style={{ color: "var(--text-tertiary)" }}
              >
                {post.readTime}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
