"""Render the cleared public Markdown inputs as standalone Field Sheets.

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
    code = []
    def protect_code(match):
        code.append('<code>' + match[1] + '</code>')
        return f'\x00{len(code) - 1}\x00'
    text = re.sub(r'`([^`]+)`', protect_code, text)
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', lambda m: '<a href="' + html.escape(html.unescape(m[2]), quote=True) + '">' + m[1] + '</a>', text)
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'\*(.+?)\*', r'<em>\1</em>', text)
    return re.sub(r'\x00(\d+)\x00', lambda m: code[int(m[1])], text)


def markdown(source):
    source = re.sub(r'^---\n.*?\n---\n', '', source, flags=re.S)
    fences = []
    def protect_fence(match):
        fences.append('<pre><code>' + html.escape(match[1], quote=False) + '</code></pre>')
        return f'\n\n\x00{len(fences) - 1}\x00\n\n'
    source = re.sub(r'^```[^\n]*\n(.*?)\n```', protect_fence, source, flags=re.M | re.S)
    parts = []
    for block in source.strip().split('\n\n'):
        if not block.strip():
            continue
        if re.fullmatch(r'\x00\d+\x00', block):
            parts.append(fences[int(block[1:-1])])
        elif block == '---':
            parts.append('<hr>')
        elif block.startswith('# '):
            parts.append('<h1>' + inline(block[2:]) + '</h1>')
        elif block.startswith('| '):
            rows = [line.strip('|').split('|') for line in block.splitlines()]
            parts.append('<div class="table-scroll"><table><thead><tr>' + ''.join('<th scope="col">' + inline(cell.strip()) + '</th>' for cell in rows[0]) + '</tr></thead><tbody>' + ''.join('<tr>' + ''.join('<td>' + inline(cell.strip()) + '</td>' for cell in row) + '</tr>' for row in rows[2:]) + '</tbody></table></div>')
        elif re.match(r'^\d+\. ', block):
            parts.append('<ol>' + ''.join('<li>' + inline(re.sub(r'^\d+\. ', '', line)) + '</li>' for line in block.splitlines()) + '</ol>')
        elif block.startswith('### '):
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
:root{color-scheme:light;--paper:#f3eddd;--paper-deep:#ebe3cf;--ink:#0c0a08;--ink-soft:#2a2520;--ink-faint:#56524a;--rule:#d4cab4;--malachite:#1a6847;--accent:var(--malachite);--serif:"Boska","Times New Roman",Georgia,serif;--mono:"JetBrains Mono",ui-monospace,"SF Mono",Menlo,monospace;--gutter:clamp(1.25rem,4.5vw,4rem)}
*{box-sizing:border-box}
body{margin:0;background-color:var(--paper);background-image:radial-gradient(ellipse 80% 50% at 50% -20%,rgba(26,104,71,0.05),transparent 60%),url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 0.1  0 0 0 0 0.08  0 0 0 0 0.05  0 0 0 0.04 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");color:var(--ink);font:400 clamp(1.125rem,.5vw + .95rem,1.25rem)/1.62 var(--serif);font-feature-settings:"liga" on,"kern" on;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration-thickness:1px;text-decoration-color:var(--rule);text-underline-offset:.22em}a:hover{color:var(--accent);text-decoration-color:currentColor}a:focus-visible{outline:2px solid var(--accent);outline-offset:4px}
::selection{background:var(--accent);color:var(--paper)}
.skip{position:absolute;top:-100px;left:20px;font:500 .75rem/1.6 var(--mono)}.skip:focus{top:10px;background:var(--ink);color:var(--paper);padding:10px;z-index:2}
.masthead,footer,.label,.toc,.filing dt{font:400 .6875rem/1.6 var(--mono);letter-spacing:.1em;text-transform:uppercase}
.bar{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0 24px;max-width:73rem;margin:auto;padding:0 var(--gutter)}
.masthead{border-bottom:1px solid var(--rule);color:var(--ink-faint)}.wordmark{display:inline-flex;align-items:center;gap:.6rem;min-height:52px;color:var(--ink);font-weight:500;text-decoration:none}.wordmark::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--accent)}.wordmark span{color:var(--ink-faint);font-weight:400}
.masthead nav{display:flex;flex-wrap:wrap;gap:0 24px}.masthead nav a{display:inline-flex;align-items:center;min-height:44px;text-decoration:none}.masthead nav a:hover{color:var(--accent)}.masthead nav a[aria-current]{color:var(--ink);text-decoration:underline;text-decoration-color:var(--accent);text-underline-offset:.5em}
main{max-width:73rem;margin:auto;padding:clamp(2rem,4vw,3.5rem) var(--gutter) 100px}
h1,h2,h3{color:var(--ink);font-weight:400;line-height:1.05;text-wrap:balance}
h1{font-size:clamp(2.75rem,1.4rem + 4.6vw,5.75rem);line-height:.98;letter-spacing:-.01em;margin:18px 0 28px}h1 em{font-style:italic;font-weight:300;color:var(--ink-soft)}
h2{font-size:clamp(1.9rem,1.3rem + 2vw,2.75rem);margin:64px 0 24px}h3{font-size:clamp(1.4rem,1.1rem + 1vw,1.85rem);margin:40px 0 16px}
p{margin:0 0 1.15em}strong{font-weight:500}
.label{color:var(--ink-faint)}
.hero{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(16rem,.6fr);gap:clamp(2rem,6vw,5rem);align-items:end;padding-bottom:48px;border-bottom:1px solid var(--ink)}
.deck{max-width:36ch;color:var(--ink-soft);font-size:clamp(1.2rem,1rem + .6vw,1.4rem);line-height:1.45;font-style:italic}
.deck::before{content:"";display:block;width:2.5rem;height:1px;margin-bottom:1rem;background:var(--accent)}
.strata{margin:0;background:var(--paper-deep);padding:22px 24px 18px}.strata div{border-top:1px solid var(--ink);padding:14px 0;font-size:1.0625rem;line-height:1.35}.strata div em{color:var(--ink-soft)}.strata div:nth-child(2){padding-top:24px}.strata div:nth-child(3){padding-top:36px}
.strata figcaption{margin-top:14px;padding-top:10px;border-top:1px solid var(--rule);font:400 .75rem/1.6 var(--mono);color:var(--ink-soft)}
.reading{max-width:31em}.intro{margin:56px 0 64px}
.longform{margin:0 0 56px;border-top:1px solid var(--ink)}.longform a{display:grid;gap:6px;padding:18px 0 22px;text-decoration:none}.longform .longform-title{font-size:clamp(1.9rem,1.3rem + 2vw,2.75rem);line-height:1.05;text-decoration:underline;text-decoration-thickness:1px;text-decoration-color:var(--rule);text-underline-offset:.18em}.longform a:hover .longform-title{color:var(--accent);text-decoration-color:currentColor}.longform .longform-deck{max-width:46ch;color:var(--ink-soft);font-style:italic}
.index{border-top:1px solid var(--ink);padding-top:12px}.index h2{margin-top:0;font:500 .75rem/1.6 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--ink)}.index h3{margin:36px 0 10px;font:400 .6875rem/1.6 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint)}
.index ul{list-style:none;padding:0;max-width:34em;margin:0 0 1.2em}.index li{margin-bottom:18px;color:var(--ink-soft)}.index li a{color:var(--ink);font-size:1.4rem;line-height:1.25}.index p{max-width:34em;color:var(--ink-soft)}
.license{display:flex;flex-wrap:wrap;gap:0 24px;margin:48px 0 0;padding-top:12px;border-top:1px solid var(--rule);font:400 .6875rem/1.6 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint)}.license a{display:inline-flex;align-items:center;min-height:44px}
.note-header{max-width:60rem;border-bottom:1px solid var(--ink);padding-bottom:30px}
.note-layout{display:grid;grid-template-columns:clamp(13rem,19vw,16rem) minmax(0,1fr);gap:clamp(2rem,5vw,5rem);margin-top:40px}.founding-layout{margin-top:0}
.toc,.filing-rail{align-self:start;position:sticky;top:24px;color:var(--ink-faint)}.toc nav{display:block}.toc nav>div{border-top:1px solid var(--rule);padding-top:10px;color:var(--ink)}.toc ol{list-style:none;padding:0;margin:10px 0 0}.toc li{margin:0;border-bottom:1px solid var(--rule)}.toc a{display:block;padding:9px 0;min-height:0;text-decoration:none;font:400 .9375rem/1.3 var(--serif);letter-spacing:0;text-transform:none;color:var(--ink-soft)}.toc a:hover{color:var(--accent)}
article{min-width:0}article h2:first-of-type{margin-top:8px}article h2{padding-top:20px;border-top:1px solid var(--ink)}
blockquote{margin:36px 0;padding:4px 0 4px 24px;border-left:1px solid var(--ink);font-size:1.25em;line-height:1.4}blockquote p{margin:0}
code{font:.82em/1.5 var(--mono)}hr{border:0;border-top:1px solid var(--rule);margin:48px 0}
.filing{margin:0}.filing div{display:grid;gap:2px;padding:8px 0 6px;border-top:1px solid var(--rule)}.filing div:last-child{border-bottom:1px solid var(--rule)}.filing dd{margin:0;color:var(--ink);font:400 .8125rem/1.5 var(--mono)}.filing a{display:inline-flex;align-items:center;min-height:28px}
footer{padding:8px 0;border-top:1px solid var(--ink);color:var(--ink-faint)}footer .bar div{display:flex;flex-wrap:wrap;gap:0 24px}footer a{display:inline-flex;align-items:center;min-height:44px;text-decoration:none}footer a:hover{color:var(--accent)}
@media(max-width:760px){.wordmark span{display:none}.masthead nav{gap:0 18px}.filing-rail{position:static}main{padding-top:28px}.hero{grid-template-columns:1fr;gap:28px;padding-bottom:36px}.note-layout{grid-template-columns:1fr;gap:28px}.toc{position:static}.index li a{font-size:1.25rem}}
@media print{body{background:#fff;color:#000}.masthead nav,.skip,.toc,footer{display:none}.note-layout{display:block}}
'''


CSS += '''
.founding-text{min-width:0;max-width:34em;overflow-wrap:anywhere}.founding-text pre{max-width:100%;overflow-x:auto;padding:18px 20px;background:var(--paper-deep);font:.8125rem/1.6 var(--mono)}.table-scroll{max-width:100%;overflow-x:auto;margin:28px 0}table{border-collapse:collapse;font-size:1rem;line-height:1.45}th,td{padding:10px 14px 10px 0;text-align:left;vertical-align:top;border-bottom:1px solid var(--rule)}thead th{font:500 .8125rem/1.5 var(--mono);letter-spacing:.02em;border-bottom-color:var(--ink)}.founding-text li{margin-bottom:10px}.founding-text h1{font-size:clamp(2.5rem,1.4rem + 4vw,4.5rem)}
'''

FONTS = '<link rel="preconnect" href="https://api.fontshare.com"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=boska@300,301,400,401,500,501&amp;display=swap"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,500;0,700;1,400&amp;display=swap">'
LICENSE = '<a href="https://creativecommons.org/licenses/by/4.0/" rel="license">CC BY 4.0</a><a href="https://github.com/thedavidmurray/latent-information-archaeology">Source on GitHub</a>'
CANONICAL_DEFINITION = "Latent Information Archaeology is the systematic identification, reconstruction, and validation of previously unrecognized information, relationships, implications, and opportunities latent within existing informational artifacts."


def page(title, description, path, body):
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title} | Edgeless Lab</title><meta name="description" content="{html.escape(description)}"><link rel="canonical" href="https://edgelesslab.com{path}"><meta property="og:type" content="article"><meta property="og:title" content="{title}"><meta property="og:description" content="{html.escape(description)}"><meta property="og:url" content="https://edgelesslab.com{path}"><meta property="og:image" content="https://edgelesslab.com/lia/og-image.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Latent Information Archaeology: finding in the intersections"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="https://edgelesslab.com/lia/og-image.png">{FONTS}<style>{CSS}</style></head>
<body><a class="skip" href="#main-content">Skip to content</a><header class="masthead"><div class="bar"><a class="wordmark" href="/">Edgeless Lab<span>/ Latent Information Archaeology</span></a><nav aria-label="Main navigation"><a href="/field-notes/">Field Notes</a><a href="/lia/"{' aria-current="page"' if path == '/lia/' else ''}>LIA</a><a href="/blog/">Blog</a><a href="https://shop.edgelesslab.com">Shop</a></nav></div></header><main id="main-content" tabindex="-1">{body}</main><footer><div class="bar"><span>Edgeless Lab / public research studio</span><div><a href="/lia/">LIA index</a><a href="/field-notes/">Field Notes</a><a href="/about/">About</a></div></div></footer></body></html>'''


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    intro = (CONTENT / 'lia-section-intro-v0.1.md').read_text()
    index = (CONTENT / 'lia-public-index-v0.1.md').read_text()
    note = (CONTENT / 'field-note-public-draft-v0.3.md').read_text()
    landing = '''<div class="hero"><div><div class="label">LIA / an Edgeless Lab research program</div><h1>Latent Information<br><em>Archaeology.</em></h1><p class="deck">Latent Information Archaeology studies the intersections between fields: useful, defensible connections across bodies of knowledge.</p></div><figure class="strata"><div>Across fields<br><em>Science, humanities, art, engineering</em></div><div>Map the connection<br><em>Prior art and disanalogies</em></div><div>Test it<br><em>A useful consequence, a discriminating test</em></div><figcaption>Evidence precedes assertion. Similarity is a lead, not proof.</figcaption></figure></div>'''
    landing += '<section class="intro reading">' + markdown(intro) + '</section><section class="index" data-lia-index>' + markdown(index) + '</section><p class="license">' + LICENSE + '</p>'
    (OUT / 'index.html').write_text(page('Latent Information Archaeology', CANONICAL_DEFINITION, '/lia/', landing))
    headings = re.findall(r'^## (.+)$', note, flags=re.M)
    toc = '<aside class="toc"><nav aria-label="In this field note"><div>IN THIS FIELD NOTE<ol>' + ''.join('<li><a href="#' + re.sub(r'[^a-z0-9]+', '-', h.lower()).strip('-') + '">' + html.escape(h) + '</a></li>' for h in headings) + '</ol></div></nav></aside>'
    body = f'<header class="note-header"><div class="label">Field Notes / methodology / filed 2026.11.18</div><h1>{TITLE}</h1><p class="deck">A research-method field note about reading artifacts without turning a pattern into an unsupported story.</p></header><div class="note-layout">' + toc + '<article class="reading">' + markdown(note) + '</article></div>'
    dest = OUT / SLUG
    dest.mkdir(exist_ok=True)
    (dest / 'index.html').write_text(page(TITLE, 'A research-method field note about reading artifacts without turning a pattern into an unsupported story.', f'/lia/{SLUG}/', body))
    founding = (CONTENT / 'LIA.md').read_text()
    filing = ('<aside class="filing-rail"><dl class="filing">'
              '<div><dt>Text</dt><dd>LIA v0.1, short form</dd></div>'
              '<div><dt>License</dt><dd><a href="https://creativecommons.org/licenses/by/4.0/" rel="license">CC BY 4.0</a></dd></div>'
              '<div><dt>Repository</dt><dd><a href="https://github.com/thedavidmurray/latent-information-archaeology">Source on GitHub</a></dd></div>'
              '<div><dt>Markdown</dt><dd><a href="/lia/founding-text/LIA.md" download>Download LIA.md</a></dd></div>'
              '</dl></aside>')
    founding_body = '<div class="note-layout founding-layout">' + filing + '<article class="reading founding-text">' + markdown(founding) + '</article></div>'
    dest = OUT / 'founding-text'
    dest.mkdir(exist_ok=True)
    (dest / 'index.html').write_text(page('LIA founding text', CANONICAL_DEFINITION, '/lia/founding-text/', founding_body))
    (dest / 'LIA.md').write_bytes((CONTENT / 'LIA.md').read_bytes())
    print('Rendered /lia/, methods note and /lia/founding-text/ from four public Markdown inputs')


if __name__ == '__main__':
    build()
