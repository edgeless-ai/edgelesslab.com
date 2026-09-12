import Critters from "critters";
import { createRequire } from "node:module";
import valueParser from "next/dist/compiled/postcss-value-parser/index.js";

const require = createRequire(import.meta.url);
const postcss = createRequire(require.resolve("next/package.json"))("postcss");

function decodeCSSURL(value) {
  return value.replace(/\\(?:([\da-f]{1,6})(?:\r\n|[\t\n\f\r ])?|(\r\n|[\n\r\f])|(.))/gi, (_, hex, newline, escaped) => {
    if (hex) {
      const code = parseInt(hex, 16);
      return code === 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)
        ? "\ufffd" : String.fromCodePoint(code);
    }
    return newline ? "" : escaped;
  });
}

class ExportCritters extends Critters {
  async getCssAsset(href) {
    const css = await super.getCssAsset(href);
    // Next's exported stylesheets use origin-relative hrefs. Inline styles
    // never pass here and retain their document-relative URL context.
    if (!css || !href.startsWith("/") || href.startsWith("//")) return css;

    // Critters copies @font-face src into a document preload verbatim. Rebase
    // only those declarations while the source stylesheet URL is still known;
    // replacing HTML hrefs later would confuse identical paths in different CSS.
    const stylesheetURL = new URL(href, "https://static-export.invalid");
    const ast = postcss.parse(css);
    ast.walkAtRules(/^font-face$/i, rule => {
      rule.walkDecls(/^src$/i, declaration => {
        const value = valueParser(declaration.value);
        value.walk(node => {
          if (node.type !== "function" || node.value.toLowerCase() !== "url") return;
          const [source] = node.nodes;
          if (node.nodes.length !== 1 || !["word", "string"].includes(source.type)) return;
          const url = decodeCSSURL(source.value);
          if (!url || url.startsWith("/") || /^[a-z][\da-z+.-]*:/i.test(url)) return;
          const resolved = new URL(url, stylesheetURL);
          node.nodes = [{ type: "string", quote: '"', value: resolved.pathname + resolved.search + resolved.hash }];
        });
        declaration.value = value.toString();
      });
    });
    return ast.toString();
  }
}

export function createExportCritters(outDir) {
  return new ExportCritters({
    path: outDir,
    publicPath: "/",
    preload: "media", // async media="print" onload swap
    noscriptFallback: true,
    pruneSource: true,
    reduceInlineStyles: true,
    mergeStylesheets: true,
    inlineThreshold: 0,
    minimumExternalSize: 0,
    preloadFonts: true, // keep real font preloads; fix their URL context above
    fonts: false,
    logLevel: "warn",
  });
}
