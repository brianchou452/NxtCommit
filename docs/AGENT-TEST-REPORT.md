# Local agent verification — 2026-09-12

[繁體中文](AGENT-TEST-REPORT.zh-TW.md) · [Operations](AGENT-OPERATIONS.md)

Scope: the local chaos, experiment, advisory and bounded self-update workflows on
`codex/chaos-experiment-agents`. Core recovery changes are commit `59a1877`
(v0.7.15). The v0.7.16 follow-up exposes model fallback status in spans and the
benchmark summary; its host checks also pass. No cloud deployment or merge occurred.

| Verification | Observed result |
| --- | --- |
| Host typecheck, tests and build | 92 passed, 0 failed, 54 existing TODO; build passed |
| Core Docker tests and browser journeys | 92 passed, 0 failed; all 12 foundation/Computer C journeys passed |
| Specifications and version consistency | 127 specifications, 0 lint errors; version check passed |
| Chaos benchmark | 19 fault cases × 2 repetitions × 3 seeds = 114/114 passed |
| Real CLI interruption and resume | SIGTERM after 8 saved cases, exit 130; resume completed 190/190 without repeating the saved prefix |
| Killed-worker recovery | Real SIGKILL child tests release SQLite leases and restore an unfinished activation before acknowledging demo freeze |
| Isolated update with invalid TypeScript | Real networkless Docker verification rejected it; baseline remained active |
| Isolated valid update | Real Docker gates and private application smoke passed; only the isolated test release was promoted |

The first live advisory benchmark (`d78cf100-b446-44a3-bee4-18139b929e28`)
received eight valid OpenAI outputs with no fallback. A second run on core commit
`59a1877` (`2248952e-55f8-487f-a03c-2d806047581f`) made eight calls: seven valid
outputs and one safe ChaosPlanner fallback. Its controlled checks still passed,
but model availability was degraded. The bounded fallback reason does not establish
whether the cause was provider availability or an invalid response. v0.7.16 makes
this distinction explicit in the CLI summary and monitoring status.

Langfuse Observations API v2 readback for the second run found 15 persisted
observations, including seven generations with 3,376 provider-reported tokens.
The failed call's usage remains unknown. Raw input/output was absent and source
identity was present. These are persistence and provenance checks, not semantic
quality scores. No additional paid benchmark was run for the metadata-only follow-up.

Local evidence (ignored runtime files):

- `var/agent-benchmarks/<run-id>/report.json`
- `var/chaos-local/optimization-cli-recovery.json`
- `var/chaos-local/optimization-langfuse-readback.json`
- `var/chaos-local/optimization-update-gates.json`
- `var/self-update-optimized-gates/candidates/<candidate-id>/` verification artifacts

The isolated update used a controlled proposal fixture, not a new model-authored
change. Its baseline was the existing static release snapshot, so candidate gates
exercise that snapshot's tests; the new controller has the separate 92-test result
above. The serving release `8d63b714-cac6-485b-b328-c82a40e380b3` stayed unchanged.
Automatic updates remain off and demo-locked. Background chaos checks are bounded,
deterministic runs; enabling live advisory calls is explicit.

Limits: 54 product scenarios remain TODO and mission execution has no registered
runner in this reconstruction. Tests do not establish model semantic quality,
power-loss or multi-host/NFS recovery, or unrestricted autonomous development.
Automatic editing remains limited to the three frontend files in the update policy.
