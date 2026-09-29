import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { internalReferences } from "./launch-readiness.mjs";
import vm from "node:vm";
import { createHash } from "node:crypto";

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
  assert.match(html, /<html\b[^>]*\bdata-preserve-inline-styles\b/);
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

test("published development fixtures resolve their shared dependencies without requesting a public HMR server", () => {
  for (const relative of ["index-dev.html", "pen-plotter/index-dev.html", "templates/algorithm-template.html"]) {
    const route = `/total-serialism/app/${relative}`;
    const html = read(`public${route}`);
    const missing = internalReferences(html, route).filter(({ url }) => {
      const target = path.join(root, "public", new URL(url).pathname);
      return !fs.existsSync(target) && !fs.existsSync(path.join(target, "index.html"));
    });
    assert.deepEqual(missing, [], route);
    if (relative.endsWith("index-dev.html")) {
      assert.match(html, /\["localhost", "127\.0\.0\.1", "\[::1\]"\]\.includes\(location\.hostname\)/);
      assert.match(html, /Static preview — HMR is local only/);
      assert.match(html, /new URLSearchParams\(location\.search\)\.get\("hmr"\) === "1"/);
      assert.match(html, /catch \{ document\.querySelector\('#hmrStatus span'\)/);
      assert.doesNotMatch(html, /<script\b[^>]*src="\/hmr\//);
    }
  }
});

test("development fixture catalog entries resolve to existing artwork", () => {
  const catalog = JSON.parse(read("public/total-serialism/app/algorithm-catalog.json"));
  assert.ok(catalog.algorithms.length > 0);
  for (const algorithm of catalog.algorithms) {
    assert.ok(algorithm.name.length > 0);
    assert.ok(Array.isArray(algorithm.hasExport));
    assert.ok(fs.existsSync(path.join(root, "public/total-serialism/app", algorithm.path)), algorithm.path);
  }
});

test("the template's shared classic scripts parse before browser initialization", () => {
  const html = read("public/total-serialism/app/templates/algorithm-template.html");
  for (const dependency of internalReferences(html, "/total-serialism/app/templates/algorithm-template.html")) {
    const pathname = new URL(dependency.url).pathname;
    if (pathname.endsWith(".js")) {
      assert.doesNotThrow(() => new vm.Script(read(`public${pathname}`), { filename: pathname }), pathname);
    }
  }
});

test("restored archive assets retain verified bytes, correct served formats, and cannot return to the known-missing list", () => {
  const restoration = JSON.parse(read("scripts/launch-readiness-restored-assets.json"));
  const blockers = JSON.parse(read("scripts/launch-readiness-known-blockers.json")).missingReferences;
  assert.ok(restoration.assets.length > 0);
  for (const asset of restoration.assets) {
    assert.ok(asset.bytes > 0);
    for (const target of asset.targets) {
      const bytes = fs.readFileSync(path.join(root, target.path));
      assert.equal(bytes.length, asset.bytes, target.path);
      assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256, target.path);
      const references = internalReferences(read(`public${target.source}`), target.source);
      assert.ok(references.some(({ url }) => new URL(url).pathname === target.path.slice(6)), `Archive alias must reference its verified asset: ${target.source} -> ${target.path}`);
      const type = path.extname(target.path);
      const prefix = bytes.toString("ascii", 0, 16);
      if (type === ".png") assert.equal(bytes.toString("hex", 0, 8), "89504e470d0a1a0a");
      else if (type === ".jpg" || type === ".jpeg") assert.equal(bytes.toString("hex", 0, 3), "ffd8ff");
      else if (type === ".webp") assert.ok(prefix.startsWith("RIFF") && prefix.slice(8, 12) === "WEBP");
      else if (type === ".avif") assert.ok(prefix.slice(4, 8) === "ftyp" && /avif|avis/.test(bytes.toString("ascii", 8, 32)));
      else if (type === ".svg") assert.match(bytes.toString("utf8"), /<svg\b/);
      else if (type === ".woff" || type === ".woff2") assert.equal(prefix.slice(0, 4), type === ".woff2" ? "wOF2" : "wOFF");
      else if (type === ".mp4") assert.equal(prefix.slice(4, 8), "ftyp");
      else if (type === ".gif") assert.match(prefix, /^GIF8[79]a/);
      else assert.fail(`Unverified archive format: ${type}`);
      assert.ok(!blockers.some((blocked) => blocked.source === target.source && `public${blocked.targetPath}` === target.originalTarget), target.path);
    }
  }
});

function maisonClient(fetch) {
  const html = read("public/maison/index.html");
  const source = html.slice(html.indexOf("  var MAISON_API="), html.indexOf("  maisonStatus(); setInterval"));
  const input = { value: "Bonjour", focus() {} };
  const send = { disabled: false };
  const messages = [];
  const sandbox = { TextEncoder, fetch, setTimeout: (fn) => fn(), document: { getElementById: (id) => id === "salonInput" ? input : send } };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  sandbox.maisonAdd = () => {
    const classes = new Set();
    const item = { textContent: "", classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name) }, classes };
    messages.push(item);
    return item;
  };
  return { sandbox, input, send, messages };
}

test("Maison sends at most eight recent valid history entries within the actual UTF-8 body limit, without trimming the transcript", () => {
  const { sandbox } = maisonClient(() => { throw Error("No network expected"); });
  const prior = Array.from({ length: 12 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `turn ${i}` }));
  assert.deepEqual(JSON.parse(sandbox.maisonRequestBody("hello", prior)).history, prior.slice(-8));
  const unicode = Array.from({ length: 8 }, () => ({ role: "assistant", content: "世".repeat(8000) }));
  const original = JSON.stringify(unicode);
  const body = sandbox.maisonRequestBody("世".repeat(800), unicode);
  assert.ok(Buffer.byteLength(body) <= 24576);
  assert.equal(JSON.stringify(unicode), original);
  const unsafe = [{ role: "assistant", content: "x".repeat(8001) }, { role: "system", content: "untrusted" }, { role: "user", content: "  " }, { role: "assistant", content: "valid", ignored: true }];
  assert.deepEqual(JSON.parse(sandbox.maisonRequestBody("hello", unsafe)).history, [{ role: "assistant", content: "valid" }]);
});

test("Maison does not poll rejected or missing chat IDs and clears composing state after failure", async () => {
  for (const response of [{ ok: false, data: { error: "Please shorten the request." } }, { ok: true, data: {} }]) {
    const calls = [];
    const { sandbox, send, messages } = maisonClient(async (url) => { calls.push(url); return { ok: response.ok, json: async () => response.data }; });
    await sandbox.sendMaison({ preventDefault() {} });
    assert.equal(calls.length, 1);
    assert.ok(calls[0].endsWith("/maison/chat"));
    assert.equal(send.disabled, false);
    assert.equal(sandbox.maisonBusy, false);
    assert.equal(messages.at(-1).classes.has("composing"), false);
    assert.ok(messages.at(-1).textContent.length > 0);
  }
});
