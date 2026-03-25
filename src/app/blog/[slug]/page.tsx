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
      url: `https://edgelesslab.com/blog/${post.slug}`,
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
                  className="px-2.5 py-1 text-[11px] font-mono rounded-md"
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
  return content
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";

      if (trimmed.startsWith("## ")) {
        return `<h2>${trimmed.slice(3)}</h2>`;
      }
      if (trimmed.startsWith("### ")) {
        return `<h3>${trimmed.slice(4)}</h3>`;
      }

      if (trimmed.startsWith("1. ") || trimmed.startsWith("- ")) {
        const isOrdered = trimmed.startsWith("1. ");
        const tag = isOrdered ? "ol" : "ul";
        const items = trimmed
          .split("\n")
          .filter((l) => l.trim())
          .map((l) => {
            const text = l.replace(/^\d+\.\s+/, "").replace(/^-\s+/, "");
            return `<li>${inlineFormat(text)}</li>`;
          })
          .join("");
        return `<${tag}>${items}</${tag}>`;
      }

      return `<p>${inlineFormat(trimmed)}</p>`;
    })
    .join("\n");
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
}
