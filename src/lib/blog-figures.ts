// Trusted, repo-local figures only. Do not turn this into arbitrary raw-HTML support.
const escapeAttribute = (text: string): string => text
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function renderBlogFigureBlock(line: string): string | null {
  if (line.trim() === ":::interactive-superdark") {
    return '<figure class="blog-figure"><iframe src="/figures/superdark-factory/dark-stack.html" title="The dark stack: interactive isometric machine bench" loading="lazy" sandbox="allow-scripts" referrerpolicy="no-referrer" style="width:100%;height:920px;border:1px solid #526b80" ></iframe><figcaption>Interactive mechanical metaphor. Select a component or adjust the revisable charter dial. <a href="/figures/superdark-factory/dark-stack.html">Open full size</a> · <a href="/images/blog/superdark-factory/anatomy-static.svg">Static bench fallback</a>. The next diagram explains the same parts without JavaScript.</figcaption></figure>';
  }
  const image = line.trim().match(/^!\[([^\]\n]+)\]\((\/images\/blog\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.(?:webp|png|jpg|svg))\)$/);
  if (!image) return null;
  const [, alt, src] = image;
  return `<figure class="blog-figure"><a href="${src}" aria-label="Open illustration full size"><img src="${src}" alt="${escapeAttribute(alt)}" loading="lazy" decoding="async" style="display:block;width:100%;height:auto" /></a><figcaption>${escapeAttribute(alt)}</figcaption></figure>`;
}
