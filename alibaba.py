"""Minimal signed OSS and CDN clients. Credentials come only from the environment."""
import base64
import datetime
import email.utils
import hashlib
import hmac
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

BUCKET = "fergusonhealth-cn-web"
DOMAIN = "www.fergusonhealth.com"


class Alibaba:
    def __init__(self):
        self.access_id = os.environ["ALIBABA_CLOUD_ACCESS_KEY_ID"]
        self.secret = os.environ["ALIBABA_CLOUD_ACCESS_KEY_SECRET"]

    def oss(self, method, key, data=None, content_type="", cache_control=None):
        date = email.utils.formatdate(usegmt=True)
        digest = base64.b64encode(hashlib.md5(data).digest()).decode() if data is not None else ""
        sign = f"{method}\n{digest}\n{content_type}\n{date}\n/{BUCKET}/{key}"
        signature = base64.b64encode(hmac.new(self.secret.encode(), sign.encode(), hashlib.sha1).digest()).decode()
        headers = {"Date": date, "Authorization": f"OSS {self.access_id}:{signature}"}
        if content_type:
            headers["Content-Type"] = content_type
        if digest:
            headers["Content-MD5"] = digest
        if cache_control:
            headers["Cache-Control"] = cache_control
        url = f"https://{BUCKET}.oss-cn-shanghai.aliyuncs.com/{urllib.parse.quote(key, safe='/')}"
        request = urllib.request.Request(url, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=40) as response:
                return response.read(), dict(response.headers)
        except urllib.error.HTTPError as error:
            if method == "GET" and error.code == 404:
                return None
            raise RuntimeError(f"OSS {method} {key}: HTTP {error.code}") from None
        except (urllib.error.URLError, TimeoutError):
            raise RuntimeError(f"OSS {method} {key}: network failure") from None

    def rpc(self, action, **params):
        params.update(Format="JSON", Version="2018-05-10", AccessKeyId=self.access_id,
                      SignatureMethod="HMAC-SHA1", SignatureVersion="1.0", SignatureNonce=str(uuid.uuid4()),
                      Timestamp=datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), Action=action)
        quote = lambda value: urllib.parse.quote(str(value), safe="~")
        canonical = "&".join(quote(k) + "=" + quote(v) for k, v in sorted(params.items()))
        sign = "POST&%2F&" + quote(canonical)
        params["Signature"] = base64.b64encode(hmac.new((self.secret + "&").encode(), sign.encode(), hashlib.sha1).digest()).decode()
        request = urllib.request.Request("https://cdn.aliyuncs.com/", data=urllib.parse.urlencode(params).encode())
        try:
            with urllib.request.urlopen(request, timeout=40) as response:
                result = json.load(response)
        except urllib.error.HTTPError as error:
            raise RuntimeError(f"CDN {action}: HTTP {error.code}") from None
        except (urllib.error.URLError, TimeoutError):
            raise RuntimeError(f"CDN {action}: network failure") from None
        if "Code" in result:
            raise RuntimeError(f"CDN {action} failed: {result['Code']}")
        return result

    def refresh(self, paths):
        result = self.rpc("RefreshObjectCaches", ObjectType="File", ObjectPath="\n".join(f"https://{DOMAIN}{p}" for p in paths))
        tasks = result["RefreshTaskId"].split(",")
        deadline = time.monotonic() + 600
        while time.monotonic() < deadline:
            complete = True
            for task_id in tasks:
                result = self.rpc("DescribeRefreshTasks", TaskId=task_id, DomainName=DOMAIN, ObjectType="file")
                rows = result.get("Tasks", {}).get("CDNTask", [])
                if any(row.get("Status") == "Failed" for row in rows):
                    raise RuntimeError("CDN refresh failed")
                complete = complete and bool(rows) and all(row.get("Status") == "Complete" for row in rows)
            if complete:
                return
            time.sleep(5)
        raise RuntimeError("CDN refresh did not finish within ten minutes")
