/**
 * Generate static OG images for all blog posts.
 * Used because the site is statically exported (output: "export") and dynamic
 * routes (src/app/og/[slug]/route.tsx) cannot run on GitHub Pages.
 *
 * Run: node scripts/generate-og-images.mjs
 *
 * Outputs: public/og/[slug].png (1200x630, <200KB)
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import satori from "satori";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Tag accent colors (matches route.tsx exactly)
const TAG_COLORS = {
  "AI Agents": "#00e5ff",
  "Automation": "#00e5ff",
  "Edgeless": "#a855f7",
  "Design": "#a855f7",
  "AI": "#00e5ff",
  "Machine Learning": "#22c55e",
  "LLMs": "#22c55e",
  "Agents": "#00e5ff",
  "Trading": "#f59e0b",
  "Finance": "#f59e0b",
  "Productivity": "#ec4899",
  "Knowledge": "#ec4899",
  "Self-Improvement": "#ec4899",
  "Knowledge Management": "#ec4899",
  "Rust": "#f97316",
  "Web": "#a855f7",
};

function getAccentColor(tags) {
  for (const tag of tags) {
    if (TAG_COLORS[tag]) return TAG_COLORS[tag];
  }
  return "#00e5ff";
}

function wordWrap(text, maxChars) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars && current) {
      lines.push(current.trim());
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function parsePosts() {
  const content = readFileSync(join(root, "src/lib/blog.ts"), "utf-8");
  const posts = [];
  const blockRegex = /\{[^{}]*?slug:\s*"([^"]+)"[^{}]*?title:\s*"([^"]+)"[^{}]*?description:\s*"([^"]+)"[^{}]*?date:\s*"([^"]+)"[^{}]*?tags:\s*\[([^\]]+)\][^{}]*?readTime:\s*"([^"]+)"[^{}]*?\}/gs;
  let match;
  while ((match = blockRegex.exec(content)) !== null) {
    const [, slug, title, description, date, tagsRaw, readTime] = match;
    const tags = (tagsRaw.match(/"[^"]+"/g) || []).map(t => t.slice(1, -1));
    posts.push({ slug, title, description, date, tags, readTime });
  }
  return posts;
}

function buildTemplate(post) {
  const accent = getAccentColor(post.tags);
  const titleLines = wordWrap(post.title, 42);
  const description = post.description.length > 120
    ? post.description.slice(0, 117) + "..."
    : post.description;
  const formattedDate = new Date(post.date + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Title children - wrap each line in a column-flex div
  const titleChildren = titleLines.map((line, i) => ({
    type: "div",
    props: {
      style: {
        fontSize: line.length > 35 ? 48 : 54,
        fontWeight: 500,
        lineHeight: 1.2,
        color: "#f5f5f5",
        marginBottom: titleLines.length > 1 ? 4 : 0,
        display: "flex",
      },
      children: [{ type: "text", props: { children: [line] } }],
    },
  }));

  // Tag children
  const tagsChildren = post.tags.slice(0, 3).map(tag => {
    const tagColor = TAG_COLORS[tag] || accent;
    return {
      type: "div",
      props: {
        style: {
          display: "flex",
          alignItems: "center",
          padding: "6px 14px",
          borderRadius: 6,
          border: `1px solid ${tagColor}40`,
          backgroundColor: `${tagColor}15`,
        },
        children: [{
          type: "text",
          props: {
            style: {
              fontFamily: "JetBrainsMono",
              fontSize: 14,
              color: tagColor,
              letterSpacing: "0.03em",
            },
            children: [tag],
          },
        }],
      },
    };
  });

  // Build children array - each div with multiple children must have explicit display
  const children = [
    // Top accent bar (absolute positioned, empty children)
    {
      type: "div",
      props: {
        style: {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        },
        children: [],
      },
    },
    // Decorative grid (absolute positioned, empty children)
    {
      type: "div",
      props: {
        style: {
          position: "absolute",
          top: 0,
          right: 0,
          width: "40%",
          height: "100%",
          opacity: 0.03,
          backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        },
        children: [],
      },
    },
    // Site header
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 40,
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: accent,
                fontSize: 20,
                fontWeight: 700,
              },
              children: [{
                type: "text",
                props: { children: ["E"] },
              }],
            },
          },
          {
            type: "text",
            props: {
              style: {
                fontFamily: "JetBrainsMono",
                fontSize: 18,
                color: "#888",
                letterSpacing: "0.05em",
              },
              children: ["edgelesslab.com"],
            },
          },
        ],
      },
    },
    // Title block
    {
      type: "div",
      props: {
        style: {
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        },
        children: titleChildren,
      },
    },
    // Description
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          fontSize: 22,
          color: "#888",
          fontFamily: "boska",
          lineHeight: 1.4,
          marginBottom: 30,
          maxWidth: "90%",
        },
        children: [{ type: "text", props: { children: [description] } }],
      },
    },
    // Tags row
    {
      type: "div",
      props: {
        style: { display: "flex", gap: 10, flexWrap: "wrap" },
        children: tagsChildren,
      },
    },
    // Date + read time
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          justifyContent: "space-between",
          marginTop: 16,
        },
        children: [
          {
            type: "text",
            props: {
              style: { color: "#555", fontFamily: "JetBrainsMono", fontSize: 14 },
              children: [formattedDate],
            },
          },
          {
            type: "text",
            props: {
              style: { color: "#555", fontFamily: "JetBrainsMono", fontSize: 14 },
              children: [post.readTime],
            },
          },
        ],
      },
    },
  ];

  return {
    type: "div",
    props: {
      style: {
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)",
        fontFamily: "boska",
        padding: "60px",
        position: "relative",
      },
      children: children,
    },
  };
}

async function main() {
  const posts = parsePosts();
  console.log(`Found ${posts.length} blog posts`);

  const fontDir = join(root, "public/pen-plotter/assets/fonts");
  const boskaMedium = readFileSync(join(fontDir, "Boska-Medium.ttf"));
  const jetbrainsMono = readFileSync(join(fontDir, "JetBrainsMono-Regular.ttf"));

  const ogDir = join(root, "public/og");
  mkdirSync(ogDir, { recursive: true });

  let success = 0;
  let failed = 0;

  for (const post of posts) {
    const dest = join(ogDir, `${post.slug}.png`);

    // Skip if already exists and recent
    if (existsSync(dest)) {
      console.log(`  ✓ ${post.slug} (exists)`);
      success++;
      continue;
    }

    try {
      const template = buildTemplate(post);

      const svg = await satori(template, {
        width: 1200,
        height: 630,
        fonts: [
          { name: "boska", data: boskaMedium, style: "normal", weight: 500 },
          { name: "JetBrainsMono", data: jetbrainsMono, style: "normal", weight: 400 },
        ],
      });

      // Convert SVG to PNG, optimize compression
      const png = await sharp(Buffer.from(svg))
        .png({ compressionLevel: 9, palette: true, quality: 80 })
        .toBuffer();

      writeFileSync(dest, png);
      const sizeKB = (png.length / 1024).toFixed(1);
      console.log(`  ✓ ${post.slug} (${sizeKB}KB)`);
      success++;
    } catch (err) {
      console.error(`  ✗ ${post.slug}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${success} generated, ${failed} failed`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
