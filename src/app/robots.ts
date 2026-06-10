import type { MetadataRoute } from 'next';

const dynamic = 'force-static';

/**
 * robots.txt: open to everything by default, with explicit allows for the AI
 * search crawlers we actively want indexing the site (Edgeless Lab content
 * is technical and benefits from being cited inside AI answers).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      { userAgent: 'GPTBot', allow: '/' },
      { userAgent: 'OAI-SearchBot', allow: '/' },
      { userAgent: 'ChatGPT-User', allow: '/' },
      { userAgent: 'ClaudeBot', allow: '/' },
      { userAgent: 'Claude-Web', allow: '/' },
      { userAgent: 'anthropic-ai', allow: '/' },
      { userAgent: 'PerplexityBot', allow: '/' },
      { userAgent: 'Perplexity-User', allow: '/' },
      { userAgent: 'CCBot', allow: '/' },
      { userAgent: 'Google-Extended', allow: '/' },
      { userAgent: 'Applebot-Extended', allow: '/' },
    ],
    sitemap: 'https://edgelesslab.com/sitemap.xml',
    host: 'https://edgelesslab.com',
  };
}
