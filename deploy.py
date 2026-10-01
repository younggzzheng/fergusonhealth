#!/usr/bin/env python3
"""Publish immutable assets, switch entry pages last, and restore them on failure."""
import argparse
import json
import mimetypes
import os
from pathlib import Path
import re
import subprocess

from alibaba import Alibaba
from build import sha256
from verify_preview import Client, login, require, require_gate, verify

ENTRIES = ("preview.html", "release.json", "index.html")
REFRESH_PATHS = ["/", "/index.html", "/preview.html", "/release.json"]


def content_type(key):
    return {".js": "application/javascript", ".woff2": "font/woff2"}.get(Path(key).suffix) or mimetypes.guess_type(key)[0] or "application/octet-stream"


def validate_build(folder):
    manifest = json.loads((folder / "release.json").read_text())
    require(bool(re.fullmatch(r"[0-9a-f]{40}", manifest.get("revision", ""))), "Invalid release revision")
    prefix = f"/releases/{manifest['revision']}/"
    for path, digest in manifest["files"].items():
        require(path.startswith("/") and ".." not in Path(path).parts, "Unsafe manifest path")
        require(path in ("/index.html", "/preview.html") or path.startswith(prefix), "Asset is not in the immutable release")
        require(sha256((folder / path.lstrip("/")).read_bytes()) == digest, f"Build file differs from manifest: {path}")
    require("/index.html" in manifest["files"] and "/preview.html" in manifest["files"], "Build entry pages are missing")
    return manifest


def publish(folder, api=None, verifier=verify, browser=False):
    folder = Path(folder)
    manifest = validate_build(folder)
    password = os.environ["FWH_PREVIEW_PASSWORD"]
    api = api or Alibaba()
    protected = ["/", "/release.json"] + [path for path in manifest["files"] if path != "/preview.html"]
    require_gate(Client(), protected)
    login(password)
    snapshots = {key: api.oss("GET", key) for key in ENTRIES}
    changed = False
    try:
        for path in sorted(manifest["files"]):
            key = path.lstrip("/")
            if key not in ENTRIES:
                api.oss("PUT", key, (folder / key).read_bytes(), content_type(key), "private, no-store")
        for key in ENTRIES:
            changed = True
            api.oss("PUT", key, (folder / key).read_bytes(), content_type(key), "private, no-store")
        api.refresh(REFRESH_PATHS)
        verifier(manifest, password)
        if browser:
            environment = {**os.environ, "FWH_LIVE_URL": "https://www.fergusonhealth.com", "EXPECTED_REVISION": manifest["revision"]}
            result = subprocess.run(["npm", "run", "test:live"], env=environment)
            require(result.returncode == 0, "Live browser verification failed")
    except Exception:
        if changed:
            print("Deployment failed; restoring the previous entry pages.", flush=True)
            try:
                for key in ENTRIES:
                    snapshot = snapshots[key]
                    if snapshot is None:
                        api.oss("DELETE", key)
                    else:
                        data, headers = snapshot
                        api.oss("PUT", key, data, headers.get("Content-Type", content_type(key)), "private, no-store")
                api.refresh(REFRESH_PATHS)
                session = login(password)
                for key, snapshot in snapshots.items():
                    status, _, body = session.request("/" + key)
                    require(status == (404 if snapshot is None else 200), f"Rollback status failed: {key}")
                    if snapshot is not None:
                        require(sha256(body) == sha256(snapshot[0]), f"Rollback bytes differ: {key}")
                require_gate(Client(), ["/", "/index.html", "/release.json"])
                print("Previous entry pages restored and verified.", flush=True)
            except Exception as rollback_error:
                raise RuntimeError("Deployment failed and automatic rollback could not be verified; manual recovery required") from rollback_error
        raise
    print(f"Deployed {manifest['revision']} successfully.", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", default="dist")
    parser.add_argument("--browser", action="store_true", help="Also run live Playwright checks before accepting the release")
    args = parser.parse_args()
    try:
        publish(args.directory, browser=args.browser)
    except (RuntimeError, KeyError, OSError, ValueError) as error:
        raise SystemExit(str(error)) from None
