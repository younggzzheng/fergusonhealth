"""Loopback-only CI stand-in for the CDN password gate, never a deploy server."""

from functools import partial
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


PASSWORD = "ci-preview-password"
TOKEN = "ci-only-preview-cookie"
COOKIE = "fwh_preview"
DIST = Path(__file__).resolve().parents[1] / "dist"


class PreviewHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "private, no-store")
        self.send_header("X-Robots-Tag", "noindex, nofollow, noarchive")
        super().end_headers()

    def respond(self, status, body, cookie=None):
        content = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        if status == 405:
            self.send_header("Allow", "POST")
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(content)

    def do_POST(self):
        path = urlsplit(self.path).path
        if path == "/__preview_auth":
            if self.headers.get("X-Preview-Password") != PASSWORD:
                self.respond(401, "Incorrect password.")
                return
            # Local HTTP omits Secure; production's HTTPS edge adds it.
            self.respond(200, "ok", f"{COOKIE}={TOKEN}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800")
        elif path == "/__preview_logout":
            self.respond(200, "ok", f"{COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT")
        else:
            self.respond(404, "Not found.")

    def allowed(self):
        path = urlsplit(self.path).path
        if path in {"/__preview_auth", "/__preview_logout"}:
            self.respond(405, "Method not allowed.")
            return False
        if path == "/robots.txt":
            self.respond(200, "User-agent: *\nDisallow: /\n")
            return False
        if path == "/preview.html":
            return True
        cookies = SimpleCookie(self.headers.get("Cookie", ""))
        if COOKIE in cookies and cookies[COOKIE].value == TOKEN:
            return True
        self.send_response(302)
        self.send_header("Location", "/preview.html")
        self.send_header("Content-Length", "0")
        self.end_headers()
        return False

    def do_GET(self):
        if self.allowed():
            super().do_GET()

    def do_HEAD(self):
        if self.allowed():
            super().do_HEAD()


if __name__ == "__main__":
    if not (DIST / "index.html").is_file():
        raise SystemExit("Build dist first with python3 build.py --revision <commit SHA>.")
    ThreadingHTTPServer(("127.0.0.1", 4173), partial(PreviewHandler, directory=str(DIST))).serve_forever()
