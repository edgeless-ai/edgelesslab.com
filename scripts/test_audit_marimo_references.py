"""Delivery regressions use a real local HTTP server, not browser interception."""
import functools
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import tempfile
import threading
import unittest

from audit_marimo_references import Audit, html_references, js_references, mime_ok, sha256


class ReferenceTests(unittest.TestCase):
    def test_html_uses_real_base_and_module_references(self):
        refs = html_references(b'''<base href="/book/"><script src="assets/index-x.js"></script>
            <link rel="modulepreload" href="assets/import-y.js">
            <link rel="stylesheet" href="assets/index-z.css">
            <link rel="icon" href="icon.png">''', 'https://example.test/book/')
        self.assertEqual(refs, [('js', 'https://example.test/book/assets/index-x.js'),
                                ('js', 'https://example.test/book/assets/import-y.js'),
                                ('css', 'https://example.test/book/assets/index-z.css')])

    def test_js_only_observed_literal_imports_not_guessed_suffixes(self):
        refs = js_references(b'''import "./static.js"; import("./lazy.js");
            import x from './style.css'; const unrelated="made-up.js";''', 'https://example.test/assets/index.js')
        self.assertEqual(refs, [('js', 'https://example.test/assets/static.js'),
                                ('js', 'https://example.test/assets/lazy.js'),
                                ('css', 'https://example.test/assets/style.css')])

    def test_html_never_counts_as_css_js_or_wasm_even_with_good_mime(self):
        for kind, mime in [('css', 'text/css'), ('js', 'text/javascript'), ('wasm', 'application/wasm')]:
            with self.subTest(kind=kind):
                self.assertFalse(mime_ok(kind, mime, b' <!doctype html><html>fallback'))
        self.assertTrue(mime_ok('wasm', 'application/wasm', b'\0asm\1\0\0\0'))
        self.assertFalse(mime_ok('wasm', 'text/html', b'\0asm'))

    def test_real_http_200_fallback_hash_and_unknown_source_fail_closed(self):
        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                self.send_response(200)
                self.send_header('Content-Type', 'text/css' if self.path == '/good.css' else 'text/html')
                self.end_headers()
                self.wfile.write(b'body{}' if self.path == '/good.css' else b'<!doctype html>fallback')

            def log_message(self, *args):
                pass

        server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            with tempfile.TemporaryDirectory() as tmp:
                output = Path(tmp) / 'audit'
                audit = Audit(output, {'good.css': sha256(b'body{}'), 'wrong.css': sha256(b'wrong')})
                base = f'http://127.0.0.1:{server.server_port}'
                fetch = functools.partial(audit.fetch, kind='css', slug='fixture', reference='actual fixture HTML')
                good, _ = fetch(base + '/good.css', logical_path='good.css')
                self.assertTrue(good['mime_ok'] and good['identity_match'])
                fallback, _ = fetch(base + '/missing.css', logical_path='missing.css')
                self.assertEqual(fallback['http'], 200)
                self.assertFalse(fallback['mime_ok'])
                self.assertFalse(fallback['identity_match'])
                wrong, _ = fetch(base + '/good.css', logical_path='wrong.css')
                self.assertTrue(wrong['mime_ok'])
                self.assertFalse(wrong['identity_match'])
                self.assertEqual(len((output / 'requests.jsonl').read_text().splitlines()), 3)
                self.assertEqual((output / fallback['body']).read_bytes(), b'<!doctype html>fallback')
                self.assertIn('Content-Type: text/html', (output / fallback['headers']).read_text())
                self.assertEqual(json.loads((output / 'requests.jsonl').read_text().splitlines()[1])['http'], 200)
        finally:
            server.shutdown()
            thread.join()
            server.server_close()


if __name__ == '__main__':
    unittest.main()
