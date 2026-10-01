#!/usr/bin/env python3
"""Check password protection and the core release without downloading all media."""
import argparse
import gzip
import hashlib
import http.cookiejar
import json
import os
from pathlib import Path
import time
import urllib.error
import urllib.request

from alibaba import BUCKET, DOMAIN

SITE = f"https://{DOMAIN}"


class VerificationError(RuntimeError):
    pass


class PropagationError(VerificationError):
    """A protected response is still an earlier release or has not arrived yet."""


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class Client:
    def __init__(self, session=False):
        handlers = [NoRedirect()]
        if session:
            handlers.append(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.opener = urllib.request.build_opener(*handlers)

    def request(self, path, method="GET", headers=None, site=SITE):
        request = urllib.request.Request(site + path, method=method,
                                         headers={"Accept-Encoding": "identity", **(headers or {})},
                                         data=b"" if method == "POST" else None)
        for attempt in range(3):
            try:
                try:
                    response = self.opener.open(request, timeout=90)
                except urllib.error.HTTPError as error:
                    response = error
                with response:
                    status = response.code
                    body = response.read()
                    result_headers = {k.lower(): v for k, v in response.headers.items()}
                if status == 429 or status >= 500:
                    raise OSError("Transient HTTP failure")
                if result_headers.get("content-encoding") == "gzip":
                    body = gzip.decompress(body)
                return status, result_headers, body
            except (OSError, urllib.error.URLError):
                if attempt == 2:
                    raise VerificationError(f"Network failure reading {path}") from None
                time.sleep(2)


def require(condition, message):
    if not condition:
        raise VerificationError(message)


def require_gate(client, paths):
    for path in paths:
        status, headers, _ = client.request(path)
        require(status == 302 and headers.get("location") == SITE + "/preview.html",
                f"Anonymous access is not blocked: {path} (HTTP {status})")


def protected_paths(manifest):
    # All immutable assets share the same protected release prefix. One probe
    # exercises that rule without adding network requests for every new image.
    asset = next((path for path in manifest["files"] if path.startswith("/releases/")), None)
    return ["/", "/index.html", "/release.json"] + ([asset] if asset else [])


def login(password, client=None):
    client = client or Client(session=True)
    status, headers, body = client.request("/__preview_auth", "POST", {"X-Preview-Password": password})
    require(status == 200 and body.strip() == b"ok", "Preview login failed")
    cookie = headers.get("set-cookie", "").lower()
    require(all(attr in cookie for attr in ("secure", "httponly", "samesite=strict", "path=/")),
            "Preview session lacks required cookie protection")
    return client


def check_release(client, manifest):
    status, _, body = client.request("/release.json")
    if status == 404:
        raise PropagationError("Release manifest has not propagated")
    require(status == 200, f"Authenticated manifest failed: HTTP {status}")
    try:
        live = json.loads(body)
    except ValueError:
        raise PropagationError("Live release manifest is not valid JSON") from None
    if live != manifest:
        raise PropagationError("Live revision or file manifest differs from the expected release")
    status, _, body = client.request("/")
    require(status == 200, f"Authenticated homepage failed: HTTP {status}")
    if hashlib.sha256(body).hexdigest() != manifest["files"]["/index.html"]:
        raise PropagationError("Live homepage hash differs from index.html")
    for path, expected in manifest["files"].items():
        if path not in ("/index.html", "/preview.html") and Path(path).suffix not in (".css", ".js"):
            continue
        status, headers, body = client.request(path)
        if status == 404:
            raise PropagationError(f"Release file has not propagated: {path}")
        require(status == 200, f"Authenticated file failed: {path} (HTTP {status})")
        if hashlib.sha256(body).hexdigest() != expected:
            raise PropagationError(f"Live file hash differs: {path}")
        require("no-store" in headers.get("cache-control", ""), f"Browser caching enabled: {path}")
        require("noindex" in headers.get("x-robots-tag", ""), f"Search indexing enabled: {path}")
        if path == "/index.html":
            marker = f'<meta name="build-revision" content="{manifest["revision"]}">'.encode()
            require(marker in body, "Homepage build revision is missing")


def verify(manifest, password, attempts=12, check_origin=True):
    anonymous = Client()
    protected = protected_paths(manifest)
    require_gate(anonymous, protected)
    status, headers, _ = anonymous.request("/", site=f"http://{DOMAIN}")
    require(status in (301, 308) and headers.get("location", "").startswith(SITE + "/"),
            "HTTP does not redirect to HTTPS")
    status, _, body = anonymous.request("/preview.html")
    require(status == 200 and b'id="login-form"' in body, "Public password form is unavailable")
    for headers in ({}, {"X-Preview-Password": "intentionally-wrong-ci-password"}):
        status, _, _ = anonymous.request("/__preview_auth", "POST", headers)
        require(status == 401, "Missing or wrong password was accepted")
    status, _, _ = anonymous.request("/", headers={"Cookie": "fwh_preview=invalid"})
    require(status == 302, "Forged session cookie was accepted")
    client = login(password)
    for attempt in range(attempts):
        try:
            check_release(client, manifest)
            break
        except PropagationError:
            if attempt == attempts - 1:
                raise
            print("Waiting for the protected release to propagate...", flush=True)
            time.sleep(10)
    require_gate(anonymous, protected)
    status, _, body = client.request("/__preview_logout", "POST")
    require(status == 200 and body.strip() == b"ok", "Preview logout failed")
    require_gate(client, ["/", "/release.json"])
    if check_origin:
        for path in ("/index.html", "/release.json"):
            status, _, _ = anonymous.request(path, site=f"https://{BUCKET}.oss-cn-shanghai.aliyuncs.com")
            require(status == 403, f"Direct OSS origin is not private: {path}")
    print(f"Verified live revision {manifest['revision']}, core pages/scripts/styles, and password protection; media loading is advisory.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", default="dist/release.json")
    parser.add_argument("--attempts", type=int, default=12)
    args = parser.parse_args()
    try:
        verify(json.loads(Path(args.manifest).read_text()), os.environ["FWH_PREVIEW_PASSWORD"], args.attempts)
    except (VerificationError, KeyError) as error:
        raise SystemExit(str(error)) from None
