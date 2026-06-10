export const dynamic = "force-static";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const category = searchParams.get('category');

  const upstream = new URL(`${SOUL_API}/v1/souls`);
  if (category && category !== 'all') upstream.searchParams.set('category', category);
  if (q) upstream.searchParams.set('limit', '200');

  const res = await fetch(upstream.toString(), {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  const raw = await res.json();
  const items = Array.isArray(raw) ? raw : [];

  const filtered = items.filter((item: Record<string, unknown>) => {
    if (!q) return true;
    const hay = [item.slug, item.name, item.category]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return new Response(JSON.stringify({ souls: filtered.slice(0, 50), count: filtered.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
