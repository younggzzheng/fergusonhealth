import base64
import hashlib
import hmac
import unittest
import urllib.error
from unittest.mock import MagicMock, patch

from alibaba import Alibaba, BUCKET


class UploadRetryTests(unittest.TestCase):
    def setUp(self):
        self.cloud = Alibaba.__new__(Alibaba)
        self.cloud.access_id = "test-access-id"
        self.cloud.secret = "test-secret"

    def response(self):
        response = MagicMock()
        response.__enter__.return_value = response
        response.read.return_value = b"uploaded"
        response.headers = {"Content-Type": "application/octet-stream"}
        return response

    @patch("alibaba.time.sleep")
    @patch("alibaba.urllib.request.urlopen")
    def test_upload_retries_identical_bytes_with_a_longer_timeout(self, open_url, sleep):
        open_url.side_effect = [TimeoutError(), self.response()]
        dates = ["Sat, 03 Oct 2026 13:00:00 GMT", "Sat, 03 Oct 2026 13:03:00 GMT"]
        with patch("alibaba.email.utils.formatdate", side_effect=dates):
            result = self.cloud.oss("PUT", "releases/test/video.mp4", b"video", "video/mp4", "private, no-store")
        self.assertEqual(result[0], b"uploaded")
        self.assertEqual(open_url.call_count, 2)
        requests = [call.args[0] for call in open_url.call_args_list]
        self.assertEqual(requests[0].data, requests[1].data)
        self.assertEqual(requests[0].full_url, requests[1].full_url)
        self.assertEqual([request.get_header("Date") for request in requests], dates)
        self.assertNotEqual(requests[0].get_header("Authorization"), requests[1].get_header("Authorization"))
        for call in open_url.call_args_list:
            self.assertEqual(call.kwargs["timeout"], 180)
            self.assertEqual(call.args[0].get_header("Cache-control"), "private, no-store")
        sleep.assert_called_once_with(5)

    @patch("alibaba.time.sleep")
    @patch("alibaba.urllib.request.urlopen", side_effect=urllib.error.URLError("sensitive diagnostic"))
    def test_upload_retries_are_bounded_and_error_is_sanitized(self, open_url, sleep):
        with self.assertRaises(RuntimeError) as error:
            self.cloud.oss("PUT", "releases/test/video.mp4", b"video")
        self.assertEqual(str(error.exception), "OSS PUT releases/test/video.mp4: network failure")
        self.assertEqual(open_url.call_count, 3)
        self.assertEqual([call.args[0] for call in sleep.call_args_list], [5, 10])

    @patch("alibaba.time.sleep")
    @patch("alibaba.urllib.request.urlopen")
    def test_permission_error_is_not_retried(self, open_url, sleep):
        open_url.side_effect = urllib.error.HTTPError("https://example.invalid", 403, "Forbidden", {}, None)
        with self.assertRaisesRegex(RuntimeError, "HTTP 403"):
            self.cloud.oss("PUT", "releases/test/video.mp4", b"video")
        self.assertEqual(open_url.call_count, 1)
        sleep.assert_not_called()

    @patch("alibaba.time.sleep")
    @patch("alibaba.urllib.request.urlopen", side_effect=TimeoutError())
    def test_reads_and_deletions_keep_the_existing_timeout_without_retry(self, open_url, sleep):
        for method in ("GET", "DELETE"):
            open_url.reset_mock()
            with self.assertRaisesRegex(RuntimeError, "network failure"):
                self.cloud.oss(method, "releases/test/video.mp4")
            self.assertEqual(open_url.call_count, 1)
            self.assertEqual(open_url.call_args.kwargs["timeout"], 40)
        sleep.assert_not_called()

    @patch("alibaba.urllib.request.urlopen")
    def test_video_copy_has_no_upload_body_and_signs_every_copy_header(self, open_url):
        etag = hashlib.md5(b"fixture-video").hexdigest().upper()
        response = self.response()
        response.read.return_value = f'<CopyObjectResult><ETag>"{etag}"</ETag></CopyObjectResult>'.encode()
        open_url.return_value = response
        date = "Tue, 06 Oct 2026 14:00:00 GMT"
        source = "releases/old/assets/video.mp4"
        destination = "releases/new/assets/video.mp4"
        with patch("alibaba.email.utils.formatdate", return_value=date):
            self.cloud.oss("PUT", destination, content_type="video/mp4", cache_control="private, no-store",
                           copy_source=source, copy_etag=etag)
        request = open_url.call_args.args[0]
        headers = {name.lower(): value for name, value in request.header_items()}
        self.assertIsNone(request.data)
        self.assertNotIn("content-md5", headers)
        self.assertEqual(headers["x-oss-copy-source"], f"/{BUCKET}/{source}")
        self.assertEqual(headers["x-oss-copy-source-if-match"], etag)
        self.assertEqual(headers["x-oss-metadata-directive"], "REPLACE")
        self.assertEqual(headers["cache-control"], "private, no-store")
        canonical = (f"x-oss-copy-source:/{BUCKET}/{source}\n"
                     f"x-oss-copy-source-if-match:{etag}\n"
                     "x-oss-metadata-directive:REPLACE\n")
        sign = f"PUT\n\nvideo/mp4\n{date}\n{canonical}/{BUCKET}/{destination}"
        signature = base64.b64encode(hmac.new(b"test-secret", sign.encode(), hashlib.sha1).digest()).decode()
        self.assertEqual(headers["authorization"], f"OSS test-access-id:{signature}")
        self.assertEqual(open_url.call_args.kwargs["timeout"], 180)

    @patch("alibaba.urllib.request.urlopen")
    def test_copy_requires_the_expected_result_etag_even_with_http_success(self, open_url):
        for body in (b"not XML", b"<Error><Code>CopyFailed</Code></Error>",
                     b"<CopyObjectResult><ETag>wrong</ETag></CopyObjectResult>"):
            with self.subTest(body=body):
                response = self.response()
                response.read.return_value = body
                open_url.return_value = response
                with self.assertRaisesRegex(RuntimeError, "copy verification failed"):
                    self.cloud.oss("PUT", "releases/new/video.mp4", copy_source="releases/old/video.mp4", copy_etag="A" * 32)

    @patch("alibaba.time.sleep")
    @patch("alibaba.urllib.request.urlopen")
    def test_changed_source_is_not_retried_or_uploaded_as_a_fallback(self, open_url, sleep):
        open_url.side_effect = urllib.error.HTTPError("https://example.invalid", 412, "Precondition Failed", {}, None)
        with self.assertRaisesRegex(RuntimeError, "HTTP 412"):
            self.cloud.oss("PUT", "releases/new/video.mp4", copy_source="releases/old/video.mp4", copy_etag="A" * 32)
        self.assertEqual(open_url.call_count, 1)
        self.assertIsNone(open_url.call_args.args[0].data)
        sleep.assert_not_called()

    @patch("alibaba.urllib.request.urlopen")
    def test_copy_rejects_a_missing_etag_or_an_upload_body(self, open_url):
        for method, data, etag in (("GET", None, "A" * 32), ("PUT", b"video", "A" * 32), ("PUT", None, None)):
            with self.assertRaises(ValueError):
                self.cloud.oss(method, "releases/new/video.mp4", data, copy_source="releases/old/video.mp4", copy_etag=etag)
        open_url.assert_not_called()


if __name__ == "__main__":
    unittest.main()
