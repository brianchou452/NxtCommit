# Agent integration into main — 2026-09-12

[繁體中文](AGENT-MAIN-INTEGRATION.zh-TW.md)

Merge `554bb59` combines fetched main `298764c` and local agent tip `0900328`.
The source version is v0.7.20. Both parent histories are retained in local main.
This operation did not push GitHub, deploy Cloudflare, move local runtime data,
restart the serving demo, or enable automatic updates.

Conflict resolution preserves the A/B/C scripted fixture engine, Responses-only
production configuration, request deduplication and budgets, measured usage,
protected demo reset/backup, and Cloudflare CI. It adds the agent workflow,
recovery and local monitoring described in [operations](AGENT-OPERATIONS.md).
Both model transports retain cancellation and bounded response handling. Unknown
usage remains absent or null; cached calls do not duplicate token counters or
product trace exports. Four new integration tests cover these shared boundaries.
Self-update verification now includes all foundation/product interactive journeys.
Its proposal lane still uses Chat Completions and needs an appropriate local key;
this does not broaden the restricted production Responses key.

| Check on merged source | Result |
| --- | --- |
| Host typecheck, tests and build | PASS; 156 tests, 0 failures, 0 TODO |
| Independent networkless Docker tests | PASS; 156 tests, 0 failures, 0 TODO |
| Specification lint / linter tests / version | PASS; 127 specs, 4 tests, v0.7.20 |
| Integrated browser journeys | PASS; 39/39, 49.5 seconds |
| Deterministic chaos benchmark | PASS; 114/114, no model calls |
| Approved visual comparisons | FAIL; 40/40 screenshot differences, 82.3 seconds |
| Full `scripts/phase4-gate.sh` | FAIL at visual comparison only |

All 40 visual failures are screenshot comparisons, not setup failures. Main
already records 40 pending differences in [Phase 3 evidence](PHASE3-INTEGRATION.md).
This merge changes neither `src/` nor approved `e2e/golden/` images. No visual
approval or complete Phase 4 success is claimed.

Local artifacts: `test-results/docker/interactive/results.json`,
`test-results/docker/visual-all/results.json` and their screenshots/traces;
`var/agent-benchmarks/6a88e5e9-cf09-4472-a004-e7105ccbba53/report.json`.
Host and Docker check logs are `/tmp/nxtcommit-main-phase4.log` and
`/tmp/nxtcommit-main-docker-tests.log`. No new paid model run was needed for merging;
earlier live evidence remains in [the branch report](AGENT-TEST-REPORT.md).

The main checkout is `NxtCommit-delivery`. The original `NxtCommit` checkout still
owns the running v0.7.16 agent workers, local Langfuse and existing demo release.
Its automatic-update switch remains off and demo lock remains on. This source
merge is not a runtime migration or a cloud release.
