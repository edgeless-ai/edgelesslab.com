import { describe, expect, it, vi } from "vitest";
import { verifyMarimoLive } from "../../../tests/helpers/verify-marimo-live";
import type { PublishedMarimoDemo } from "../marimo-demos";

const demo: PublishedMarimoDemo = {
  slug: "fixture", title: "Fixture", description: "Test only",
  category: "Research", tags: ["test"], published_url: "https://marimo.edgelesslab.com/fixture/",
};
const notebook = '<marimo-wasm hidden></marimo-wasm><marimo-code hidden>encoded-python</marimo-code><script type="module" src="./assets/index.js"></script>';
const html = (text = notebook, status = 200) => new Response(text, { status, headers: { "content-type": "text/html" } });
const asset = (text = "console.log('fixture')", status = 200, type = "application/javascript") => new Response(text, { status, headers: { "content-type": type } });
const mock = (...responses: Response[]) => vi.fn<typeof fetch>().mockImplementation(async () => {
  const response = responses.shift();
  if (!response) throw new Error("Unexpected extra request");
  return response;
});

describe("publisher live delivery gate", () => {
  it("checks the canonical notebook AND its same-directory entry bundle", async () => {
    const fetcher = mock(html(), asset());
    await verifyMarimoLive(demo, fetcher);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([demo.published_url, `${demo.published_url}assets/index.js`]);
    expect(fetcher.mock.calls.every(([, options]) => options?.redirect === "error")).toBe(true);
  });
  it("rejects 404 and soft-404/unverified pages", async () => {
    await expect(verifyMarimoLive(demo, mock(html("Not found", 404)))).rejects.toThrow(/delivery failed/);
    await expect(verifyMarimoLive(demo, mock(html("<html>Not published</html>")))).rejects.toThrow(/Not a runnable/);
    await expect(verifyMarimoLive(demo, mock(html(notebook.replace("encoded-python", ""))))).rejects.toThrow(/Not a runnable/);
  });
  it("rejects missing, off-origin and off-notebook entry bundles", async () => {
    for (const entry of ["", '<script type="module" src="https://evil.example/a.js"></script>', '<script type="module" src="/other/a.js"></script>']) {
      const body = notebook.replace(/<script.*<\/script>/, entry);
      await expect(verifyMarimoLive(demo, mock(html(body)))).rejects.toThrow(/Missing notebook entry|Unexpected notebook entry/);
    }
  });
  it("rejects broken/missing/soft-404/empty JavaScript even when the HTML returns 200", async () => {
    for (const response of [asset("missing", 404), asset("<html>Not found</html>", 200, "text/html"), asset("")]) {
      await expect(verifyMarimoLive(demo, mock(html(), response))).rejects.toThrow(/Broken notebook entry/);
    }
  });
  it("fails closed on network errors without rerun loops", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("network unavailable"));
    await expect(verifyMarimoLive(demo, fetcher)).rejects.toThrow("network unavailable");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
