#!/usr/bin/env python3
"""Validate the static site and build one immutable, revision-addressed release."""
import argparse
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path, PurePosixPath
import re
import shutil
from urllib.parse import unquote, urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parent
EXTENSIONS = {".html", ".css", ".js", ".svg", ".jpg", ".jpeg", ".png", ".webp", ".woff", ".woff2", ".txt"}
ATTRIBUTE = re.compile(r"\b(src|href)\s*=\s*(['\"])(.*?)\2", re.IGNORECASE)
CSS_URL = re.compile(r"url\(\s*(['\"]?)(.*?)\1\s*\)", re.IGNORECASE)


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def asset_path(url, current):
    parts = urlsplit(url)
    if not parts.path or parts.scheme or parts.netloc:
        return None
    path = unquote(parts.path)
    if path.startswith("/__preview_"):
        return None
    result = PurePosixPath(path.lstrip("/")) if path.startswith("/") else PurePosixPath(current).parent / path
    if ".." in result.parts:
        raise ValueError(f"Parent-directory asset reference in {current}")
    return result.as_posix()


class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.assets = []
        self.anchors = []
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            self.ids.add(attrs["id"])
        if tag == "base":
            raise ValueError("A base URL would break same-page navigation")
        if "srcset" in attrs:
            raise ValueError("Use explicit local image src values in this static build")
        if attrs.get("src"):
            self.assets.append(attrs["src"])
        if tag == "link" and attrs.get("href"):
            self.assets.append(attrs["href"])
        if tag in {"a", "use"} and attrs.get("href", "").startswith("#"):
            self.anchors.append(attrs["href"][1:])


def build(revision, root=ROOT, output=None):
    if not re.fullmatch(r"[0-9a-f]{40}", revision):
        raise ValueError("Revision must be a full 40-character Git commit SHA")
    root = Path(root)
    source = root / "draft"
    output = Path(output) if output else root / "dist"
    files = {}
    for path in sorted(source.rglob("*")):
        if path.is_symlink():
            raise ValueError("Site assets must not be symbolic links")
        if path.is_file() and path.suffix.lower() in EXTENSIONS:
            files[path.relative_to(source).as_posix()] = path.read_bytes()
    if "index.html" not in files:
        raise ValueError("draft/index.html is missing")
    for name, data in files.items():
        refs = []
        if name.endswith(".html"):
            parser = References()
            parser.feed(data.decode())
            refs = parser.assets
            missing = set(parser.anchors) - parser.ids - {""}
            if missing:
                raise ValueError(f"Missing anchor targets in {name}: {sorted(missing)}")
        elif name.endswith(".css"):
            refs = [match[1] for match in CSS_URL.findall(data.decode())]
        for url in refs:
            if urlsplit(url).scheme in {"http", "https"} or url.startswith("//"):
                raise ValueError(f"Essential assets must be hosted locally: {name}")
            asset = asset_path(url, name)
            if asset and asset not in files:
                raise ValueError(f"Missing asset {asset} referenced by {name}")

    prefix = f"/releases/{revision}/"

    def rewrite(url, current):
        asset = asset_path(url, current)
        if asset not in files:
            return url
        parts = urlsplit(url)
        return urlunsplit(("", "", prefix + asset, parts.query, parts.fragment))

    built = {}
    for name, data in files.items():
        if name.endswith(".html"):
            text = ATTRIBUTE.sub(lambda m: f"{m[1]}={m[2]}{rewrite(m[3], name)}{m[2]}", data.decode())
            text = text.replace("</head>", f'<meta name="build-revision" content="{revision}">\n</head>', 1)
            data = text.encode()
        elif name.endswith(".css"):
            data = CSS_URL.sub(lambda m: f'url("{rewrite(m[2], name)}")', data.decode()).encode()
        built[("/index.html" if name == "index.html" else prefix + name)] = data
    built["/preview.html"] = (root / "preview.html").read_bytes()
    manifest = {"revision": revision, "files": {name: sha256(data) for name, data in sorted(built.items())}}
    built["/release.json"] = (json.dumps(manifest, indent=2, sort_keys=True) + "\n").encode()
    if output.exists():
        shutil.rmtree(output)
    for name, data in built.items():
        destination = output / name.lstrip("/")
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(data)
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--revision", required=True)
    args = parser.parse_args()
    manifest = build(args.revision)
    print(f"Built {manifest['revision']}: {len(manifest['files'])} verified files")
