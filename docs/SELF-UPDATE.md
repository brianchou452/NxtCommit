# Switchable local self-update agent

> **2026-09-12 LangGraph / Langfuse update:** Local agents now use persistent stage workflows and metadata-only monitoring. See [agent operations](AGENT-OPERATIONS.md) for recovery, replay protection, commands and limits. Demo controls and the serving static release remain independent.

[繁體中文](SELF-UPDATE.zh-TW.md)

The local operator can enable real model-authored **frontend resilience** updates.
The default is **off + demo locked**. This control is separate from the existing
advisory chaos loop. No public API exposes this control: use the local CLI.

```bash
npm run agents:update -- status
npm run agents:update -- demo-on   # freeze before presenting
npm run agents:update -- off       # stop new work and revoke pending work
npm run agents:update -- demo-off  # explicit end of demo protection
npm run agents:update -- on        # enable; demo lock must also be off
npm run agents:update -- run       # one bounded real-model iteration
npm run agents:update -- watch 10  # up to 10 cycles, five minutes apart
npm run agents:update -- rollback  # previous static release; requires demo-off
```

Controls persist in ignored `var/self-update/settings.json`. Turning on alone
never clears the demo lock. Every toggle rotates an epoch: an older candidate
cannot activate even after off/on or demo-on/demo-off. Changing the flags during
model generation or container verification aborts that work; promotion checks the
epoch again. A brief activation/smoke transaction serializes with toggles, so a
successful `demo-on` acknowledgement means subsequent pending activations are
blocked. An activation that already completed before acknowledgement is not
undone. A corrupt/missing setting fails closed. Stop a watcher with SIGTERM;
there is no reboot service or automatic startup.

## Scope and iteration

The controller gives the configured OpenAI model only these local source files:
`src/services/api.ts`, `src/services/authoring.ts`, and
`src/components/useApplicationSession.ts`. It accepts at most three exact-match
edits, 16 KB per replacement, bilingual rationale, no changed imports or remote
URLs. No secrets, backend, SQLite migrations, dependencies, tests, updater controls
or approved screenshots may be edited. This first lane improves request failure
and session handling; it is not general autonomous feature development.

The initial objective is stable handling of null/non-JSON error responses while
preserving success payloads, server error codes and AbortError identity. No-op
proposals are retained without activation. Use `npm run agents:update -- goal "<next bounded objective>"` to persist a new
objective and revoke any pending old-goal candidate. It applies to the next active
cycle. A wider file allowlist requires a reviewed controller change, not model
self-modification. The same frozen quality gates always remain mandatory.

The model call uses existing `.env` credentials server-side, one request per
active iteration, a 45-second deadline and at most 5000 GPT-5 completion tokens
(including reasoning), or 3000 for other compatible models. Only the official
OpenAI endpoint is accepted. Usage is recorded when returned; unknown usage is
not reported as zero. `self-update-proposal-v1` is the prompt identity. Source
and proposals are not exported to Langfuse. Reports never contain the API key.

## Verification and activation

1. Start from an operator-initialized clean source snapshot and current release.
2. Model proposes exact edits; deterministic validation enforces the file scope.
3. Create a separate candidate. Run typechecks, all server tests, the six frozen
   frontend request contracts, production build, and all integrated foundation/product
   Playwright journeys in Docker. No snapshot update is performed.
4. The image is pinned by digest. It has no network, service credentials or Docker
   socket; source/tests are read-only, with only output/temp mounts writable, including an isolated 32 MB Vite config cache.
   Limits: 2 CPUs, 2 GB RAM, 256 PIDs, 240-second verification timeout. There is
   no host execution fallback. The Docker executable/context are operator settings.
5. Only passing candidates with the same enable epoch and active base release
   can atomically switch `current`. Retain content-hashed old assets for already
   opened pages. API/backend process and its database stay pinned.
6. Smoke-check local readiness and HTML. Failure or timeout restores the previous
   pointer. Rollback can also be requested locally after ending demo protection.

A healthy page plus green tests is not a guarantee of correctness. This is not
full visual-regression approval, semantic quality evidence or backend deployment.
The limited code scope, frozen checks, demo lock and previous release reduce risk;
they do not prove arbitrary generated JavaScript safe. Watcher/settings files and
release directories assume a trusted local OS user, not multi-tenant isolation.

## Initialize the local deployment

Build/check and commit the trusted controller source before initialization:

```bash
npm run check
npm run check-version
npm run agents:update -- init
SELF_UPDATE_ROOT=./var/self-update HOST=127.0.0.1 PORT=4188 \
  VAR_DIR=./var/chaos-local EXECUTION_MODE=demo npm start
```

`init` requires the locally available `nxtcommit-agent-verifier:local` image and
records its immutable ID and retains a dedicated `nxtcommit-self-update-verifier:local` tag. If a local image was removed, `npm run agents:update -- verifier` explicitly refreshes the pinned verifier and revokes pending work. Default Docker path is `~/.docker/bin/docker`, context
`colima`; override with `SELF_UPDATE_DOCKER` and `SELF_UPDATE_DOCKER_CONTEXT`.
It copies the clean checked-in source and built `dist`, and starts off/demo-locked.
Initialization does not start a watcher or change an existing process. The
application must be restarted once with `SELF_UPDATE_ROOT` to use release pointers.
Further frontend releases do not require a restart. Model code is never executed
on the host. There is no change to Git branches or the delivery worktree.

Candidate `proposal.json`, `verification.log`, browser artifacts and terminal
`result.json` are under `var/self-update/candidates/<id>/`. Successful static
versions, source snapshots and manifests are under `releases/<id>/`; `current`
is the authoritative serving pointer. The limit is 20 retained releases, then new
work fails closed pending operator archival. Failed candidates also need operator
retention management. Current workers use OS-released SQLite leases and activation
journals; never unlink lock databases. Legacy directory locks fail closed. See
[recovery operations](AGENT-OPERATIONS.md).

## Handoff

Entrypoints: `server/self-update/cli.ts`, `runner.ts`, `control.ts`, and `proposal.ts`.
App wiring: `SELF_UPDATE_ROOT` in `server/index.ts`. Contract tests:
`control.test.ts`; candidate quality gate: `quality-cli.ts`. No new product page
or authentication claim. The integrated B scripted fixture engine and pending visual
approval remain separate from this lane. Live local evidence is recorded separately from controlled
unit tests in the local deployment record.

## Verified local run — 2026-09-12

Candidate `8d63b714-cac6-485b-b328-c82a40e380b3` was generated by real `gpt-5-mini` (2147 reported tokens), improved the frozen request contracts from 4/6 to 6/6, passed 78 server tests plus 12 Docker browser journeys, and reached `promoted`. The serving release header and exact index HTML matched it. Candidate `5363297d-8d9e-4b53-992e-3cb6f2ad7404` was then cancelled by demo-on during a real iteration; the serving pointer stayed unchanged. An off-mode run created no candidate. Final state: off, demo locked. Reports live in ignored `var/self-update/`. Earlier build-cache and missing-image failures were retained and never activated. The source branch itself retains the operator baseline; generated source is in the active release snapshot, not silently merged into Git.
