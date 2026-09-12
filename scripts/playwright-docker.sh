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
docker build -f e2e/Dockerfile -t nxtcommit-foundation-e2e:0.1.0 .
arguments=("$@")
if [[ ${#arguments[@]} -eq 0 ]]; then arguments=(--project=foundation --project=product); fi
report_directory=foundation
for argument in "${arguments[@]}"; do
  case "$argument" in
    --project=visual) report_directory=visual ;;
    --project=product) report_directory=product ;;
  esac
done
if [[ " ${arguments[*]} " == *" --project=foundation "* && " ${arguments[*]} " == *" --project=product "* ]]; then report_directory=interactive; fi
mkdir -p "test-results/docker/$report_directory"
docker run --rm --init --network=none --shm-size=1g --cap-drop=ALL \
  --user "$(id -u):$(id -g)" \
  --mount "type=bind,source=$PWD/test-results/docker/$report_directory,target=/out" \
  nxtcommit-foundation-e2e:0.1.0 ./node_modules/.bin/playwright test "${arguments[@]}"
