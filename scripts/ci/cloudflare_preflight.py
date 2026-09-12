"""Fail closed if the requested hostname belongs to another service."""
import json
import os
import urllib.request
from urllib.parse import urlencode

account = os.environ["CLOUDFLARE_ACCOUNT_ID"]
token = os.environ["CLOUDFLARE_API_TOKEN"]
hostname = "hackathon.ianjuan.com"
service = "nxtcommit-delivery"


def get(path):
    request = urllib.request.Request("https://api.cloudflare.com/client/v4/" + path,
                                     headers={"Authorization": "Bearer " + token})
    with urllib.request.urlopen(request, timeout=25) as response:
        data = json.load(response)
    if not data.get("success"):
        raise SystemExit("Cloudflare preflight API reported failure")
    return data["result"]


zones = get("zones?" + urlencode({"name": "ianjuan.com", "account.id": account}))
if len(zones) != 1 or zones[0]["status"] != "active":
    raise SystemExit("Expected one active ianjuan.com zone in deployment account")
domains = get(f"accounts/{account}/workers/domains")
owned = [d for d in domains if d["hostname"] == hostname]
if owned and any(d.get("service") != service or d.get("environment", "production") != "production" for d in owned):
    raise SystemExit("Hostname is already attached to another Worker/environment; refusing overwrite")
records = get(f"zones/{zones[0]['id']}/dns_records?" + urlencode({"name": hostname}))
if records and not owned:
    raise SystemExit("Hostname already has DNS records; refusing to replace an existing service")
print("Cloudflare preflight passed: active zone; requested hostname is available or owned by this Worker")
