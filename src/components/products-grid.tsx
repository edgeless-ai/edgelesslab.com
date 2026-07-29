"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { GumroadButton } from "@/components/gumroad-button";
import type { Product } from "@/lib/data";

export function ProductsGrid({ products }: { products: Product[] }) {
  return (
    <div
      className="grid gap-px border md:grid-cols-2"
      style={{
        borderColor: "var(--border-subtle)",
        background: "var(--border-subtle)",
      }}
    >
      {products.map((product) => (
        <article
          key={product.name}
          className="flex min-h-[360px] flex-col p-6 sm:p-8"
          style={{ background: "var(--bg-surface)" }}
        >
          <div className="flex items-center justify-between gap-4">
            <span className="lab-metadata" style={{ color: "var(--relay)" }}>
              {product.category}
            </span>
            <span
              className="font-mono text-xs"
              style={{
                color:
                  product.price === "Free"
                    ? "var(--green)"
                    : "var(--accent)",
              }}
            >
              {product.comingSoon ? "Coming soon" : product.price}
            </span>
          </div>

          <h2 className="mt-9 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
            {product.name}
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
            {product.description}
          </p>

          <ul className="mt-6 space-y-2 border-t pt-5" style={{ borderColor: "var(--border-subtle)" }}>
            {product.features.slice(0, 3).map((feature) => (
              <li
                key={feature}
                className="grid grid-cols-[8px_1fr] gap-3 text-xs leading-5"
                style={{ color: "var(--text-tertiary)" }}
              >
                <span className="mt-[7px] h-1 w-1" style={{ background: "var(--relay)" }} />
                {feature}
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-8">
            {product.comingSoon ? (
              <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                In development
              </span>
            ) : product.slug ? (
              <Link
                href={`/products/${product.slug}`}
                className="group inline-flex items-center gap-2 text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                View details · {product.price}
                <ArrowUpRight
                  size={14}
                  className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
            ) : (
              <GumroadButton
                href={product.href}
                price={product.price}
                productName={product.name}
                className="inline-flex items-center gap-2 text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              />
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
