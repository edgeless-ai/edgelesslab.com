"use client";

import {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { usePreText } from "@/hooks/use-pretext";
import { PreTextMasonry } from "@/components/ui/pretext-masonry";
import type { Product } from "@/lib/data";

/** Fixed-height zones in each card (px). */
const CARD_PADDING = 48; // p-6 top+bottom
const HEADER_HEIGHT = 32; // name line
const PRICE_HEIGHT = 40; // price + margin
const DESC_MARGIN = 20; // mb-5
const TOGGLE_HEIGHT = 36; // expand/collapse button
const CTA_HEIGHT = 28; // buy link
const FEATURE_ITEM_HEIGHT = 24;
const FEATURE_GAP = 8;
const FEATURE_PADDING = 16;

const DESC_FONT = '14px "Geist"';
const DESC_LINE_HEIGHT = 22.4;
const FEATURE_FONT = '12px "Geist"';
const FEATURE_LINE_HEIGHT = 19.2;

/**
 * Product card grid with draggable masonry layout.
 *
 * Cards are draggable -- pick up and drop to reorder. Masonry recalculates
 * instantly because heights are pre-measured by PreText (no DOM measurement).
 * Features expand with cascading reveal animation.
 */
export function ProductsGrid({ products }: { products: Product[] }) {
  const { ready, prepare, layout } = usePreText("Geist");
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [cardOrder, setCardOrder] = useState<string[]>(() =>
    products.map((p) => p.name)
  );

  // Drag state
  const [dragState, setDragState] = useState<{
    key: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    cardRect: DOMRect;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const dragRef = useRef(dragState);
  dragRef.current = dragState;

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
  const cardWidth =
    containerWidth > 0 ? (containerWidth - gap * (columns - 1)) / columns : 320;
  const textWidth = cardWidth - CARD_PADDING;

  const toggleCard = useCallback((name: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  // Global pointer move/up for drag
  useEffect(() => {
    if (!dragState) return;

    const onMove = (e: globalThis.PointerEvent) => {
      setDragState((prev) =>
        prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null
      );
    };

    const onUp = () => {
      const ds = dragRef.current;
      if (ds && containerRef.current) {
        // Determine drop position in grid
        const containerRect = containerRef.current.getBoundingClientRect();
        const dropX = ds.currentX - containerRect.left;
        const dropY = ds.currentY - containerRect.top + containerRef.current.scrollTop;
        const colWidth = (containerWidth - gap * (columns - 1)) / columns;

        // Find which column the drop landed in
        const dropCol = Math.min(
          columns - 1,
          Math.max(0, Math.floor(dropX / (colWidth + gap)))
        );

        // Find insertion point based on Y position within the masonry
        const draggedKey = ds.key;
        const otherKeys = cardOrder.filter((k) => k !== draggedKey);

        // Simple: find the card closest to drop position and insert before/after
        let bestIndex = otherKeys.length; // default: end
        let bestDist = Infinity;

        // Get current placed positions from masonry calculation
        const heights = new Map<string, number>();
        for (const key of cardOrder) {
          const product = products.find((p) => p.name === key);
          if (!product) continue;
          let h = estimateHeight(product, ready, prepare, layout, textWidth, expandedCards.has(key));
          heights.set(key, h);
        }

        // Run mini masonry to find positions of non-dragged cards
        const colHeights = new Array(columns).fill(0);
        const positions: Array<{ key: string; x: number; y: number }> = [];
        for (const key of otherKeys) {
          let shortest = 0;
          for (let c = 1; c < columns; c++) {
            if (colHeights[c] < colHeights[shortest]) shortest = c;
          }
          const x = shortest * (colWidth + gap);
          const y = colHeights[shortest];
          positions.push({ key, x, y });
          colHeights[shortest] += (heights.get(key) ?? 200) + gap;
        }

        // Find where to insert based on proximity
        for (let i = 0; i < positions.length; i++) {
          const pos = positions[i];
          const dist = Math.abs(pos.y - dropY) + Math.abs(pos.x - dropX) * 0.5;
          if (dist < bestDist) {
            bestDist = dist;
            // Insert before this card if we're above its midpoint
            const cardH = heights.get(pos.key) ?? 200;
            bestIndex = dropY < pos.y + cardH / 2 ? i : i + 1;
          }
        }

        const newOrder = [...otherKeys];
        newOrder.splice(bestIndex, 0, draggedKey);
        setCardOrder(newOrder);
      }
      setDragState(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragState, cardOrder, columns, containerWidth, gap, products, ready, prepare, layout, textWidth, expandedCards]);

  const handleDragStart = useCallback(
    (key: string, e: ReactPointerEvent<HTMLDivElement>) => {
      // Don't drag if clicking a button or link
      const target = e.target as HTMLElement;
      if (target.closest("button") || target.closest("a")) return;

      const cardEl = e.currentTarget;
      const rect = cardEl.getBoundingClientRect();

      setDragState({
        key,
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
        cardRect: rect,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
      });
    },
    []
  );

  // Ordered products
  const orderedProducts = useMemo(() => {
    const map = new Map(products.map((p) => [p.name, p]));
    return cardOrder.map((key) => map.get(key)).filter(Boolean) as Product[];
  }, [products, cardOrder]);

  // Measure all card heights
  const masonryItems = useMemo(() => {
    return orderedProducts.map((product) => {
      const isExpanded = expandedCards.has(product.name);
      const totalHeight = estimateHeight(
        product,
        ready,
        prepare,
        layout,
        textWidth,
        isExpanded
      );
      const isDragging = dragState?.key === product.name;

      return {
        key: product.name,
        height: totalHeight,
        element: (
          <ProductCard
            product={product}
            expanded={isExpanded}
            featuresHeight={measureFeatures(product, ready, prepare, layout, textWidth)}
            onToggle={() => toggleCard(product.name)}
            isDragging={isDragging}
            onDragStart={(e: ReactPointerEvent<HTMLDivElement>) =>
              handleDragStart(product.name, e)
            }
          />
        ),
      };
    });
  }, [
    orderedProducts,
    ready,
    prepare,
    layout,
    textWidth,
    expandedCards,
    toggleCard,
    dragState?.key,
    handleDragStart,
  ]);

  // Filter out dragged card from masonry
  const visibleItems = useMemo(
    () => (dragState ? masonryItems.filter((i) => i.key !== dragState.key) : masonryItems),
    [masonryItems, dragState]
  );

  // Dragged card overlay
  const draggedItem = dragState
    ? masonryItems.find((i) => i.key === dragState.key)
    : null;

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <PreTextMasonry
        items={visibleItems}
        gap={gap}
        breakpoints={[
          { minWidth: 1024, columns: 3 },
          { minWidth: 640, columns: 2 },
          { minWidth: 0, columns: 1 },
        ]}
      />

      {/* Dragged card follows pointer */}
      {dragState && draggedItem && (
        <div
          style={{
            position: "fixed",
            left: `${dragState.currentX - dragState.offsetX}px`,
            top: `${dragState.currentY - dragState.offsetY}px`,
            width: `${dragState.cardRect.width}px`,
            zIndex: 1000,
            transform: "scale(1.03) rotate(1.5deg)",
            transition: "transform 0.15s ease",
            pointerEvents: "none",
            filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.4))",
          }}
        >
          {draggedItem.element}
        </div>
      )}
    </div>
  );
}

/** Measure features section height */
function measureFeatures(
  product: Product,
  ready: boolean,
  prepare: ReturnType<typeof usePreText>["prepare"],
  layout: ReturnType<typeof usePreText>["layout"],
  textWidth: number
): number {
  if (!ready || !prepare || !layout || textWidth <= 0) return 0;
  let h = 0;
  for (const feature of product.features) {
    const fp = prepare(feature, FEATURE_FONT);
    if (fp) {
      h += layout(fp, textWidth - 12, FEATURE_LINE_HEIGHT)?.height ?? FEATURE_ITEM_HEIGHT;
      h += FEATURE_GAP;
    }
  }
  return h + FEATURE_PADDING;
}

/** Estimate total card height */
function estimateHeight(
  product: Product,
  ready: boolean,
  prepare: ReturnType<typeof usePreText>["prepare"],
  layout: ReturnType<typeof usePreText>["layout"],
  textWidth: number,
  isExpanded: boolean
): number {
  let descHeight = 70;
  if (ready && prepare && layout && textWidth > 0) {
    const dp = prepare(product.description, DESC_FONT);
    if (dp) descHeight = layout(dp, textWidth, DESC_LINE_HEIGHT)?.height ?? 70;
  }
  const base =
    CARD_PADDING + HEADER_HEIGHT + PRICE_HEIGHT + descHeight + DESC_MARGIN + TOGGLE_HEIGHT + CTA_HEIGHT;
  if (!isExpanded) return base;
  return base + measureFeatures(product, ready, prepare, layout, textWidth);
}

function ProductCard({
  product,
  expanded,
  featuresHeight,
  onToggle,
  isDragging,
  onDragStart,
}: {
  product: Product;
  expanded: boolean;
  featuresHeight: number;
  onToggle: () => void;
  isDragging: boolean;
  onDragStart: (e: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  const [wasExpanded, setWasExpanded] = useState(false);
  const justExpanded = expanded && !wasExpanded;

  useEffect(() => {
    setWasExpanded(expanded);
  }, [expanded]);

  return (
    <div
      onPointerDown={onDragStart}
      className="group relative flex flex-col rounded-xl border p-6 h-full transition-all select-none"
      style={{
        background: "var(--bg-raised)",
        borderColor: isDragging ? "var(--accent)" : "var(--border-subtle)",
        cursor: isDragging ? "grabbing" : "grab",
        opacity: isDragging ? 0.3 : 1,
        transition: "border-color 0.2s, opacity 0.2s, box-shadow 0.2s",
      }}
    >
      {product.badge && (
        <span
          className="absolute top-4 right-4 px-2 py-0.5 text-xs font-mono rounded-md"
          style={{
            background:
              product.comingSoon
                ? "rgba(255,255,255,0.08)"
                : product.price === "Free"
                  ? "rgba(34,197,94,0.15)"
                  : "var(--accent-muted)",
            color:
              product.comingSoon
                ? "var(--text-tertiary)"
                : product.price === "Free"
                  ? "var(--green)"
                  : "var(--accent)",
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

      {/* Plain description */}
      <p
        className="text-sm mb-5"
        style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}
      >
        {product.description}
      </p>

      {/* Accordion toggle */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }}
        className="flex items-center gap-1.5 text-xs font-mono mb-2 transition-colors hover:text-white"
        style={{ color: "var(--text-tertiary)" }}
      >
        <ChevronDown
          size={12}
          style={{
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        />
        {expanded ? "Less" : `${product.features.length} features`}
      </button>

      {/* Cascading feature reveal */}
      <div
        style={{
          maxHeight: expanded ? `${featuresHeight}px` : "0px",
          overflow: "hidden",
          transition: expanded
            ? "max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
            : "max-height 0.25s cubic-bezier(0.4, 0, 1, 1)",
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
                  ? "translateY(0) scale(1)"
                  : `translateY(${-6 - i * 2}px) scale(0.97)`,
                transition: justExpanded
                  ? `opacity 0.3s ease ${i * 60}ms, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 60}ms`
                  : "opacity 0.12s ease, transform 0.12s ease",
              }}
            >
              {/* Animated bullet dot */}
              <span
                className="mt-1 flex-shrink-0"
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  background: "var(--accent)",
                  transform: expanded ? "scale(1)" : "scale(0)",
                  transition: justExpanded
                    ? `transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 60 + 40}ms`
                    : "transform 0.1s ease",
                }}
              />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {product.comingSoon ? (
        <span
          className="flex items-center gap-1 text-sm font-medium mt-auto pt-2"
          style={{ color: "var(--text-tertiary)" }}
        >
          Coming soon
        </span>
      ) : (
        <a
          href={product.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm font-medium hover:text-white transition-colors mt-auto pt-2"
          style={{ color: "var(--text-secondary)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {product.price === "Free"
            ? "Get it free on GitHub"
            : `Buy now \u2014 ${product.price}`}
          <ArrowUpRight size={14} />
        </a>
      )}
    </div>
  );
}
