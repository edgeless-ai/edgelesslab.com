import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { products } from "@/lib/data";
import { productContent } from "@/lib/product-content";
import { posts } from "@/lib/blog";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { GumroadButton } from "@/components/gumroad-button";
import { StripeButton } from "@/components/stripe-button";

const SITE = "https://edgelesslab.com";

/**
 * Only products with both a `slug` field AND an entry in productContent
 * get a local landing page. Coming-soon products are excluded so we never
 * publish a page that links to a 404.
 */
function landingProducts() {
  return products.filter(
    (p) => p.slug && !p.comingSoon && productContent[p.slug],
  );
}

export function generateStaticParams() {
  return landingProducts().map((p) => ({ slug: p.slug! }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = products.find((p) => p.slug === slug);
  const content = productContent[slug];
  if (!product || !content) return {};

  const fullTitle = `${product.name} (${product.price}) | Edgeless Lab`;
  const url = `${SITE}/products/${slug}`;
  const image = `${SITE}/product-covers/${slug}.webp`;

  return {
    title: { absolute: fullTitle },
    description: content.shortDescription,
    keywords: [product.name, "Edgeless Lab", "Claude Code", "AI agents", slug.replace(/-/g, " ")],
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: "Edgeless Lab",
      title: fullTitle,
      description: content.shortDescription,
      images: [{ url: image, width: 1280, height: 1280, alt: product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: content.shortDescription,
      images: [image],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = products.find((p) => p.slug === slug);
  const content = productContent[slug];
  if (!product || !content) notFound();

  const priceNumber = Number(product.price.replace(/[^0-9.]/g, "")) || 0;
  const companionPost = posts.find((p) => p.productSlug === slug);

  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
      <Nav />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: content.shortDescription,
          image: `${SITE}/product-covers/${slug}.webp`,
          brand: { "@type": "Brand", name: "Edgeless Lab" },
          url: `${SITE}/products/${slug}`,
          offers: {
            "@type": "Offer",
            url: product.href,
            priceCurrency: "USD",
            price: priceNumber,
            availability: "https://schema.org/InStock",
            seller: { "@type": "Organization", name: "Edgeless Lab", url: SITE },
          },
        }}
      />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE },
            { "@type": "ListItem", position: 2, name: "Products", item: `${SITE}/products` },
            { "@type": "ListItem", position: 3, name: product.name, item: `${SITE}/products/${slug}` },
          ],
        }}
      />

      <article className="pt-28 pb-20 px-6">
        <div className="max-w-[1080px] mx-auto">
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-sm mb-8 transition-colors hover:text-white"
            style={{ color: "var(--text-tertiary)" }}
          >
            <ArrowLeft size={14} /> All products
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-12">
            {/* Main content */}
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="text-xs font-mono uppercase tracking-[0.12em] px-2.5 py-1 rounded-md"
                  style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
                >
                  {product.badge ?? "Edgeless Lab"}
                </span>
                <span
                  className="text-xs font-mono"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {product.price}
                </span>
              </div>

              <h1
                className="text-3xl sm:text-4xl font-bold tracking-tight leading-[1.2] mb-4"
                style={{ color: "var(--text-primary)" }}
              >
                {content.longTitle}
              </h1>

              <p
                className="text-lg font-light mb-10"
                style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}
              >
                {content.shortDescription}
              </p>

              <div
                className="prose-custom"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(content.body) }}
              />

              <div
                className="mt-12 p-6 rounded-lg border"
                style={{ background: "var(--accent-muted)", borderColor: "var(--border-subtle)" }}
              >
                <p
                  className="text-base mb-4"
                  style={{ color: "var(--text-primary)", lineHeight: 1.6 }}
                >
                  {content.callToAction}
                </p>
                {slug === "agent-starter-kit" ? (
                  <StripeButton
                    href={product.href}
                    price={product.price}
                    productName={product.name}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-md font-medium transition-colors hover:opacity-90"
                    style={{ background: "var(--accent)", color: "var(--bg-base)" }}
                    icon
                  />
                ) : (
                  <GumroadButton
                    href={product.href}
                    price={product.price}
                    productName={product.name}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-md font-medium transition-colors hover:opacity-90"
                    style={{ background: "var(--accent)", color: "var(--bg-base)" }}
                    icon
                  />
                )}
                <span
                  className="ml-3 text-xs font-mono"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {product.price === "Free" ? "Free \u00b7 instant download" : `${product.price} \u00b7 instant download`}
                </span>
              </div>
            </div>

            {/* Sidebar */}
            <aside className="space-y-6">
              <div
                className="rounded-xl border overflow-hidden"
                style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}
              >
                <picture>
                  <source
                    srcSet={`/product-covers/${slug}.webp`}
                    type="image/webp"
                  />
                  <img
                    src={`/product-covers/${slug}.webp`}
                    alt={`${product.name} cover`}
                    width={1280}
                    height={1280}
                    className="w-full h-auto block"
                    fetchPriority="high"
                    decoding="async"
                  />
                </picture>
              </div>

              <div
                className="rounded-xl border p-6"
                style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}
              >
                <h2
                  className="text-xs font-mono uppercase tracking-[0.12em] mb-4"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  What&apos;s inside
                </h2>
                <ul className="space-y-2.5">
                  {product.features.map((feature) => (
                    <li
                      key={feature}
                      className="text-[13px]"
                      style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}
                    >
                      &mdash; {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {companionPost && (
                <div
                  className="rounded-xl border p-6"
                  style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}
                >
                  <h2
                    className="text-xs font-mono uppercase tracking-[0.12em] mb-3"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Related blog post
                  </h2>
                  <Link
                    href={`/blog/${companionPost.slug}`}
                    className="text-[14px] font-medium hover:text-white transition-colors block"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {companionPost.title}
                  </Link>
                  <p
                    className="text-[12px] mt-2"
                    style={{ color: "var(--text-tertiary)", lineHeight: 1.5 }}
                  >
                    {companionPost.description}
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
}

/**
 * Minimal markdown renderer matching the one used by the blog detail page.
 * Supports headings (##, ###), lists (-, 1.), bold (**), inline code (`),
 * paragraphs, and the inline link syntax. Kept dependency-free.
 */
function renderMarkdown(content: string): string {
  const lines = content.split("\n");
  const blocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

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
    if (line.startsWith("# ")) {
      blocks.push(`<h1>${inlineFormat(line.slice(2))}</h1>`);
      i++;
      continue;
    }

    if (line.trimStart().startsWith("- ") || /^\d+\.\s/.test(line.trimStart())) {
      const isOrdered = /^\d+\.\s/.test(line.trimStart());
      const tag = isOrdered ? "ol" : "ul";
      const items: string[] = [];
      while (
        i < lines.length &&
        (lines[i].trimStart().startsWith("- ") || /^\d+\.\s/.test(lines[i].trimStart()))
      ) {
        const text = lines[i].trimStart().replace(/^\d+\.\s+/, "").replace(/^-\s+/, "");
        items.push(`<li>${inlineFormat(text)}</li>`);
        i++;
      }
      blocks.push(`<${tag}>${items.join("")}</${tag}>`);
      continue;
    }

    if (!line.trim()) {
      i++;
      continue;
    }

    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("#") &&
      !lines[i].trimStart().startsWith("- ") &&
      !/^\d+\.\s/.test(lines[i].trimStart())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length) {
      blocks.push(`<p>${inlineFormat(paraLines.join(" "))}</p>`);
    } else {
      i++;
    }
  }

  return blocks.join("\n");
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
}
