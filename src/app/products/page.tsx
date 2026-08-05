import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { createPageMetadata } from "@/lib/metadata";
import { ProductsGrid } from "@/components/products-grid";
import { ProductsSubtitle } from "@/components/products-subtitle";
import { products } from "@/lib/data";

export const metadata = createPageMetadata({
  title: "Resources",
  description:
    "Free references and paid implementation kits extracted from systems used inside Edgeless Lab.",
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
        "name": "Edgeless Lab Resources",
        "description": "Free references and paid implementation kits from working systems.",
        "numberOfItems": products.filter(p => !p.comingSoon).length,
        "itemListElement": products.filter(p => !p.comingSoon).map((p, i) => ({
          "@type": "ListItem",
          "position": i + 1,
          "url": p.slug ? `https://edgelesslab.com/products/${p.slug}` : p.href,
          "name": p.name,
        })),
      }} />

      <main id="main-content">
      <section className="px-6 pb-20 pt-36 sm:pt-44">
        <div className="max-w-[1080px] mx-auto">
          <div className="lab-metadata mb-6 flex items-center gap-3" style={{ color: "var(--relay)" }}>
            <span className="h-2 w-2" style={{ background: "var(--relay)" }} />
            Resources / from working systems
          </div>

          <h1
            className="mb-6 text-5xl font-semibold leading-[0.92] tracking-[-0.045em] sm:text-6xl lg:text-7xl"
            style={{ color: "var(--text-primary)" }}
          >
            Resources
          </h1>

          <div className="max-w-[640px] mb-8">
            <ProductsSubtitle />
          </div>

          <div className="mb-12 flex flex-wrap items-center gap-3">
            <a
              href="https://edgelessai.gumroad.com/l/claude-memory-kit"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 border px-5 font-mono text-xs uppercase tracking-[0.1em] transition-colors"
              style={{
                color: "var(--green)",
                borderColor: "rgba(52, 211, 153, 0.4)",
                background: "rgba(52, 211, 153, 0.06)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--green)" }} />
              Start with Claude Memory Kit
            </a>
            <span className="font-mono text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              Open references first
            </span>
          </div>

          <ProductsGrid products={products} />
        </div>
      </section>
      </main>

      <Footer />
    </div>
  );
}
