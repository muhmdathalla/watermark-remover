#!/usr/bin/env python3
"""
AURA // Pro Watermark Inpainting Studio Server
Lightweight local HTTP server for testing and using the studio locally.
"""
import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8080

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable COOP & COEP for high-resolution SharedArrayBuffer and Canvas performance
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

def run():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    port = PORT
    for p in range(PORT, PORT + 20):
        try:
            with socketserver.TCPServer(("", p), Handler) as httpd:
                print(f"=====================================================")
                print(f"  AURA PRO // Studio Watermark Inpainting Engine")
                print(f"  Server aktif di: http://localhost:{p}")
                print(f"=====================================================")
                print(f"  Tekan Ctrl+C untuk menghentikan server.")
                httpd.serve_forever()
                break
        except OSError:
            continue

if __name__ == '__main__':
    run()
