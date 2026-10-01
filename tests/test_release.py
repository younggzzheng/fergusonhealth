"""Regression tests for build validation, fail-closed checks, and rollback."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

from build import build, sha256
from deploy import publish, validate_build
from verify_preview import check_release, PropagationError, require_gate, VerificationError

REVISION = "a" * 40


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        draft = self.root / "draft"
        draft.mkdir()
        (draft / "index.html").write_text('<html><head><link rel="stylesheet" href="styles.css"></head><body><a href="#contact">Contact</a><section id="contact"><img src="portrait.svg"></section></body></html>')
        (draft / "styles.css").write_text("body{color:black}")
        (draft / "portrait.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg"/>')
        (self.root / "preview.html").write_text('<form id="login-form" method="post"></form>')

    def prepare(self):
        return build(REVISION, self.root)

    def test_build_keeps_anchors_and_versions_every_asset(self):
        manifest = self.prepare()
        output = self.root / "dist"
        html = (output / "index.html").read_text()
        self.assertIn('href="#contact"', html)
        self.assertNotIn("<base", html)
        self.assertIn(f'/releases/{REVISION}/portrait.svg', html)
        self.assertIn(f'name="build-revision" content="{REVISION}"', html)
        self.assertEqual(validate_build(output), manifest)
        for path, digest in manifest["files"].items():
            self.assertEqual(sha256((output / path.lstrip("/")).read_bytes()), digest)

    def test_missing_image_fails_the_build(self):
        (self.root / "draft" / "portrait.svg").unlink()
        with self.assertRaisesRegex(ValueError, "Missing asset"):
            self.prepare()

    def test_missing_css_font_fails_the_build(self):
        (self.root / "draft" / "styles.css").write_text("@font-face{src:url('missing.woff2')}")
        with self.assertRaisesRegex(ValueError, "Missing asset"):
            self.prepare()

    def test_modified_build_is_rejected_before_deployment(self):
        self.prepare()
        (self.root / "dist" / "index.html").write_text("unexpected modification")
        with self.assertRaisesRegex(VerificationError, "differs from manifest"):
            validate_build(self.root / "dist")

    def test_anonymous_success_fails_closed(self):
        client = Mock()
        client.request.return_value = (200, {}, b"private content")
        with self.assertRaisesRegex(VerificationError, "Anonymous access"):
            require_gate(client, ["/index.html"])
        self.assertEqual(client.request.call_count, 1)

    def test_wrong_live_revision_is_rejected(self):
        manifest = self.prepare()
        old = {**manifest, "revision": "b" * 40}
        client = Mock()
        client.request.return_value = (200, {}, json.dumps(old).encode())
        with self.assertRaisesRegex(PropagationError, "revision"):
            check_release(client, manifest)

    def test_unprotected_new_asset_blocks_all_uploads(self):
        self.prepare()
        api = Mock()
        anonymous = Mock()
        anonymous.request.side_effect = lambda path: (404, {}, b"") if path.startswith("/releases/") else (302, {"location": "https://www.fergusonhealth.com/preview.html"}, b"")
        with patch.dict("os.environ", {"FWH_PREVIEW_PASSWORD": "unit-test-only"}), patch("deploy.Client", return_value=anonymous):
            with self.assertRaisesRegex(VerificationError, "Anonymous access"):
                publish(self.root / "dist", api=api)
        api.oss.assert_not_called()

    def test_incorrect_live_asset_hash_is_rejected(self):
        manifest = self.prepare()
        client = Mock()

        def response(path):
            if path == "/release.json":
                body = json.dumps(manifest).encode()
            elif path.endswith("styles.css"):
                body = b"wrong bytes"
            else:
                body = (self.root / "dist" / (path.lstrip("/") or "index.html")).read_bytes()
            return 200, {"cache-control": "private, no-store", "x-robots-tag": "noindex"}, body

        client.request.side_effect = response
        with self.assertRaisesRegex(PropagationError, "hash differs"):
            check_release(client, manifest)

    def test_failed_postdeployment_check_restores_previous_entry_pages(self):
        self.check_rollback(False)

    def test_uncertain_entry_upload_restores_previous_entry_pages(self):
        self.check_rollback(True)

    def check_rollback(self, upload_failure):
        self.prepare()
        original = {"index.html": b"previous home", "preview.html": b"previous gate"}
        objects = dict(original)
        mutations = []
        failed = False

        def oss(method, key, data=None, *_):
            nonlocal failed
            if method == "GET":
                return (objects[key], {"Content-Type": "text/html"}) if key in objects else None
            mutations.append((method, key))
            if method == "DELETE":
                objects.pop(key, None)
            else:
                objects[key] = data
                if upload_failure and key == "index.html" and not failed:
                    failed = True
                    raise RuntimeError("Upload connection lost after acceptance")

        api = Mock()
        api.oss.side_effect = oss
        session = Mock()
        session.request.side_effect = lambda path: (200, {}, objects[path[1:]]) if path[1:] in objects else (404, {}, b"")
        verifier = Mock(side_effect=VerificationError("Live verification failed"))
        with patch.dict("os.environ", {"FWH_PREVIEW_PASSWORD": "unit-test-only"}), patch("deploy.require_gate"), patch("deploy.login", return_value=session):
            with self.assertRaises(RuntimeError):
                publish(self.root / "dist", api=api, verifier=verifier)
        self.assertEqual(objects["index.html"], original["index.html"])
        self.assertEqual(objects["preview.html"], original["preview.html"])
        self.assertNotIn("release.json", objects)
        self.assertTrue(any(key.startswith("releases/") for key in objects))
        self.assertEqual([key for method, key in mutations if method == "PUT"][-1], "index.html")


if __name__ == "__main__":
    unittest.main()
