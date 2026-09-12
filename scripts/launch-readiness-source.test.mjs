import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("standalone HTML does not install the placeholder Google Analytics tracker", () => {
  const htmlFiles = (directory) =>
    fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const file = path.join(directory, entry.name);
      return entry.isDirectory()
        ? htmlFiles(file)
        : entry.isFile() && entry.name.endsWith(".html")
          ? [file]
          : [];
    });
  const files = [
    ...htmlFiles(path.join(root, "public")),
    path.join(root, "tartanism/app/index.html"),
  ];
  const tracker =
    /G-XXXXXXXXXX|<script\b[^>]*src=["'][^"']*googletagmanager\.com\/gtag\/js/i;
  const matches = files
    .filter((file) => tracker.test(fs.readFileSync(file, "utf8")))
    .map((file) => path.relative(root, file));
  assert.deepEqual(matches, []);
});

test("knowledge-base series link resolves to its published blog slug", () => {
  const source = read("src/lib/blog.ts");
  assert.match(source, /slug: "knowledge-base-loop"/);
  assert.ok(
    source.includes("[The Knowledge Base Loop →](/blog/knowledge-base-loop/)"),
  );
  assert.ok(!source.includes("./post-3-knowledge-base-loop"));
});

test("every selectable Excalidraw diagram has a public SVG", () => {
  const source = read("src/components/excalidraw-diagrams.tsx");
  const slugs = Array.from(
    source.matchAll(/slug: "([^"]+)"/g),
    (match) => match[1],
  );
  assert.ok(slugs.length > 0, "catalog must not be empty");
  const missing = slugs.filter(
    (slug) =>
      !fs.existsSync(
        path.join(root, "public/lab/excalidraw-diagrams", `${slug}.svg`),
      ),
  );
  assert.deepEqual(missing, []);
});

test("both Tartanism field-note copies reference the existing social image", () => {
  const files = [
    "tartanism/field-notes/index.html",
    "public/tartanism/field-notes/index.html",
  ];
  for (const file of files) {
    const image = read(file).match(
      /<meta property="og:image" content="([^"]+)"/,
    )[1];
    const url = new URL(image);
    assert.equal(
      url.pathname,
      "/tartanism/field-notes/assets/og-image.png",
      file,
    );
    assert.ok(fs.existsSync(path.join(root, "public", url.pathname)), file);
  }
});

test("marimo demo attribution uses the reviewed wigglystuff repository", () => {
  for (const file of [
    "public/marimo-mlb-demos/index.html",
    "public/marimo-sports-demos/index.html",
  ]) {
    const html = read(file);
    assert.ok(html.includes("https://github.com/koaning/wigglystuff"), file);
    assert.ok(
      !html.includes("https://github.com/vincentlaucsb/wigglystuff"),
      file,
    );
  }
});

test("agent kit follows the RSS feed without collecting email or reporting false delivery", () => {
  const html = read("public/agent-kit.html");
  assert.match(html, /href="\/feed\.xml"/);
  assert.doesNotMatch(
    html,
    /\/api\/subscribe|agent-kit-leads|<input\b[^>]*type=["']email["']/i,
  );
  assert.doesNotMatch(
    html,
    /We will notify you when the kit ships|hello@edgelesslabs\.com/,
  );
  assert.match(html, /mailto:help@edgelesslab\.com/);
});

test("Maison keeps its audience dialog hidden, labelled, keyboard accessible and honest about email handoff", () => {
  const html = read("public/maison/index.html");
  assert.match(html, /<main id="main-content" tabindex="-1">/);
  assert.match(html, /id="audience"[^>]+hidden inert/);
  for (const id of ["af_name", "af_work", "af_note"]) {
    assert.ok(html.includes(`<label for="${id}">`), id);
  }
  assert.match(html, /audienceOpener\.focus\(\)/);
  assert.match(html, /e\.key!==['"]Tab['"]/);
  assert.match(html, /Your request has not been sent yet/);
  assert.doesNotMatch(html, /Your request is noted/);
});

function contrast(foreground, background) {
  const luminance = (hex) => hex.match(/[a-f\d]{2}/gi).map((v) => parseInt(v, 16) / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test("light-theme relay and Support shell use readable foreground/background pairs", () => {
  const light = read("src/app/globals.css").match(/:root\[data-theme="light"\]\s*\{([^}]+)\}/)[1];
  const relay = light.match(/--relay:\s*(#[a-f\d]{6})/i)?.[1];
  assert.ok(relay, "light mode needs its own relay text color");
  assert.ok(contrast(relay, "#FAFAFA") >= 4.5);
  const accent = light.match(/--accent:\s*(#[a-f\d]{6})/i)[1];
  assert.ok(contrast(accent, "#e9ede3") >= 4.5, "light blog tag surface");
  const colors = JSON.parse(read("src/components/design-system/tokens.json")).color;
  for (const surface of ["shellCanvas", "shellGlass"]) {
    assert.ok(contrast(colors.primary.light, colors[surface].light) >= 4.5, surface);
  }
});

test("gallery captions and the live artifact header retain readable surfaces", () => {
  const gallery = read("public/gallery.html");
  const caption = gallery.match(/\.card \.category\s*\{[^}]*color:\s*(#[a-f\d]{6})/i)[1];
  assert.ok(contrast(caption, "#1a2222") >= 4.5);
  assert.match(read("src/components/featured-artifact.tsx"), /className="flex items-center justify-between border-b px-4 py-3"\s+style=\{\{ background: "var\(--bg-surface\)" \}\}/);
});
