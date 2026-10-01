import contextlib
import io
import json
import unittest

from backend import status


class StatusCloud:
    def __init__(self, enabled="on"):
        self.enabled = enabled

    def rpc(self, action, **params):
        if action == "DescribeCdnDomainDetail":
            return {"GetDomainDetailModel": {"DomainStatus": "online", "ServerCertificateStatus": "on"}}
        return {"DomainConfigs": {"DomainConfig": [{
            "FunctionName": "edge_function",
            "FunctionArgs": {"FunctionArg": [
                {"ArgName": "name", "ArgValue": "fwh_preview_gate"},
                {"ArgName": "enable", "ArgValue": self.enabled},
                {"ArgName": "rule", "ArgValue": "credential-must-never-be-logged"},
            ]},
        }]}}

    def oss(self, method, key):
        return json.dumps({"revision": "a" * 40}).encode(), {}


class BackendStatusTests(unittest.TestCase):
    def test_status_never_discloses_the_gate_rule(self):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            status(StatusCloud())
        self.assertNotIn("credential-must-never-be-logged", output.getvalue())
        self.assertEqual(json.loads(output.getvalue())["deployed_revision"], "a" * 40)

    def test_disabled_gate_makes_status_fail(self):
        with contextlib.redirect_stdout(io.StringIO()), self.assertRaises(SystemExit):
            status(StatusCloud(enabled="off"))
