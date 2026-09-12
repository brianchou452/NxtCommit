"""Require the expected deployed SHA and explicit infrastructure provenance."""
import json
import os
from pathlib import Path
import time
import urllib.error
import urllib.request

base = os.environ["DEPLOYMENT_URL"].rstrip("/")
sha = os.environ["EXPECTED_COMMIT_SHA"]
expected_run = os.environ["EXPECTED_RUN_URL"]
if not base.startswith("https://"):
    raise SystemExit("Deployment verification requires HTTPS")
error = "No response"
for attempt in range(12):
    try:
        with urllib.request.urlopen(base + "/__deployment", timeout=15) as response:
            assert response.status == 200
            receipt = json.load(response)
        assert receipt["service"] == "nxtcommit-delivery"
        assert receipt["stage"] == "infrastructure-only"
        assert receipt["applicationReady"] is False
        assert receipt["commit"] == sha, "Serving commit differs from release commit"
        assert receipt["runUrl"] == expected_run, "Serving run differs from release run"
        Path("artifacts").mkdir(exist_ok=True)
        Path("artifacts/deployment-receipt.json").write_text(json.dumps(receipt, indent=2) + "\n")
        print(json.dumps(receipt, indent=2))
        break
    except (urllib.error.URLError, TimeoutError, AssertionError, ValueError, KeyError) as exc:
        error = str(exc)
        if attempt < 11:
            time.sleep(5)
else:
    raise SystemExit("Deployment smoke check failed: " + error)
