"""Render only the three cleared public Markdown inputs as standalone Field Sheets.

Run: python3 scripts/build-lia.py
No private research manifests or receipts are read or published.
"""
import html
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTENT = ROOT / 'content/lia'
OUT = ROOT / 'public/lia'
TITLE = 'Building an Instrument That Can Say No'
SLUG = 'building-an-instrument-that-can-say-no'


def inline(text):
    text = html.escape(text, quote=False)
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', lambda m: '<a href="' + html.escape(html.unescape(m[2]), quote=True) + '">' + m[1] + '</a>', text)
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    return re.sub(r'\*(.+?)\*', r'<em>\1</em>', text)


def markdown(source):
    source = re.sub(r'^---\n.*?\n---\n', '', source, flags=re.S)
    parts = []
    for block in source.strip().split('\n\n'):
        if block.startswith('### '):
            parts.append('<h3>' + inline(block[4:]) + '</h3>')
        elif block.startswith('## '):
            label = block[3:]
            anchor = re.sub(r'[^a-z0-9]+', '-', label.lower()).strip('-')
            parts.append(f'<h2 id="{anchor}">' + inline(label) + '</h2>')
        elif block.startswith('> '):
            parts.append('<blockquote><p>' + inline(block[2:]) + '</p></blockquote>')
        elif block.startswith('- '):
            parts.append('<ul>' + ''.join('<li>' + inline(line[2:]) + '</li>' for line in block.splitlines()) + '</ul>')
        else:
            parts.append('<p>' + inline(block) + '</p>')
    return '\n'.join(parts)


CSS = '''
:root{color-scheme:light;--paper:#f3eddd;--deep:#ebe3cf;--ink:#0c0a08;--soft:#2a2520;--accent:#684832;--rule:#c5b79c}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:19px/1.7 Georgia,'Times New Roman',serif}a{color:var(--accent);text-decoration-thickness:1px;text-underline-offset:.22em}a:hover{color:var(--ink)}a:focus-visible{outline:2px solid var(--accent);outline-offset:5px}.skip{position:absolute;top:-100px;left:20px}.skip:focus{top:10px;background:var(--paper);padding:10px;z-index:2}.meta,nav,footer,.label{font:12px/1.6 ui-monospace,'SF Mono',monospace;letter-spacing:.06em}.meta{display:flex;justify-content:space-between;gap:20px;padding:18px 5vw;border-bottom:1px solid var(--rule)}nav{display:flex;flex-wrap:wrap;gap:12px 28px;padding:18px 5vw}nav a{padding:6px 0}main{max-width:1280px;margin:auto;padding:54px 5vw 100px}h1,h2,h3{font-weight:400;line-height:1.08;text-wrap:balance}h1{font-size:clamp(3.1rem,7vw,6rem);letter-spacing:-.035em;margin:22px 0 34px}h2{font-size:clamp(2rem,4vw,2.8rem);margin:64px 0 24px}h3{font-size:1.65rem;margin:36px 0 18px}p{margin:0 0 24px}.label{color:var(--accent)}.hero{display:grid;grid-template-columns:1.4fr .6fr;gap:60px;align-items:end;padding-bottom:56px;border-bottom:1px solid var(--ink)}.deck{max-width:36ch;font-size:24px;line-height:1.4;font-style:italic}.strata{margin:0;background:var(--deep);padding:26px 22px}.strata div{border-top:1px solid var(--accent);padding:14px 0;font-size:17px}.strata div:nth-child(2){padding-top:24px}.strata div:nth-child(3){padding-top:38px}.strata figcaption{font:12px/1.6 ui-monospace,monospace;color:var(--soft);margin-top:20px}.reading{max-width:68ch}.intro{margin:58px 0 70px}.index{border-top:1px solid var(--ink);padding-top:10px}.index li{margin-bottom:28px;padding-left:6px}.index ul{padding-left:22px;max-width:70ch}.index a{font-size:24px}.note-header{max-width:1000px;border-bottom:1px solid var(--ink);padding-bottom:30px}.note-layout{display:grid;grid-template-columns:220px minmax(0,1fr);gap:65px;margin-top:48px}.toc{font:14px/1.6 ui-monospace,monospace}.toc ol{padding-left:20px}.toc li{margin-bottom:16px}.toc a{display:inline-block;padding:4px 0}article{min-width:0}article h2:first-of-type{margin-top:48px}blockquote{margin:36px 0;padding:24px 0;border-block:1px solid var(--accent);font-size:25px;line-height:1.4}blockquote p{margin:0}footer{padding:30px 5vw;border-top:1px solid var(--rule);display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap}footer a{margin-right:22px}::selection{background:var(--accent);color:var(--paper)}@media(max-width:760px){body{font-size:18px}.meta{font-size:11px;flex-wrap:wrap;gap:6px}main{padding-top:30px}.hero{grid-template-columns:1fr;gap:24px}.strata{max-width:100%}.note-layout{grid-template-columns:1fr;gap:30px}.toc{border-bottom:1px solid var(--rule);padding-bottom:24px}.deck{font-size:22px}.index a{font-size:22px}}
'''


def page(title, description, path, body):
    # Canonical definition from LIA.md §1
    CANONICAL_DEFINITION = "Latent Information Archaeology is the systematic identification, reconstruction, and validation of previously unrecognized information, relationships, implications, and opportunities latent within existing informational artifacts."
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title} | Edgeless Lab</title><meta name="description" content="{CANONICAL_DEFINITION}"><link rel="canonical" href="https://edgelesslab.com{path}"><meta property="og:type" content="article"><meta property="og:title" content="{title}"><meta property="og:description" content="{CANONICAL_DEFINITION}"><meta property="og:url" content="https://edgelesslab.com{path}"><meta property="og:image" content="https://edgelesslab.com/lia/og-image.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Latent Information Archaeology: finding in the intersections"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="https://edgelesslab.com/lia/og-image.png"><style>{CSS}</style></head>
<body><a class="skip" href="#main-content">Skip to content</a><header><div class="meta"><span>EDGELESS LAB / LATENT INFORMATION ARCHAEOLOGY</span><span>RESEARCH IN DEVELOPMENT</span></div><nav aria-label="Main navigation"><a href="/">Edgeless Lab</a><a href="/field-notes/">Field Notes</a><a href="/lia/"{' aria-current="page"' if path == '/lia/' else ''}>LIA</a><a href="/blog/">Blog</a><a href="https://shop.edgelesslab.com">Shop</a></nav></header><main id="main-content" tabindex="-1">{body}</main><footer><span>Edgeless Lab / public research studio</span><div><a href="/lia/">LIA index</a><a href="/field-notes/">Field Notes</a><a href="/about/">About</a></div></footer></body></html>'''


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    intro = (CONTENT / 'lia-section-intro-v0.1.md').read_text()
    index = (CONTENT / 'lia-public-index-v0.1.md').read_text()
    note = (CONTENT / 'field-note-public-draft-v0.3.md').read_text()
    landing = '''<div class="hero"><div><div class="label">LIA / an Edgeless Lab research program</div><h1>Latent Information<br><em>Archaeology.</em></h1><p class="deck">Latent Information Archaeology studies the intersections between fields: useful, defensible connections across bodies of knowledge.</p></div><figure class="strata"><div>Across fields<br><em>Science, humanities, art, engineering</em></div><div>Map the connection<br><em>Prior art and disanalogies</em></div><div>Test it<br><em>A useful consequence, a discriminating test</em></div><figcaption>A connection is a question to test, not a discovery to announce.</figcaption></figure></div>'''
    landing += '<section class="intro reading">' + markdown(intro) + '</section><section class="index" data-lia-index>' + markdown(index) + '</section>'
    (OUT / 'index.html').write_text(page('Latent Information Archaeology', 'LIA studies the intersections between fields: useful, defensible connections across bodies of knowledge.', '/lia/', landing))
    headings = re.findall(r'^## (.+)$', note, flags=re.M)
    toc = '<aside class="toc"><nav aria-label="In this field note"><div>IN THIS FIELD NOTE<ol>' + ''.join('<li><a href="#' + re.sub(r'[^a-z0-9]+', '-', h.lower()).strip('-') + '">' + html.escape(h) + '</a></li>' for h in headings) + '</ol></div></nav></aside>'
    body = f'<header class="note-header"><div class="label">Field Notes / methodology / filed 2026.11.18</div><h1>{TITLE}</h1><p class="deck">A research-method field note about reading artifacts without turning a pattern into an unsupported story.</p></header><div class="note-layout">' + toc + '<article class="reading">' + markdown(note) + '</article></div>'
    dest = OUT / SLUG
    dest.mkdir(exist_ok=True)
    (dest / 'index.html').write_text(page(TITLE, 'A research-method field note about reading artifacts without turning a pattern into an unsupported story.', f'/lia/{SLUG}/', body))
    print('Rendered /lia/ and LIA field note from three public Markdown inputs')


if __name__ == '__main__':
    build()
