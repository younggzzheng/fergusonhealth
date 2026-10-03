import unittest
import urllib.error
from unittest.mock import MagicMock, patch

from alibaba import Alibaba


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


if __name__ == "__main__":
    unittest.main()
