"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SHOP_LINK, PLOTTER_ORIGINALS, LOOP_PACKS, type EtsyListing } from "@/lib/etsy-listings";

interface EtsyCalloutProps {
  /** Show plotter originals (images, titles, prices). Defaults to false. */
  originals?: boolean;
  /** Show loop pack links. Defaults to false. */
  packs?: boolean;
  /** Override the heading text. Auto-set based on mode. */
  heading?: string;
}

function ListingCard({ listing, page }: { listing: EtsyListing; page: string }) {
  return (
    <a
      href={listing.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg border p-4 transition-colors hover:border-white/20"
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <div className="text-xs font-mono uppercase tracking-[0.12em] mb-1" style={{ color: "var(--accent)" }}>
        Etsy
      </div>
      <div className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
        {listing.title}
      </div>
      <div className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>
        {listing.price}
      </div>
    </a>
  );
}

export function EtsyCallout({ originals = false, packs = false, heading }: EtsyCalloutProps) {
  if (!originals && !packs) return null;

  const label = heading ?? (originals ? "Buy an original" : "Get the loop packs");

  return (
    <section className="mt-12 pt-8 border-t" style={{ borderColor: "var(--border-subtle)" }}>
      <h2 className="text-xs font-mono uppercase tracking-[0.12em] mb-4" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {originals &&
          PLOTTER_ORIGINALS.map((l) => (
            <ListingCard key={l.id} listing={l} page="pen-plotter-art" />
          ))}
        {packs &&
          LOOP_PACKS.map((l) => (
            <ListingCard key={l.id} listing={l} page="tartanism" />
          ))}
      </div>
      <a
        href={SHOP_LINK.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-mono underline hover:no-underline"
        style={{ color: "var(--accent)" }}
      >
        View all LineFields listings <ArrowUpRight size={12} />
      </a>
    </section>
  );
}