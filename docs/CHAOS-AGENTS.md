# Local chaos and experiment agents

> **2026-09-12 LangGraph / Langfuse update:** Local agents now use persistent stage workflows and metadata-only monitoring. See [agent operations](AGENT-OPERATIONS.md) for recovery, replay protection, commands and limits. Demo controls and the serving static release remain independent.

For the separate optional code-writing lane and demo freeze, see [self-update](SELF-UPDATE.md).

[繁體中文](CHAOS-AGENTS.zh-TW.md)

This branch adds an operator-run resilience loop to the Computer C implementation.
`NxtCommit` and `NxtCommit-delivery` are worktrees of the same repository; this
work starts from `dev/computer-c` (`ec95912`), not delivery `main`. No cloud rollout
or merge into the delivery worktree is implied.

## Run and inspect

Use Node 24 and the installed lockfile dependencies from the repository root:

```bash
npm run agents:experiment
npm run agents:experiment -- --live
npm run agents:experiment -- --cycles 100 --interval 300
npm run agents:experiment -- --live --cycles 10 --interval 300
```

Default: two repetitions of every case, seed 42, one cycle, no provider calls.
`--live` loads the ignored local `.env` and requires `OPENAI_API_KEY` and
`OPENAI_MODEL`. It makes at most two advisory calls per cycle, each with a
12-second deadline and a bounded completion. GPT-5 requests use a 2400-token
completion cap (including reasoning); other compatible models use 800 tokens.
Credentials never enter a chaos fixture or a report. Provider billing is not
estimated; missing usage remains unknown. Configured model is preserved.

Reports are atomic JSON files in `var/chaos-agents/`, including every result,
failed check, backlog item, advisory provenance and comparison with the preceding
compatible report. A different corpus or repetition count makes comparison
unavailable. The CLI exits 1 if any cycle fails, 130 on interruption and 0 when
all executed cycles pass. SIGINT/SIGTERM interrupt interval waits; an active cycle
finishes within its bounded operations. `active.lock` prevents overlapping loops.
After SIGKILL, inspect the PID in that file and verify that process has exited
before manually removing the stale lock. Historical reports are retained for
review; operators own archival and disk retention.

## Roles and authority

1. Chaos Agent optionally asks the model for risk hypotheses over a fixed catalog.
2. Every catalog scenario executes, regardless of model prose, against real
   `Assistance`, Express, readiness and SQLite modules using controlled transports
   and disposable in-memory application state.
3. Experiment Agent checks deterministic invariants, compares failures, records a
   remediation backlog, and optionally asks the model to interpret results and
   the preceding Chaos Agent hypothesis.
4. A maintainer changes source, adds regression coverage, and reruns the same
   corpus. The loop never writes code, runs model-authored commands, promotes
   prompts, changes credits, approves a mission, merges or deploys.

This is a sequential two-role advisory workflow with an explicit report handoff.
It is not a cooperating mission-runner fleet or an autonomous coding system.
`roles` says `model-assisted` only after an accepted real model response; unavailable
or invalid output keeps the role `deterministic`. Controlled fake model responses
inside the tests are synthetic even though the production adapter's generator
label follows its successful transport path. The report's
`controlled-faults-real-modules` provenance applies to those measurements.

## Catalog v1 (17 scenarios)

- Healthy model, 429, 503, synthetic timeout, invalid JSON, oversized response,
  missing language, whitespace-only advice, secret-shaped output, unsupported
  claims, unavailable trace sink and trace containment.
- Malformed/oversized API requests, reset-invalidated capabilities, unavailable
  database readiness and worker-heartbeat recovery on private application instances.

Faults cannot target an arbitrary URL. There is no public fault-injection route.
No OS process is killed, real DB corrupted or external repository executed.
Synthetic timeout rejection validates fallback; it is not a measured network
outage or deadline test. Passing this corpus is not proof of production stability,
semantic bilingual quality, model superiority or B-runner readiness.

The cycle always includes all cases; it does not silently reduce coverage after
success. Latency is diagnostic only, not a statistical promotion claim. Failures
block the cycle even when the model recommends otherwise. `promotionApproved`
is always false.

## Local application deployment

Build the application, then use a separate port and database:

```bash
npm run check
npm run check-version
HOST=127.0.0.1 PORT=4188 VAR_DIR=./var/chaos-local EXECUTION_MODE=demo npm start
```

Verify `/healthz`, `/readyz`, `/metrics`, `/api/bootstrap`, and the HTML root.
The agent CLI is a separate local process. Application readiness does not prove
that the agent loop is alive; inspect its process and newest JSON report. Stop
the application and loop with SIGTERM to their recorded PIDs. Neither process
is configured to restart after reboot. Starting a new cycle does not rebuild
application bundles; rebuild/restart after editing source.

## Verification and handoff

- Entrypoints: `server/resilience/cli.ts`, `chaos.ts`, `experiment.ts`.
- Outcome tests: `server/resilience/chaos.test.ts`; every case records terminal
  checks, deliberately broken cases block, and model advice cannot override them.
- New policy: `spec/policies/chaos-experiments.yaml`.
- No UI behavior changes or approved image changes; no new browser journey.
- Central wiring: package script and existing assistance adapter; no mission or
  public route registration is needed.
- Remaining boundaries: B execution/funding integration and existing C visual
  approval remain outside this loop; it does not make those capabilities complete.
- Results and deployment evidence: [experiment record](experiment-report.md).

API compatibility reference: [OpenAI Chat Completions](https://developers.openai.com/api/reference/python/resources/chat/subresources/completions/methods/create).
