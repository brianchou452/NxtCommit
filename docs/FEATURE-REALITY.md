# Feature reality matrix

> **Cloud assurance lane:** See [Agent Lab](ASSURANCE.md) for the six-stage scheduled workflow, measured evidence, model provenance and scope limits. Deployment proof is recorded separately.


> **2026-09-12 LangGraph / Langfuse update:** Local agents now use persistent stage workflows and metadata-only monitoring. See [agent operations](AGENT-OPERATIONS.md) for recovery, replay protection, commands and limits. Demo controls and the serving static release remain independent.

> **Self-update lane (2026-09-12):** The local frontend self-update lane adds real model-authored source candidates, container verification and optional static-release promotion. It is disabled and demo-locked by default; it neither updates backend code nor repairs arbitrary product features. [Runbook](SELF-UPDATE.md).

> **Local resilience update (2026-09-12):** Local resilience CLI adds controlled fault experiments over real modules and optional real model hypotheses/interpretation. It does not enable mission runners or automatic repair; inspect each report’s provenance. [Runbook](CHAOS-AGENTS.md).

> **2026-09-12 source extension:** `/github` adds authenticated public source snapshots, a draft PR on prototype-credit commitment, one bounded Responses implementation, network-disabled Docker tests, and promotion after required CI on the same head. This is a separate workspace workflow; existing metadata/fixture routes are unchanged. It is not deployed or live-upstream-write verified. See [GitHub workspaces](GITHUB-WORKSPACES.md) for limits and tests. Older statements below do not describe this new entrypoint.


[繁體中文](FEATURE-REALITY.zh-TW.md)

> **Integrated source, 2026-09-12:** main combines Phase 3 A/B/C (`08bead6`) with the Cloudflare delivery baseline (`7d9fbba`) at version `0.7.17`. Local authoring, funding, accounting, comments, SSE and local decisions share one mission authority. Two bundled fixtures use scripted patches with measured engine tests/diffs. Seed review remains demo; imported repositories never execute. Existing cloud egress and Responses permissions are unchanged: product advice uses labelled fallbacks in the container and GitHub import requires the local server network path. Live product assistance and visual approval are not established. The previous Responses probe and serving revision are documented in [checkpoints](cicd/CHECKPOINTS.md); source merging does not establish a new deployment. See [integration evidence](PHASE3-INTEGRATION.md). The historical inventory below does not describe this reconstruction in full.

This document answers one narrow question: **what is genuinely connected to an
LLM or an external system, and what is a demonstration?** It is the canonical
truth-label inventory for product copy, QA, and coding agents. Architecture and
security details remain in their respective documents.

## Status vocabulary

| Label | Meaning |
| --- | --- |
| **Real LLM** | A request reaches the configured OpenAI-compatible model and the response affects the result. Evidence must include generator/model provenance. |
| **Real non-LLM** | Real code, storage, tests, network APIs, or infrastructure run, but no model generates the result. |
| **Hybrid demo** | A real mechanism operates on scripted, fixture, seeded, or otherwise non-production input. |
| **Seeded demo** | Authored seed data or a simulated history; it is not an observed external fact. |
| **UI only** | Presentation or animation driven by existing state; it has no separate backend intelligence. |
| **Not implemented** | The product may describe the boundary, but it does not perform the external action. |

“Real” does not mean production-ready. This prototype has no user authentication,
durable production database, or safe deployed boundary for arbitrary code.

## Deployed non-production snapshot

Last fully verified on 2026-08-11 at version `v0.5.3`, commit `1c28a5f`:

> This is a historical serving snapshot, not a claim about the latest source.
> Source `v0.5.5` commit `99f2205` was blocked by I18N-01 before image
> publication. The current source fixes that gate; use immutable-image, Argo, and
> serving-build evidence rather than this historical snapshot to claim rollout.

- `EXECUTION_MODE=demo`; configured and resolved execution modes are both demo.
- The LLM credential validation endpoint succeeded against the configured
  OpenAI-compatible gateway using the campaign model. After validation, project
  explanation payloads reported `plainGenerator: "openai"` and
  `impactGenerator: "openai"`.
- Langfuse is configured. This states configuration, not proof that every request
  has a trace; correlate a request and trace ID when that distinction matters.
- Process isolation is reported. There is no deployed per-run Docker/OS boundary,
  so real mission runners remain disabled.
- `/api/impact` and profile/marketplace payloads report `dataMode: "demo"`.

Configuration and execution are independent: a working model credential does not
promote mission execution out of demo mode.

The campaign-D layout and motion-led homepage exist in the `v0.5.5` source
candidate. They are **UI only** over existing API/seed state and must not be
described as live until an immutable image, Argo reconciliation, and serving-build
identity prove deployment.

## Repository discovery and campaign authoring

| Feature | Current implementation | Classification | Boundary / evidence |
| --- | --- | --- | --- |
| Bundled fixture analysis | Reads the checked-in fixture, issue, and repository facts locally. | **Hybrid demo** | Real parser over a deliberately bundled demo repository; no LLM. |
| Public GitHub import | Calls GitHub's read-only API for public metadata, issues, README/workflows, and optional npm download data. | **Real non-LLM** | Does not clone, inspect the full tree, authenticate, or execute the repo. Probe with `PrimeIntellect-ai/prime-agent`. |
| Issue scope and acceptance assistant | Optionally sends one server-capability-bound public issue excerpt to the configured model and validates bounded bilingual JSON. | **Real LLM** or labelled fallback | Shows prompt/version/variant/generator; cannot alter the selected issue or claim repository execution. |
| Campaign generation, real mode | Sends structured repository/issue context to the configured chat-completions endpoint. | **Real LLM** | Response has `generator: "openai"` plus model, request, latency, and token evidence. |
| Campaign generation, demo mode | Produces deterministic, issue-grounded bilingual copy for fixtures or GitHub metadata. | **Hybrid demo** | Response has `generator: "demo"`; GitHub copy avoids file or execution claims. |
| Campaign quality critic | Optionally checks grounding, actionability and bilingual parity without mutating the original draft. | **Real LLM** or labelled fallback | The draft capability is revalidated server-side; the critic cannot publish or change compute. |
| Compute estimate | `server-heuristic-v2` prices observed repository scope, issue size, criteria, verification loops, and risk; it publishes a range/confidence/breakdown and applies bounded historical calibration after three successful samples. Model-authored totals are discarded. | **Real deterministic policy over partial observations** | A planning allowance, not provider-billed token usage. Metadata-only repositories remain low-confidence. |
| Project plain-language and impact explanations | Uses the configured model after validation; otherwise returns authored fallback copy. | **Real LLM** or **Hybrid demo** | Inspect `plainGenerator` and `impactGenerator`; do not infer from prose quality. |
| Project timeline | Derives milestones from local mission, test, and release state. | **Real non-LLM** | It is never model-generated; source records may themselves be seeded. |

## Funding, execution, review, and release

| Feature | Current implementation | Classification | Boundary / evidence |
| --- | --- | --- | --- |
| Pledge credits, wallet, ledger, idempotency | Validates and persists local SQLite transactions and state transitions. | **Real non-LLM** | Credits are prototype units; there is no payment processor, blockchain, or provider token transfer. |
| Automatic start after full funding | Engine starts an eligible fixture mission when its local funding goal is reached. | **Hybrid demo** | The state machine is real; the funded identity and credits are local demo state. |
| DemoRunner mission | Applies scripted reasoning and patches to a copied fixture. | **Hybrid demo** | Reasoning, plan, and proposed edit are authored scripts, not an LLM response. |
| Engine verification | Runs the fixture's actual tests, captures output, computes the diff, applies deterministic gates, and accounts credits. | **Real non-LLM** | Engine evidence is real for the copied fixture even when the runner is demo. |
| LlmRunner | A bounded 14-turn OpenAI-compatible tool loop with read/search/write/test/submit/abstain operations. | **Real LLM**, available locally | Requires explicit `EXECUTION_MODE=llm` and a measured boundary or unsafe disposable-local opt-in. It is not active in shared nonprod. |
| CodexRunner | Uses the Codex SDK/CLI through a runner path separate from LlmRunner tools. | **Real LLM**, local-only | Current production image does not provide the practical CLI path; do not describe it as deployed. |
| Advisory judge | Uses the execution model only in an eligible non-demo mode; otherwise performs a static diff-shape review. | **Real LLM** or **Real non-LLM** | Inspect judge provenance. Static output must never be labelled LLM. The judge cannot promote or discard a run. |
| Evidence explainer | Optionally explains engine-owned test/diff facts on the review page. | **Real LLM** or labelled fallback | Deterministic evidence remains primary and unchanged. |
| Shadow diff reviewer | Calls the execution model over bounded, redacted artifact evidence even while mission execution remains demo. | **Real LLM**, shadow only | Always returns `affectedGate: false`; it cannot approve, block, spend, merge, or publish. |
| Live agent activity | Streams stored and current engine/runner events over SSE with source/evidence labels. | **Hybrid demo** in nonprod | The live transport and current run are real; DemoRunner event content is scripted. No active run must render idle, not fabricated work. |
| Change-evidence demo decision | Stores accept/request-changes demo decisions and a proposed branch/diff evidence package. | **Real non-LLM** | No authenticated maintainer and no GitHub write occurs. “Maintainer” and “token provider” walkthroughs are UI perspectives, not verified roles. |
| Verification dossier | Persists baseline and every post-change test execution, commands, exit codes, pass/fail counts, deterministic quality gates, criterion evidence, provenance, and estimate-versus-actual compute. | **Engine-verified for live runs; authored and labelled for seed data** | More experiments are evidence, not a correctness guarantee; aggregate green suites do not prove each criterion. |
| Execution cancellation | Internal reset/shutdown paths can abort and settle runs. The public cancellation route returns `403 auth_required`. | **Real non-LLM**, not user-enabled | A future service should authorize the mission maintainer or a platform operator; no authenticated role or full RBAC exists today. |
| “Release” action | Updates local database state and receipts. | **Hybrid demo** | Does not merge, tag upstream, publish a package, or create a GitHub release. |
| Guided demo walkthrough | Performs a real deterministic reset before navigation, then points at the next visible product control as the user completes the workflow. | **Hybrid demo** | The guide never clicks pledge, review, or other state-changing controls for the user. The repository, identity, credits, and DemoRunner intelligence remain demo. |

## Marketplace, community, profile, and visuals

| Feature | Current implementation | Classification | Boundary / evidence |
| --- | --- | --- | --- |
| Marketplace/project cards | Reads local API/database state. Seed popularity, adoption, and history are visibly labelled. | **Seeded demo** | Public repository links are real URLs; most figures are not live GitHub observations. |
| Global impact totals | Calculates totals from the local ledger and release state. | **Hybrid demo** | `dataMode: "demo"`; token figures use the prototype credit conversion, not provider metering. |
| Contributor world map | Derives beacon size from local pledged credits. Coordinates and seed personas are authored. | **Hybrid demo** | Real rendering and aggregation over demo identities/locations. |
| Glow, meteor, token-rain, and pledge celebration | CSS/React animation driven by project and pledge state. | **UI only** | More activity can produce more animation; it is not agent or LLM evidence. |
| Community voting | Persists votes in local SQLite for the current unauthenticated demo identity. | **Hybrid demo** | Not a verified GitHub user, organization vote, or governance action. |
| Comment wall | Stores local comments with server-assigned roles and secret redaction. | **Hybrid demo** | No production identity, moderation service, or upstream issue comment. |
| Contributor profile | Aggregates local pledges, receipts, runs, and releases. | **Hybrid demo** | Payload is `dataMode: "demo"`; the default persona is seeded. |
| Badges and achievements | Deterministically derive colored states from local progress. | **Hybrid demo** | A “real AI agent” criterion cannot be earned by DemoRunner activity. |
| Open-source links | Navigates to genuine GitHub repository URLs. | **Real non-LLM** | A real link does not make accompanying seed stats live. |
| Reset demo data | Cancels active local runs, wipes SQLite demo state, and reseeds it. | **Real non-LLM** | This is a destructive local mutation, not a visual-only reset. |

## Platform and external effects

| Feature | Current implementation | Classification | Boundary / evidence |
| --- | --- | --- | --- |
| Structured logs, Prometheus metrics, SSE | Generated by the running server and engine. | **Real non-LLM** | Provenance still distinguishes seeded/demo events from engine observations. |
| Langfuse tracing, scores, datasets and experiments | v5 tracing exports versioned bounded summaries; the client records feedback scores and can sync/run five source-controlled curated datasets. | **Real non-LLM integration** | `npm run eval:llm` is dry-run by default; `--sync`/`--live` require credentials and operator intent. Export metrics do not prove semantic quality. |
| GitHub → GitLab → image → Argo CD | Mirrors commits, runs CI, builds immutable images, and reconciles nonprod. | **Real non-LLM integration** | Each link has separate evidence; see `GITHUB-OPERATIONS.md`. |
| GitHub authentication and upstream write | No OAuth/app installation, branch push, PR, merge, tag, issue comment, or release publication. | **Not implemented** | UI “PR” and “release” objects are local artifacts only. |
| Payment/provider compute settlement | No billing, wallet custody, provider token meter, or compute marketplace settlement. | **Not implemented** | Credits and token conversions are prototype accounting units. |
| Arbitrary imported-repository execution | Imported repositories are never cloned or executed. | **Not implemented** | Only bundled fixtures pass the executable-workspace gate. |
| Phase 3 queue and worker foundation | Transactional SQLite run requests, lease/heartbeat/retry/cancel/recovery, a separate worker entrypoint, queue metrics/Langfuse traces and GitHub commit capture exist in source. | **Real non-LLM, not deployed** | Nonprod remains `RUN_DISPATCH_MODE=inline` on `emptyDir`; there is no one-job-per-run isolation, signed artifact store or deployed SEC-00 evidence, so imported-repository execution stays disabled. |

## How to verify without guessing

Use a disposable local database or the authorized non-production endpoint. Do not
print environment variables or credentials.

```bash
# Configuration and measured runtime state
curl --fail "$COMMONCOMMIT_URL/api/bootstrap"

# Fresh credential/model check; returns non-secret model and latency evidence
curl --fail "$COMMONCOMMIT_URL/api/llm/validate"

# Real GitHub read-only integration probe
curl --fail -X POST "$COMMONCOMMIT_URL/api/analyze" \
  -H 'content-type: application/json' \
  --data '{"source":"github","url":"https://github.com/PrimeIntellect-ai/prime-agent"}'

# Demo provenance for aggregate product data
curl --fail "$COMMONCOMMIT_URL/api/impact"

# Serving build identity — independent of what CI intended to deploy
curl --fail "$COMMONCOMMIT_URL/metrics" | grep '^commoncommit_build_info'
```

For generated content, inspect the response's `generator`, model evidence, and
data-mode fields. For execution, inspect the resolved execution mode and event
sources. Never use animation, apparent specificity, or a successful credential
check as a proxy for execution mode.

## Maintenance rule

Update this document and `FEATURE-REALITY.zh-TW.md` in the same commit whenever a
feature gains or loses an external effect, changes generator fallback, changes
deployed mode, or changes provenance. Record implementation architecture elsewhere
and link here; do not duplicate large design descriptions.
