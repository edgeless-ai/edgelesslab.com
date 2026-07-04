import { posts } from "@/lib/blog";
import { products, projects, experiments } from "@/lib/data";

// /llms.txt — Markdown index for LLM crawlers (https://llmstxt.org spec).
// Re-rendered at build time, served as text/plain with 1h cache.

export const dynamic = "force-static";

const SITE_URL = "https://edgelesslab.com";

function oneLine(s: string): string {
  return s.replace(/\r?\n+/g, " ").trim();
}

export async function GET(): Promise<Response> {
  const sortedPosts = [...posts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const recent = sortedPosts.slice(0, 12);
  const editorial = sortedPosts.filter((p) => p.editorial);

  const liveProductsAll = products.filter((p) => !p.comingSoon);
  const freeCount = liveProductsAll.filter((p) => p.price === "Free").length;
  const paidCount = liveProductsAll.length - freeCount;
  const featuredProducts = liveProductsAll.slice(0, 20);
  const liveProjects = projects.filter((p) => p.status !== "Draft");
  const liveExperiments = experiments.filter((e) => e.status !== "Draft");

  const postLine = (p: typeof sortedPosts[number], kind: "editorial" | "field-note") => {
    const url = `${SITE_URL}/blog/${p.slug}`;
    const desc = p.description ? `: ${oneLine(p.description)}` : "";
    return `- [${oneLine(p.title)}](${url}) (${p.date}, ${kind})${desc}`;
  };

  const productLine = (p: typeof products[number]) => {
    const priceTag = p.price && p.price !== "Free" ? ` — ${p.price}` : "";
    const target = p.href || `${SITE_URL}/products/${p.slug || ""}`;
    return `- [${oneLine(p.name)}](${target})${priceTag}: ${oneLine(p.description)}`;
  };

  const itemLine = (item: { slug?: string | undefined; title: string; href?: string | undefined; status: string; description: string; category?: string | undefined }) => {
    const target = item.href || (item.slug ? `${SITE_URL}/projects/${item.slug}` : SITE_URL);
    const cat = item.category ? ` [${item.category}]` : "";
    return `- [${oneLine(item.title)}](${target})${cat} (${item.status}): ${oneLine(item.description)}`;
  };

  const body = `# Edgeless Lab

> One developer shipping autonomous agents, MCP servers, and generative art. ${freeCount} free lead magnets, ${paidCount} premium toolkits. Everything open source. Built in production, released in the open.

## Docs

- [About](${SITE_URL}/about): founder context, mission, and operating principles
- [Now](${SITE_URL}/now): production state, active projects, live signals
- [Projects](${SITE_URL}/projects): shipped and live systems
- [Agents](${SITE_URL}/agents): multi-agent orchestration stack
- [Lab](${SITE_URL}/lab): interactive playgrounds and experiments
- [Creative](${SITE_URL}/creative): generative art, pen-plotter, and visual work
- [Services / Private AI Systems](${SITE_URL}/services/private-ai-systems): custom private AI agent systems for professionals and small businesses
- [Agentic OS series](${SITE_URL}/series/agentic-os): long-form series on building autonomous AI infrastructure
- [Knowledge](${SITE_URL}/knowledge): KB index
- [Support](${SITE_URL}/support): help and contact

## Recent posts

${recent.map((p) => postLine(p, p.editorial ? "editorial" : "field-note")).join("\n")}

## Editorial (long-form)

${editorial.slice(0, 12).map((p) => postLine(p, "editorial")).join("\n")}

## Products

${featuredProducts.map(productLine).join("\n")}

## Live projects

${liveProjects.map(itemLine).join("\n")}

## Live experiments

${liveExperiments.map(itemLine).join("\n")}

## Related properties

- [Field Notes](https://notes.edgelesslab.com): gallery of field notes and visual experiments (separate subdomain)
- [Shop](https://shop.edgelesslab.com): merch and physical goods (separate subdomain)

## Optional

- [RSS feed](${SITE_URL}/feed.xml)
- [Sitemap](${SITE_URL}/sitemap.xml)
- [Source on GitHub](https://github.com/edgeless-ai)

## Contact

- GitHub: https://github.com/edgeless-ai
- Site: https://edgelesslab.com
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
