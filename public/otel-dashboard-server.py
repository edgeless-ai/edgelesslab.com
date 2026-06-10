#!/usr/bin/env python3
"""HTTP server for Edgeless OTEL Dashboard with Jaeger API proxy."""

import http.server
import socketserver
import urllib.request
import urllib.error

JAEGER = "http://localhost:16687"
PORT = 8765


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        # Proxy /jaeger/* → Jaeger API
        if self.path.startswith("/jaeger/"):
            target = JAEGER + self.path[len("/jaeger"):]
            try:
                with urllib.request.urlopen(target, timeout=5) as resp:
                    body = resp.read()
                    self.send_response(resp.status)
                    self.send_header("Content-Type", resp.headers.get("Content-Type", "application/json"))
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(body)
            except urllib.error.HTTPError as e:
                self.send_response(e.code)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(e.read())
            except Exception as e:
                self.send_response(502)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(f'{{"error":"{str(e)}"}}'.encode())
            return

        # Serve static files (dashboard HTML, etc.)
        super().do_GET()


if __name__ == "__main__":
    import os
    os.chdir("/Users/djm/claude-projects/generated")
    with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
        print(f"Dashboard:  http://127.0.0.1:{PORT}/edgeless-otel-dashboard.html")
        print(f"Jaeger UI:  http://localhost:16687")
        print("Serving...")
        httpd.serve_forever()
