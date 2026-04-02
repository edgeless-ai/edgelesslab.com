import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
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

      <section className="pt-28 pb-20 px-6">
        <div className="max-w-[1080px] mx-auto">
          <div className="flex items-baseline gap-4 mb-3">
            <h1
              className="text-3xl sm:text-4xl font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Products
            </h1>
            <span
              className="text-xs font-mono"
              style={{ color: "var(--text-tertiary)" }}
            >
              {products.length} tools &middot; {products.filter(p => p.price === "Free").length} free
            </span>
          </div>
          <div className="max-w-[600px] mb-12">
            <ProductsSubtitle />
          </div>

          <ProductsGrid products={products} />
        </div>
      </section>

      <Footer />
    </div>
  );
}
