import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { createPageMetadata } from "@/lib/metadata";
import { ProductsGrid } from "@/components/products-grid";
import { ProductsSubtitle } from "@/components/products-subtitle";
import { products } from "@/lib/data";

export const metadata = createPageMetadata({
  title: "Products",
  description:
    "Developer tools and templates for AI agent infrastructure. Built from production systems.",
  path: "/products",
  keywords: ["AI products", "Claude Memory Kit", "prompt engineering", "developer templates", "MCP servers", "agent cookbook"],
});

export default function ProductsPage() {
  return (
    <div
      className="flex flex-col min-h-full"
      style={{ background: "var(--bg-base)" }}
    >
      <Nav />

      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Edgeless Lab Products",
        "description": "Developer tools and templates for AI agent infrastructure.",
        "numberOfItems": products.filter(p => !p.comingSoon).length,
        "itemListElement": products.filter(p => !p.comingSoon).map((p, i) => ({
          "@type": "ListItem",
          "position": i + 1,
          "url": p.slug ? `https://edgelesslab.com/products/${p.slug}` : p.href,
          "name": p.name,
        })),
      }} />

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-[1080px] mx-auto">
          <div
            className="inline-flex items-center gap-2.5 mb-6 px-3 py-1.5 rounded-full border"
            style={{
              borderColor: "rgba(129, 140, 248, 0.25)",
              background: "var(--accent-muted)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--accent)" }}
            />
            <span
              className="text-[11px] font-mono uppercase tracking-[0.14em]"
              style={{ color: "var(--accent)" }}
            >
              On Gumroad &middot; {products.filter(p => !p.comingSoon).length} live
            </span>
          </div>

          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.92] mb-6"
            style={{ color: "var(--text-primary)" }}
          >
            Products
          </h1>

          <div className="max-w-[640px] mb-8">
            <ProductsSubtitle />
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-12">
            <a
              href="https://edgelessai.gumroad.com/l/claude-memory-kit"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-10 px-5 text-xs font-mono uppercase tracking-[0.1em] rounded-full border transition-all hover:brightness-110 hover:scale-[1.02]"
              style={{
                color: "var(--green)",
                borderColor: "rgba(52, 211, 153, 0.4)",
                background: "rgba(52, 211, 153, 0.06)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--green)" }} />
              Start free with Claude Memory Kit
            </a>
            <span
              className="text-[11px] font-mono"
              style={{ color: "var(--text-tertiary)" }}
            >
              30-day refund &middot; instant download
            </span>
          </div>

          <ProductsGrid products={products} />
        </div>
      </section>

      <Footer />
    </div>
  );
}
