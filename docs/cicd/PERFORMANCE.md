# CI speed and demo capacity — 2026-09-12

Main previously ran standalone CI and the same reusable CI inside deployment. Keep one required reusable CI on main; PR/codex/manual checks remain. Build the application once in the pinned Node 24 / Playwright Docker image, then run typechecks, server tests, version checks and browser journeys in that same image. Remove the duplicate host dependency install and build. Dockerfile copies only build inputs and adds browser tests after compilation. Worker dry-run uses `--containers-rollout=none` to bundle/validate the Worker without building the production container again; actual deployment still builds its production image and verifies HTTPS identity/readiness.

An experimental GitHub layer-cache run (34674498977) spent several minutes in image build/export and was cancelled. That extra cache machinery was removed rather than imposed on short hackathon builds.

Baseline deployment run 34673517601: application CI 68 seconds (browser step 41 seconds), contracts CI 41 seconds, deployment job 92 seconds. Standalone CI duplicated another pair of jobs. Optimized remote timings are pending measurement.

| Round | Concurrent clients | Requests | Errors | p95 ms | Requests/s |
|---|---:|---:|---:|---:|---:|
| 1 | 1 | 10 | 0 | 759 | 1.56 |
| 1 | 5 | 50 | 0 | 721 | 7.91 |
| 1 | 10 | 100 | 0 | 675 | 15.18 |
| 1 | 20 | 200 | 0 | 791 | 27.29 |
| 2 | 1 | 10 | 0 | 808 | 1.62 |
| 2 | 5 | 50 | 0 | 679 | 7.42 |
| 2 | 10 | 100 | 0 | 787 | 13.12 |
| 2 | 20 | 200 | 0 | 1372 | 24.66 |

720 read-only warm HTTP requests to homepage, bootstrap, SQLite readiness and liveness; two rounds from one Taiwan client machine. This is not a long soak, full browser/assets journey, write-contention, LLM, SSE or maximum-throughput test. The tested deployment is Phase 1 foundation, not the unmerged Phase 2 runner. Reproduce with `python3 scripts/ci/probe_capacity.py`; it is opt-in, bounded, and refuses requests after the demo cutoff.

Monitor runs 34674329417 and 34674395127 reported healthy lifecycle, no alerts, trailing-24-hour max memory 150007808 bytes (about 143 MiB / 14% capacity), disk 0.068%, CPU p95 0.007673 (about 0.77%). Analytics may lag; this 24-hour aggregate cannot establish burst CPU during the probe.

Decision: keep basic (1/4 vCPU, 1 GiB), one named instance. No paid resize or autoscaler was enabled. Horizontal replicas would split ephemeral local SQLite; raising max_instances alone would not change fixed-name routing. If repeated representative probes exceed p95 2 seconds or show errors together with sustained resource pressure, consider a vertical move to standard-1 (1/2 vCPU, 4 GiB, 8 GB), then remeasure. Cold starts and upstream model latency do not automatically imply insufficient CPU. Avoid redeploying during judging because ephemeral data may reset. Open the demo shortly before presenting to avoid idle cold starts. Existing cutoff remains intact.

[Cloudflare instance types](https://developers.cloudflare.com/containers/platform/limits/) · [Docker GitHub cache](https://docs.docker.com/build/ci/github-actions/cache/)
