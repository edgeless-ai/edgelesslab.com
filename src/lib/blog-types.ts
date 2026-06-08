/**
 * Shared blog post type — single source of truth.
 *
 * Imported by `blog.ts` (full posts, with content) and by the generated
 * `blog-meta.ts` (metadata-only view, content stripped). Keep all blog shape
 * changes here so the two files never drift.
 */
export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  readTime: string;
  content: string;
  productSlug?: string;
  /** True only for posts that announce a product launch (not editorial posts that happen to link a product). */
  isLaunch?: boolean;
  /** Two-column layout with sticky TOC sidebar. For longer, narrative posts. */
  editorial?: boolean;
  /** One-line hook for the companion product CTA. Pain-point framing, not generic. */
  ctaHook?: string;
  /** Blog post cover image / og:image path */
  image?: string;
}

/**
 * Metadata-only view of a blog post (content stripped to ""). Structurally
 * identical to {@link BlogPost}; aliased so generated `blog-meta.ts` keeps its
 * historical type name without redeclaring the shape.
 */
export type BlogPostMeta = BlogPost;
