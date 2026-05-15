/**
 * Generate static SVG-based OG images for all blog posts.
 * Run during build: pnpm generate-og
 * 
 * Each SVG is 1200x630 and includes:
 * - Title (auto-wrapped)
 * - Description
 * - Tags with accent colors
 * - Date and read time
 */

const fs = require('fs');
const path = require('path');

// Parse blog.ts to extract post metadata
function parseBlogTs(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const posts = [];

  // Extract each post object - find slug blocks
  const slugMatches = [...content.matchAll(/slug:\s*["']([^"']+)["']/g)];
  const titleMatches = [...content.matchAll(/title:\s*["']([^"']+)["']/g)];
  const descMatches = [...content.matchAll(/description:\s*["']([^"']+)["']/g)];
  const dateMatches = [...content.matchAll(/date:\s*["']([^"']+)["']/g)];
  const readTimeMatches = [...content.matchAll(/readTime:\s*["']([^"']+)["']/g)];
  const tagBlocks = content.match(/tags:\s*\[([^\]]+)\]/g) || [];

  for (let i = 0; i < slugMatches.length; i++) {
    const tags = tagBlocks[i]?.match(/["']([^"']+)["']/g)?.map(t => t.replace(/["']/g, '')) || [];
    posts.push({
      slug: slugMatches[i][1],
      title: titleMatches[i]?.[1] || '',
      description: descMatches[i]?.[1] || '',
      date: dateMatches[i]?.[1] || '',
      readTime: readTimeMatches[i]?.[1] || '5 min',
      tags,
    });
  }

  return posts;
}

// Tag color mapping
const TAG_COLORS = {
  "AI Agents": "#00e5ff",
  "Automation": "#00e5ff",
  "AI": "#00e5ff",
  "Agents": "#00e5ff",
  "Edgeless": "#a855f7",
  "Design": "#a855f7",
  "Machine Learning": "#22c55e",
  "LLMs": "#22c55e",
  "Trading": "#f59e0b",
  "Finance": "#f59e0b",
  "Productivity": "#ec4899",
  "Knowledge": "#ec4899",
  "Self-Improvement": "#ec4899",
  "Knowledge Management": "#ec4899",
  "Rust": "#f97316",
  "Web": "#a855f7",
  "Generative Art": "#a855f7",
  "Creative Coding": "#a855f7",
  "Pen Plotters": "#f97316",
  "MCP": "#00e5ff",
  "Infrastructure": "#22c55e",
  "Claude Code": "#00e5ff",
  "Memory": "#ec4899",
  "Developer Tools": "#22c55e",
};

function getAccentColor(tags) {
  for (const tag of tags) {
    if (TAG_COLORS[tag]) return TAG_COLORS[tag];
  }
  return "#00e5ff";
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function wrapText(text, maxChars) {
  const words = text.split(' ');
  const lines = [];
  let current = '';

  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars && current) {
      lines.push(current.trim());
      current = word;
    } else {
      current = (current + ' ' + word).trim();
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function generateSVG(post) {
  const accent = getAccentColor(post.tags);
  const titleLines = wrapText(post.title, 40);
  const description = post.description.length > 100
    ? post.description.slice(0, 97) + '...'
    : post.description;

  const titleFontSize = titleLines.length > 2 ? 40 : titleLines.length > 1 ? 46 : 52;
  const titleY = 320 - (titleLines.length - 1) * (titleFontSize * 0.6);

  // Generate tag SVGs
  const tagY = 490;
  const tagSvg = post.tags.slice(0, 3).map((tag, i) => {
    const tagColor = TAG_COLORS[tag] || accent;
    const x = 60 + i * 130;
    return `
    <rect x="${x}" y="${tagY}" width="${tag.length * 9 + 28}" height="30" rx="6" 
          fill="${tagColor}15" stroke="${tagColor}40" stroke-width="1" />
    <text x="${x + 14}" y="${tagY + 20}" font-family="monospace" font-size="13" fill="${tagColor}" letter-spacing="0.03em">${escapeXml(tag)}</text>`;
  }).join('\n');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0a0f"/>
      <stop offset="50%" style="stop-color:#1a1a2e"/>
      <stop offset="100%" style="stop-color:#16213e"/>
    </linearGradient>
    <linearGradient id="accentBar" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:transparent"/>
      <stop offset="50%" style="stop-color:${accent}"/>
      <stop offset="100%" style="stop-color:transparent"/>
    </linearGradient>
    <!-- Grid pattern -->
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" stroke-opacity="0.03" stroke-width="1"/>
    </pattern>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="480" y="0" width="720" height="630" fill="url(#grid)"/>
  
  <!-- Top accent bar -->
  <rect x="0" y="0" width="1200" height="4" fill="url(#accentBar)"/>
  
  <!-- Site header -->
  <circle cx="90" cy="90" r="18" fill="${accent}"/>
  <text x="90" y="96" font-family="system-ui, sans-serif" font-size="18" font-weight="700" fill="#0a0a0f" text-anchor="middle">E</text>
  <text x="120" y="96" font-family="monospace" font-size="16" fill="#888888" letter-spacing="0.05em">edgelesslab.com</text>
  
  <!-- Title -->
  ${titleLines.map((line, i) => 
    `<text x="60" y="${titleY + i * (titleFontSize * 1.25)}" font-family="system-ui, -apple-system, sans-serif" font-size="${titleFontSize}" font-weight="600" fill="#f5f5f5">${escapeXml(line)}</text>`
  ).join('\n  ')}
  
  <!-- Description -->
  <text x="60" y="445" font-family="system-ui, sans-serif" font-size="20" fill="#888888">${escapeXml(description)}</text>
  
  <!-- Tags -->
  ${tagSvg}
  
  <!-- Date + read time -->
  <text x="60" y="560" font-family="monospace" font-size="13" fill="#555555">${formatDate(post.date)}</text>
  <text x="1080" y="560" font-family="monospace" font-size="13" fill="#555555" text-anchor="end">${escapeXml(post.readTime)}</text>
</svg>`;

  return svg;
}

// Main execution
const blogPath = path.join(__dirname, 'src/lib/blog.ts');
const outDir = path.join(__dirname, 'public/og');

// Ensure output directory exists
fs.mkdirSync(outDir, { recursive: true });

const posts = parseBlogTs(blogPath);
console.log(`Generating OG images for ${posts.length} posts...`);

for (const post of posts) {
  const svg = generateSVG(post);
  const outFile = path.join(outDir, `${post.slug}.svg`);
  fs.writeFileSync(outFile, svg);
  console.log(`  ✓ ${post.slug}.svg`);
}

console.log(`\nDone! Generated ${posts.length} OG images in public/og/`);
