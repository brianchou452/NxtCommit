#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export BUILDX_CONFIG="${BUILDX_CONFIG:-/tmp/nxtcommit-buildx}"
npm run build
docker pull node:24.19.0-bookworm-slim
docker build --load -f e2e/Dockerfile -t nxtcommit-foundation-e2e:0.1.0 .
mkdir -p test-results/github-full
if curl --silent --fail http://127.0.0.1:4202/healthz >/dev/null; then
  echo 'Port 4202 is already occupied; stop the previous test server first.' >&2
  exit 1
fi
# The server owns disposable Docker sandboxes; the browser has no Docker socket.
GITHUB_E2E_REAL_DOCKER=1 node --import tsx e2e/github-fixture-server.ts >test-results/github-full/server.log 2>&1 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true; wait "$server_pid" 2>/dev/null || true' EXIT
for attempt in $(seq 1 100); do
  if curl --silent --fail http://127.0.0.1:4202/healthz >/dev/null; then break; fi
  kill -0 "$server_pid"
  sleep 0.1
done
docker run --rm --init --network=host --shm-size=1g --cap-drop=ALL \
  --user "$(id -u):$(id -g)" \
  --mount "type=bind,source=$PWD/test-results/github-full,target=/out" \
  nxtcommit-foundation-e2e:0.1.0 ./node_modules/.bin/playwright test --config=playwright.github.config.ts
