#!/usr/bin/env python3
"""Real-network marimo witness. Records every error; never routes/mocks requests."""
import argparse
import hashlib
import json
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlsplit

from playwright.sync_api import sync_playwright


def sha(text):
    return hashlib.sha256(text.encode()).hexdigest()


def attach(page, state, manifest=None, manifest_origin=None):
    def finished(request):
        suffix = Path(urlsplit(request.url).path).suffix.lower()
        if suffix not in {'.css', '.js', '.mjs', '.wasm'}:
            return
        response = request.response()
        row = dict(url=request.url, resource_type=request.resource_type,
                   status=response.status, content_type=response.headers.get('content-type', ''))
        state['responses'].append(row)
        try:
            body = response.body()
            row.update(bytes=len(body), sha256=hashlib.sha256(body).hexdigest())
            mime = row['content_type'].split(';')[0].strip().lower()
            allowed = {'.css': {'text/css'}, '.wasm': {'application/wasm'}}.get(
                suffix, {'text/javascript', 'application/javascript'})
            row['mime_ok'] = mime in allowed and not body.lstrip().lower().startswith((b'<!doctype html', b'<html'))
            if manifest is not None and urlsplit(request.url).netloc == manifest_origin:
                key = unquote(urlsplit(request.url).path).lstrip('/')
                row['expected_sha256'] = manifest.get(key)
                row['identity_ok'] = row['sha256'] == row['expected_sha256']
            if not row['mime_ok'] or row.get('identity_ok') is False:
                state['errors'].append(dict(kind='asset-validation', **row))
        except Exception as e:
            row['capture_failure'] = str(e)
            state['errors'].append(dict(kind='asset-capture', url=request.url, failure=str(e)))

    page.on('requestfinished', finished)
    page.on('pageerror', lambda e: state['errors'].append(dict(kind='pageerror', text=str(e), stack=e.stack)))
    page.on('console', lambda m: state['console'].append(dict(kind=m.type, text=m.text, location=m.location)))
    page.on('requestfailed', lambda r: state['errors'].append(dict(kind='requestfailed', url=r.url, failure=r.failure)))
    page.on('response', lambda r: state['errors'].append(dict(kind='http', url=r.url, status=r.status)) if r.status >= 400 else None)
    page.on('request', lambda r: state['requests'].append(dict(url=r.url, resource_type=r.resource_type)))


def isolated(page, state, url, timeout):
    response = page.goto(url, wait_until='domcontentloaded', timeout=60000)
    state['http'] = response.status
    page.get_by_role('slider').first.wait_for(timeout=timeout)
    page.wait_for_timeout(1000)
    state['headings'] = page.locator('h1,h2,h3').all_text_contents()
    state['initial_text'] = page.locator('body').inner_text()
    state['controls'] = []
    for i in range(page.get_by_role('slider').count()):
        slider = page.get_by_role('slider').nth(i)
        before = page.locator('body').inner_text()
        before_svg = page.locator('svg').evaluate_all('(es)=>es.map(e=>e.outerHTML).join("|")')
        value = slider.evaluate('(e)=>e.getAttribute("aria-valuenow") ?? e.value')
        maximum = slider.evaluate('(e)=>e.getAttribute("aria-valuemax") ?? e.max')
        slider.focus()
        slider.press('Home' if value == maximum else 'End')
        page.wait_for_function('(old)=>document.body.innerText!==old', arg=before, timeout=timeout)
        page.wait_for_timeout(500)
        after = page.locator('body').inner_text()
        after_svg = page.locator('svg').evaluate_all('(es)=>es.map(e=>e.outerHTML).join("|")')
        after_value = slider.evaluate('(e)=>e.getAttribute("aria-valuenow") ?? e.value')
        state['controls'].append(dict(index=i, before_value=value, after_value=after_value,
                                      value_changed=value != after_value,
                                      text_changed=before != after, svg_changed=before_svg != after_svg,
                                      before_svg_sha256=sha(before_svg), after_svg_sha256=sha(after_svg), after_text=after))
    state['overflow_px'] = page.evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth')
    state['runtime_and_control_pass'] = bool(state['controls']) and all(c['value_changed'] and c['text_changed'] and c['svg_changed'] for c in state['controls'])
    if not state['runtime_and_control_pass']:
        raise AssertionError('Control, reactive text and SVG must all change')


def gallery(page, state, url, behavior):
    page.add_init_script('''window.__frameMax=0;setInterval(()=>{window.__frameMax=Math.max(window.__frameMax,document.querySelectorAll('iframe[src]').length)},25)''')
    response = page.goto(url, wait_until='domcontentloaded', timeout=60000)
    state['http'] = response.status
    reject = page.get_by_role('button', name='Reject analytics', exact=True)
    if reject.count():
        reject.click()
    cards = page.locator('a').filter(has=page.locator('[data-testid="marimo-preview"]'))
    # The selector is structural, not a hand-maintained notebook list.
    if not cards.count():
        cards = page.locator('a[target="_blank"]').filter(has=page.locator('h3'))
    state['cards'] = cards.count()
    if not state['cards']:
        raise AssertionError('No gallery cards; selector no longer witnesses gallery')
    state['card_urls'] = cards.evaluate_all('(es)=>es.map(e=>e.href)')
    for i in range(cards.count()):
        cards.nth(i).evaluate('(e,b)=>e.scrollIntoView({behavior:b,block:"center"})', behavior)
        page.wait_for_timeout(250 if behavior == 'instant' else 450)
    page.wait_for_timeout(5000)
    target = page.locator('a[href="https://marimo.edgelesslab.com/2608.12123-ready-cohort-packing/"]')
    target.evaluate('(e,b)=>e.scrollIntoView({behavior:b,block:"center"})', behavior)
    target.locator('iframe').wait_for(timeout=30000)
    frame = target.locator('iframe').content_frame
    frame.get_by_role('heading', name='At 50 ms: fixed 12/23 · exact 16/23 · local upper 19/23', exact=True).wait_for(timeout=90000)
    state['ready_cohort_preview_heading'] = True
    state['max_iframes'] = page.evaluate('window.__frameMax')
    state['overflow_px'] = page.evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth')


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--url', required=True)
    ap.add_argument('--mode', choices=['isolated', 'gallery'], required=True)
    ap.add_argument('--output', type=Path, required=True)
    ap.add_argument('--timeout', type=int, default=90000)
    ap.add_argument('--logical-manifest', type=Path, help='Packager receipt for same-origin asset identity checks')
    args = ap.parse_args()
    manifest = json.loads(args.logical_manifest.read_text())['logical_manifest'] if args.logical_manifest else None
    args.output.mkdir(parents=True, exist_ok=True)
    receipt = dict(url=args.url, mode=args.mode, states=[], network_interception=False)
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for width, height in [(1440, 1000), (390, 844)]:
            for behavior in (['instant', 'smooth'] if args.mode == 'gallery' else ['direct']):
                state: dict[str, Any] = dict(width=width, height=height, behavior=behavior, errors=[], console=[], requests=[], responses=[])
                receipt['states'].append(state)
                context = browser.new_context(viewport={'width': width, 'height': height})
                page = context.new_page()
                attach(page, state, manifest, urlsplit(args.url).netloc)
                try:
                    if args.mode == 'isolated':
                        isolated(page, state, args.url, args.timeout)
                    else:
                        gallery(page, state, args.url, behavior)
                    state['witness_completed'] = True
                except Exception as e:
                    state['witness_completed'] = False
                    state['witness_failure'] = str(e)
                finally:
                    try:
                        page.screenshot(path=str(args.output/f'{width}-{behavior}.png'))
                        state['final_text'] = page.locator('body').inner_text(timeout=5000)
                        if args.mode == 'gallery':
                            state['max_iframes'] = page.evaluate('window.__frameMax')
                    except Exception as e:
                        state['capture_failure'] = str(e)
                    context.close()
                    state['clean'] = state['witness_completed'] and not state['errors'] and not any(m['kind']=='error' or 'RPC request timed out' in m['text'] for m in state['console'])
                    (args.output/'receipt.json').write_text(json.dumps(receipt, indent=2)+'\n')
                    print(json.dumps({k: state.get(k) for k in ['width','behavior','witness_completed','clean','max_iframes','runtime_and_control_pass']})+' errors='+str(len(state['errors'])), flush=True)
        browser.close()
    return 0 if all(s['clean'] for s in receipt['states']) else 1


if __name__ == '__main__':
    raise SystemExit(main())
