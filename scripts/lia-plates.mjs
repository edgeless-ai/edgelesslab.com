// Illustration and plate manifests for the LIA long-form reader.
//
// Manifests live in content/lia/: illustrations.json (files under
// read/illustrations/) and any plates-*.json (files under read/plates/).
// Each holds {"illustrations": [...]} or {"plates": [...]} entries:
//   { id, file, alt, caption, after_heading, role: "hero" | "plate",
//     kind?: "diagram" | "illustration" | "infographic" }
// No manifest means no plates. A manifest that names a missing file, an
// unknown heading or a malformed entry fails the build.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const KINDS = new Set(["diagram", "illustration", "infographic"]);
const ROLES = new Set(["hero", "plate"]);

const escape = value => String(value).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function exists(path) {
  return statSync(path, { throwIfNoEntry: false })?.isFile() ?? false;
}

export function manifestFiles(dir) {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return [];
  const names = readdirSync(dir).filter(name => name === "illustrations.json" || /^plates-[\w.-]+\.json$/.test(name));
  // illustrations.json first, then plates-*.json in name order.
  return names.sort((a, b) => (a === "illustrations.json" ? -1 : b === "illustrations.json" ? 1 : a.localeCompare(b)))
    .map(name => ({ name, path: join(dir, name), base: name === "illustrations.json" ? "illustrations" : "plates" }));
}

// Width and height from PNG, WebP, JPEG, GIF or SVG bytes; undefined if unknown.
export function imageSize(buffer, file) {
  const ascii = (start, end) => buffer.toString("latin1", start, end);
  if (/\.svg$/i.test(file)) {
    const svg = buffer.toString("utf8", 0, Math.min(buffer.length, 4096));
    const tag = /<svg\b[^>]*>/i.exec(svg)?.[0] || "";
    const attr = name => Number.parseFloat(new RegExp(`\\s${name}="([\\d.]+)(?:px)?"`).exec(tag)?.[1]);
    const [width, height] = [attr("width"), attr("height")];
    if (width && height) return { width: Math.round(width), height: Math.round(height) };
    const box = /\sviewBox="[\d.\s,-]*?([\d.]+)[\s,]+([\d.]+)"/.exec(tag);
    return box ? { width: Math.round(Number(box[1])), height: Math.round(Number(box[2])) } : undefined;
  }
  if (ascii(1, 4) === "PNG" && ascii(12, 16) === "IHDR") return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    const chunk = ascii(12, 16);
    if (chunk === "VP8X") return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
    if (chunk === "VP8L") {
      const bits = buffer.readUInt32LE(21);
      return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
    }
    if (chunk === "VP8 ") return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  }
  if (ascii(0, 3) === "GIF") return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    for (let offset = 2; offset + 9 < buffer.length;) {
      if (buffer[offset] !== 0xff) return undefined;
      const marker = buffer[offset + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      }
      offset += 2 + buffer.readUInt16BE(offset + 2);
    }
  }
  return undefined;
}

function check(condition, message) {
  if (!condition) throw new Error(`LIA plates: ${message}`);
}

// Read and validate every manifest. readerDir is the built out/lia/read/ directory.
export function loadPlates(manifestDir, readerDir) {
  const reader = readerDir instanceof URL ? fileURLToPath(readerDir) : readerDir;
  const plates = [];
  const ids = new Set();
  for (const manifest of manifestFiles(manifestDir)) {
    let data;
    try {
      data = JSON.parse(readFileSync(manifest.path, "utf8"));
    } catch (error) {
      throw new Error(`LIA plates: ${manifest.name} is not valid JSON (${error.message})`);
    }
    const entries = data.illustrations ?? data.plates;
    check(Array.isArray(entries), `${manifest.name} must hold an "illustrations" or "plates" array`);
    for (const [index, entry] of entries.entries()) {
      const where = `${manifest.name}[${index}]`;
      check(entry && typeof entry === "object", `${where} must be an object`);
      const { id, file, alt, caption, after_heading: afterHeading, after_subheading: afterSubheading, role = "plate" } = entry;
      const kind = entry.kind ?? "illustration";
      check(typeof id === "string" && /^[A-Za-z0-9_-]+$/.test(id), `${where} needs an id of letters, digits, - or _`);
      check(!ids.has(id), `duplicate id ${id} (${where})`);
      ids.add(id);
      check(typeof file === "string" && file && !file.startsWith("/") && !file.split(/[\\/]/).includes(".."), `${where} (${id}) needs a relative file path`);
      check(typeof alt === "string" && alt.trim(), `${where} (${id}) needs alt text`);
      check(typeof caption === "string" && caption.trim(), `${where} (${id}) needs a caption`);
      check(ROLES.has(role), `${where} (${id}) role must be hero or plate, not ${role}`);
      check(KINDS.has(kind), `${where} (${id}) kind must be diagram, illustration or infographic, not ${kind}`);
      if (role === "plate") check(typeof afterHeading === "string" && afterHeading.trim(), `${where} (${id}) needs after_heading`);
      const src = `${manifest.base}/${file}`;
      const path = join(reader, src);
      check(exists(path), `${where} (${id}) image is missing: ${path}`);
      const plate = { id, src, alt, caption, afterHeading, afterSubheading, role, kind, manifest: manifest.name, ...imageSize(readFileSync(path), file) };
      if (kind === "diagram" && /\.svg$/i.test(file)) {
        plate.fallback = src.replace(/\.svg$/i, ".png");
        check(exists(join(reader, plate.fallback)), `${where} (${id}) diagram needs a PNG fallback: ${join(reader, plate.fallback)}`);
      }
      plates.push(plate);
    }
  }
  check(plates.filter(plate => plate.role === "hero").length <= 1, "only one hero plate is allowed");
  return plates;
}

export function renderPlate(plate) {
  const size = plate.width && plate.height ? ` width="${plate.width}" height="${plate.height}"` : "";
  const label = `Plate ${escape(plate.id)}`;
  const id = `plate-${plate.id.toLowerCase()}`;
  if (plate.role === "hero") {
    return `<figure class="hero-plate" id="${id}">
  <img src="${escape(plate.src)}" alt="${escape(plate.alt)}"${size} decoding="async" fetchpriority="high">
  <figcaption class="shell"><span class="figure-label">${label}</span><p>${escape(plate.caption)}</p></figcaption>
</figure>\n`;
  }
  const diagram = plate.kind === "diagram" ? " data-diagram" : "";
  const fallback = `<a href="${escape(plate.fallback || plate.src)}" data-zoom>Open full size</a>`;
  return `<figure class="plate plate--${plate.kind}" id="${id}">
  <div class="figure-frame"><img src="${escape(plate.src)}" alt="${escape(plate.alt)}"${size} loading="lazy" decoding="async"${diagram}></div>
  <figcaption><span class="figure-label">${label}</span><p>${escape(plate.caption)}</p>${fallback}</figcaption>
</figure>\n`;
}

// Insert plate groups into the main-text token stream. Plates that share a
// heading render in manifest order after the first block under that heading.
export function placePlates(tokens, headings, plates) {
  const groups = new Map();
  const headingText = index => (tokens[index + 1]?.content ?? "").replace(/\s+/g, " ").trim();
  for (const plate of plates.filter(entry => entry.role === "plate")) {
    const want = plate.afterHeading.trim();
    const heading = headings.find(entry => entry.label === want);
    let open = heading
      ? tokens.findIndex(token => token.type === "heading_open" && token.attrGet("id") === heading.id)
      : -1;
    if (open < 0) {
      // Subheadings (h4/h5) carry no anchor; match their text, and refuse ambiguity.
      const hits = tokens.map((token, i) => (token.type === "heading_open" && headingText(i) === want ? i : -1)).filter(i => i >= 0);
      check(hits.length <= 1, `${plate.manifest} (${plate.id}) after_heading is ambiguous (${hits.length} matches): "${plate.afterHeading}"`);
      open = hits.length ? hits[0] : -1;
    }
    check(open >= 0, `${plate.manifest} (${plate.id}) after_heading not found in the manuscript: "${plate.afterHeading}"`);
    if (plate.afterSubheading) {
      // Finer placement: the first h4/h5 with this text inside the chapter.
      const level = tokens[open].tag;
      for (let i = open + 1; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.type !== "heading_open") continue;
        if (token.tag <= level) break;
        if (headingText(i) === plate.afterSubheading.trim()) { open = i; break; }
      }
    }
    if (!groups.has(open)) groups.set(open, []);
    groups.get(open).push(plate);
  }
  const Token = tokens[0].constructor;
  // Insert from the end so earlier indices stay valid.
  for (const [open, group] of [...groups].sort((a, b) => b[0] - a[0])) {
    let at = open + 3; // heading_open, inline, heading_close
    const first = tokens[at];
    if (first && first.type !== "heading_open") {
      if (first.nesting === 1) {
        while (at < tokens.length && !(tokens[at].nesting === -1 && tokens[at].level === first.level)) at++;
      }
      at++;
    }
    const token = new Token("lia_plates", "", 0);
    token.block = true;
    token.meta = { plates: group };
    tokens.splice(at, 0, token);
  }
  return groups.size;
}

export function renderPlateGroup(tokens, index) {
  const { plates } = tokens[index].meta;
  return `<div class="plate-group">\n${plates.map(renderPlate).join("")}</div>\n`;
}
