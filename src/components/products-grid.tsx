"use client";

import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { usePreText } from "@/hooks/use-pretext";
import { KineticPreText } from "@/components/ui/kinetic-pretext";
import { PreTextMasonry } from "@/components/ui/pretext-masonry";
import type { Product } from "@/lib/data";

/** Fixed-height zones in each card (px). */
const CARD_PADDING = 48; // p-6 top+bottom
const HEADER_HEIGHT = 32; // name line
const PRICE_HEIGHT = 40; // price + margin
const DESC_MARGIN = 20; // mb-5
const TOGGLE_HEIGHT = 36; // expand/collapse button
const CTA_HEIGHT = 28; // buy link
const FEATURE_ITEM_HEIGHT = 24; // single feature line (approx)
const FEATURE_GAP = 8;
const FEATURE_PADDING = 16; // top+bottom padding in expanded region

const DESC_FONT = '14px "Geist"';
const DESC_LINE_HEIGHT = 22.4;
const FEATURE_FONT = '12px "Geist"';
const FEATURE_LINE_HEIGHT = 19.2;

/**
 * Product card grid with PreText-measured masonry layout.
 *
 * Each card's height is pre-calculated: description measured by PreText,
 * features measured for accordion expand, fixed zones summed. Cards are
 * placed by shortest-column algorithm -- no DOM measurement.
 *
 * Features expand with PreText-measured target height (zero layout shift).
 * Masonry re-layouts on expand/collapse with smooth card repositioning.
 */
export function ProductsGrid({ products }: { products: Product[] }) {
  const { ready, prepare, layout } = usePreText("Geist");
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!containerRef.current) return;
    const measure = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.clientWidth);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const columns = containerWidth >= 1024 ? 3 : containerWidth >= 640 ? 2 : 1;
  const gap = 16;
  const cardWidth = containerWidth > 0
    ? (containerWidth - gap * (columns - 1)) / columns
    : 320;
  const textWidth = cardWidth - CARD_PADDING;

  const toggleCard = useCallback((name: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  // Measure all card heights
  const masonryItems = useMemo(() => {
    return products.map((product) => {
      let descHeight = 70; // fallback estimate
      let featuresHeight = 0;

      if (ready && prepare && layout && textWidth > 0) {
        const descPrepared = prepare(product.description, DESC_FONT);
        if (descPrepared) {
          descHeight = layout(descPrepared, textWidth, DESC_LINE_HEIGHT)?.height ?? 70;
        }

        // Measure features for accordion
        for (const feature of product.features) {
          const fp = prepare(feature, FEATURE_FONT);
          if (fp) {
            featuresHeight += layout(fp, textWidth - 12, FEATURE_LINE_HEIGHT)?.height ?? FEATURE_ITEM_HEIGHT;
            featuresHeight += FEATURE_GAP;
          }
        }
        featuresHeight += FEATURE_PADDING;
      }

      const isExpanded = expandedCards.has(product.name);
      const baseHeight =
        CARD_PADDING + HEADER_HEIGHT + PRICE_HEIGHT + descHeight + DESC_MARGIN + TOGGLE_HEIGHT + CTA_HEIGHT;
      const totalHeight = isExpanded ? baseHeight + featuresHeight : baseHeight;

      return {
        key: product.name,
        height: totalHeight,
        element: (
          <ProductCard
            product={product}
            expanded={isExpanded}
            featuresHeight={featuresHeight}
            onToggle={() => toggleCard(product.name)}
          />
        ),
      };
    });
  }, [products, ready, prepare, layout, textWidth, expandedCards, toggleCard]);

  return (
    <div ref={containerRef}>
      <PreTextMasonry
        items={masonryItems}
        gap={gap}
        breakpoints={[
          { minWidth: 1024, columns: 3 },
          { minWidth: 640, columns: 2 },
          { minWidth: 0, columns: 1 },
        ]}
      />
    </div>
  );
}

function ProductCard({
  product,
  expanded,
  featuresHeight,
  onToggle,
}: {
  product: Product;
  expanded: boolean;
  featuresHeight: number;
  onToggle: () => void;
}) {
  const [wasExpanded, setWasExpanded] = useState(false);
  const justExpanded = expanded && !wasExpanded;

  useEffect(() => {
    setWasExpanded(expanded);
  }, [expanded]);

  return (
    <div
      className="group relative flex flex-col rounded-xl border p-6 h-full transition-colors hover:border-white/20"
      style={{
        background: "var(--bg-raised)",
        borderColor: "var(--border-subtle)",
      }}
    >
      {product.badge && (
        <span
          className="absolute top-4 right-4 px-2 py-0.5 text-xs font-mono rounded-md"
          style={{
            background:
              product.price === "Free"
                ? "rgba(34,197,94,0.15)"
                : "var(--accent-muted)",
            color:
              product.price === "Free" ? "var(--green)" : "var(--accent)",
          }}
        >
          {product.badge}
        </span>
      )}

      <h2
        className="text-lg font-semibold mb-1"
        style={{ color: "var(--text-primary)" }}
      >
        {product.name}
      </h2>

      <span
        className="text-2xl font-bold font-mono mb-3"
        style={{
          color: product.price === "Free" ? "var(--green)" : "var(--accent)",
        }}
      >
        {product.price}
      </span>

      {/* Cursor-reactive description -- text flows around your mouse */}
      <div className="mb-5">
        <KineticPreText
          text={product.description}
          font={DESC_FONT}
          lineHeight={DESC_LINE_HEIGHT}
          cursorRadius={24}
          cursorColor="var(--accent)"
          style={{ color: "var(--text-secondary)" }}
          fallback={
            <p className="text-sm" style={{ lineHeight: 1.6 }}>
              {product.description}
            </p>
          }
        />
      </div>

      {/* Accordion toggle */}
      <button
        onClick={(e) => {
          e.preventDefault();
          onToggle();
        }}
        className="flex items-center gap-1.5 text-xs font-mono mb-2 transition-colors hover:text-white"
        style={{ color: "var(--text-tertiary)" }}
      >
        <ChevronDown
          size={12}
          style={{
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
        {expanded ? "Less" : `${product.features.length} features`}
      </button>

      {/* Staggered feature reveal */}
      <div
        style={{
          maxHeight: expanded ? `${featuresHeight}px` : "0px",
          overflow: "hidden",
          transition: "max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <ul className="space-y-2 py-2">
          {product.features.map((feature, i) => (
            <li
              key={feature}
              className="text-xs flex items-start gap-2"
              style={{
                color: "var(--text-tertiary)",
                opacity: expanded ? 1 : 0,
                transform: expanded
                  ? "translateX(0)"
                  : `translateX(${-12 - i * 4}px)`,
                transition: justExpanded
                  ? `opacity 0.35s ease ${i * 55}ms, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${i * 55}ms`
                  : "opacity 0.15s ease, transform 0.15s ease",
              }}
            >
              <span
                className="mt-1 w-1 h-1 rounded-full flex-shrink-0"
                style={{
                  background: "var(--accent)",
                  opacity: expanded ? 1 : 0,
                  transition: justExpanded
                    ? `opacity 0.3s ease ${i * 55 + 30}ms`
                    : "opacity 0.1s ease",
                }}
              />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <a
        href={product.href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-sm font-medium hover:text-white transition-colors mt-auto pt-2"
        style={{ color: "var(--text-secondary)" }}
      >
        {product.price === "Free"
          ? "Get it free on GitHub"
          : `Buy now \u2014 ${product.price}`}
        <ArrowUpRight size={14} />
      </a>
    </div>
  );
}
