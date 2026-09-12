import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readPublic = (url) => fs.readFileSync(path.join(root, "public", url));
const manifest = () =>
  JSON.parse(readPublic("/gallery-thumbnails/manifest.json"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

// Decode dimensions from the standard WebP image chunks without a new dependency.
function webpDimensions(bytes) {
  assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
  assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const kind = bytes.toString("ascii", offset, offset + 4);
    const length = bytes.readUInt32LE(offset + 4);
    const data = offset + 8;
    assert.ok(data + length <= bytes.length, "WebP chunk must be complete");
    if (kind === "VP8X")
      return [
        bytes.readUIntLE(data + 4, 3) + 1,
        bytes.readUIntLE(data + 7, 3) + 1,
      ];
    if (kind === "VP8 ") {
      assert.equal(bytes.toString("hex", data + 3, data + 6), "9d012a");
      return [
        bytes.readUInt16LE(data + 6) & 0x3fff,
        bytes.readUInt16LE(data + 8) & 0x3fff,
      ];
    }
    if (kind === "VP8L") {
      assert.equal(bytes[data], 0x2f);
      const bits = bytes.readUInt32LE(data + 1);
      return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
    }
    offset = data + length + (length % 2);
  }
  assert.fail("WebP image dimensions missing");
}

test("gallery loads lazy thumbnails with intrinsic dimensions and links to each original", () => {
  const html = readPublic("/gallery.html").toString();
  const images = Array.from(
    html.matchAll(/<img\b[^>]*>/g),
    (match) => match[0],
  );
  assert.equal(
    images.length,
    166,
    "all 166 cards have a verified preview",
  );
  const cards = Array.from(html.matchAll(/<div class="card"/g)).length;
  assert.ok(
    html.includes(`${cards} gallery entries · ${images.length} previews available`),
    "visible availability count must match the rendered cards and previews",
  );
  const rows = new Map(manifest().images.map((row) => [row.sourceUrl, row]));
  for (const match of html.matchAll(
    /<a\b[^>]*href="([^"]+)"[^>]*>\s*(<img\b[^>]*>)\s*<\/a>/g,
  )) {
    const row = rows.get(match[1]);
    assert.ok(row, `original URL must be in manifest: ${match[1]}`);
    assert.ok(match[2].includes(`src="${row.thumbnailUrl}"`));
    assert.match(match[2], /alt="[^"]+"/);
    assert.match(match[2], /loading="lazy"/);
    assert.match(match[2], /decoding="async"/);
    assert.ok(match[2].includes(`width="${row.width}"`));
    assert.ok(match[2].includes(`height="${row.height}"`));
  }
  assert.equal(
    Array.from(html.matchAll(/<a\b[^>]*>\s*<img\b/g)).length,
    images.length,
  );
  assert.match(html, /<main\b/);
  assert.ok(html.includes("minmax(min(280px, 100%), 1fr)"));
  assert.ok(html.includes("overflow-wrap: anywhere"));
  assert.ok(html.includes(":focus-visible"));
  assert.ok(!html.includes("/Users/"));
});

test("gallery previews fit the transfer budget and preserve original masters", () => {
  const data = manifest();
  const thumbnails = new Map();
  assert.equal(data.images.length, 164);
  for (const row of data.images) {
    assert.equal(
      sha256(readPublic(row.sourceUrl)),
      row.sourceSha256,
      row.sourceUrl,
    );
    const bytes = readPublic(row.thumbnailUrl);
    assert.equal(sha256(bytes), row.thumbnailSha256, row.thumbnailUrl);
    assert.deepEqual(webpDimensions(bytes), [row.width, row.height]);
    assert.ok(row.width <= 640 && row.height <= 640);
    thumbnails.set(row.thumbnailUrl, bytes.length);
  }
  assert.equal(thumbnails.size, 142);
  assert.ok(
    Array.from(thumbnails.values()).reduce((sum, size) => sum + size, 0) <
      2_000_000,
  );
});

test("crosspost uses the complete verified historical original and its own compact preview", () => {
  const html = readPublic("/gallery.html").toString();
  const data = manifest();
  assert.equal(data.unavailable.length, 0);
  const row = data.images.find((image) => image.sourceUrl === "/renders/crosspost.png");
  assert.ok(row);
  assert.equal(row.sourceSha256, "03c07c382b062de4df4c5f45c8066e45b644f2fc40f238e08420566a564dd3c1");
  assert.equal(sha256(readPublic(row.sourceUrl)), row.sourceSha256);
  assert.equal(readPublic(row.sourceUrl).length, 4037517);
  assert.equal(data.restorations[0].sourceRevision, "8c34aeee157d92a8ba357e514097e03077c1e6e6");
  assert.ok(html.includes(`src="${row.thumbnailUrl}"`));
  assert.match(html, /alt="A faceted turquoise sphere and a smaller pale sphere encircled by an orbital ring on a dark background\."/);
  assert.doesNotMatch(html, /Preview unavailable|original \(incomplete\)/);
  assert.doesNotMatch(html, /<img\b[^>]*src="[^\"]*crosspost\.png"/);
});
