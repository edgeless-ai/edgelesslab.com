# Open Graph Image Generation

Automated OG image pipeline for the Edgeless Lab website.

## Overview

Generates 1200x630 Open Graph images for:
- Blog posts (auto-generated from frontmatter)
- Default fallback image
- Category pages (future)

## Quick Start

```bash
cd edgelesslab

# Install dependencies
cd scripts && npm install && cd ..

# Install Playwright browsers
npx playwright install chromium

# Generate default image
node scripts/generate-og-images.js --default

# Generate for all posts
node scripts/generate-og-images.js --all

# Generate for specific post
node scripts/generate-og-images.js access-vs-meaning-agent-semantics
```

## Design System

- **Size**: 1200x630 (Open Graph standard)
- **Colors**: Dark theme with cyan/purple accents
- **Typography**: System fonts + SF Mono for code elements
- **Elements**: ASCII block art, diamond sigils, gradient borders
- **Branding**: "EdgelessLab" logo, consistent footer

## Integration

The Hugo site automatically references OG images:

```toml
# hugo.toml
[params]
  images = ["/og-default.png"]
```

Frontmatter in posts:

```yaml
---
title: "Post Title"
image: /og/post-slug.png  # Auto-generated
---
```

## Build Integration

Add to publish workflow (Netlify/GitHub Actions):

```yaml
- name: Generate OG Images
  run: |
    cd scripts
    npm ci
    npx playwright install chromium
    cd ..
    node scripts/generate-og-images.js --all
```

## File Structure

```
edgelesslab/
├── scripts/
│   ├── generate-og-images.js   # Main generator
│   └── package.json            # Dependencies
├── static/
│   └── og/                     # Generated images
│       ├── default.png
│       └── {post-slug}.png
└── README-OG.md              # This file
```

## Maintenance

- Run `--all` after adding new posts
- Default image updates automatically with `--default`
- Images are committed to repo (static assets)
- Playwright renders HTML templates as PNG screenshots