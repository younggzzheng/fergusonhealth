#!/usr/bin/env python3
"""Publish the private Ferguson Health draft to the existing OSS bucket."""
import argparse
import base64
import email.utils
import hashlib
import hmac
import os
from pathlib import Path
import urllib.error
import urllib.request

SITE = "https://www.fergusonhealth.com"
BUCKET = "fergusonhealth-cn-web"


def upload(key, data, content_type):
    access_id = os.environ["ALIBABA_CLOUD_ACCESS_KEY_ID"]
    secret = os.environ["ALIBABA_CLOUD_ACCESS_KEY_SECRET"]
    date = email.utils.formatdate(usegmt=True)
    content_md5 = base64.b64encode(hashlib.md5(data).digest()).decode()
    to_sign = f"PUT\n{content_md5}\n{content_type}\n{date}\n/{BUCKET}/{key}"
    signature = base64.b64encode(
        hmac.new(secret.encode(), to_sign.encode(), hashlib.sha1).digest()
    ).decode()
    request = urllib.request.Request(
        f"https://{BUCKET}.oss-cn-shanghai.aliyuncs.com/{key}",
        data=data,
        method="PUT",
        headers={
            "Date": date,
            "Content-Type": content_type,
            "Content-MD5": content_md5,
            "Cache-Control": "private, no-store",
            "Authorization": f"OSS {access_id}:{signature}",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            print(f"Uploaded {key}: HTTP {response.status}")
    except urllib.error.HTTPError as error:
        raise SystemExit(f"OSS upload failed: HTTP {error.code}") from None


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def check_gate():
    try:
        urllib.request.build_opener(NoRedirect).open(SITE + "/index.html", timeout=30)
    except urllib.error.HTTPError as error:
        if error.code == 302 and error.headers.get("Location") == SITE + "/preview.html":
            return
    raise SystemExit("Refusing to publish: the live preview gate is not enforced.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--gate-only", action="store_true", help="Upload the public login page only")
    args = parser.parse_args()
    root = Path(__file__).parent
    if args.gate_only:
        upload("preview.html", (root / "preview.html").read_bytes(), "text/html; charset=utf-8")
        return

    check_gate()
    source = root / "draft"
    content_types = {
        ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
        ".js": "application/javascript; charset=utf-8", ".svg": "image/svg+xml",
        ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
        ".woff2": "font/woff2", ".woff": "font/woff", ".txt": "text/plain; charset=utf-8",
    }
    files = [p for p in source.rglob("*") if p.is_file() and p.suffix in content_types]
    if not (source / "index.html").is_file():
        raise SystemExit("Draft index.html is missing.")
    # Publish the entry page last, after all of its assets exist.
    for path in sorted(files, key=lambda p: (p == source / "index.html", str(p))):
        upload(path.relative_to(source).as_posix(), path.read_bytes(), content_types[path.suffix])
    print("Uploaded draft. Refresh the CDN and verify the live page before declaring success.")


if __name__ == "__main__":
    main()
