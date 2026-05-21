#!/usr/bin/env node
/**
 * OG Image Generator for Edgeless Lab
 * Generates 1200x630 Open Graph images for blog posts
 * 
 * Usage: node scripts/generate-og-images.js [post-slug]
 *        node scripts/generate-og-images.js --all
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const matter = require('gray-matter');

const OUTPUT_DIR = path.join(__dirname, '..', 'static', 'og');
const POSTS_DIR = path.join(__dirname, '..', 'content', 'posts');
const TEMPLATE_DIR = path.join(__dirname, '..', 'assets', 'og-templates');

// Edgeless brand colors
const COLORS = {
  bg: '#0a0a0f',
  bgGradient: 'linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #0d1117 100%)',
  accent: '#00d4ff',
  accentSecondary: '#7c3aed',
  text: '#ffffff',
  textMuted: '#8b949e',
  border: '#30363d'
};

// ASCII art elements for visual texture
const ASCII_BLOCKS = [
  '██████',
  '██░░██',
  '░░░░░░',
  '▓▓▓▓▓▓',
  '▒▒▒▒▒▒',
  '▓▒▓▒▓▒',
  '◆◆◆◆◆◆',
  '◇◇◇◇◇◇'
];

function generateRandomAsciiPattern() {
  const pattern = [];
  for (let i = 0; i < 8; i++) {
    const row = [];
    for (let j = 0; j < 12; j++) {
      if (Math.random() > 0.7) {
        row.push(ASCII_BLOCKS[Math.floor(Math.random() * ASCII_BLOCKS.length)]);
      } else {
        row.push('      ');
      }
    }
    pattern.push(row.join(''));
  }
  return pattern;
}

function createOGTemplate({ title, description, date, tags = [], category = 'Article' }) {
  const asciiPattern = generateRandomAsciiPattern();
  const asciiArt = asciiPattern.join('\n');
  
  // Truncate title for display
  const displayTitle = title.length > 60 ? title.substring(0, 57) + '...' : title;
  const displayDesc = description && description.length > 140 
    ? description.substring(0, 137) + '...' 
    : (description || '');
  
  // Get primary tag for accent color
  const primaryTag = tags[0] || category;
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      width: 1200px;
      height: 630px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: ${COLORS.bgGradient};
      color: ${COLORS.text};
      overflow: hidden;
      position: relative;
    }
    
    .grid-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: 
        linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px);
      background-size: 60px 60px;
      pointer-events: none;
    }
    
    .ascii-bg {
      position: absolute;
      top: 20px;
      right: 30px;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      font-size: 8px;
      line-height: 1.2;
      color: rgba(0, 212, 255, 0.08);
      white-space: pre;
      text-align: right;
      pointer-events: none;
    }
    
    .container {
      position: relative;
      z-index: 10;
      padding: 60px 80px;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    
    .header {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .logo {
      font-family: 'SF Mono', monospace;
      font-size: 24px;
      font-weight: 700;
      color: ${COLORS.accent};
      letter-spacing: -1px;
    }
    
    .logo-accent {
      color: ${COLORS.accentSecondary};
    }
    
    .divider {
      width: 40px;
      height: 2px;
      background: linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accentSecondary});
    }
    
    .category {
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: ${COLORS.textMuted};
    }
    
    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 40px 0;
    }
    
    .title {
      font-size: 48px;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.02em;
      margin-bottom: 24px;
      max-width: 900px;
    }
    
    .title-accent {
      color: ${COLORS.accent};
    }
    
    .description {
      font-size: 24px;
      line-height: 1.5;
      color: ${COLORS.textMuted};
      max-width: 800px;
    }
    
    .footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 40px;
      border-top: 1px solid ${COLORS.border};
    }
    
    .meta {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    
    .date {
      font-size: 16px;
      color: ${COLORS.textMuted};
      font-family: 'SF Mono', monospace;
    }
    
    .tags {
      display: flex;
      gap: 8px;
    }
    
    .tag {
      font-size: 13px;
      padding: 6px 12px;
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid rgba(0, 212, 255, 0.3);
      border-radius: 4px;
      color: ${COLORS.accent};
      font-family: 'SF Mono', monospace;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .edgeless-sigil {
      font-family: 'SF Mono', monospace;
      font-size: 20px;
      color: ${COLORS.accent};
      opacity: 0.6;
    }
    
    .noise {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      opacity: 0.02;
      pointer-events: none;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    }
  </style>
</head>
<body>
  <div class="noise"></div>
  <div class="grid-overlay"></div>
  <div class="ascii-bg">${asciiArt}</div>
  
  <div class="container">
    <div class="header">
      <span class="logo">Edgeless<span class="logo-accent">Lab</span></span>
      <div class="divider"></div>
      <span class="category">${category}</span>
    </div>
    
    <div class="content">
      <h1 class="title">${displayTitle.replace(/:(.+)/, ':<span class="title-accent">$1</span>')}</h1>
      ${displayDesc ? `<p class="description">${displayDesc}</p>` : ''}
    </div>
    
    <div class="footer">
      <div class="meta">
        <span class="date">${date}</span>
        <div class="tags">
          ${tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
      </div>
      <span class="edgeless-sigil">◆ ◇ ◆</span>
    </div>
  </div>
</body>
</html>`;
}

function createDefaultTemplate() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      width: 1200px;
      height: 630px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #0d1117 100%);
      color: #ffffff;
      overflow: hidden;
      position: relative;
    }
    
    .grid-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: 
        linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px);
      background-size: 60px 60px;
      pointer-events: none;
    }
    
    .container {
      position: relative;
      z-index: 10;
      padding: 80px;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
    }
    
    .logo {
      font-family: 'SF Mono', monospace;
      font-size: 72px;
      font-weight: 700;
      color: #00d4ff;
      letter-spacing: -2px;
      margin-bottom: 16px;
    }
    
    .logo-accent {
      color: #7c3aed;
    }
    
    .tagline {
      font-size: 32px;
      font-weight: 500;
      color: #8b949e;
      margin-bottom: 48px;
      max-width: 800px;
      line-height: 1.4;
    }
    
    .ascii-pattern {
      font-family: 'SF Mono', monospace;
      font-size: 14px;
      line-height: 1.4;
      color: rgba(0, 212, 255, 0.15);
      white-space: pre;
      letter-spacing: 4px;
      margin: 32px 0;
    }
    
    .keywords {
      display: flex;
      gap: 16px;
      justify-content: center;
      flex-wrap: wrap;
      margin-top: 48px;
    }
    
    .keyword {
      font-size: 16px;
      padding: 12px 24px;
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid rgba(0, 212, 255, 0.3);
      border-radius: 6px;
      color: #00d4ff;
      font-family: 'SF Mono', monospace;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .noise {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      opacity: 0.02;
      pointer-events: none;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    }
  </style>
</head>
<body>
  <div class="noise"></div>
  <div class="grid-overlay"></div>
  
  <div class="container">
    <h1 class="logo">Edgeless<span class="logo-accent">Lab</span></h1>
    <p class="tagline">AI-Native Creative Studio<br>Building the future of generative art, autonomous agents, and intelligent systems</p>
    
    <div class="ascii-pattern">
◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆
◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇
◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆ ◇ ◆</div>
    
    <div class="keywords">
      <span class="keyword">Generative Art</span>
      <span class="keyword">Autonomous Agents</span>
      <span class="keyword">Machine Learning</span>
      <span class="keyword">Creative Coding</span>
    </div>
  </div>
</body>
</html>`;
}

async function generateImage(html, outputPath) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  
  // Wait for fonts to load
  await page.waitForTimeout(500);
  
  await page.screenshot({
    path: outputPath,
    type: 'png',
    clip: { x: 0, y: 0, width: 1200, height: 630 }
  });
  
  await browser.close();
  
  return outputPath;
}

function getPostSlug(filename) {
  return path.basename(filename, '.md');
}

async function generateForPost(postPath) {
  const content = fs.readFileSync(postPath, 'utf8');
  const { data } = matter(content);
  
  const slug = getPostSlug(postPath);
  const outputPath = path.join(OUTPUT_DIR, `${slug}.png`);
  
  // Format date
  const date = data.date 
    ? new Date(data.date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
  
  const html = createOGTemplate({
    title: data.title || slug,
    description: data.description || '',
    date,
    tags: data.tags || [],
    category: data.categories?.[0] || 'Article'
  });
  
  await generateImage(html, outputPath);
  console.log(`✅ Generated: ${outputPath}`);
  
  // Update post frontmatter if needed
  const ogImage = `/og/${slug}.png`;
  if (data.image !== ogImage) {
    console.log(`📝 Update frontmatter: image: ${ogImage}`);
  }
  
  return outputPath;
}

async function generateDefault() {
  const outputPath = path.join(OUTPUT_DIR, 'default.png');
  const html = createDefaultTemplate();
  await generateImage(html, outputPath);
  console.log(`✅ Generated default: ${outputPath}`);
  return outputPath;
}

async function main() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Created: ${OUTPUT_DIR}`);
  }
  
  const args = process.argv.slice(2);
  
  if (args.includes('--default')) {
    await generateDefault();
    return;
  }
  
  if (args.includes('--all')) {
    // Generate for all posts
    const posts = fs.readdirSync(POSTS_DIR)
      .filter(f => f.endsWith('.md') && !f.startsWith('_'));
    
    console.log(`🔄 Generating OG images for ${posts.length} posts...\n`);
    
    // Generate default first
    await generateDefault();
    console.log('');
    
    // Generate for each post
    for (const post of posts) {
      try {
        await generateForPost(path.join(POSTS_DIR, post));
      } catch (err) {
        console.error(`❌ Failed for ${post}:`, err.message);
      }
    }
    
    console.log('\n✅ All OG images generated');
    return;
  }
  
  // Generate for specific post
  const postSlug = args[0];
  if (postSlug) {
    const postPath = path.join(POSTS_DIR, `${postSlug}.md`);
    if (fs.existsSync(postPath)) {
      await generateForPost(postPath);
    } else {
      console.error(`❌ Post not found: ${postPath}`);
      process.exit(1);
    }
    return;
  }
  
  // Show usage
  console.log(`
OG Image Generator for Edgeless Lab

Usage:
  node scripts/generate-og-images.js --all        Generate for all posts
  node scripts/generate-og-images.js --default    Generate default image only
  node scripts/generate-og-images.js <slug>       Generate for specific post

Examples:
  node scripts/generate-og-images.js --all
  node scripts/generate-og-images.js access-vs-meaning-agent-semantics
`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});