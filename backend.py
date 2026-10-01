#!/usr/bin/env python3
"""Small, redacted maintenance interface for the existing Ferguson backend."""
import argparse
import json

from alibaba import Alibaba, BUCKET, DOMAIN


def status(cloud):
    detail = cloud.rpc("DescribeCdnDomainDetail", DomainName=DOMAIN)["GetDomainDetailModel"]
    configs = cloud.rpc("DescribeCdnDomainConfigs", DomainName=DOMAIN,
                        FunctionNames="edge_function,l2_oss_key,https_force")
    functions = configs.get("DomainConfigs", {}).get("DomainConfig", [])
    active_functions = []
    for function in functions:
        if function.get("FunctionName") == "edge_function":
            # The rule itself contains secrets. Only expose the enabled flag.
            arguments = function.get("FunctionArgs", {}).get("FunctionArg", [])
            values = {item["ArgName"]: item.get("ArgValue") for item in arguments}
            if values.get("enable") == "on" and values.get("name") == "fwh_preview_gate":
                active_functions.append("preview_password_gate")
        else:
            active_functions.append(function.get("FunctionName"))
    manifest = cloud.oss("GET", "release.json")
    revision = json.loads(manifest[0]).get("revision") if manifest else None
    output = {
        "domain": DOMAIN,
        "bucket": BUCKET,
        "region": "cn-shanghai",
        "cdn_status": detail.get("DomainStatus"),
        "cdn_cname": detail.get("Cname"),
        "certificate_status": detail.get("ServerCertificateStatus"),
        "active_functions": active_functions,
        "deployed_revision": revision,
    }
    print(json.dumps(output, indent=2))
    if output["cdn_status"] != "online" or "preview_password_gate" not in active_functions:
        raise SystemExit("Backend status requires attention: CDN or preview gate is not enabled.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation", choices=["status", "refresh"])
    operation = parser.parse_args().operation
    cloud = Alibaba()
    if operation == "refresh":
        cloud.refresh(["/", "/index.html", "/preview.html", "/release.json"])
        print("CDN entry-page refresh completed.")
    status(cloud)


if __name__ == "__main__":
    main()
