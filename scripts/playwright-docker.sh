#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export BUILDX_CONFIG="${BUILDX_CONFIG:-${TMPDIR:-/tmp}/nxtcommit-buildx}"
for argument in "$@"; do
  if [[ "$argument" == --update-snapshots* || "$argument" == -u ]]; then
    echo 'Approved golden updates require explicit review; this wrapper only verifies.' >&2
    exit 2
  fi
done
image=nxtcommit-foundation-e2e:0.1.0
docker build --load -f e2e/Dockerfile -t "$image" .
arguments=("$@")
if [[ ${#arguments[@]} -eq 0 ]]; then arguments=(--project=foundation); fi
report_directory=foundation
for argument in "${arguments[@]}"; do
  case "$argument" in
    --project=visual) report_directory=visual ;;
    --project=product) report_directory=product ;;
  esac
done
mkdir -p "test-results/docker/$report_directory"
command=(./node_modules/.bin/playwright test "${arguments[@]}")
if [[ "${E2E_CHECK_APPLICATION:-0}" == 1 ]]; then
  command=(bash -c 'npm run typecheck && npm test && npm run check-version && exec ./node_modules/.bin/playwright test "$@"' -- "${arguments[@]}")
fi
docker run --rm --init --network=none --shm-size=1g --cap-drop=ALL \
  --user "$(id -u):$(id -g)" \
  --mount "type=bind,source=$PWD/test-results/docker/$report_directory,target=/out" \
  "$image" "${command[@]}"
