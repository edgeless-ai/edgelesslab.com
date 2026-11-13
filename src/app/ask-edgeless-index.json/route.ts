import { posts } from '@/lib/blog';
import { getFieldNotes } from '@/lib/field-notes.server';
import fs from 'node:fs';
import path from 'node:path';
export const dynamic = 'force-static';
export function GET() {
  return Response.json([
    ...posts.map(p => ({ type: 'blog', title: p.title, description: p.description, tags: p.tags, path: `/blog/${p.slug}/`, url: `https://edgelesslab.com/blog/${p.slug}/`, content: p.content.replace(/<[^>]*>/g, ' ').slice(0, 16000) })),
    ...getFieldNotes().map(n => ({ type: 'field-note', title: n.title, description: n.description, tags: n.tags, path: `/creative-demos/${n.slug}/index.html`, url: `https://edgelesslab.com/creative-demos/${n.slug}/index.html`, content: fs.readFileSync(path.join(process.cwd(),'public','creative-demos',n.slug,'index.html'),'utf8').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,6000) })),
    ...['/blog/','/field-notes/','/lab/'].map(path => ({ type: 'section', title: path === '/blog/' ? 'Blog' : path === '/lab/' ? 'Lab' : 'Field Notes', description: 'Edgeless site index', path, url: `https://edgelesslab.com${path}` })),
  ]);
}
