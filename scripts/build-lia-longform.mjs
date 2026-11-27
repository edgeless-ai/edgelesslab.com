import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import MarkdownIt from "markdown-it";
import { findLiaLongformSource } from "../src/lib/lia-longform-source.mjs";

const out = new URL("../out/", import.meta.url);
const reader = new URL("lia/read/", out);
const markdown = new MarkdownIt({ html: false, linkify: true });
markdown.linkify.set({ fuzzyLink: false, fuzzyEmail: false, fuzzyIP: false });
const escape = markdown.utils.escapeHtml;

// Accept only the manuscript's explicit heading anchors as raw HTML.
markdown.block.ruler.before("paragraph", "chapter_anchor", (state, line, end, silent) => {
  const text = state.src.slice(state.bMarks[line] + state.tShift[line], state.eMarks[line]);
  const match = /^<a id="([a-z][a-z0-9-]*)"><\/a>$/.exec(text);
  if (!match) return false;
  if (silent) return true;
  const token = state.push("chapter_anchor", "", 0);
  token.content = match[1];
  state.line = line + 1;
  return true;
});

markdown.inline.ruler.before("link", "endnote_ref", (state, silent) => {
  if (state.src.charAt(state.pos) !== "[") return false;
  const match = /^\[\^(\d+)\]/.exec(state.src.slice(state.pos));
  if (!match) return false;
  if (!silent) state.push("endnote_ref", "sup", 0).content = match[1];
  state.pos += match[0].length;
  return true;
});

markdown.renderer.rules.endnote_ref = (tokens, index, options, env) => {
  const number = tokens[index].content;
  const note = env.notes.get(number);
  if (!note) throw new Error(`LIA text cites missing endnote ${number}`);
  const ref = `note-ref-${number}-${note.references.length + 1}`;
  note.references.push(ref);
  return `<sup id="${ref}" class="note-ref" data-pagefind-ignore><a href="#note-${number}" role="doc-noteref" aria-label="Endnote ${number}">[${number}]</a></sup>`;
};

markdown.renderer.rules.table_open = () => '<div class="table-scroll" role="region" aria-label="Table" tabindex="0"><table>\n';
markdown.renderer.rules.table_close = () => "</table></div>\n";

function splitManuscript(source) {
  const main = source.search(/^<a id="prologue"><\/a>\s*$/m);
  const notes = /^## Endnotes\s*$/m.exec(source);
  const appendix = /^## (Appendix A[^\n]*)$/m.exec(source);
  if (main < 0 || !notes || !appendix || !(main < notes.index && notes.index < appendix.index)) {
    throw new Error("LIA manuscript must contain a prologue, endnotes, and Appendix A in order");
  }
  const preamble = markdown.parse(source.slice(0, main), {});
  if (preamble[0]?.tag !== "h1" || preamble[3]?.tag !== "p") {
    throw new Error("LIA manuscript must open with a title and subtitle");
  }
  return {
    title: preamble[1].content,
    subtitle: markdown.renderer.renderInline(preamble[4].children, markdown.options, {}),
    main: source.slice(main, notes.index),
    notes: source.slice(notes.index + notes[0].length, appendix.index),
    appendixTitle: appendix[1],
    appendix: source.slice(appendix.index + appendix[0].length),
  };
}

function parseNotes(source) {
  const starts = [...source.matchAll(/^\[\^(\d+)\]:[\t ]*/gm)];
  if (!starts.length || source.slice(0, starts[0].index).trim()) {
    throw new Error("LIA endnotes must start with numbered Markdown note definitions");
  }
  const notes = new Map();
  for (const [index, match] of starts.entries()) {
    const [, number] = match;
    if (notes.has(number)) throw new Error(`Duplicate LIA endnote ${number}`);
    const text = source.slice(match.index + match[0].length, starts[index + 1]?.index)
      .replace(/^(?: {4}|\t)/gm, "").trim();
    if (!text) throw new Error(`LIA endnote ${number} is empty`);
    notes.set(number, { text, references: [] });
  }
  return notes;
}

function prepareMain(tokens) {
  const headings = [];
  const ids = new Set();
  let anchor;
  const content = tokens.filter((token, index) => {
    if (token.type === "chapter_anchor") {
      if (anchor) throw new Error(`Unattached LIA heading anchor ${anchor}`);
      anchor = token.content;
      return false;
    }

    if (token.type === "heading_open" && ["h2", "h3"].includes(token.tag)) {
      const label = tokens[index + 1].content;
      if (!anchor || ids.has(anchor)) throw new Error(`Missing or duplicate LIA heading anchor: ${label}`);
      ids.add(anchor);
      headings.push({ id: anchor, label, level: Number(token.tag[1]) });
      token.attrSet("id", anchor);
      token.attrSet("tabindex", "-1");
      anchor = undefined;
    } else if (anchor) {
      throw new Error(`Unattached LIA heading anchor ${anchor}`);
    }
    return true;
  });
  if (anchor) throw new Error(`Unattached LIA heading anchor ${anchor}`);
  return { content, headings };
}

async function prepareFigures(tokens, source) {
  const metadata = JSON.parse(await readFile(join(dirname(source), "figures/alt.json"), "utf8")).figures;
  const figures = new Set();
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    const image = token.children?.[0];
    if (image?.type !== "image" || token.children.length !== 1 || tokens[index - 1]?.type !== "paragraph_open") continue;
    const imagePath = image.attrGet("src");
    const id = /^figures\/(F\d+)\.png$/.exec(imagePath)?.[1];
    if (!id || !metadata[id] || figures.has(id)) throw new Error(`Missing or duplicate LIA figure: ${imagePath}`);
    figures.add(id);
    const png = await readFile(new URL(imagePath, reader));
    if (png.toString("ascii", 12, 16) !== "IHDR") throw new Error(`Invalid LIA PNG: ${imagePath}`);
    const [width, height] = [png.readUInt32BE(16), png.readUInt32BE(20)];
    const svg = `figures/${id}.svg`;
    await readFile(new URL(svg, reader));
    const { alt, caption, source: provenance } = metadata[id];
    const cleanCaption = caption.replace(/ Use the interactive companion for anchors, qualifications, and sources\.$/, "");
    token.type = "figure";
    token.meta = { id, imagePath, svg, width, height, alt, caption: cleanCaption, provenance };
    tokens[index - 1].hidden = true;
    tokens[index + 1].hidden = true;
  }
  return figures.size;
}

markdown.renderer.rules.figure = (tokens, index) => {
  const { id, imagePath, svg, width, height, alt, caption, provenance } = tokens[index].meta;
  const sourceLine = provenance ? `<p class="figure-source">Sources: ${escape(provenance)}</p>` : "";
  return `<figure id="figure-${id.toLowerCase()}">
  <div class="figure-frame"><img src="${imagePath}" alt="${escape(alt)}" width="${width}" height="${height}" loading="lazy" decoding="async"></div>
  <figcaption><span class="figure-label">Figure ${id.slice(1)}</span><p>${escape(caption)}</p>${sourceLine}<a href="${svg}" aria-label="Open Figure ${id.slice(1)} as SVG">Open SVG</a></figcaption>
</figure>\n`;
};

function contents(headings) {
  const groups = [];
  for (const heading of headings) {
    if (heading.level === 2) groups.push({ ...heading, chapters: [] });
    else groups.at(-1).chapters.push(heading);
  }
  const link = ({ id, label }) => {
    const chapter = /^((?:[PC]|[IVX]+-\d+)\.) (.+)$/.exec(label);
    const text = chapter ? `<span class="chapter-no">${chapter[1]}</span><span>${escape(chapter[2])}</span>` : escape(label);
    return `<a href="#${id}">${text}</a>`;
  };
  return `<ol>${groups.map(group => `<li>${link(group)}${group.chapters.length ? `<ol>${group.chapters.map(chapter => `<li>${link(chapter)}</li>`).join("")}</ol>` : ""}</li>`).join("")}</ol>`;
}

function renderNotes(notes) {
  return [...notes].map(([number, { text, references }]) => {
    const backLink = (id, label) => `<a href="#${id}" role="doc-backlink">${label}</a>`;
    const [first, ...others] = references;
    const additional = others.length ? `<details class="note-more"><summary>Other locations (${others.length})</summary><ol>${others.map((id, index) => `<li>${backLink(id, `Return to reference ${index + 2}`)}</li>`).join("")}</ol></details>` : "";
    return `<li id="note-${number}" value="${number}" tabindex="-1">${markdown.render(text, { notes })}${first ? `<div class="note-returns" data-pagefind-ignore>${backLink(first, "Back to text")}${additional}</div>` : ""}</li>`;
  }).join("\n");
}

function readingWords(tokens) {
  const text = tokens.filter(token => token.type === "inline")
    .map(token => token.children.map(child => {
      if (child.type === "text" || child.type === "code_inline") return child.content;
      return child.type.endsWith("break") ? " " : "";
    }).join("")).join(" ");
  return (text.match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*(?:[’'-][\p{L}\p{M}\p{N}]+)*/gu) || []).length;
}

const source = findLiaLongformSource();
if (!source) {
  console.log("LIA longform: skipped (set LIA_LONGFORM_SOURCE to include the reader)");
} else {
  const manuscript = splitManuscript((await readFile(source, "utf8")).replace(/\r\n?/g, "\n"));
  const notes = parseNotes(manuscript.notes);
  const env = { notes };
  const { content, headings } = prepareMain(markdown.parse(manuscript.main, env));
  const figureCount = await prepareFigures(content, source);
  const words = readingWords(content);
  const minutes = Math.ceil(words / 240);
  const body = markdown.renderer.render(content, markdown.options, env);
  const appendix = markdown.parse(manuscript.appendix, env);
  for (const token of appendix) {
    if (/^heading_(open|close)$/.test(token.type)) token.tag = `h${Math.min(6, Number(token.tag[1]) + 2)}`;
  }
  const appendixHtml = markdown.renderer.render(appendix, markdown.options, env);
  headings.push({ id: "endnotes", label: "Endnotes", level: 2 }, { id: "appendix-a", label: "Appendix A · Founding text", level: 2 });

  const layout = await readFile(new URL("lia-longform.html", import.meta.url), "utf8");
  const title = escape(manuscript.title);
  const values = {
    title,
    displayTitle: title.replace(/ Archaeology$/, " <em>Archaeology</em>"),
    subtitle: manuscript.subtitle,
    words,
    minutes,
    readingTime: `${Math.floor(minutes / 60)} hr ${minutes % 60} min`,
    contents: contents(headings),
    body,
    endnotes: renderNotes(notes),
    appendixTitle: escape(manuscript.appendixTitle),
    appendix: appendixHtml,
  };
  await writeFile(new URL("index.html", reader), layout.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!Object.hasOwn(values, key)) throw new Error(`Unknown LIA reader template value ${key}`);
    return values[key];
  }));

  const landingPath = new URL("lia/index.html", out);
  const landing = await readFile(landingPath, "utf8");
  const marker = '<section class="index" data-lia-index>';
  if (!landing.includes(marker)) throw new Error("LIA landing page index is missing");
  const preview = '<section class="index" aria-label="Long-form field note"><h2><a href="/lia/read/">Read the long-form edition</a></h2></section>';
  if (!landing.includes('href="/lia/read/"')) await writeFile(landingPath, landing.replace(marker, preview + marker));
  console.log(`LIA longform: ${words.toLocaleString("en-US")} main-text words, ${minutes} min at 240 wpm, ${headings.length} contents links, ${notes.size} endnotes, ${figureCount} figures`);
}
