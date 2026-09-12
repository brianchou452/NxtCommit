# CommonCommit gotchas

[繁體中文](GOTCHAS.zh-TW.md)

These notes preserve the incident context behind non-obvious controls. An incident describes what was observed at the time; **Current state** describes the source on `main` at the last review. Do not treat an old model result, infrastructure observation, or version-specific explanation as a timeless platform guarantee.

Severity used in the original incident log: 🔴 trust, data, or availability failure · 🟠 broken behaviour, waste, or dead end · 🟡 efficiency or experience · 🔵 background knowledge.

## G01 — A test directory can be interpreted as a module, not discovered tests 🟠

**Incident.** The fixture command `node --test test/` failed with `MODULE_NOT_FOUND` instead of discovering tests.

**Cause.** The positional directory was resolved as an input module by the affected Node runtimes. The original incident attributed the change specifically to Node 24, but the same failure is reproducible with the currently supported Node 22.23 runtime, so that version boundary was too narrow.

**Current state.** Both the fixture and root verification script use bare `node --test`, which invokes test discovery. Preserve that form unless a replacement is verified on every supported runtime.

**Lesson.** Record the observed compatibility boundary, not a guessed release boundary, and test the exact production runtime.

## G02 — Parent test-runner environment leaked into child test output 🟠

**Incident.** An end-to-end server test failed only when the engine itself ran under `node --test`; the same mission passed in isolation.

**Cause.** The child verifier inherited parent `NODE_TEST_*` and `NODE_OPTIONS` settings, changing reporter output and defeating the parser.

**Current state.** `sandbox.ts` now constructs a small allowlisted child environment with stable colour settings instead of inheriting the server environment. It may set its own `NODE_OPTIONS` for the cooperative network-control path; the fix is environment construction, not merely deleting a few historical variables.

**Lesson.** A system that runs somebody else's tests must treat the subprocess environment as both an attack surface and a source of nondeterminism.

## G03 — A demo that succeeds immediately cannot demonstrate adaptation 🟡

**Incident.** The scripted demo passed on its first attempt and omitted the most informative sequence: failure, diagnosis, revision, and success.

**Cause.** The first scripted patch was accidentally the correct implementation, even though the demo was meant to show adaptation to engine evidence.

**Current state.** `DemoRunner` deliberately applies a plausible whitespace-splitting patch on attempt one, which real tests reject, then applies the tokenizer fix on attempt two. The prose and edits are scripted; the workspace writes and engine test results are real for the fixture.

**Lesson.** A demonstration may stage the scenario, but it must label the staging and must not fabricate the evidence.

## G04 — Demo compute was exhausted before the successful retry 🟠

**Incident.** The demo stopped at `budget_exhausted` after revising its plan, before the second verification could pass.

**Cause.** The original goal was sized near one attempt, while the scripted failure and recovery consumed roughly 950 and 720 credits before any extra review cost.

**Current state.** All campaign drafts, including values returned by a real LLM, pass through a 2,400-credit minimum normalization; this closes the later regression where the model returned 200 and a 200-credit normalization floor let the guided flow fund successfully but fail deterministically. Fixture demo sizing otherwise uses `max(2400, linesOfCode * 6 + issueBodyLength / 3)` with roughly 30% headroom, and the seed starts around 85% funded so one visible pledge crosses the goal. The tour surfaces terminal failures instead of waiting forever. This is a deterministic demo-sizing rule, not a general estimate for arbitrary LLM work.

**Lesson.** Size a bounded demonstration from its intended worst path plus margin, and do not generalize scripted costs into production economics.

## G05 — Quoted environment-file values can break authentication 🔴

**Incident.** Credentials worked when a shell sourced `.env` but failed when the same file was passed through a container environment-file path; quote characters reached the process.

**Cause.** Shell parsing and container environment-file parsing do not have identical quote semantics.

**Current state.** The `.env` loader removes one matching quote layer from every value it parses. A second post-load pass normalizes the API, model, mode, Langfuse, GitHub, port, and demo-speed keys even when the platform injected them. Platform-injected `VAR_DIR` and build-identity values do not receive that second pass.

**Lesson.** Normalize configuration where it is consumed, keep secrets out of logs, and validate credentials through a non-secret diagnostic such as `make validate-llm`.

## G06 — Node test reporter shapes vary across execution environments 🟠

**Incident.** Local output included spec-style failure names, while the Node 22 container emitted TAP; the UI and retry context lost every failing test name.

**Cause.** The parser recognized only `✖ name (Nms)`, not `not ok N - name` or TAP summary lines. Reporter choice can depend on runtime and output environment, so the original Node-24-versus-Node-22 mapping is an observation, not a universal rule.

**Current state.** `parseNodeTestOutput` accepts both spec and TAP summaries and failure names, and `workspace.test.ts` has a regression test that explicitly references G06.

**Lesson.** Parsers for external tools need captured examples and compatibility tests for every supported output shape.

## G07 — Production should not transpile TypeScript at startup 🟠

**Incident.** An amd64 image under emulation crashed in runtime `tsx`/esbuild startup and carried unnecessary multi-platform SDK binaries.

**Cause.** Production started from TypeScript, leaving a compiler and native helper on the execution path, while the SDK package included binaries for platforms the image could never run.

**Current state.** `npm run build` creates the Vite frontend and an esbuild server bundle; the runtime executes plain Node over `dist-server/index.js`. The image retains only the relevant Codex vendor binary.

**Lesson.** Compile at build time and keep only runtime artefacts required by the target platform.

## G08 — The evaluated runner tried to rewrite its safety net 🔴

**Incident.** A model modified existing tests and could make a green suite easier to obtain.

**Cause.** Prompt guidance said to add or update tests, while the gate checked only the resulting suite. A metric is unsafe if the evaluated actor may shrink its denominator.

**Current state.** Repository-relative paths are canonicalized before policy checks, and baseline detection includes directory-based tests plus root-level JavaScript, Python, Go, and Ruby naming styles. `LlmRunner` still refuses protected writes at the tool boundary, while a runner-independent engine preflight compares the complete baseline-commit diff and Git/ignored-file integrity before the engine-owned authoritative final suite; this also catches `CodexRunner` direct writes and commit/amend attempts. A runner may already have executed changed code through its own tool or SDK path. The final test count may not fall below baseline. These are integrity controls, not, by itself, OS isolation.

**Lesson.** Verification controls must be canonicalized, adversarially tested, and scoped to the runners that actually pass through them.

## G09 — Green with no meaningful change proves nothing 🔴

**Incident.** An agent could make no change and still produce a green test process and an empty local PR artefact.

**Cause.** The original success condition checked only exit status and failures; the baseline was already green.

**Current state.** The deterministic gate requires a non-empty diff, readable non-zero test evidence, a nondecreasing test count, and for non-document changes either a newly named test file or suite growth. This is a test-growth proxy, not measured code coverage; the documentation must not call it coverage growth.

**Lesson.** Require both trustworthy evidence and evidence that the requested work actually happened.

## G10 — One dated model trial is not a durable capability claim 🔵

**Incident.** In a particular gateway experiment, one `gpt-4o` run failed the fixture, `gpt-5.3-codex` was unavailable with 404, and `gpt-5.5` solved it on the first attempt.

**Cause.** The fixture required changing the implementation model rather than patching the original splitting idea, and the gateway exposed only a subset of model names.

**Current state.** `EXECUTION_MODEL` still defaults to `gpt-5.5`, but the success rate and model-availability observations are dated, gateway-specific experiment results. They must not be presented as a general ranking of model families.

**Lesson.** Keep model availability and task performance in dated experiment records; keep only protocol constraints in durable implementation notes.

## G11 — Model generations can require different request parameters 🟠

**Incident.** Calls returned HTTP 400 after switching to a reasoning-era model.

**Cause.** The affected endpoint rejected `temperature` and expected `max_completion_tokens` rather than `max_tokens`; reasoning tokens also consumed the completion allowance.

**Current state.** `chatComplete` currently classifies names matching `gpt-5*` and selected `o*` models, omits temperature, and sends `max_completion_tokens` with headroom. This is the repository's current endpoint-compatibility policy, not an eternal contract for every OpenAI-compatible service.

**Lesson.** Centralize model-specific wire contracts, test them against the configured endpoint, and revise the classifier when the provider contract changes.

## G12 — Seeded lifecycle states need their downstream records 🟠

**Incident.** “Building” and “under verification” marketplace entries opened empty run and review screens.

**Cause.** Seed data created mission states without the run, event, and artefact rows those states navigate to.

**Current state.** `seedRun()` supplies labelled demo histories for seeded executing, review, and failed examples, including a review artefact where needed.

**Lesson.** If a UI state implies a destination, fixture data must include the destination's data graph as well as the status label.

## G13 — A non-executable project must not offer an execution CTA 🟠

**Incident.** A funded imported project offered “start execution” and inevitably returned `no executable workspace`.

**Cause.** The CTA and auto-start logic looked only at mission status, not workspace capability.

**Current state.** The engine accepts only `{kind: "fixture"}` projects, pledge auto-start checks the workspace, and the mission page replaces execution buttons with an explanation for non-fixtures.

**Lesson.** Capability must gate both server actions and every UI affordance that invokes them.

## G14 — Server prose leaked into the localized UI 🟡

**Incident.** English server errors appeared verbatim in the Traditional Chinese interface.

**Cause.** Toasts rendered `Error.message`, crossing a localization boundary with prose instead of a stable identifier.

**Current state.** The API maps known failures to stable codes, and `apiErrorText()` maps those codes to localized copy while unknown cases use a generic translated message. Raw prose stays in logs.

**Lesson.** Network boundaries should transport error codes; user-facing sentences belong to the client locale.

## G15 — A root-owned state volume prevented non-root startup 🔴

**Incident.** The container failed with `EACCES` while creating `/app/var/workspaces` under the production filesystem posture.

**Cause.** The pod ran as UID/GID 1000 with a read-only root filesystem, while its mounted state volume was not writable by that identity.

**Current state.** State resolution tries `VAR_DIR`, repository `var` (which is `/app/var` in the bundle), then a temporary fallback with a structured warning. Kubernetes sets `runAsUser`, `runAsGroup`, and load-bearing `fsGroup: 1000` and mounts writable `emptyDir` volumes. Old “20/20” results remain historical observations, not a continuing guarantee.

**Lesson.** Test non-root and read-only container settings with the same volume ownership shape used in deployment.

## G16 — Authored demo narrative must be localized too 🟡

**Incident.** The live room mixed translated controls with English scripted analysis, plans, and summaries.

**Cause.** The `L10n` union permits plain strings for externally generated text, and authored demo content incorrectly used that escape hatch.

**Current state.** `DemoRunner` authored events and summaries use bilingual values; identifiers such as paths and test names remain unmodified.

**Lesson.** A type that permits external unlocalized data does not excuse first-party copy from providing every supported locale.

## G17 — Reset raced active writers and crashed the server 🔴

**Incident.** Resetting demo data during a live run wiped rows while the asynchronous loop and its cleanup path were still writing, producing an unhandled failure.

**Cause.** Cancellation was signalled but not awaited, and hot paths assumed mission rows could not disappear.

**Current state.** The reset endpoint aborts runs, waits up to eight seconds, and the loop tolerates a removed mission. The durable claim is not fully enforced: `cancelAllAndSettle()` warns and returns even if work remains, the endpoint then reseeds anyway, and the standalone reseed CLI bypasses settlement entirely.

**Lesson.** A destructive state replacement must prove all writers have stopped or use a data design that makes late writers harmless; a bounded wait that times out is not proof of settlement.

## G18 — Error handling can fail too 🔴

**Incident.** `runLoop` caught the primary error, then `finishRun()` threw while emitting events into deleted state, creating another unhandled rejection.

**Cause.** The fire-and-forget launch had only finalization, and cleanup code was assumed infallible.

**Current state.** Cleanup recording is guarded, the launch has a terminal `.catch()`, and process-level handlers log last-resort faults. This is the cleanup half of G17 and can remain conceptually grouped with it.

**Lesson.** Every catch-path side effect needs its own failure policy, especially in detached asynchronous work.

## G19 — Provenance, not presentation, determines evidence labels 🔴

**Incident.** Authored seeded test counts and diffs wore an “engine verified” badge despite never being executed.

**Cause.** Seed events used `source: "engine"`, and verification was derived directly from that source field.

**Current state.** Every seeded history event uses `source: "demo"`, and a regression scans all seeded events for false engine attribution. Review artifacts now carry an explicit `testEvidenceSource`, so the UI labels the suite from evidence provenance rather than presentation or artifact mode: only engine-observed suite results receive the engine observation label, while seeded evidence remains demo data.

**Lesson.** Trust labels need executable invariants because the easiest person to bypass them for a prettier demo is the product author.

## G20 — An asynchronous feedback transition needs compensation 🟠

**Incident.** “Request changes” moved the only reviewable seed mission into `changes_requested`, then its follow-up execution could not start and left the mission permanently stuck.

**Cause.** The asynchronous start error was logged but did not compensate the preceding state transition.

**Current state.** If the follow-up run cannot start, the engine restores `needs_review` and emits an explanatory engine event.

**Lesson.** Any fire-and-forget action that changes state first must define who restores the state when the action never starts.

## G21 — A ledger line is not a wallet refund 🔴

**Incident.** Release wrote a `refund_unused` ledger entry while contributor balances never increased.

**Cause.** Narrative accounting and balance state were updated through separate paths with no reconciliation test.

**Current state.** The live release path allocates integer credits with a stable largest-remainder method, credits each backer, writes per-contributor refund ledger entries, and asserts that their sum equals the exact unused reserve. Receipts derive consumed shares through the same allocator and refunds from those ledger entries. Seeded released missions now create matching reserve, consumption, and per-contributor refund entries with the same conservation invariant; seed wallet balances remain authored snapshots and are deliberately not credited a second time during reseeding.

**Lesson.** Test financial-like flows from both the ledger and balance sides, and assert conservation rather than merely asserting that some balance increased.

## G22 — Release copy claimed work the product never performed 🟠

**Incident.** A release event said the system tagged a version, updated the changelog, and generated release notes, although none of those operations existed.

**Cause.** The copy described an aspirational workflow rather than executed behaviour.

**Current state.** The event says only that local mission state was marked released and unused credits were refunded; tagging, changelog work, release notes, and repository pushes remain the maintainer's responsibility.

**Lesson.** User-visible operational copy is a product assertion and must be reviewed like a test assertion.

## G23 — A green suite is not per-criterion proof 🟠

**Incident.** Every acceptance criterion, including performance and API claims, appeared individually test verified; seeded missions made the same claim without execution.

**Cause.** The engine marked all criteria verified after the aggregate suite passed.

**Current state.** Live criteria use the distinct `suite_passed` status with `suite:pass/total` provenance rather than `verified`; seeded criteria retain `seeded-demo` provenance, and the UI explains the aggregate-suite meaning. There is still no test-to-criterion mapping, so no individual criterion is described as independently verified.

**Lesson.** Never use language stronger than the granularity of the evidence.

## G24 — Cancelling an orphaned run must report what happened 🟠

**Incident.** Stopping a seeded or pre-restart `running` record produced a success toast while no in-memory execution existed and the row stayed running.

**Cause.** `engine.cancel()` knew only current-process abort controllers, and the client ignored its result.

**Current state.** The API distinguishes an active cancellation from `settleOrphanedRun()`, and the UI reports success only when the server returns `cancelled: true`. Separately, `Makefile` currently cites “G24” for an external kubectl context-drift incident; that reference collides with this entry and should be qualified with its external source.

**Lesson.** The server owns the truth of a state-changing operation; optimistic success is unsafe when the action cannot be rolled back.

## G25 — LLM calls need both cancellation and a deadline 🟠

**Incident.** A stalled gateway could hold a run forever, and cancelling a run did not stop an in-flight request.

**Cause.** The network call had neither a caller signal nor a timeout.

**Current state.** `chatComplete` combines the caller signal with a 180-second default timeout and keeps both `fetch` and response-body consumption inside that boundary. The catch path recognizes Node's `TimeoutError` as well as `AbortError`, checks the timeout signal first, and reports timeout separately from caller cancellation. Regressions cover a request stalled before headers, explicit caller cancellation, and a response body stalled after headers.

**Lesson.** Propagate cancellation to the I/O boundary, cap every remote call, and test the runtime's actual abort error types.

## G26 — “Sandbox” must name concrete capabilities, not imply isolation 🟠

**Incident.** Verification was hardcoded to `node --test`, inherited the full server environment, and was described as isolated.

**Cause.** There was no environment plan, command capability boundary, or explicit subprocess policy.

**Current state.** The engine derives test commands from repository files, restricts executables, pins `cwd`, caps time/output, scrubs the child environment, and uses cooperative proxy/offline settings during verification. These are application-level controls: `cwd` is not a filesystem write boundary, proxy variables are not hard egress isolation, child processes share the server boundary in the process-level fallback but not inside a per-run container (see G47), and arbitrary third-party repositories remain out of scope. Live event copy now states this limitation instead of claiming egress is disabled.

**Lesson.** Document exactly who may execute what, where writes are enforced, which environment is visible, and whether network isolation is cooperative or hard.

## G27 — Istio rejected `timeout: 0s` 🔵

**Incident.** Server-side dry-run rejected a VirtualService intended for SSE because the validation webhook required a positive duration.

**Cause.** `0s` was used to mean unlimited, but that mesh policy treated it as invalid.

**Current state.** The historical fix used a large finite `86400s` timeout and was caught before affecting the shared gateway. The current repository VirtualService contains no explicit timeout, so that exact fix is no longer present; revalidate mesh defaults and SSE behaviour before reintroducing a timeout claim.

**Lesson.** Run server-side admission validation before changing shared infrastructure, and label cluster-specific constraints as historical when the manifest changes.

## G28 — Server-authored achievement copy also needs localization 🟡

**Incident.** Achievement chips were translated, but card titles and descriptions supplied by the server stayed English.

**Cause.** Two rendering paths drew from different localization sources, and only the client dictionary had been translated.

**Current state.** All eight server achievement definitions use bilingual `name` and `description` objects.

**Lesson.** Exercise every rendering path in each locale; shared meaning does not imply shared localization storage.

## G29 — Tool-call history is a wire protocol, not a summary 🟠

**Incident.** The gateway returned 400 or repeated calls when tool results were sent without the exact assistant `tool_calls` message they answered.

**Cause.** Each tool result must match a `tool_call_id`, and a tool-only assistant turn may legitimately have `content: null`.

**Current state.** `ChatMessage` models nullable assistant tool-call turns and tool replies; `LlmRunner` replays the assistant call skeleton before appending each matching result.

**Lesson.** Reduce tool-result payloads if token pressure demands it, but do not rewrite the protocol skeleton.

## G30 — A weaker reviewer becomes a rubber stamp 🔴

**Incident.** A cheap campaign model approved a stronger model's real diff with no risks or unverified items.

**Cause.** The reviewer lacked the capability needed to detect the implementer's mistakes, yet its confident approval looked like an extra control.

**Current state.** Model review uses `env.executionModel`; static fallback is labelled `static`, and all review remains advisory. Equal configuration does not prove parity when the implementer is `CodexRunner`, so this is a policy choice, not a measured guarantee of reviewer superiority.

**Lesson.** Reduce review frequency when cost requires it; do not silently substitute a weaker reviewer or imply that advisory output is a gate.

## G31 — Unknown modes must not silently become simulation 🟠

**Incident.** An unsupported campaign `mode` returned 200 with plausible demo content to a caller that requested real generation.

**Cause.** Nullish fallback handled absence but not invalid enum values.

**Current state.** The campaign endpoint rejects unknown generation modes, the mission endpoint rejects malformed drafts, and startup parses `EXECUTION_MODE` as a strict enum instead of casting it. Explicit `codex` or `llm` mode now fails unless EITHER a per-run OS boundary is measured OR `ALLOW_UNSAFE_LOCAL_AGENT_EXECUTION=1` is set; `auto` remains demo even with a verified boundary, because finding a credential is not consent. The opt-in acknowledges missing OS isolation—it does not provide it.

**Lesson.** Validate enums at every boundary, especially where a fallback can turn a real request into simulated output.

## G32 — `stalled` is a decision; `failed` is an unsuccessful attempt 🟡

**Incident.** Deliberate abstention and escalation were flattened into `failed`, making a judgment call look like a malfunction.

**Cause.** Run outcomes had more semantic states than mission outcomes.

**Current state.** A blocked run moves the mission to `stalled`, while genuine failure, cancellation, and budget exhaustion move it to `failed`. Observability is incomplete: toolchain-unavailable and provisioning-failed blocked branches do not increment `runsBlocked`, so at least one configured reason alert cannot receive its intended series.

**Lesson.** Preserve decision semantics across state, copy, metrics, and alerts; adding a state without instrumenting every producer is only a partial fix.

## G33 — An absent Prometheus series is not numeric zero 🔴

**Incident.** An alert intended to detect “never abstains” evaluated to an empty vector and never fired.

**Cause.** A counter has no series before its first increment; `sum(increase(absent)) == 0` remains empty rather than becoming true.

**Current state.** Relevant rules and dashboards use `or vector(0)` around potentially absent counters. The repository has no automated Prometheus rule test, so the operational verification described by the incident remains historical/manual.

**Lesson.** Test alert expressions against populated, zero, and never-created series; “no alert” can mean the detector is broken.

## G34 — One metric carried two different rejection semantics 🟡

**Incident.** Loop-level premature submissions and post-verification rejections shared one counter, so aggregation could not answer where cost or control failure occurred.

**Cause.** Similar-looking events were combined even though they happened at different pipeline stages and had different costs.

**Current state.** `commoncommit_submission_rejections_total` includes `stage="loop"` and `stage="verify"`, and monitoring can query them independently. Stage identifies location and cost, not malicious intent; dashboard and alert language that calls every verify-stage rejection “cheating” is stronger than the evidence.

**Lesson.** Split metrics at boundaries that lead to different action, and avoid inferring motivation from a control outcome.

## G35 — Unknown measurements must remain absent 🔴

**Incident.** Repository analysis displayed invented popularity, health, test, file, and line values beside real observations without provenance labels.

**Cause.** Missing values were replaced by demo defaults or zero, then reused in campaign copy and persisted as if measured.

**Current state.** Analysis fields remain optional through imported-project persistence, and the UI omits unknown facts instead of displaying zero. Short-lived server-issued analysis and campaign capabilities bind mission creation to a server-observed repository and source issue, so mutated client copies cannot supply invented measurements. Fictional seed popularity remains allowed only as explicitly labelled demo data.

**Lesson.** Missing information is not zero. Defaults are acceptable only when the data model explicitly records that they are simulated.

## G36 — A constant was presented as an AI feasibility read 🔴

**Incident.** Every GitHub issue returned `medium` and every fixture issue `high`, while the UI described an intelligent repository and issue assessment.

**Cause.** A placeholder constant survived behind persuasive product copy.

**Current state.** The value is now an input-dependent, transparent text-shape heuristic with scored and unpriced signals, `by: "heuristic"`, and calibration metadata. The original 19 hand-written patterns are no longer the live design; the measured rewrite did not establish held-out improvement. Source comments still reference G36, so removing this entry made the durable-note index internally inconsistent.

**Lesson.** Any “AI”, prediction, or intelligence claim must vary with its inputs, disclose what it actually reads, and be evaluated rather than merely made more elaborate.

## G37 — Protect every path that can redefine CI or verification 🟠

**Incident.** The write denylist protected `.gitlab-ci.yml` while included `.gitlab/ci/*.yml` and multiple test-definition files remained writable.

**Cause.** The list named familiar files instead of asking which paths could change the execution environment or definition of passing.

**Current state.** The bounded LLM tool denylist covers `.gitlab/`, other CI systems, verification definitions, lockfiles, Git worktree controls, and related configuration. The engine also freezes one environment/test plan before the runner starts and reuses it for baseline and final verification. A runner-independent preflight checks the complete baseline-relative diff, ignored-file seals, and Git execution controls before the engine-owned authoritative final suite, so `CodexRunner` writes are blocked even though it does not use the LLM tool denylist. This does not prevent a runner from executing changed code earlier through its own tool or SDK path.

**Lesson.** Protect capabilities and canonicalized path classes, not a handful of filenames, and state which runner enforces the policy.

## G38 — String prefixes do not contain symlinks 🔴

**Incident.** A repository symlink such as `host -> /` could make a workspace-prefixed path read arbitrary host files in the server process.

**Cause.** Multiple helpers used string-prefix checks or `statSync`, which follows symlinks.

**Current state.** Model-directed bounded tool reads/writes use shared realpath containment, their listing skips symlinks, and adversarial tests cover those helpers. `LlmRunner` opening-brief reads use the same contained, redacted path; baseline discovery, repository scanning, `DemoRunner.listFiles`, and environment-planning counts now also skip symlinks. A regression test ensures a linked test directory cannot duplicate evidence. These fixes close the named walker bugs, but they do not supply OS isolation; real-agent execution still requires either a measured per-run OS boundary or the explicit unsafe local opt-in.

**Lesson.** Filesystem containment is a canonical-path property, and every read, write, and walker must share the same policy.

## G39 — Image provenance must describe every input that affects the bytes 🟠

**Incident.** A local image contained new working-tree code while its labels described the previous committed source tree.

**Cause.** Docker copied the working tree, while provenance was computed from `HEAD`.

**Current state.** `make build` refuses dirty paths listed in `IMAGE_PATHS`, and `build-dirty` labels local output as uncommitted. The guarantee is incomplete: tracked `.dockerignore` affects the Docker context but is absent from the local/CI path list and source-tree hash, so changing it can change included bytes without changing provenance.

**Lesson.** Build bytes and provenance must derive from the same complete input set, including context filters.

## G40 — Runner metadata is not runner liveness 🔴

**Incident.** Jobs remained pending on tagged runners whose processes and pods existed but had stopped polling for work.

**Cause.** The liveness probe checked for a PID, and scheduling was chosen from registered tags rather than recently successful work.

**Current state.** The repository pipeline declares no runner tags and specifies job images and services explicitly, preserving access to any live compatible runner. The fleet outage and polling timestamps are external historical evidence, not a condition this repository can verify.

**Lesson.** Health for a poller must measure recent successful polling or work, and scheduling conventions should come from successful sibling jobs rather than static registration data.

## G41 — Repeated use of an undefined variable does not reveal its scope 🟡

**Incident.** The first image job assumed a credential used by several sibling projects was group-scoped, but it was independently configured per project and absent here.

**Cause.** Source files cannot distinguish one inherited variable from several separately configured project variables.

**Current state.** The image job prefers keyless Workload Identity Federation. It still supports stored `GCP_SA_KEY` and `GOOGLE_CREDENTIALS` fallbacks, so comments claiming that nothing is stored in CI variables are too absolute.

**Lesson.** Verify external configuration at its source, and prefer removing long-lived credentials to guessing where they are inherited from.

## G42 — Report artefacts can upload after an earlier failure 🟡

**Incident.** Authentication failed, then dotenv upload emitted a second, louder “no files to upload” error that obscured the real cause.

**Cause.** GitLab report artefacts are attempted for failed jobs regardless of the ordinary `when` intuition, while `build.env` did not yet exist.

**Current state.** Closed by removing the dotenv report entirely. After two-phase
delivery, no downstream GitLab job consumes it: GitHub observes job status through
the API and Argo reads the promoted Git revision. `build.env` remains job-local,
so an early authentication failure now ends with its real error and no report
uploader noise.

**Lesson.** Create promised report files before any earlier phase can fail, and verify causal explanations against the actual CI phase order.

## G43 — Ask whether a privileged call is necessary before requesting a credential 🟡

**Incident.** Deployment requested an ArgoCD token to force synchronization even though automated reconciliation already existed and the application did not yet exist.

**Cause.** The pipeline verified that it had issued a command rather than verifying the serving result.

**Current state.** Deployment now polls public application metrics for the exact version and source tree; release tagging uses job-scoped `CI_JOB_TOKEN`. Historical shorthand that “three credentials disappeared” needs scope: the GitHub-to-GitLab mirror still requires `GITLAB_PUSH_TOKEN`, and image authentication retains key fallbacks. The ArgoCD Application comment still says CI force-syncs even though the pipeline does not.

**Lesson.** Prefer verifying an observable outcome over issuing a privileged trigger, and distinguish credentials removed from one job from credentials still required elsewhere.

## G44 — Unreadable test output is an engine limitation 🔴

**Incident.** Unsupported reporters became `0/0/0`, were blamed on the agent as “zero tests”, and consumed retries.

**Cause.** The result type could not distinguish a measured zero from parser failure.

**Current state.** JavaScript parsing has captured real fixtures for Jest, Vitest, and Mocha, tests for Node spec/TAP, and an explicit `test_output_unreadable` path. Coverage is not universal: pytest and Go lack equivalent captured parser fixtures, and normal non-verbose `go test ./...` can be marked readable from package-level `ok` while producing zero counted cases, falling back into the same misattribution.

**Lesson.** Model “unknown” in the type, test parsers with real output from the actual command, and never turn an engine blind spot into an agent failure.

## G45 — Tuning and reporting on the same data measures memory 🟠

**Incident.** A feasibility corpus used an invalid proxy (`closed as not_planned`) for non-automatable work and initially had no train/test boundary.

**Cause.** Maintainer intent was confused with technical tractability, and feature selection would have contaminated evaluation on the same rows.

**Current state.** The evaluator has a deterministic 70/30 repository-grouped split, although it defaults to `--split=all`. New collection now excludes every `NOT_PLANNED` issue before considering other proxy signals, and the collector describes that boundary honestly. Existing corpus rows and reported calibration do not change retroactively: regenerate the corpus, evaluate the untouched repository holdout and record its provenance before reusing those numbers.

**Lesson.** First validate that a label measures the desired construct, then split by the shared source that could leak style or context.

## G46 — Tune on training data and judge on untouched held-out data 🔴

**Incident.** Repo-grouped cross-validation on feature-selection data suggested a large AUC gain, while untouched held-out repositories did not establish improvement and favoured the old score in the point estimate.

**Cause.** Cross-validation split samples after feature choices had already seen the broader training corpus, so selection bias survived every fold.

**Current state.** The heuristic discloses the negative held-out result, labels itself heuristic, and returns calibration metadata. Enforcement is partial: evaluation defaults to all rows, no CI gate or uncertainty computation is committed, and the returned high-band precision (`0.811`) is ambiguous beside the file's held-out top-band figure (`78.8%`). Calibration needs an explicit corpus/split provenance before it can be treated as a current measurement.

**Lesson.** Use untouched grouped holdout data, report uncertainty, and prefer the estimate that answers the actual deployment question rather than the one with the best number.

## G47 — A scrubbed child environment is not a boundary 🔴

**Incident.** `sandboxEnv()` removed every credential from the child's environment, and the sandbox was described as isolating untrusted repository code. A child with a completely clean environment still read the parent's synthetic canary on the first attempt.

**Cause.** Same-uid processes are not isolated from one another. On Linux `/proc/<server-pid>/environ` is readable; on darwin `ps -Eww -p <ppid>` prints the same thing. Both report the environment as it was at `exec`, so no amount of `delete process.env.X` after startup helps, and nothing in application code can close the hole.

**Current state.** `server/engine/isolation.ts` runs each command in a disposable container with private PID, mount, and network namespaces, so the server process does not appear in `/proc` at all. `runInSandbox` dispatches there when a boundary is available and falls back to the process path honestly when one is not. The allowlist and scrubbed environment remain as defence in depth; neither is load-bearing. The residual risk is stated in `SECURITY.md`: namespaces are a kernel boundary, not a hypervisor one.

**Lesson.** Ask what enforces a control, not what it forbids. A rule enforced by the process that holds the secret is a policy, and a policy is not a boundary.

## G48 — A probe must perform the operation it makes a claim about 🔴

**Incident.** The isolation probe checked that the Docker daemon answered and the sandbox image existed, then reported `osIsolated: true`. Every run under the test harness silently executed against an **empty directory**, and the engine recorded “baseline test run: 0/0 passing”.

**Cause.** Docker Desktop shares only certain host paths. The test harness puts workspaces under `os.tmpdir()`, which is `/var/folders/…` on macOS and is not shared. Docker does not refuse such a mount — it substitutes an empty directory. `npm test --silent` then found no `package.json`, exited non-zero, and printed nothing, because `--silent` suppresses npm's own error. Two independent silences combined into a confident wrong answer.

**Current state.** `probeWorkspaceMount()` writes a token into the real workspace root, mounts it, and reads the token back inside a container. Anything else falls back to the process path with the reason in the status detail. The condition is also its own regression test in `server/engine/isolation.test.ts`.

**Lesson.** Preconditions are not the operation. When a probe's answer gates a security claim, make it do the thing and check the result — and remember that this project has already been bitten by an engine limitation reported as an agent failure (G44).

## G49 — Absence of a finding is only evidence when something looked 🔴

**Incident.** The first SEC-00 smoke run reported four of six attack vectors as “clean”. The payloads had crashed before making a single attempt.

**Cause.** The payload wrapper declared its reporting helper with `const` **after** splicing in the body, so a body ending in `finish()` hit a temporal dead zone and threw. The harness saw no reported findings and scored that silence as a pass.

**Current state.** The helper is declared before the body, `uncaughtException` and `unhandledRejection` both still emit a report, and two threshold clauses now fail a repetition whose payload produced no parseable report or died mid-way. A separate false negative in the same run had the same shape: the canary was assigned at runtime, so `/proc/environ` and `ps -E` — which both report the exec-time environment — could not have seen it no matter how broken the sandbox was. The harness now re-executes itself with the canary in its exec environment.

**Lesson.** A security harness must distinguish “attacked and blocked” from “never attacked”. Make the unmeasured case a failure, not a pass, and verify the harness can detect the vulnerability it is testing for before trusting a green result.

## G50 — `node:sqlite` is not `better-sqlite3` 🟡

**Incident.** An idempotency helper wrapped its effect in `db.transaction(() => …)` and failed to compile.

**Cause.** `DatabaseSync` from `node:sqlite` has no `transaction()` helper; that is better-sqlite3's API, and the two are easy to conflate because the `prepare`/`run`/`get` surface matches.

**Current state.** The helper issues `BEGIN IMMEDIATE` / `COMMIT` / `ROLLBACK` explicitly, which also makes the rollback path visible at the call site.

**Lesson.** Check the actual module's surface rather than the one the idiom came from.

## G51 — A retried request charged the backer twice 🔴

**Incident.** DATA-01 measured that a byte-identical retry of `POST /missions/:id/pledge` created a second pledge row, a second ledger entry, and a second wallet debit. Conservation held — nothing was created or destroyed — so every existing accounting test passed.

**Cause.** No idempotency mechanism existed anywhere in the product: no header, no request-id column, no dedup table. The plan's threshold “one effect per idempotency key” had nothing to be true of.

**Current state.** `store.runIdempotent` records the key inside the same transaction as the effect, so a duplicate cannot half-apply, and reusing one key for a different request is refused rather than silently answered with the first response. The dialog mints one key per user intent and holds it across retries. The honest limit is asserted by its own test: a request that omits the header gets no protection, because the server cannot tell an accidental retry from a deliberate second pledge of the same amount — only the client knows which it meant.

**Lesson.** Conservation invariants can all hold while a user is still charged twice. Check the property the user cares about, not only the one the ledger cares about.

## G52 — A green run that did nothing 🔴

**Incident.** `mirror-to-gitlab.yml` had a run history of green checkmarks lasting 5–16 seconds. It had never mirrored a commit. `gh secret list` returns nothing for this repository, so `GITLAB_PUSH_TOKEN` has never existed, and every one of those runs took the unconfigured skip path and exited 0. The GitHub → GitLab → build → deploy chain had never once run end to end from a push; the images that do exist in Artifact Registry were built by hand.

**Cause.** The skip was deliberate and its reasoning was written down: "a permanently-red CI badge teaches people to ignore CI, so red is reserved for something actually breaking." That is a good rule for a gap about to be closed. It became wrong when the gap stayed open, because the badge then asserted something false every single push. `docs/DEPLOYMENT.md` even carried the warning — "a green skipped workflow does not prove GitLab received the commit" — which is exactly the sentence you write when the signal is lying and you have decided to document the lie instead of fixing it.

**Current state.** The project-scoped token is now configured. The latest fully
verified image rollout is GitHub run `31409728473` with GitLab pipeline
`2748045554`. The workflow now checks the credential before checkout and fails
closed for every event if it is absent; the historical push warning/skip behavior
described above is no longer current.

**Lesson.** "Red is reserved for real breakage" needs an expiry date. A warning inside a green run is invisible; if a documented caveat is the only thing standing between a reader and a wrong conclusion, the signal is the bug.

## G53 — The liveness probe crashed the pod over a refusal that was correct 🟡

**Incident.** `/healthz`, `/readyz`, and `/api/bootstrap` all called `resolveMode()`, which throws when a real agent is configured without a measured per-run OS boundary. Setting `EXECUTION_MODE=llm` in the non-production cluster — which has no Docker daemon, by design — therefore made the liveness probe return 500. Kubelet read that as a dead container and restart-looped the pod. The only statement of the actual reason was inside a response body nobody was reading, and 353 passing tests never asked what a status endpoint does in the refused state.

**Cause.** One function served two jobs with opposite failure requirements. Refusing to run is the right answer for `executeMission`, where throwing stops the run. It is the wrong answer for an endpoint whose entire purpose is to describe the server, where throwing destroys the description.

**Current state.** `safeResolveMode()` returns `{ mode: null, error }` and the three describing endpoints use it; `executeMission` still calls the throwing form. `mode` is `null` and never `"demo"` — reporting demo would be the silent downgrade the gate exists to prevent, relocated into the status endpoint, and would have let `deploy:verify` go green on a cluster where no mission can run.

**Lesson.** Fail-fast and self-describe are incompatible in one function. A health endpoint must survive every configuration it is capable of disagreeing with.

## G54 — "The same gate a developer runs locally" was not the same gate 🟡

**Incident.** Two consecutive `npm run check` runs on an unchanged tree disagreed, failing `every seeded repository card explains what would break without it` on a different project each time — `zxcache`, then `sigstore-lite`. The GitLab `test:` job had never seen it.

**Cause.** `explainProject` picks its generator with `openaiConfigured()`. A developer machine has `OPENAI_API_KEY` in `.env`, so the test called a live gateway and then asserted minimum lengths on model-authored bilingual prose. GitLab runs `npm ci` in `node:22-alpine` with no `.env` and no secret, so CI always took the deterministic bundled-copy path. The comment in `.gitlab-ci.yml` calling this "the same gate a developer runs locally" was false in the direction nobody checks: the local gate was *stricter and nondeterministic*, and a real defect would have been indistinguishable from the model having a terse day.

**Current state.** `server/landing.test.ts` clears `env.openaiApiKey` and the explanation cache at module load, pinning every `explainProject` assertion to bundled copy. Those assertions were always about text the repository ships and can fix. Model output keeps its own invariants — the provenance label and the ban on emitting numbers — asserted separately.

**Lesson.** A test that reaches a live model asserts on something no reviewer can repair. Before trusting a gate, check that it runs the same way in both places — including the case where the local one is the stricter of the two.

## G55 — A protected endpoint made successful delivery look broken 🟠

**Incident.** GitHub displayed a red mirror workflow after GitLab had tested and published the immutable image and Argo CD had deployed it. The failing line reported the GitLab post-deploy verifier rather than the delivery step that actually failed.

**Cause.** The workflow treated an HTTP observation from a shared runner as authoritative even though Cloud Armor intentionally denies that runner with `403 Forbidden`. Build delivery and public endpoint authorization have different owners and trust boundaries.

**Current state.** GitHub waits for the matching candidate `test` and `build:image`
jobs, then promotes GitLab main. The obsolete GitLab endpoint verifier and its
release jobs have been removed. Argo's in-cluster PostSync hook owns readiness and
exact-build verification; the public metric independently proves routed bytes.

**Lesson.** A verifier is authoritative only when it is both authorized to observe the target and assigned ownership of that outcome. Split delivery evidence from deployment evidence instead of making one inaccessible probe turn successful work red.

## G56 — A runner can accept a job whose pod never starts 🟠

**Incident.** `build:image` remained pending with `0/8 nodes are available: Insufficient cpu`. A later `test` job appeared `running` for the full 20-minute observer window while its build job stayed `created`; its useful trace had not begun.

**Cause.** GitLab marks a Kubernetes-executor job running when the runner accepts it, before the job pod is necessarily scheduled. Default CPU requests for build, helper, and Docker-in-Docker service containers were too large for available shared-node capacity. The same distinction applied to the lighter test pod.

**Current state.** The test pod requests `250m` plus a `50m` helper. Pipeline
`2747980634` proved the build pod's former `800m` total still could not fit on any
of eight nodes for the complete 18-minute boundary, even though test completed in
4m06s. The build/helper/dind requests are now `100m`/`25m`/`125m` (250m total),
with no CPU limit, so Docker may burst. Pipeline `2748199303` subsequently proved
that shared capacity could fall far enough that even the already-bounded 300m test
pod could not schedule on any of eight nodes. The observer prints both traces on
timeout; repository YAML cannot manufacture missing cluster capacity.

**Lesson.** Distinguish queued, runner-accepted, pod-scheduled, and script-started states. Change requests only after scheduler evidence identifies the constrained resource, and keep them as narrow as the workload permits.

## G57 — Desired state must not reference an artifact that is still being built 🟠

**Incident.** Every push made Argo CD look stuck for most of the 7–9 minute GitLab
pipeline. GitLab `main` already contained the new overlay tag, while its immutable
image did not exist yet. PreSync protected the old pod, but Argo correctly waited;
kubelet image-pull backoff could add delay even after publication.

**Cause.** Mirroring and promotion were the same write. GitHub pushed directly to
the branch Argo watched before CI had established the artifact prerequisite. CI,
registry and GitOps each behaved correctly, but their publication order made a
normal build indistinguishable from a stalled rollout.

**Current state.** GitHub first fast-forwards `delivery-candidate`. GitLab tests and
publishes the immutable image there, then GitHub non-force fast-forwards GitLab
`main` with duplicate CI skipped. Newer revisions cancel superseded candidates.
Argo keeps PreSync as defense in depth and an in-cluster PostSync hook verifies
readiness plus exact version/source-tree identity without crossing Cloud Armor.

**Lesson.** Publish prerequisites before desired state. A controller should only
observe a revision it can act on immediately; staging and promotion must be
separate, atomic, evidence-bearing steps.

## G58 — A late delivery observer can expose an earlier source failure 🟠

**Incident.** Source commit `99f2205` waited nearly two hours for a GitHub hosted
runner. Once acquired, the delivery job failed quickly and looked like another
runner or deployment outage. GitLab pipeline `2749163703`, however, had already
run its test and failed four I18N-01 gates: Traditional Chinese dropped the
seeded-data qualifier, three components introduced inline locale branches and 11
inline translations, and five dictionary keys became unused.

**Cause.** The homepage redesign bypassed locale dictionaries for new visible
copy and removed call sites without removing their keys. The GitHub observer and
GitLab candidate pipeline run on different schedulers; delayed observation did
not cause the candidate's deterministic source failure.

**Current state.** Exact commit `99f2205` remains the failed incident specimen.
The remediation moves campaign-D copy from `Hero.tsx`, `Marketplace.tsx`, and
`MissionDetail.tsx` into both dictionaries, restores the seeded qualifier, and
removes five dead keys. The current source passes 21/21 with 634 keys per locale
and 121 security-marked keys. That proves the source gate only; delivery, Argo,
and serving identity still require separate evidence.

**Lesson.** Treat bilingual copy as a tested behavior and truth boundary. New
visible text belongs in both dictionaries, locale branching belongs in `t(...)`,
and a changelog version is only a source candidate until test, immutable image,
promotion, Argo, and serving identity supply their own evidence.
