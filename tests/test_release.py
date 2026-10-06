"""Regression tests for build validation, public access, and rollback."""
from contextlib import redirect_stdout
from io import StringIO
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

from build import build, sha256
from deploy import publish, validate_build
from verify_site import check_release, verify, PropagationError, VerificationError

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
        (self.root / "preview.html").write_text('<meta http-equiv="refresh" content="0;url=/">')

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

    def test_video_and_poster_use_release_urls(self):
        draft = self.root / "draft"
        (draft / "video.mp4").write_bytes(b"fixture-video")
        (draft / "insights.html").write_text('<html><head></head><body><a href="/#contact">Home</a><video controls preload="none" poster="portrait.svg"><source src="video.mp4" type="video/mp4"></video></body></html>')
        self.prepare()
        html = (self.root / "dist" / "releases" / REVISION / "insights.html").read_text()
        self.assertIn(f'poster="/releases/{REVISION}/portrait.svg"', html)
        self.assertIn(f'src="/releases/{REVISION}/video.mp4"', html)
        self.assertIn('href="/#contact"', html)
        self.assertTrue((self.root / "dist" / "releases" / REVISION / "video.mp4").is_file())

    def test_missing_video_poster_fails_the_build(self):
        (self.root / "draft" / "index.html").write_text('<video poster="missing.png"></video>')
        with self.assertRaisesRegex(ValueError, "Missing asset"):
            self.prepare()

    def video_release(self, old_revision="b" * 40, old_bytes=b"fixture-video"):
        (self.root / "draft" / "video.mp4").write_bytes(b"fixture-video")
        manifest = self.prepare()
        source = f"/releases/{old_revision}/video.mp4"
        previous = {"revision": old_revision, "files": {source: sha256(old_bytes)}}
        api = Mock()
        api.oss.return_value = (json.dumps(previous).encode(), {})
        return manifest, source, api

    def test_identical_video_is_copied_inside_oss_before_switching_entry_pages(self):
        manifest, source, api = self.video_release()
        verifier = Mock()
        with redirect_stdout(StringIO()):
            publish(self.root / "dist", api=api, verifier=verifier)
        copy = next(call for call in api.oss.call_args_list if call.kwargs.get("copy_source"))
        self.assertEqual(copy.args, ("PUT", f"releases/{REVISION}/video.mp4"))
        self.assertEqual(copy.kwargs["copy_source"], source.lstrip("/"))
        self.assertEqual(copy.kwargs["copy_etag"], hashlib.md5(b"fixture-video").hexdigest().upper())
        self.assertEqual(copy.kwargs["content_type"], "video/mp4")
        self.assertEqual(copy.kwargs["cache_control"], "private, no-store")
        writes = [call for call in api.oss.call_args_list if call.args[0] == "PUT"]
        self.assertEqual(writes[-1].args[1], "index.html")
        self.assertLess(writes.index(copy), len(writes) - 3)
        verifier.assert_called_once_with(manifest)

    def test_changed_video_is_uploaded_instead_of_copied(self):
        _, _, api = self.video_release(old_bytes=b"older-video")
        with redirect_stdout(StringIO()):
            publish(self.root / "dist", api=api, verifier=Mock())
        video_write = next(call for call in api.oss.call_args_list if call.args[:2] == ("PUT", f"releases/{REVISION}/video.mp4"))
        self.assertEqual(video_write.args[2], b"fixture-video")
        self.assertNotIn("copy_source", video_write.kwargs)

    def test_invalid_previous_revision_cannot_select_a_video_copy_source(self):
        _, _, api = self.video_release(old_revision="../../unrelated")
        with redirect_stdout(StringIO()):
            publish(self.root / "dist", api=api, verifier=Mock())
        self.assertFalse(any(call.kwargs.get("copy_source") for call in api.oss.call_args_list))

    def test_failed_video_copy_leaves_previous_entry_pages_untouched(self):
        _, _, api = self.video_release()
        response = api.oss.return_value
        def oss(method, key, *args, **kwargs):
            if kwargs.get("copy_source"):
                raise RuntimeError("Copy failed")
            return response
        api.oss.side_effect = oss
        verifier = Mock()
        with self.assertRaisesRegex(RuntimeError, "Copy failed"):
            publish(self.root / "dist", api=api, verifier=verifier)
        self.assertFalse(any(call.args[0] == "PUT" and call.args[1] in ("index.html", "preview.html", "release.json") for call in api.oss.call_args_list))
        api.refresh.assert_not_called()
        verifier.assert_not_called()

    def test_missing_css_font_fails_the_build(self):
        (self.root / "draft" / "styles.css").write_text("@font-face{src:url('missing.woff2')}")
        with self.assertRaisesRegex(ValueError, "Missing asset"):
            self.prepare()

    def test_modified_build_is_rejected_before_deployment(self):
        self.prepare()
        (self.root / "dist" / "index.html").write_text("unexpected modification")
        with self.assertRaisesRegex(VerificationError, "differs from manifest"):
            validate_build(self.root / "dist")

    def test_wrong_live_revision_is_rejected(self):
        manifest = self.prepare()
        old = {**manifest, "revision": "b" * 40}
        client = Mock()
        client.request.return_value = (200, {}, json.dumps(old).encode())
        with self.assertRaisesRegex(PropagationError, "revision"):
            check_release(client, manifest)

    def test_remaining_password_redirect_is_retried_as_propagation(self):
        client = Mock()
        client.request.return_value = (302, {"location": "/preview.html"}, b"")
        with self.assertRaisesRegex(PropagationError, "Password gate"):
            check_release(client, self.prepare())

    def test_public_verification_needs_no_password_and_keeps_origin_private(self):
        manifest = self.prepare()
        client = Mock()
        def response(path, **kwargs):
            if kwargs.get("site", "").startswith("http:"):
                return 301, {"location": "https://www.fergusonhealth.com/"}, b""
            if "oss-cn-shanghai" in kwargs.get("site", ""):
                return 403, {}, b""
            body = json.dumps(manifest).encode() if path == "/release.json" else (self.root / "dist" / (path.lstrip("/") or "index.html")).read_bytes()
            return 200, {"cache-control": "no-store"}, body
        client.request.side_effect = response
        with patch("verify_site.Client", return_value=client), patch.dict("os.environ", {}, clear=True):
            verify(manifest)
        self.assertFalse(any("__preview" in call.args[0] for call in client.request.call_args_list))
        self.assertTrue(any("oss-cn-shanghai" in call.kwargs.get("site", "") for call in client.request.call_args_list))

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

    def test_core_verification_does_not_download_media(self):
        manifest = self.prepare()
        client = Mock()

        def response(path):
            if path.endswith("portrait.svg"):
                self.fail("Core verification must not wait for image downloads")
            body = json.dumps(manifest).encode() if path == "/release.json" else (self.root / "dist" / (path.lstrip("/") or "index.html")).read_bytes()
            return 200, {"cache-control": "private, no-store", "x-robots-tag": "noindex"}, body

        client.request.side_effect = response
        check_release(client, manifest)
        self.assertIn(f"/releases/{REVISION}/styles.css", [call.args[0] for call in client.request.call_args_list])

    def test_advisory_browser_failure_does_not_restore_previous_release(self):
        self.prepare()
        for failure in (False, True):
            with self.subTest(browser_could_not_start=failure):
                api = Mock()
                api.oss.return_value = (b"previous page", {})
                runner = Mock(side_effect=OSError("browser unavailable")) if failure else Mock(return_value=Mock(returncode=1))
                output = StringIO()
                with redirect_stdout(output), patch.dict("os.environ", {}, clear=True), patch("deploy.subprocess.run", runner):
                    publish(self.root / "dist", api=api, verifier=Mock(), browser=True)
                self.assertIn("release remains published", output.getvalue())
                writes = [call for call in api.oss.call_args_list if call.args[0] == "PUT"]
                self.assertEqual(writes[-1].args[1], "index.html")
                self.assertEqual(writes[-1].args[2], (self.root / "dist" / "index.html").read_bytes())
                self.assertFalse(any(call.args[0] == "DELETE" for call in api.oss.call_args_list))
                self.assertEqual(api.refresh.call_count, 1)

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
        with patch("deploy.Client", return_value=session):
            with self.assertRaises(RuntimeError):
                publish(self.root / "dist", api=api, verifier=verifier)
        self.assertEqual(objects["index.html"], original["index.html"])
        self.assertEqual(objects["preview.html"], original["preview.html"])
        self.assertNotIn("release.json", objects)
        self.assertTrue(any(key.startswith("releases/") for key in objects))
        self.assertEqual([key for method, key in mutations if method == "PUT"][-1], "index.html")


if __name__ == "__main__":
    unittest.main()
