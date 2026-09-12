# NxtCommit phase roadmap

[繁體中文](PHASE-ROADMAP.zh-TW.md)

## Status at v0.6.0

| Phase | Status | Delivered boundary |
| --- | --- | --- |
| 0 — observable model boundary | Implemented | Langfuse v5 tracing, build/prompt identity, redacted capture contract, unified metrics, export-health dashboard and alerts. |
| 1 — advisory LLM product features | Implemented | Issue triage/criteria, campaign critic, evidence explainer and shadow reviewer; all have labelled fallback and no gate authority. |
| 2 — evaluation and rollout loop | Implemented | Five versioned curated datasets, experiment CLI, deterministic evaluators, stable cohorts, feedback scores and promotion record. |
| 3 — isolated real coding worker | **In progress — foundation only** | A transactional run-request queue, lease/heartbeat/retry/cancel/orphan-recovery protocol, separate worker entrypoint, queue telemetry, UI polling fallback, and GitHub default-branch commit capture exist in source. Shared nonprod still uses inline demo execution and has no disposable workload or SEC-00-qualified deployed boundary. |

“Implemented Phase 2” means the evaluation machinery exists and is testable. It
does not manufacture statistical evidence: the required 50 blinded human
annotations per promoted feature have not yet been collected, so no candidate
prompt may claim proven superiority.

## Phase 3 — isolated coding worker (in progress, exit gate not met)

Outcome: a public repository can be pinned and cloned only inside one disposable
job/VM with no service credentials, deny-by-default egress, bounded CPU/memory/
disk/time, signed event output and deterministic cleanup.

Delivery status:

1. **Implemented in source:** SQLite-backed run-request queue with atomic lease,
   heartbeat, bounded retry, cooperative cancellation, one active owner per
   mission and expired-lease recovery. It is durable only when `VAR_DIR` is on
   durable shared storage; nonprod `emptyDir` does not earn that claim.
2. **Implemented in source:** separate `server/worker.ts` entrypoint, health and
   Prometheus surfaces, Langfuse `queue-worker-run` traces, and API/UI queue
   status. `RUN_DISPATCH_MODE=queue` is explicit opt-in; nonprod remains `inline`.
3. **Partially implemented:** GitHub analysis captures the observed default
   branch and immutable 40-character commit SHA. Imported repositories are still
   rejected by the execution gate; clone and toolchain locking are not present.
4. **Not implemented:** one disposable Kubernetes Job/VM per run, per-run
   workload identity, deny-by-default destination-scoped egress, artifact object
   storage, signed events/artifacts and deterministic workload deletion.
5. **Not passed:** SEC-00, SEC-01, AG-02, AG-04 and held-out AG-01 evidence in the
   exact deployed worker boundary. `EXECUTION_MODE=demo` and imported-repository
   execution denial remain mandatory until those measurements are recorded.

Exit gate: isolation and containment evidence, durable cancellation/cleanup,
zero credential leaks, zero unbounded egress and zero false-reviewable P0 cases.

## Phase 4 — authenticated upstream delivery

Add a least-privilege GitHub App after Phase 3 passes. Installation consent,
repository allowlists and human authorization are mandatory. The worker emits a
signed artifact; a separate delivery service creates a branch and draft PR.
Merge, tag, release and package publication remain separate permissions and
default off. Record idempotency, revocation, audit events and rollback.

## Phase 5 — multi-user governance and real accounting

Replace the local demo identity and wallet with authenticated organizations,
role-based review, durable production storage and an auditable credit ledger.
Only after provider metering and billing reconciliation exist may the UI call
credits “paid compute”. Add abuse controls, quotas, dispute/refund workflows,
privacy retention and tenant isolation.

## Phase 6 — measured agent optimization network

Scale the Phase 2 loop across languages and task families: human annotation
queues, inter-rater agreement, causal prompt/model experiments, cost per accepted
artifact, drift detection and automatic rollback. Candidates can automate
traffic allocation only after P0 safety scores remain non-regressing; they can
never automate human merge authority.

## Phase 7 — ecosystem interoperability

Publish a portable signed evidence bundle and worker protocol so independent
projects can verify tests, provenance, resource use and review state without
trusting NxtCommit's UI. Add reproducible public benchmarks and governance
for dataset changes. Federated workers remain opt-in and must prove the same
isolation contract.

## Ordering rule

Phases are capability gates, not marketing milestones. Phase 4 cannot bypass
Phase 3, real accounting cannot precede identity and metering, and a model score
cannot replace engine evidence or human upstream authorization.
