import { NextResponse } from "next/server";

const PAPERCLIP_API = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3100";
const PAPERCLIP_COMPANY = process.env.PAPERCLIP_COMPANY_ID ?? "c5ea22fb-99d2-46a1-87c6-e7fc1ab0d712";

export interface ShippedItem {
  identifier: string;
  title: string;
  completedAt: string | null;
}

export async function GET() {
  try {
    const res = await fetch(
      `${PAPERCLIP_API}/api/companies/${PAPERCLIP_COMPANY}/issues?status=done&limit=3`,
      { next: { revalidate: 0 } }
    );

    if (!res.ok) {
      throw new Error(`Paperclip API error: ${res.status}`);
    }

    const issues = (await res.json()) as Array<{
      identifier: string;
      title: string;
      completedAt: string | null;
    }>;

    const items: ShippedItem[] = issues.map((issue) => ({
      identifier: issue.identifier,
      title: issue.title,
      completedAt: issue.completedAt,
    }));

    return NextResponse.json({ items, source: "live" });
  } catch (err) {
    // Static fallback: return last-known shipped items so the widget never blanks.
    const fallback: ShippedItem[] = [
      {
        identifier: "EDGA-3629",
        title: "[COO Sweep] EDGA-3563: Unassigned critical TODO issue",
        completedAt: "2026-05-17T15:00:18.903Z",
      },
      {
        identifier: "EDGA-3641",
        title: "Recover stalled issue EDGA-3629",
        completedAt: "2026-05-17T14:42:45.966Z",
      },
      {
        identifier: "EDGA-673",
        title: "[OAuth] Restore Gmail OAuth for newsletter pipeline",
        completedAt: "2026-05-16T12:54:52.141Z",
      },
    ];

    return NextResponse.json(
      { items: fallback, source: "fallback", error: String(err) },
      { status: 200 }
    );
  }
}
