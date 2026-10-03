"""Loopback-only static server for public website browser checks."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

DIST = Path(__file__).resolve().parents[1] / "dist"


class SiteHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        if urlsplit(self.path).path == "/preview.html":
            self.send_response(301)
            self.send_header("Location", "/")
            self.send_header("Content-Length", "0")
            self.end_headers()
        else:
            super().do_GET()


if __name__ == "__main__":
    if not (DIST / "index.html").is_file():
        raise SystemExit("Build dist first with python3 build.py --revision <commit SHA>.")
    ThreadingHTTPServer(("127.0.0.1", 4173), partial(SiteHandler, directory=str(DIST))).serve_forever()
