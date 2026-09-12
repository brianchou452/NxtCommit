# Development

> **2026-09-12 LangGraph / Langfuse update:** Local agents now use persistent stage workflows and metadata-only monitoring. See [agent operations](AGENT-OPERATIONS.md) for recovery, replay protection, commands and limits. Demo controls and the serving static release remain independent.

> **Self-update lane (2026-09-12):** For the optional self-update toggle and demo freeze, see the self-update runbook. [Runbook](SELF-UPDATE.md).

> **Local resilience update (2026-09-12):** For the new Node 24 local chaos/experiment workflow, commands, local deployment and stop behavior, see the local agents runbook. [Runbook](CHAOS-AGENTS.md).

> Phase 1 reconstruction uses Node 24.x and the [foundation workflow](PHASE1-FOUNDATION.md). All runner modes remain refused; the older full-application commands below require later-phase modules.

[繁體中文](DEVELOPMENT.zh-TW.md)

This guide owns local setup, configuration, validation, and the repository change workflow. Product scope belongs in the root README; system behaviour belongs in `ARCHITECTURE.md`; security claims belong in `SECURITY.md`.

## Prerequisites

- Node.js 22.12 or newer. The server uses the built-in `node:sqlite` module.
- Git. The execution engine creates a Git baseline inside each fixture workspace.

Install exactly what is recorded in the lockfile:

```bash
npm ci
```

## Local development

```bash
cp .env.example .env  # optional
npm run dev
```

The command starts two processes:

| Process | Default URL | Implementation |
| --- | --- | --- |
| API | `http://localhost:4177` | `tsx watch server/index.ts` |
| Web | `http://localhost:5173` | Vite with `/api` proxying to port 4177 |

The Vite proxy is configured directly in `vite.config.ts`. Changing `PORT` alone changes the API port but not the development proxy.

No credentials are required. With the default `EXECUTION_MODE=auto`, an unconfigured checkout runs in labelled demo mode.

## Production-style local run

```bash
npm run build
npm start
```

`npm run build` creates both `dist/` and `dist-server/`. `npm start` only starts the existing server bundle; it does not build first.

## Configuration

The server loads `.env` without overriding variables already present in the process environment.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4177` | Express port; the container sets 8080 |
| `EXECUTION_MODE` | `auto` | `auto`, `demo`, `llm`, or `codex` |
| `RUN_DISPATCH_MODE` | `inline` | `inline` keeps execution in the web process; `queue` requires the separate `npm run worker` process and shared durable `VAR_DIR`. It does not by itself provide OS isolation. |
| `ALLOW_UNSAFE_LOCAL_AGENT_EXECUTION` | unset | Must be exactly `1` before `llm` or `codex` may run **without** a verified OS boundary; a local risk acknowledgement, not an isolation control. Prefer `make sandbox-image`, which earns the boundary instead of promising it |
| `SANDBOX_ISOLATION` | unset | Set to `process` to force the process-level fallback and skip the container probe. Useful in tests, which should not depend on whether the machine has Docker |
| `OPENAI_API_KEY` | empty | LLM execution and real campaign generation |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | OpenAI-compatible chat-completions base URL |
| `CAMPAIGN_MODEL` | `gpt-4o-mini` | Campaign generation model |
| `EXECUTION_MODEL` | `gpt-5.5` | LLM runner and advisory review model |
| `LANGFUSE_PUBLIC_KEY` | empty | Langfuse public key |
| `LANGFUSE_SECRET_KEY` | empty | Langfuse secret key |
| `LANGFUSE_BASE_URL` | empty | Langfuse endpoint; all three Langfuse values are required |
| `GITHUB_TOKEN` | empty | Raises rate limits for read-only GitHub analysis |
| `DEMO_SPEED` | `1` | Delay multiplier for scripted demo events; 0 is immediate |
| `VAR_DIR` | `./var`, then OS temp fallback | SQLite database and execution workspaces |

`APP_VERSION`, `APP_COMMIT`, and `APP_SOURCE_TREE` are injected by the image build and exported through Prometheus build-info metrics. They are not ordinary developer settings.

Real-agent execution is safe by default, and there are now two independent ways
past the gate. A forced `llm` or `codex` runs when EITHER the engine has verified a
per-run OS boundary — run `make sandbox-image`, and it confirms this by actually
mounting a workspace in a container — OR
`ALLOW_UNSAFE_LOCAL_AGENT_EXECUTION=1` is set.

The two are not equivalent. The first is measured; the second is a promise that the
host is disposable, adds no protection whatsoever, and exists only so a laptop
without Docker can develop the runners. It must not be set in a shared deployment,
and it does not satisfy the [SEC-00 P0 gate](VALIDATION-EXPERIMENTS.md#sec-00--per-run-os-isolation-and-escape-resistance) —
a verified boundary does, locally. The GKE pod has no Docker daemon, so the gate is
not met there whatever the flag says.

`auto` is different from a forced mode, and the asymmetry is deliberate. A verified
boundary does NOT promote `auto` to a real runner: isolation answers "is this safe
to run", not "did the operator ask for it", and finding a credential in the
environment is not consent. Only `ALLOW_UNSAFE_LOCAL_AGENT_EXECUTION=1` makes `auto`
resolve past `demo`, which is why the chain below is described as following that
opt-in.

After that explicit local opt-in, mode resolution for `auto` is deterministic:

1. Use `codex` when the bundled/local CLI and Codex authentication are available, or when an official OpenAI platform key can be used.
2. Otherwise use `llm` when `OPENAI_API_KEY` exists.
3. Otherwise use `demo`.

Forced modes do not fall back. Campaign generation has its own `openai` or `demo` choice and is not the same setting as mission execution.

## Commands

| Command | Runs |
| --- | --- |
| `npm run dev` | API watcher and Vite together |
| `npm run dev:server` | API watcher only |
| `npm run dev:web` | Vite only |
| `npm run typecheck` | Browser and server TypeScript projects |
| `npm run test:fixture` | The `fixtures/tempo` Node test suite |
| `npm run test:server` | Engine, state, guard, tool, judge, analyzer, and workspace tests |
| `npm test` | Fixture then server tests |
| `npm run build` | Frontend build and server bundle |
| `npm run check` | Type-check, test, and build |
| `npm run seed` | Force-replace local state with demo data |
| `make sandbox-image` | Build `commoncommit/sandbox:1`, the per-run isolation image. Until this exists the engine falls back to process-level controls and says so |
| `npm run sec00` | The SEC-00 isolation experiment: seven attack vectors × 20 repetitions × 2 isolation modes, writing an evidence bundle under `evidence/` |
| `make validate-llm` | Send a minimal credential validation request |

The repository currently has no browser or component test suite. `npm run check` verifies TypeScript, server behaviour, fixture execution, and production compilation; UI journeys still require manual browser verification.

`npm run check` includes the validation-experiment harnesses (`pd01`–`pd03`,
`ag02`–`ag04`, `sec01`, `data01`, `i18n01`, `rec01`). They are deterministic,
offline, and pinned to `SANDBOX_ISOLATION=process` where they touch the engine, so
they measure the code rather than whether this machine has Docker. Several of them
assert a measured GAP rather than a guarantee; when you fix one, invert its
assertion in the same change so the test that documented the defect becomes the
one that guards against its return.

`npm run sec00` is deliberately NOT part of `npm run check`: it needs a Docker
daemon, takes minutes, and its verdict belongs in a dated evidence bundle rather
than in a pass/fail gate that would silently pass on a machine without Docker. It
refuses to start if it finds a plausible real credential in the environment,
because its payloads read the parent environment on purpose.

The feasibility corpus evaluator is available separately:

```bash
npx tsx server/cli/eval-feasibility.ts path/to/corpus.jsonl --split=test
```

## Local data

SQLite data and execution workspaces live under `VAR_DIR`. On a normal checkout this is `var/`, which is ignored by Git. Delete or move that directory only when losing local state is acceptable.

Use the CLI only while the server is stopped:

```bash
npm run seed
```

While the app is running, use the UI or `POST /api/demo/reset`. That endpoint first cancels active runs, then replaces the seed data. The CLI reseed command does not coordinate with the in-process engine and can race an active run.

## Change workflow

1. Read the canonical document for the area being changed.
2. Inspect the implementation; do not copy current documentation claims without checking them.
3. Make the smallest coherent change and add regression coverage for changed behaviour.
4. Run targeted tests while iterating, then run `npm run check` before committing.
5. Update only the canonical documents affected by the change.

High-risk areas:

| Change | Required checks |
| --- | --- |
| Review gate, write rules, redaction, or evidence fencing | Update and run `server/engine/guard.test.ts` |
| Agent tools or submission gate | Update and run `server/engine/tools.test.ts` |
| State transitions, accounting, reset, or release | Update and run engine/state tests |
| Test-command detection or output parsing | Update workspace tests with real reporter fixtures |
| Analyzer or feasibility scoring | Update analyzer tests and evaluate on held-out data |
| User-visible copy | Put copy in both locale dictionaries (no `locale === ...` inline branches) and run `server/i18n01-parity.test.ts` |

I18N-01 is a delivery gate, not a cleanup suggestion. Removing a call site also
requires removing its dead keys; security and provenance qualifiers must remain
equivalent across languages. Run the targeted parity harness before a full check.

Read `SECURITY.md` before changing runners, the sandbox, repository input, secrets, or deployment isolation.

Run a single server test file directly when useful:

```bash
node --import tsx --test server/engine/guard.test.ts
node --import tsx --test server/engine/tools.test.ts
```

## Versioning

The deployment version is intentionally independent of the private npm package metadata. For image-relevant changes, update all three locations in the same commit:

1. `VERSION` in `Makefile`;
2. `newTag` in `k8s/overlays/nonprod/kustomization.yaml`;
3. the first released version in `docs/CHANGELOG.md`.

Then run:

```bash
make check-version
```

Documentation-only and manifest-only changes do not require an image version bump unless they also change files copied into the image. Record release or user-visible changes in the changelog; do not create a release entry for every editorial edit.

## Documentation ownership

To prevent the previous drift, each fact has one canonical home. Entry points and safety-critical runbooks may summarize a boundary, but detailed claims belong to the owner below:

| Topic | Canonical file |
| --- | --- |
| Product promise and quick start | `README.md` |
| Local setup and contributor workflow | `docs/DEVELOPMENT.md` |
| Current system design | `docs/ARCHITECTURE.md` |
| Threat model and controls | `docs/SECURITY.md` |
| Deployment and operations | `docs/DEPLOYMENT.md` |
| GitHub/GitLab/Argo delivery history and evidence | `docs/GITHUB-OPERATIONS.md` |
| Real LLM, non-LLM, demo, and external-effect status | `docs/FEATURE-REALITY.md` |
| Planned LLM features, observability schema, evaluation, and promotion | `docs/LLM-OBSERVABILITY-PLAN.md` |
| Unfinished work and non-goals | `docs/ROADMAP.md` |
| Released history | `docs/CHANGELOG.md` |
| Planned experiments and go/no-go criteria | `docs/VALIDATION-EXPERIMENTS.md` |
| Reproducible evidence | `docs/experiment-report.md` |
| Incident history and durable lessons | `docs/GOTCHAS.md` |
| Product and website direction | `docs/PRODUCT-DIRECTION.md` |
| Coding-agent procedure | `SKILL.md` |

English files are canonical; each indexed document has a faithful `.zh-TW.md`
counterpart for readers. Update both languages in the same documentation change.
Link to the canonical explanation instead of inventing a second claim.
