import { posts } from "@/lib/blog";
import { products } from "@/lib/data";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { BlogArticle } from "@/components/blog-article";
import { RelatedPosts } from "@/components/related-posts";
import type { Metadata } from "next";

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) return {};

  const fullTitle = `${post.title} | Edgeless Lab`;

  return {
    title: {
      absolute: fullTitle,
    },
    description: post.description,
    keywords: post.tags,
    openGraph: {
      title: fullTitle,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      siteName: "Edgeless Lab",
      url: `https://edgelesslab.com/blog/${post.slug}`,
      images: [{
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: post.title,
      }],
    },
    alternates: {
      canonical: `https://edgelesslab.com/blog/${post.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: post.description,
      images: ["/og-image.png"],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) notFound();

  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
      <Nav />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.description,
          datePublished: post.date,
          dateModified: post.date,
          wordCount: parseInt(post.readTime) * 250,
          author: {
            "@type": "Person",
            name: "David Murray",
            url: "https://edgelesslab.com/about",
          },
          publisher: {
            "@type": "Organization",
            name: "Edgeless Lab",
            url: "https://edgelesslab.com",
          },
          url: `https://edgelesslab.com/blog/${post.slug}`,
          keywords: post.tags,
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": `https://edgelesslab.com/blog/${post.slug}`,
          },
        }}
      />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://edgelesslab.com" },
            { "@type": "ListItem", position: 2, name: "Blog", item: "https://edgelesslab.com/blog" },
            { "@type": "ListItem", position: 3, name: post.title, item: `https://edgelesslab.com/blog/${post.slug}` },
          ],
        }}
      />

      <article className="pt-28 pb-20 px-6">
        <div className={post.editorial ? "max-w-[960px] mx-auto" : "max-w-[680px] mx-auto"}>
          {/* Header */}
          <div className="mb-12 max-w-[680px]">
            <div className="flex items-center gap-3 mb-4">
              <time
                className="text-xs font-mono"
                style={{ color: "var(--text-tertiary)" }}
                dateTime={post.date}
              >
                {new Date(post.date + "T00:00:00").toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              <span
                className="text-xs font-mono"
                style={{ color: "var(--text-tertiary)" }}
              >
                {post.readTime}
              </span>
            </div>
            <h1
              className="text-3xl sm:text-4xl font-bold tracking-tight leading-[1.2] mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              {post.title}
            </h1>
            <p
              className="text-lg font-light"
              style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}
            >
              {post.description}
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 text-xs font-mono rounded-md"
                  style={{
                    background: "var(--accent-muted)",
                    color: "var(--accent)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Content */}
          <BlogArticle
            html={renderMarkdown(post.content)}
            editorial={post.editorial}
            sidebar={
              post.productSlug ? (() => {
                const product = products.find((p) => p.href.includes(`/l/${post.productSlug}`));
                if (!product || product.comingSoon) return null;
                return (
                  <a
                    href={product.href}
                    className="block p-4 rounded-lg border transition-colors hover:border-white/20"
                    style={{
                      background: "var(--bg-surface)",
                      borderColor: "var(--border-subtle)",
                    }}
                  >
                    <div
                      className="text-[10px] font-mono uppercase tracking-[0.12em] mb-2"
                      style={{ color: "var(--accent)" }}
                    >
                      Companion
                    </div>
                    <div
                      className="text-sm font-semibold mb-1"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {product.name}
                    </div>
                    <div
                      className="text-xs font-mono mb-2"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {product.price}
                    </div>
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-tertiary)", lineHeight: 1.5 }}
                    >
                      {post.ctaHook || "Full implementation, code, and templates."}
                    </p>
                  </a>
                );
              })() : undefined
            }
          />

          {/* Inline product CTA for non-editorial posts (below content) */}
          {!post.editorial && post.productSlug && (() => {
            const product = products.find((p) => p.href.includes(`/l/${post.productSlug}`));
            if (!product || product.comingSoon) return null;
            return (
              <a
                href={product.href}
                className="block mt-12 p-6 rounded-lg border transition-colors hover:border-white/30"
                style={{
                  background: "var(--accent-muted)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <div className="text-xs font-mono uppercase tracking-wider mb-2" style={{ color: "var(--accent)" }}>
                  Companion product
                </div>
                <div className="flex items-baseline justify-between gap-4 mb-2">
                  <div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                    {product.name}
                  </div>
                  <div className="text-base font-mono" style={{ color: "var(--text-secondary)" }}>
                    {product.price}
                  </div>
                </div>
                <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {post.ctaHook || `This post is adapted from ${product.name}. Get the full implementation, code, and templates.`}
                </p>
              </a>
            );
          })()}

          {/* Related Posts */}
          <RelatedPosts current={post} allPosts={posts} />

          {/* Back link */}
          <div className="mt-12 pt-8 border-t" style={{ borderColor: "var(--border-subtle)" }}>
            <Link
              href="/blog"
              className="text-sm font-medium transition-colors hover:text-white"
              style={{ color: "var(--text-secondary)" }}
            >
              &larr; All posts
            </Link>
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
}

function renderBarChart(title: string, rows: string[]): string {
  const entries: { label: string; value: number; display: string }[] = [];
  for (const row of rows) {
    const parts = row.split("|").map((s) => s.trim());
    if (parts.length >= 2) {
      const numMatch = parts[1].match(/[\d.]+/);
      entries.push({
        label: parts[0],
        value: numMatch ? parseFloat(numMatch[0]) : 0,
        display: parts[1],
      });
    }
  }
  if (entries.length === 0) return "";
  const max = Math.max(...entries.map((e) => e.value));

  const bars = entries
    .map((e) => {
      const pct = max > 0 ? (e.value / max) * 100 : 0;
      return `<div class="blog-bar-row"><span class="blog-bar-label">${escapeHtml(e.label)}</span><div class="blog-bar-track"><div class="blog-bar-fill" style="width:${pct}%"></div></div><span class="blog-bar-value">${escapeHtml(e.display)}</span></div>`;
    })
    .join("");

  return `<div class="blog-viz blog-bar-chart"><div class="blog-viz-title">${escapeHtml(title)}</div>${bars}</div>`;
}

function renderFlow(title: string, rows: string[]): string {
  const pipelines = rows
    .filter((r) => r.includes("->"))
    .map((row) => {
      const steps = row.split("->").map((s) => s.trim());
      const boxes = steps
        .map((s) => `<span class="blog-flow-box">${escapeHtml(s)}</span>`)
        .join('<span class="blog-flow-arrow">\u2192</span>');
      return `<div class="blog-flow-row">${boxes}</div>`;
    })
    .join("");

  return `<div class="blog-viz blog-flow"><div class="blog-viz-title">${escapeHtml(title)}</div>${pipelines}</div>`;
}

function renderMetric(rows: string[]): string {
  const metrics = rows
    .filter((r) => r.includes("|"))
    .map((row) => {
      const parts = row.split("|").map((s) => s.trim());
      return `<div class="blog-metric"><div class="blog-metric-value">${escapeHtml(parts[0])}</div><div class="blog-metric-label">${escapeHtml(parts[1] || "")}</div></div>`;
    })
    .join("");

  return `<div class="blog-viz blog-metrics">${metrics}</div>`;
}

function renderMarkdown(content: string): string {
  const lines = content.split("\n");
  const blocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Data viz blocks: :::bar-chart, :::flow, :::metric
    const vizMatch = line.trimStart().match(/^:::(bar-chart|flow|metric)\s*(.*)?$/);
    if (vizMatch) {
      const vizType = vizMatch[1];
      const vizTitle = (vizMatch[2] || "").trim();
      const vizLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trimStart() !== ":::") {
        if (lines[i].trim()) vizLines.push(lines[i].trim());
        i++;
      }
      i++; // skip closing :::
      if (vizType === "bar-chart") {
        blocks.push(renderBarChart(vizTitle, vizLines));
      } else if (vizType === "flow") {
        blocks.push(renderFlow(vizTitle, vizLines));
      } else if (vizType === "metric") {
        blocks.push(renderMetric(vizLines));
      }
      continue;
    }

    // Fenced code blocks
    if (line.trimStart().startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(escapeHtml(lines[i]));
        i++;
      }
      i++; // skip closing ```
      blocks.push(`<pre><code>${codeLines.join("\n")}</code></pre>`);
      continue;
    }

    // Blockquotes
    if (line.trimStart().startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith("> ")) {
        quoteLines.push(inlineFormat(lines[i].replace(/^>\s?/, "")));
        i++;
      }
      blocks.push(`<blockquote>${quoteLines.join("<br/>")}</blockquote>`);
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      blocks.push(`<h3>${inlineFormat(line.slice(4))}</h3>`);
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      const text = line.slice(3);
      const id = slugify(text);
      blocks.push(`<h2 id="${id}">${inlineFormat(text)}</h2>`);
      i++;
      continue;
    }

    // Lists
    if (line.trimStart().startsWith("- ") || /^\d+\.\s/.test(line.trimStart())) {
      const isOrdered = /^\d+\.\s/.test(line.trimStart());
      const tag = isOrdered ? "ol" : "ul";
      const items: string[] = [];
      while (i < lines.length) {
        const cur = lines[i].trimStart();
        if (cur.startsWith("- ") || /^\d+\.\s/.test(cur)) {
          const text = cur.replace(/^\d+\.\s+/, "").replace(/^-\s+/, "");
          items.push(`<li>${inlineFormat(text)}</li>`);
          i++;
        } else if (!cur && i + 1 < lines.length && (lines[i + 1].trimStart().startsWith("- ") || /^\d+\.\s/.test(lines[i + 1].trimStart()))) {
          // Skip blank lines between list items
          i++;
        } else {
          break;
        }
      }
      blocks.push(`<${tag}>${items.join("")}</${tag}>`);
      continue;
    }

    // Empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // Paragraphs: collect consecutive non-empty, non-special lines
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() && !lines[i].startsWith("#") && !lines[i].trimStart().startsWith("```") && !lines[i].trimStart().startsWith("> ") && !lines[i].trimStart().startsWith("- ") && !/^\d+\.\s/.test(lines[i].trimStart())) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length) {
      blocks.push(`<p>${inlineFormat(paraLines.join(" "))}</p>`);
    }
  }

  return blocks.join("\n");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
}
