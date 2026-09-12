# Local LangGraph agents and Langfuse monitoring

[繁體中文](AGENT-OPERATIONS.zh-TW.md)

LangGraph JS 1.4.15 coordinates the existing TypeScript agents; the official SQLite
checkpointer 1.0.4 persists stage boundaries. Langfuse 4.35.0 runs as an independent
local Docker Compose stack. A graph is orchestration, not permission for a model
to change tests, tools, commands, deployment policy or the demo lock.

```mermaid
flowchart LR
  P[Plan] --> C[Controlled chaos] --> A[Deterministic assessment] --> R[Advisory review]
  M[Propose exact edits] --> S[Prepare candidate] --> V[Frozen Docker verification] --> B[Build release] --> G[Epoch gate and atomic activation]
  G --> H[Smoke check or rollback]
  CP[(SQLite checkpoints)] --- P
  CP --- M
  R -. Metadata only .-> LF[Local Langfuse]
  H -. Metadata only .-> LF
```

## Run and observe

Use Node 24. After `npm ci`, allow the native `better-sqlite3` build when the
local npm install-script policy blocks it: `npm rebuild better-sqlite3 --ignore-scripts=false`.
The verifier image explicitly builds this dependency; candidate containers never
install packages or access the network.

```bash
npm run agents:monitor -- up
npm run agents:monitor -- status
npm run agents:experiment -- --live
npm run agents:monitor -- verify
npm run agents:monitor -- stop
```

Langfuse UI: `http://127.0.0.1:4310`. Login is the `LANGFUSE_INIT_USER_EMAIL`
value in the local configuration (default `maintainer@nxtcommit.local`); the password is `ADMIN_PASSWORD` in
ignored `var/langfuse/.env` (0600). Never paste this file into logs or a report.
The project is `nxtcommit-agents`. Docker volumes persist across `stop`/`up`.
Images are pinned by digest, signup and Langfuse product telemetry are disabled,
and only the UI and MinIO port 4311 are published, both on loopback. No automatic
Langfuse upgrade, cloud export, or model connection inside Langfuse is configured.
This resource-limited stack is for local development, not a production HA setup.

Agent CLIs load the local monitoring configuration. Set `AGENT_TRACING_ENABLED=false`
in the process environment to disable export; it never changes update permissions.
Use `verify <trace-id>` to check a specific trace from the last 24 hours. Verification
queries Observations API v2; HTTP ingestion acceptance alone is not persistence
proof. Langfuse v4 removed the old `/api/public/traces` read endpoint.

Exported data includes stage names, parent/child relationships, actual durations,
source identity, deterministic gate counts, bounded outcome codes, prompt version,
model and provider token counts when available. Langfuse may estimate costs from
its model price catalog; those are not billing receipts. Missing usage remains
unknown. Raw prompts, goals, source files, edits, responses, credentials and raw
errors are excluded. Automatic LangChain/LangSmith tracing is disabled; explicit
allowlisted OTLP spans avoid automatic callback capture of source/goal data.
A failed export is recorded in `var/agents/exports.jsonl` and never changes a gate.
Export is bounded to two seconds and an 8 KB acknowledgement, with no unbounded retry queue. Synthetic capture tests do not append to the live export audit.

## Durable update recovery

The [self-update controls](SELF-UPDATE.md) remain authoritative. The CLI is off
and demo-locked by default. Start a new run with `agents:update -- run`; recover
an interrupted or failed stage with:

```bash
npm run agents:update -- resume <run-id>
```

Recovery requires the same epoch, goal, model, controller source, dependency lock,
verifier configuration and active baseline (or the already activated candidate).
Turning off/on, toggling demo mode or changing the goal invalidates old checkpoints.
Completed stages are skipped; a persisted proposal is reused, verification can be
repeated, and a finished activation is not replayed. Artifacts are checked before
verification and promotion. A finished cancelled/no-change graph stays finished.
There is no automatic replay of failed model calls or automatic resume at startup.
If the process dies after the provider charges a call but before saving the proposal,
manual resume can issue another call; exactly-once provider billing is not promised.

Workers now hold SQLite write leases, which the OS releases on process death. Do
not unlink lock databases. Stop older workers before upgrading; legacy directory
locks fail closed. Activation writes a journal before switching and a receipt
after smoke verification. The next control operation reconciles an interrupted
switch: an activation without a completed receipt returns to its previous release
before a demo freeze is acknowledged. Finished receipts prevent replay. Tests
kill real child processes with SIGKILL; power-loss and multi-host/NFS recovery are
not established by these tests. Inspect candidate `context.json`, `result.json`,
`attempts/`, promotion receipts and verifier logs locally.

Experiment checkpoints include plan, each completed measurement, assessment and
report under `var/chaos-agents/runs/`. SIGTERM/SIGINT propagates to model/private
HTTP calls. Resume an interrupted run with its original settings and source:

```bash
npm run agents:experiment -- --resume <run-id>
npm run agents:benchmark
npm run agents:benchmark -- --live
```

Resume does not rerun saved cases; incomplete or duplicate scenario/repetition
coverage cannot pass assessment. Catalog v2 contains 19 cases (38 checks with
default repetitions). The benchmark runs three seeds (114 checks); live mode
makes at most eight advisory calls across all eight feature roles. Results live
in `var/agent-benchmarks/<id>/report.json`. It never enables or promotes self-update.
Format, provenance and containment checks do not measure semantic model quality.

## Verifier and local evidence

```bash
docker --context colima build -f e2e/Dockerfile -t nxtcommit-agent-verifier:local .
npm run agents:update -- verifier
```

`verifier` retains a dedicated image tag and rotates the update epoch. Override
`SELF_UPDATE_VERIFIER_IMAGE` only for an intentional local image change. Existing
static releases and their source snapshots remain unchanged by a controller upgrade.

On 2026-09-12, the real two-role OpenAI experiment passed 34/34 controlled checks;
Langfuse v2 readback returned eight observations, including both generations and
provider token usage. Automated tests cover SQLite reopen/resume, duplicate work,
epoch cancellation, full update activation, raw-error/secret containment, partial
OTLP rejection and exporter failure. Controlled tests use synthetic model/verifier
adapters; they do not claim a new model-authored website release was activated.

References: [LangGraph persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence),
[Langfuse local deployment](https://langfuse.com/self-hosting/deployment/docker-compose),
[headless initialization](https://langfuse.com/self-hosting/administration/headless-initialization),
[OTLP attribute contract](https://langfuse.com/integrations/native/opentelemetry),
[Observations API v2](https://langfuse.com/docs/api-and-data-platform/features/observations-api).

## Slice handoff

- Owned policy: `policy.self-update` checkpoint-epoch and trace-containment, wired through both agent CLIs, `workflow.ts`, `telemetry.ts` and the update controller.
- Outcome tests: `server/agents/workflow.test.ts` and `server/self-update/workflow.test.ts` reach persisted resume, cancellation and activation; existing control tests retain rollback coverage.
- Verification: `npm run check`, version check, 127-spec lint, Docker tests and all 12 foundation/Computer C browser journeys pass. Existing 54 TODO scenarios remain outside this slice.
- Real update probe: isolated run `4b2c6eec-d303-4ea3-ad16-33e5ef718d91` returned `no-change`; Langfuse readback found its root, proposal stage and actual generation. Serving settings and release were unchanged.
- Central integration required: none for these local CLIs. Mission execution remains outside this agent workflow. The historical `scripts/phase4-gate.sh` referenced by the maintainer template is absent in this reconstruction; no phase-4 completion is claimed.
- Known limits: explicit recovery after failure, trusted local operator, bounded frontend editing, no cloud delivery or automatic Git merge, and no power-loss or multi-host recovery claim.
