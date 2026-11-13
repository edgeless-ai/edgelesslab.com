import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { renderBlogFigureBlock } from './blog-figures';
import { superdarkFactoryPost as post } from './blog-superdark-factory';
import { posts } from './blog';

describe('trusted blog figures', () => {
  it('renders and escapes a local image and visible caption', () => {
    const html = renderBlogFigureBlock('![A "dial" <script> & needle](/images/blog/superdark-factory/dark-stack.svg)');
    expect(html).toContain('<img');
    expect(html).toContain('alt="A &quot;dial&quot; &lt;script&gt; &amp; needle"');
    expect(html).toContain('<figcaption>');
    expect(html).not.toContain('<script>');
  });
  it.each([
    '![remote](https://example.org/file.svg)',
    '![bad](/images/blog/../private.svg)',
    '![bad](/images/blog/a.svg" onerror="alert(1))',
    '![bad](javascript:alert(1))',
    '![bad](/images/blog/a.html)',
    ':::interactive https://example.org',
    '<iframe src="https://example.org"></iframe>',
    'ordinary prose',
  ])('does not introduce arbitrary embeds: %s', value => {
    expect(renderBlogFigureBlock(value)).toBeNull();
  });
  it('allows only the fixed sandboxed anatomy embed with a static alternative', () => {
    const html = renderBlogFigureBlock(':::interactive-superdark')!;
    expect(html).toContain('sandbox="allow-scripts"');
    expect(html).not.toContain('allow-same-origin');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('anatomy-static.svg');
  });
});

describe('Superdark publication contract', () => {
  it('is registered once and has a synchronized markdown source', () => {
    expect(posts.filter(p => p.slug === post.slug)).toHaveLength(1);
    const md = readFileSync(resolve('content/blog/superdark-factory.md'),'utf8');
    expect(md.split(/^---\s*$/m)[2].trim()).toBe(post.content);
    execFileSync(process.execPath, ['scripts/superdark/sync-post.mjs','--check']);
    expect(post.content.split(/\s+/).length).toBeGreaterThanOrEqual(1500);
    expect(post.content.split(/\s+/).length).toBeLessThanOrEqual(2500);
    expect(post.editorial).toBe(true);
    expect(post.image).toBe('/images/blog/superdark-factory/hero.webp');
  });
  it('has five existing images and an existing self-contained figure', () => {
    const refs=[...post.content.matchAll(/!\[.*?\]\(([^)]+)\)/g)].map(m=>m[1]);
    expect(refs).toHaveLength(4);
    for (const ref of refs) expect(existsSync(resolve('public',ref.slice(1))), ref).toBe(true);
    expect(existsSync(resolve('public',post.image!.slice(1)))).toBe(true);
    const html=readFileSync('public/figures/superdark-factory/dark-stack.html','utf8');
    expect(html).toContain('data-preserve-inline-styles');
    expect(html).not.toMatch(/<script[^>]+src=/);
    expect(html).toContain('id="soft-rule"');
    expect(html).toContain('id="hide"');
  });
  it('preserves attribution and design-versus-rollout boundaries', () => {
    for (const name of ['Marek Poliks','Roberto Alonso Trillo','Ty Dunn','Hugh Scott-Douglas','Jay Springett']) expect(post.content).toContain(name);
    expect(post.content).toContain('https://superdark.antikythera.org/chapter-ii-the-dark-stack');
    expect(post.content).toContain('changed no production routing');
    expect(post.content).toContain('We reject that operational prescription.');
    expect(post.content).not.toContain('47%');
  });
});
