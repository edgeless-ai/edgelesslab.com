import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createExportCritters } from "./critters-font-preloads.mjs";

async function exportFixture(t, files) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "critters-font-preloads-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  for (const [name, contents] of Object.entries(files)) {
    const filename = path.join(dir, name);
    await mkdir(path.dirname(filename), { recursive: true });
    await writeFile(filename, contents);
  }
  return { dir, critters: createExportCritters(dir) };
}

function html(stylesheets, inline = "") {
  return `<!doctype html><html lang="en"><head>${stylesheets.map(href => `<link rel="stylesheet" href="${href}">`).join("")}${inline}</head><body><main class="used">Font fixture</main></body></html>`;
}

function fontCSS(src, family = "Fixture") {
  return `@font-face{font-family:${family};src:${src};font-display:swap}.used{font-family:${family}}.unused{color:red}`;
}

function fontPreloads(html) {
  return [...html.matchAll(/<link\b[^>]*\bas="font"[^>]*>/g)].map(([tag]) => {
    assert.match(tag, /\brel="preload"/);
    assert.match(tag, /\bcrossorigin="anonymous"/);
    return tag.match(/\bhref="([^"]+)"/)[1];
  });
}

test("real Critters preloads resolve to exported font files on root and nested routes", async t => {
  const { dir, critters } = await exportFixture(t, {
    "_next/static/chunks/arbitrary-build.css": fontCSS('url("../media/Fixture.woff2") format("woff2")'),
    "_next/static/media/Fixture.woff2": "fixture-font-bytes",
  });
  const result = await critters.process(html(["/_next/static/chunks/arbitrary-build.css"]));
  const preloads = fontPreloads(result);
  assert.deepEqual(preloads, ["/_next/static/media/Fixture.woff2"]);
  for (const route of ["/", "/support/", "/about/", "/deep/nested/"]) {
    const request = new URL(preloads[0], `https://example.test${route}`);
    assert.equal(await readFile(path.join(dir, request.pathname), "utf8"), "fixture-font-bytes");
  }
});

test("font sources are resolved per stylesheet, retaining query and fragment", async t => {
  const { critters } = await exportFixture(t, {
    "one/css/page.css": fontCSS("url('../fonts/Same.woff2?v=2#face')", "One"),
    "two/css/page.css": fontCSS("url(../fonts/Same.woff2)", "Two"),
  });
  const result = await critters.process(html(["/one/css/page.css", "/two/css/page.css"]));
  assert.deepEqual(fontPreloads(result).sort(), ["/one/fonts/Same.woff2?v=2#face", "/two/fonts/Same.woff2"]);
});

test("already absolute, remote and data font URLs retain their meaning", async t => {
  const sources = ["/fonts/Root.woff2", "https://cdn.example.test/Remote.woff2", "//cdn.example.test/Protocol.woff2", "data:font/woff2;base64,AA=="];
  const { critters } = await exportFixture(t, {
    "styles/page.css": sources.map((src, index) => fontCSS(`url("${src}")`, `Fixture${index}`)).join(""),
  });
  assert.deepEqual(fontPreloads(await critters.process(html(["/styles/page.css"]))).sort(), sources.sort());
});

test("inline style font URLs stay in document context", async t => {
  const { critters } = await exportFixture(t, {});
  const result = await critters.process(html([], `<style>${fontCSS('url("../fonts/Inline.woff2")')}</style>`));
  assert.deepEqual(fontPreloads(result), ["../fonts/Inline.woff2"]);
});

test("font URL rebasing leaves unrelated CSS and source files untouched", async t => {
  const css = `${fontCSS('local("Fixture"), url("../fonts/Fixture.woff2") format("woff2")')}.used{background-image:url(../images/texture.png)}`;
  const { dir, critters } = await exportFixture(t, { "styles/page.css": css });
  const loaded = await critters.getCssAsset("/styles/page.css");
  assert.match(loaded, /local\("Fixture"\), url\("\/fonts\/Fixture\.woff2"\) format\("woff2"\)/);
  assert.match(loaded, /background-image:url\(\.\.\/images\/texture\.png\)/);
  assert.equal(await readFile(path.join(dir, "styles/page.css"), "utf8"), css);
});

test("CSS escapes are decoded before resolving and serializing font URLs", async t => {
  const { critters } = await exportFixture(t, {
    "styles/page.css": fontCSS(String.raw`url("../fonts/Fixture\20 Font.woff2")`),
  });
  const result = await critters.process(html(["/styles/page.css"]));
  assert.deepEqual(fontPreloads(result), ["/fonts/Fixture%20Font.woff2"]);
});
