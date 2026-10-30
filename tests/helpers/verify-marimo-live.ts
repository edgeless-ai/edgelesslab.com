import type { PublishedMarimoDemo } from "../../src/lib/marimo-demos";

/** Publisher-only network check. CI validates the manifest and built UI offline.
 * Reject 404s, soft-404 HTML, redirects and missing/incorrect entry bundles.
 * This proves delivery of an actual notebook, not Python/control correctness;
 * publishers must still exercise the new notebook's controls before opting in.
 */
export async function verifyMarimoLive(demo: PublishedMarimoDemo, fetcher: typeof fetch = fetch) {
  const response = await fetcher(demo.published_url, { redirect: "error", signal: AbortSignal.timeout(20_000) });
  if (response.status !== 200 || !response.headers.get("content-type")?.includes("text/html")) {
    throw new Error(`Notebook delivery failed: ${demo.slug} HTTP ${response.status}`);
  }
  const html = await response.text();
  const code = html.match(/<marimo-code\b[^>]*>([^<]*)<\/marimo-code>/)?.[1];
  if (!/<marimo-wasm\b/.test(html) || !code?.trim()) {
    throw new Error(`Not a runnable marimo notebook: ${demo.slug}`);
  }
  const entry = html.match(/<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["']([^"']+)["']/)?.[1];
  if (!entry) throw new Error(`Missing notebook entry bundle: ${demo.slug}`);
  const url = new URL(entry, demo.published_url);
  if (url.origin !== new URL(demo.published_url).origin || !url.pathname.startsWith(`/${demo.slug}/`)) {
    throw new Error(`Unexpected notebook entry URL: ${demo.slug}`);
  }
  const asset = await fetcher(url.href, { redirect: "error", signal: AbortSignal.timeout(20_000) });
  if (asset.status !== 200 || !/(?:javascript|ecmascript)/.test(asset.headers.get("content-type") ?? "") || !(await asset.text()).trim()) {
    throw new Error(`Broken notebook entry bundle: ${demo.slug} HTTP ${asset.status}`);
  }
}
