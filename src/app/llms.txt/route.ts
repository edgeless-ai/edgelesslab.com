import { posts } from "@/lib/blog";
import { products, projects, experiments } from "@/lib/data";
import fs from "node:fs";
import path from "node:path";
import { creativeDemos } from "@/lib/creative-demos";
import { publishedMarimoDemos } from "@/lib/marimo-demos";

// /llms.txt: Markdown index for LLM crawlers (https://llmstxt.org spec).
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

  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const demoRoot = path.join(process.cwd(), "public", "creative-demos");
  // List only demos that actually ship a page: a registry entry without one is a 404 for agents.
  const fieldNotes = creativeDemos.filter((d) => fs.existsSync(path.join(demoRoot, d.slug, "index.html"))).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const fieldNoteLine = (d: typeof creativeDemos[number]) =>
    `- [${oneLine(d.title)}](${SITE_URL}/creative-demos/${d.slug}/) (${d.date}${d.category ? `, ${d.category}` : ""}): ${oneLine(d.description)}`;
  const marimoLine = (d: typeof publishedMarimoDemos[number]) =>
    `- [${oneLine(d.title)}](${d.published_url}) [${d.category}]: ${oneLine(d.description)}`;

  const postLine = (p: typeof sortedPosts[number], kind: "editorial" | "field-note") => {
    const url = `${SITE_URL}/blog/${p.slug}`;
    const desc = p.description ? `: ${oneLine(p.description)}` : "";
    return `- [${oneLine(p.title)}](${url}) (${p.date}, ${kind})${desc}`;
  };

  const productLine = (p: typeof products[number]) => {
    const priceTag = p.price && p.price !== "Free" ? `, ${p.price}` : "";
    const target = p.href || `${SITE_URL}/products/${p.slug || ""}`;
    return `- [${oneLine(p.name)}](${target})${priceTag}: ${oneLine(p.description)}`;
  };

  const itemLine = (item: { slug?: string | undefined; title: string; href?: string | undefined; status: string; description: string; category?: string | undefined }, section: "projects" | "lab" = "projects") => {
    const target = item.href || (item.slug ? `${SITE_URL}/${section}/${item.slug}` : SITE_URL);
    const cat = item.category ? ` [${item.category}]` : "";
    return `- [${oneLine(item.title)}](${target})${cat} (${item.status}): ${oneLine(item.description)}`;
  };

  const body = `# Edgeless Lab

> A public research studio for autonomous software, generative systems, and physical artifacts. Working systems, Field Notes, and methods published in the open. ${plural(freeCount, "resource is", "resources are")} free${paidCount > 0 ? ` and ${plural(paidCount, "deeper toolkit is", "deeper toolkits are")} paid` : ""}.

## Docs

- [About](${SITE_URL}/about): founder context, mission, and operating principles
- [Projects](${SITE_URL}/projects): shipped and live systems
- [Agents](${SITE_URL}/agents): multi-agent orchestration stack
- [Lab](${SITE_URL}/lab): interactive playgrounds and experiments
- [Field Notes](${SITE_URL}/field-notes): interactive studies, cited science plots, generative systems, and visual research
- [Services / Private AI Systems](${SITE_URL}/services/private-ai-systems): custom private AI agent systems for professionals and small businesses
- [Agentic OS series](${SITE_URL}/series/agentic-os): long-form series on building autonomous AI infrastructure
- [Knowledge](${SITE_URL}/knowledge): KB index
- [Support](${SITE_URL}/support): help and contact

## Field Notes (interactive, readable without JavaScript)

${fieldNotes.map(fieldNoteLine).join("\n")}

## Marimo notebooks (live, run in the browser)

${publishedMarimoDemos.map(marimoLine).join("\n")}

## Recent posts

${recent.map((p) => postLine(p, p.editorial ? "editorial" : "field-note")).join("\n")}

## Editorial (long-form)

${editorial.slice(0, 12).map((p) => postLine(p, "editorial")).join("\n")}

## Products

${featuredProducts.map(productLine).join("\n")}

## Live projects

${liveProjects.map((p) => itemLine(p)).join("\n")}

## Live experiments

${liveExperiments.map((e) => itemLine(e, "lab")).join("\n")}

## Related properties

- [Shop](https://shop.edgelesslab.com): art-led editions and physical objects from the lab

## Optional

- [AI catalog](${SITE_URL}/.well-known/ai-catalog.json): machine-readable index of agent-facing resources
- [humans.txt](${SITE_URL}/humans.txt): who builds the lab
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
