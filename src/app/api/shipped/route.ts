import { NextResponse } from "next/server";

// Static export: pre-rendered at build time. No network calls.
// The client widget has its own fallback for when this is stale.
export const dynamic = "force-static";

export interface ShippedItem {
  identifier: string;
  title: string;
  completedAt: string | null;
}

// Baked-in data — updated by CI or manually before deploy.
const SHIPPED_ITEMS: ShippedItem[] = [
  {
    identifier: "EDGA-3653",
    title: "Recently Shipped Widget — live on edgelesslab.com",
    completedAt: "2026-05-17T18:00:00.000Z",
  },
  {
    identifier: "EDGA-3629",
    title: "[COO Sweep] EDGA-3563: Unassigned critical TODO issue",
    completedAt: "2026-05-17T15:00:18.903Z",
  },
  {
    identifier: "EDGA-673",
    title: "[OAuth] Restore Gmail OAuth for newsletter pipeline",
    completedAt: "2026-05-16T12:54:52.141Z",
  },
];

export async function GET() {
  return NextResponse.json({ items: SHIPPED_ITEMS, source: "static" });
}
