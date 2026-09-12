#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export UV_CACHE_DIR="${UV_CACHE_DIR:-/tmp/commoncommit-uv-cache}"
uv run python scripts/lint_specs.py
npm run test:spec-tools
npm run check
make check-version
git diff --check
npm run test:e2e
# All approved references are compared. A mismatch must remain a failed gate;
# this script never creates or approves replacement snapshots.
npm run test:visual
