# Roadmap

[繁體中文](ROADMAP.zh-TW.md)

This file contains unfinished work and deliberate non-goals only. Released work belongs in `CHANGELOG.md`; current behaviour belongs in `ARCHITECTURE.md`; security requirements belong in `SECURITY.md`.

> **Highest-priority blocker:** CommonCommit cannot safely execute arbitrary
> third-party repositories. It remains a fixture-based workflow prototype rather
> than a real pull-request service.
>
> What changed on 2026-08-06: per-run isolation now EXISTS and passed SEC-00
> locally (140 repetitions, seven attack vectors, zero disclosures — see
> `experiment-report.md`). That removes the original blocker but not the gate.
> Three things still stand between here and executing a real repository, and they
> are different in kind:
>
> 1. **The deployment has no boundary.** The GKE pod has no Docker daemon, so
>    `describeIsolation()` reports `process` there — the column SEC-00 measured as
>    leaking a credential on 20 of 20 repetitions. Needs a per-run Kubernetes Job
>    or a sibling runtime, which does not exist.
> 2. **AG-02 is a failed P0.** Its containment half passes, but the injection
>    scanner flags 47.1% of benign look-alike text against a 5% threshold, and a
>    flagged benign issue blocks an otherwise correct run. Widening intake would
>    multiply that.
> 3. **The plan's own promotion checklist** requires a new threat-model review and
>    a fresh execution of every P0 before intake widens. A local pass on bundled
>    fixtures does not transfer to arbitrary code.

## Current limitations

| Area | Current state | Consequence |
| --- | --- | --- |
| Repository execution | Bundled fixtures only | GitHub imports cannot be executed or turned into real PRs |
| Isolation | Per-run container (private PID/mount/network namespaces) where a Docker daemon and a shareable workspace root exist; application-level subprocess controls only where the probe reports `process`, which includes the GKE pod | Still unsafe for arbitrary third-party code in a shared environment: the deployment is the `process` case, and widening intake needs a threat-model review |
| Identity | No login, authorization, or tenant model | Review and pledge identities are simulated |
| Upstream integration | GitHub metadata is read-only | Branch, PR, CI, tag, and release are local artifacts or states |
| Data | SQLite and workspaces on `emptyDir` in Kubernetes | Restart or rollout loses state; one replica only |
| Verification | Local parsing for Node test, Jest, Vitest, Mocha, pytest, and Go test output | No upstream CI evidence or criterion-by-criterion proof; deployed toolchains remain narrower than the parsers |
| Adoption | Seeded demo values after release | No real downstream impact measurement |
| UI validation | Manual browser journeys | No component, accessibility, or end-to-end browser suite |
| Codex packaging | Local development installs the Codex CLI dependency; the production image omits dev dependencies | Treat deployed Codex mode as unsupported until packaging is fixed and tested |

## Priorities

### Cross-cutting — Measured LLM assistance

Expand model use first on public metadata and engine-owned evidence, not on
unisolated repository execution. The phased features, Langfuse trace/score
contract, datasets, dashboards, promotion gates, and isolated-worker boundary
are specified in [Measured LLM expansion and Langfuse optimization](LLM-OBSERVABILITY-PLAN.md).
Its OBS-01 P0 must pass before new LLM traffic ships; it does not supersede the
SEC-00, SEC-01, AG-02, or AG-04 gates below.

### 1. Per-run isolation and executable repository intake

This is the prerequisite for handling a real repository rather than a fixture.
The per-run boundary itself is done and measured; what remains is making it exist
in the deployment and widening intake safely.

- ~~Give each run a kernel boundary with private PID/mount/network namespaces.~~
  Done: `server/engine/isolation.ts`, verified by `npm run sec00`. Residual risk
  recorded in `SECURITY.md` — namespaces are a kernel, not a hypervisor, boundary.
- ~~Clean up every workspace deterministically.~~ Done: `runLoop` reaps in a
  `finally`, so abnormal exits are covered too.
- Move execution from the web process to a queued worker and one isolated workload
  per run — this is what makes the boundary exist IN THE CLUSTER, which is the
  part that currently does not.
- Use a distinct low-privilege identity, no mounted service-account token, resource and disk limits, and destination-scoped egress.
- Accept only pinned public HTTPS sources after validating host, resolved addresses, size, commit, package shape, and licence policy.
- Collect structured test reports rather than scraping reporter prose.
- Add ranged reads and reject writes based on truncated file content.

Completion means an adversarial repository cannot read server secrets, access the host filesystem, redefine verification, escape through symlinks or clone helpers, or retain unbounded disk/network access.

### 2. Identity and real GitHub delivery

- Add user authentication and role-based authorization for pledges and reviews.
- Install a least-privilege GitHub App.
- Create a real branch and pull request only after the deterministic gate passes.
- Receive upstream CI evidence through signed webhooks.
- Preserve human approval as a hard boundary; do not auto-merge.
- Reconcile local artifact state with remote PR and release state.

Completion means every review decision is attributable to an authorized maintainer and every upstream action is auditable and revocable.

### 3. Durable data and horizontal execution

- Replace SQLite with Postgres behind the existing store boundary.
- Move active-run ownership to a durable queue and worker lease.
- Make retries, cancellation, and recovery idempotent across process restarts.
- Store artifacts and event history durably.
- Define backup, restore, retention, and migration procedures.
- Replace shell-sourced, argv-based Kubernetes secret bootstrap with a restricted parser and secret-manager or stdin path.

Completion means a rollout loses neither mission state nor active-run ownership and the API can scale independently of workers.

### 4. Stronger verification evidence

- Support machine-readable reporters for each advertised framework instead of scraping prose.
- Record test command, toolchain version, repository commit, and environment identity in every artifact.
- Map acceptance criteria to explicit evidence or mark them unverified.
- Add policy checks for generated dependencies, licences, and oversized artifacts.

Completion means a maintainer can reproduce each claimed result from the artifact without trusting a runner narrative.

### 5. Real impact and compute accounting

- Replace seeded adoption values with sourced package-download and dependent signals.
- Distinguish measured, delayed, unavailable, and simulated values in the data model.
- Reconcile compute credits with provider usage if credits become more than a demo unit.
- Define escrow, expiry, cancellation, and partial-refund policies before accepting real value.

### 6. Product and quality coverage

- Add browser end-to-end coverage for the pledge, execution, reset, review, feedback, and release journeys in both languages.
- Add accessibility checks and keyboard-flow coverage.
- Version the API before external clients depend on it.

## Deliberate non-goals

- **No automatic merge or default-branch push.** Human review remains mandatory even after real GitHub integration.
- **No model-defined verification command.** The evaluated agent cannot choose what counts as passing.
- **No prompt-only security boundary.** Material controls must be deterministic and tested.
- **No blockchain, tradable token, or secondary market.** Compute credits are not currency.
- **No unlabelled simulation.** Seeded or scripted data must remain visibly distinct from observed evidence.
- **No default zero for missing measurements.** Unknown is different from measured zero.
- **No model veto over deterministic evidence.** Advisory review may inform a human but cannot promote or discard a run.
- **No broad repository execution before isolation.** Product convenience does not override the threat model.
