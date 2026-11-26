import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarimoPreview } from "../../components/marimo-preview";

describe("static marimo preview", () => {
  it("renders an honest decorative placeholder without an embedded runtime", () => {
    const html = renderToStaticMarkup(createElement(MarimoPreview, {
      title: "Notebook title",
    }));
    expect(html).toContain("Notebook title");
    expect(html).toContain("Open notebook");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("aspect-[16/10]");
    expect(html).not.toMatch(/<(iframe|script|img|canvas)\b/);
    expect(html).not.toContain("animate-pulse");
    expect(html).not.toContain("https://marimo.edgelesslab.com");
  });
});
