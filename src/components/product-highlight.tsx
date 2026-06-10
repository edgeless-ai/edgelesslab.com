import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { products } from "@/lib/data";

export function ProductHighlight() {
  // Lead magnets: free products first (the funnel entry)
  const freeProducts = products.filter((p) => p.price === "Free");
  const paidProducts = products.filter((p) => p.price !== "Free");
  // Show up to 4 free lead magnets, then fill with paid products to reach 7 total
  const featuredFree = freeProducts.slice(0, 4);
  const featuredPaid = paidProducts.slice(0, Math.max(0, 7 - featuredFree.length - 1));
  const remaining = products.length - featuredFree.length - featuredPaid.length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {featuredFree.map((product, i) => (
        <a
          key={product.name}
          href={product.href}
          target="_blank"
          rel="noopener noreferrer"
          className="group block rounded-xl border p-5 transition-all hover:scale-[1.01] hover:border-white/20"
          style={{
            background: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
            animation: `fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 0.08}s both`,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {product.name}
            </span>
            <span
              className="text-xs font-mono px-2 py-0.5 rounded-md"
              style={{ background: "rgba(34,197,94,0.15)", color: "var(--green)" }}
            >
              Free
            </span>
          </div>
          <span
            className="text-lg font-bold font-mono block mb-2"
            style={{ color: "var(--green)" }}
          >
            {product.price}
          </span>
          <p
            className="text-xs"
            style={{ color: "var(--text-tertiary)", lineHeight: 1.6 }}
          >
            {product.description}
          </p>
        </a>
      ))}
      {featuredPaid.map((product, i) => (
        <a
          key={product.name}
          href={product.href}
          target="_blank"
          rel="noopener noreferrer"
          className="group block rounded-xl border p-5 transition-all hover:scale-[1.01] hover:border-white/20"
          style={{
            background: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
            animation: `fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1) ${(featuredFree.length + i) * 0.08}s both`,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {product.name}
            </span>
            <ArrowUpRight
              size={14}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "var(--text-tertiary)" }}
            />
          </div>
          <span
            className="text-lg font-bold font-mono block mb-2"
            style={{ color: "var(--accent)" }}
          >
            {product.price}
          </span>
          <p
            className="text-xs"
            style={{ color: "var(--text-tertiary)", lineHeight: 1.6 }}
          >
            {product.description}
          </p>
        </a>
      ))}
      <Link
        href="/products/"
        className="group block rounded-xl border p-5 transition-all hover:scale-[1.01] hover:border-white/20"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border-subtle)",
          animation: `fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1) ${(featuredFree.length + featuredPaid.length) * 0.08}s both`,
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            All products
          </span>
          <span
            className="text-xs font-mono px-2 py-0.5 rounded-md"
            style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
          >
            {products.length}
          </span>
        </div>
        <p
          className="text-xs mb-3"
          style={{ color: "var(--text-tertiary)", lineHeight: 1.6 }}
        >
          Free lead magnets and premium toolkits for building AI agents.
        </p>
        <span
          className="text-xs font-medium flex items-center gap-1"
          style={{ color: "var(--accent)" }}
        >
          +{remaining} more products <ArrowRight size={12} />
        </span>
      </Link>
    </div>
  );
}
