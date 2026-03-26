import { posts } from "@/lib/blog";

export const dynamic = "force-static";

const SITE_URL = "https://edgelesslab.com";

function toRfc2822(dateStr: string): string {
  // dateStr is YYYY-MM-DD; parse as UTC noon to avoid date-shift issues
  const d = new Date(`${dateStr}T12:00:00Z`);
  return d.toUTCString();
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(): Promise<Response> {
  const sorted = [...posts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const items = sorted
    .map((post) => {
      const link = `${SITE_URL}/blog/${post.slug}`;
      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <description>${escapeXml(post.description)}</description>
      <pubDate>${toRfc2822(post.date)}</pubDate>
      <guid isPermaLink="true">${link}</guid>
    </item>`.trimStart();
    })
    .join("\n    ");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Edgeless Labs Blog</title>
    <link>${SITE_URL}/blog</link>
    <description>Agent experiments, developer tools, and creative coding from a solo lab.</description>
    <language>en-us</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
