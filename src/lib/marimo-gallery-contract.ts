import type { MarimoDemo, PublishedMarimoDemo } from "./marimo-demos";

const categories = new Set([
  "Finance/GPU", "Generative", "Algorithms", "Reactive", "Research", "AI evaluation", "AI training",
]);

/** Test/publisher oracle: validate the raw catalog, NOT the UI's filtered export.
 * published_url is the existing live-verification opt-in; never infer it from slug.
 * Network verification belongs in the publisher preflight, not every offline CI run.
 */
export function validateMarimoCatalog(demos: readonly MarimoDemo[]): PublishedMarimoDemo[] {
  const slugs = new Set<string>();
  const urls = new Set<string>();
  const published: PublishedMarimoDemo[] = [];
  for (const demo of demos) {
    if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(demo.slug)) {
      throw new Error(`Invalid notebook slug: ${demo.slug}`);
    }
    if (slugs.has(demo.slug)) throw new Error(`Duplicate notebook slug: ${demo.slug}`);
    slugs.add(demo.slug);
    if (!demo.title.trim() || !demo.description.trim() || !categories.has(demo.category) ||
        !demo.tags.length || demo.tags.some((tag) => !tag.trim())) {
      throw new Error(`Invalid notebook metadata: ${demo.slug}`);
    }
    if (demo.published_url == null) continue;
    if (urls.has(demo.published_url)) throw new Error(`Duplicate publication URL: ${demo.published_url}`);
    urls.add(demo.published_url);
    if (demo.published_url !== `https://marimo.edgelesslab.com/${demo.slug}/`) {
      throw new Error(`Invalid publication URL: ${demo.slug}`);
    }
    published.push({ ...demo, published_url: demo.published_url });
  }
  if (!published.length) throw new Error("Published notebook catalog must not be empty");
  return published;
}
