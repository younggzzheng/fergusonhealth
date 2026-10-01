#!/usr/bin/env python3
"""Exercise real preview authentication, including cache and origin bypasses."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import tempfile

DOMAIN = "www.fergusonhealth.com"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--staging-ip")
    parser.add_argument("--draft", action="store_true")
    args = parser.parse_args()
    password = os.environ["FWH_PREVIEW_PASSWORD"]
    with tempfile.TemporaryDirectory(prefix="fwh-verify-") as folder:
        root = Path(folder)
        cookies = root / "cookies"

        def request(path, method="GET", header=None, session=False, http=False, origin=False):
            host = "fergusonhealth-cn-web.oss-cn-shanghai.aliyuncs.com" if origin else DOMAIN
            url = ("http" if http else "https") + "://" + host + path
            command = ["curl", "--silent", "--show-error", "--max-time", "25",
                       "--request", method, "--dump-header", str(root / "headers"),
                       "--output", str(root / "body"), "--write-out", "%{http_code}", url]
            if args.staging_ip and not origin:
                command += ["--resolve", f"{DOMAIN}:{80 if http else 443}:{args.staging_ip}"]
            if header:
                command += ["--header", header]
            if session:
                command += ["--cookie", str(cookies), "--cookie-jar", str(cookies)]
            result = subprocess.run(command, capture_output=True, text=True, check=True)
            headers = {}
            for line in (root / "headers").read_text().splitlines():
                if ":" in line:
                    name, value = line.split(":", 1)
                    headers[name.lower()] = value.strip()
            return int(result.stdout), headers, (root / "body").read_bytes()

        def check(name, response, code, body=None, redirect=False):
            status, headers, content = response
            assert status == code, f"{name}: expected {code}, got {status}"
            if body is not None:
                assert body in content, f"{name}: expected content missing"
            if redirect:
                assert headers.get("location") == f"https://{DOMAIN}/preview.html", name
            print(json.dumps({"check": name, "status": status, "passed": True}), flush=True)
            return headers

        check("http redirects to https", request("/", http=True), 301)
        for path in ["/", "/index.html", "/styles.css", "/assets/dr-ferguson.jpg", "/index.html?test=1"]:
            check("anonymous " + path, request(path), 302, redirect=True)
        check("public login page", request("/preview.html"), 200, b'id="login-form"')
        check("robots", request("/robots.txt"), 200, b"Disallow: /")
        check("login must use POST", request("/__preview_auth"), 405)
        check("missing password", request("/__preview_auth", "POST"), 401)
        check("wrong password", request("/__preview_auth", "POST", "X-Preview-Password: wrong"), 401)
        check("forged cookie", request("/", header="Cookie: fwh_preview=wrong"), 302, redirect=True)
        headers = check("correct password", request("/__preview_auth", "POST", "X-Preview-Password: " + password, True), 200, b"ok")
        cookie = headers.get("set-cookie", "").lower()
        assert all(value in cookie for value in ["secure", "httponly", "samesite=strict", "path=/"]), "Missing secure cookie attributes"
        expected = b"For every chapter" if args.draft else b"Under maintenance"
        headers = check("authenticated home", request("/", session=True), 200, expected)
        assert "no-store" in headers.get("cache-control", ""), "Private content must not be browser-cached"
        assert "noindex" in headers.get("x-robots-tag", ""), "Preview must not be indexed"
        if args.draft:
            for path in ["/index.html", "/styles.css", "/site.js", "/assets/dr-ferguson.jpg"]:
                check("authenticated asset " + path, request(path, session=True), 200)
                check("anonymous after warm " + path, request(path), 302, redirect=True)
        check("anonymous after warm home", request("/"), 302, redirect=True)
        check("logout", request("/__preview_logout", "POST", session=True), 200, b"ok")
        check("logged out home", request("/", session=True), 302, redirect=True)
        for path in ["/", "/index.html"]:
            check("private OSS " + path, request(path, origin=True), 403)
    print("All preview protection checks passed.", flush=True)


if __name__ == "__main__":
    main()
