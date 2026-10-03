#!/usr/bin/env python3
"""Check the public website and core release without downloading all media."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import time
import urllib.error
import urllib.request

from alibaba import BUCKET, DOMAIN

SITE = f"https://{DOMAIN}"


class VerificationError(RuntimeError):
    pass


class PropagationError(VerificationError):
    """A public response is still an earlier release or has not arrived yet."""


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class Client:
    def __init__(self):
        self.opener = urllib.request.build_opener(NoRedirect())

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


def check_release(client, manifest):
    status, _, body = client.request("/release.json")
    if status == 404:
        raise PropagationError("Release manifest has not propagated")
    if status == 302:
        raise PropagationError("Password gate has not yet been removed from this CDN node")
    require(status == 200, f"Public manifest failed: HTTP {status}")
    try:
        live = json.loads(body)
    except ValueError:
        raise PropagationError("Live release manifest is not valid JSON") from None
    if live != manifest:
        raise PropagationError("Live revision or file manifest differs from the expected release")
    status, _, body = client.request("/")
    require(status == 200, f"Public homepage failed: HTTP {status}")
    if hashlib.sha256(body).hexdigest() != manifest["files"]["/index.html"]:
        raise PropagationError("Live homepage hash differs from index.html")
    for path, expected in manifest["files"].items():
        if path == "/preview.html" or Path(path).suffix not in (".html", ".css", ".js"):
            continue
        status, headers, body = client.request(path)
        if status == 404:
            raise PropagationError(f"Release file has not propagated: {path}")
        require(status == 200, f"Public file failed: {path} (HTTP {status})")
        if hashlib.sha256(body).hexdigest() != expected:
            raise PropagationError(f"Live file hash differs: {path}")
        require("no-store" in headers.get("cache-control", ""), f"Browser caching enabled: {path}")
        if path == "/index.html":
            marker = f'<meta name="build-revision" content="{manifest["revision"]}">'.encode()
            require(marker in body, "Homepage build revision is missing")


def verify(manifest, attempts=12, check_origin=True):
    anonymous = Client()
    status, headers, _ = anonymous.request("/", site=f"http://{DOMAIN}")
    require(status in (301, 308) and headers.get("location", "").startswith(SITE + "/"),
            "HTTP does not redirect to HTTPS")
    for attempt in range(attempts):
        try:
            check_release(anonymous, manifest)
            break
        except PropagationError:
            if attempt == attempts - 1:
                raise
            print("Waiting for the public release to propagate...", flush=True)
            time.sleep(10)
    if check_origin:
        for path in ("/index.html", "/release.json"):
            status, _, _ = anonymous.request(path, site=f"https://{BUCKET}.oss-cn-shanghai.aliyuncs.com")
            require(status == 403, f"Direct OSS origin is not private: {path}")
    print(f"Verified live revision {manifest['revision']}, public pages/scripts/styles without a password; media loading is advisory.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", default="dist/release.json")
    parser.add_argument("--attempts", type=int, default=12)
    args = parser.parse_args()
    try:
        verify(json.loads(Path(args.manifest).read_text()), args.attempts)
    except (VerificationError, KeyError) as error:
        raise SystemExit(str(error)) from None
