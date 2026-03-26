import { posts } from "@/lib/blog";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
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

  const fullTitle = `${post.title} | Edgeless Labs`;

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
      siteName: "Edgeless Labs",
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
          author: {
            "@type": "Person",
            name: "David Murray",
          },
          publisher: {
            "@type": "Organization",
            name: "Edgeless Labs",
            url: "https://edgelesslab.com",
          },
          url: `https://edgelesslab.com/blog/${post.slug}`,
        }}
      />

      <article className="pt-28 pb-20 px-6">
        <div className="max-w-[680px] mx-auto">
          {/* Header */}
          <div className="mb-12">
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
          <div
            className="prose-custom"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
          />

          {/* Back link */}
          <div className="mt-16 pt-8 border-t" style={{ borderColor: "var(--border-subtle)" }}>
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

function renderMarkdown(content: string): string {
  const lines = content.split("\n");
  const blocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

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
      blocks.push(`<h2>${inlineFormat(line.slice(3))}</h2>`);
      i++;
      continue;
    }

    // Lists
    if (line.trimStart().startsWith("- ") || /^\d+\.\s/.test(line.trimStart())) {
      const isOrdered = /^\d+\.\s/.test(line.trimStart());
      const tag = isOrdered ? "ol" : "ul";
      const items: string[] = [];
      while (i < lines.length && (lines[i].trimStart().startsWith("- ") || /^\d+\.\s/.test(lines[i].trimStart()))) {
        const text = lines[i].trimStart().replace(/^\d+\.\s+/, "").replace(/^-\s+/, "");
        items.push(`<li>${inlineFormat(text)}</li>`);
        i++;
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

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
}
