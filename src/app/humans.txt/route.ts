// /humans.txt — authorship & credits (http://humanstxt.org/).
// Companion file to /llms.txt. Tells humans and crawlers who actually builds
// this site. Re-rendered at build time, served as text/plain with 24h cache.

export const dynamic = "force-static";

const SITE_URL = "https://edgelesslab.com";

const body = `/* TEAM */
	Site:               ${SITE_URL}
	Author:             Edgeless (Edgeless Lab)
	Contact:             https://github.com/edgeless-ai
	Built in:           Berlin, Germany (CET/CEST)
	Stack:              Next.js 16 → static export to Cloudflare Pages

/* SITE */
	Last update:        ${new Date().toISOString().slice(0, 10)}
	Standards:          HTML5, CSS4, ES2024, RSS 2.0
	Components:         MDX, Pagefind (search), Posthog (analytics)
	IDE:                Claude Code + Codex
	Source:             https://github.com/edgeless-ai

/* THANKS */
	- Next.js team — for the static export pipeline that makes this site fast at the edge
	- Model Context Protocol maintainers — for the agent integration primitives powering every product shipped here
	- Vercel + Cloudflare Pages — for the build pipeline and global CDN
	- Pen-plotter + generative-art community — for the references in /lab and /pen-plotter
	- Open-source maintainers everywhere — every dependency below credits its authors

/* LICENSE */
	Code:               MIT (this site's source on GitHub)
	Posts:              CC BY-NC-SA 4.0 unless noted otherwise
	Products:           See individual product licenses on /products
`;

export async function GET(): Promise<Response> {
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // Re-render at most daily so credits stay current without per-request work.
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
