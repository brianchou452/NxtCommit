# Security and trust boundaries

## Computer C authoring and review boundary

The C slice accepts public HTTPS GitHub identities only and reads at most five issue/PR records per request, then excludes PRs; an empty result means no issues observed in that bounded window. Responses, issue text and model output are size-bounded. Process-local analysis/draft tokens expire within 30 minutes, are capacity-bounded and are invalidated by reset. Client edits never replace server snapshots. Reset epochs reject in-flight authoring results. Review comments are redacted before persistence.

Fresh review requires B-owned evidence plus a measured integrity port and deterministic gate validation; the default demo reader has a separately labelled authored-seed exception. It cannot establish fresh engine verification. Provider perspective is a read-only UI demonstration, not authentication or access control. Model instructions and output checks reduce unsupported prose but are not a proof of semantic grounding; model output cannot mutate estimates, evidence or lifecycle decisions. No imported repository is executable.


[繁體中文](SECURITY.zh-TW.md)

NxtCommit is an experimental prototype. Its controls are designed to make fixture demonstrations auditable; they are not sufficient for executing arbitrary third-party code in a shared or production environment.

## Threat model

Treat all of the following as untrusted:

- repository files, filenames, symlinks, and dependency scripts;
- issue and README text returned by GitHub;
- maintainer feedback entered through the UI;
- test output;
- model responses and claimed summaries.

Protect these assets:

- server-side API keys and observability credentials;
- files outside a run workspace;
- verification definitions and existing tests;
- the integrity of test, diff, source, and mode labels;
- service availability and local state.

The current deployment assumes trusted operators and demo users. It does not provide account authentication, authorization, tenant isolation, or a secure boundary between users.

## What each control actually covers

| Control | Applies to | Does not establish |
| --- | --- | --- |
| Per-run container (`engine/isolation.ts`) | Every sandboxed command, when the probe confirms a boundary is available | A hypervisor boundary; anything at all when the probe reports `process` — including in the GKE pod, which has no Docker daemon |
| Git-baselined fixture workspace | Engine-run fixture missions | OS-level isolation on its own |
| Evidence fencing and secret-shaped redaction | Selected tool results, test output, event strings, and diff patches | Uniform coverage of every model input or artifact field; proof that every secret format is removed |
| `LlmRunner` containment and write denylist | Model-directed calls plus fixed opening prefetch reads | An OS boundary or command mediation for `CodexRunner` |
| Engine-run final test and diff | Live fixture executions | Correctness of every acceptance criterion |
| Reviewability gate | Transition into local `needs_review` state | Authenticated human approval or upstream CI |
| `--network none` during verification | Every command in a per-run container | Anything when running process-level, where proxy variables remain cooperative only and raw sockets ignore them |
| Proxy variables and package-manager offline flags | Cooperative subprocess traffic in the process-level fallback | Hard network isolation |
| Kubernetes NetworkPolicy | Pod-level traffic allowed by the manifest | Per-run egress isolation; the current HTTPS rule has no destination restriction |
| Non-root, read-only container filesystem | Application container | Isolation between the server and child processes when they share its UID and PID namespace — which is the process-level fallback, not the container path |
| Secret-shaped redaction | Accidental disclosure of plaintext credentials in evidence, logs, and prompts | Containment against a hostile runner: base64, hex, and percent-encoded values pass, and no plaintext matcher can close that |

## Implemented controls

Repository analysis accepts only the explicit `fixture` and `github` source
values. Unknown values fail closed with a `4xx` response before analysis or
capability issuance; they cannot silently select the executable bundled fixture.
This input validation does not broaden GitHub access or make imported repositories
executable.

### Evidence and output handling

The bounded tools fence and redact file reads, searches, and test results. Artifact diff patches are redacted, and event emission redacts string details plus an output payload when present.

Coverage differs by RUNNER, and a previous version of this sentence over-claimed by describing only `LlmRunner`. In `LlmRunner` the objective and criteria are redacted and carry an authorship label (deliberately not fenced — a fence says "do not act on this", and the objective is the one thing the agent must act on), maintainer feedback is both fenced and redacted, attempt history is fenced, and `list_files` redacts filenames. `CodexRunner` calls neither `redactSecrets` nor `fenceEvidence` anywhere: it passes the objective, criteria, and maintainer feedback into its prompt raw. What else remains uneven: artifact summaries, risks, and review notes do not all pass through one redaction boundary. Treat `fenceEvidence()` and `redactSecrets()` as implemented primitives with incomplete call-site coverage, not a universal guarantee.

Prompt-injection patterns are advisory signals. A hit prevents the run from being promoted as reviewable; it is not proof that the text is malicious or benign.

Do not log or commit real credentials. Keep secrets in process environment variables, a local ignored `.env`, or the deployment's secret store. `make validate-llm` returns non-secret connection evidence only.

### Workspace containment

Model-directed paths handled by `tools.ts` use the shared realpath containment check, and file listing skips symlinks. `LlmRunner` tool writes reject absolute paths, traversal, `.git`, CI configuration, verification definitions, dependency lockfiles, package-manager configuration, container build files, `LICENSE`, installed dependencies, and pre-existing test files.

`LlmRunner` builds its fixed `ISSUE.md` and `package.json` prefetch through the shared realpath containment helper, then truncates, redacts, and fences the content.

The denylist is deliberately code, not runtime configuration. Any change to it requires review and guard/tool regression tests.

`CodexRunner` uses the Codex SDK's workspace-write mode directly and does not pass each write through `assertWritable()`. The engine therefore applies the protected-path policy to every runner's full baseline-relative diff and blocks newly ignored files before executing the authoritative final suite. After that executable suite returns, the engine rechecks Git controls and ignored-file seals before any diff command. This is a universal reviewability gate, not command or host isolation: Codex and bounded tools can still execute code before that preflight.

### Verification integrity

The engine derives and freezes the test command from the pre-run repository rather than asking the model. It rejects a red, empty, or unreadable baseline before model spend; after submission it compares the index with the captured baseline commit, checks protected and ignored paths, reruns the frozen suite, rechecks direct Git/ignored integrity after executable tests return, and applies blast-radius and test-count checks. A runner commit or amend cannot redefine the comparison base.

The runner cannot make a run reviewable merely by saying tests passed. However, the current engine verifies a suite as a whole; it does not prove each acceptance criterion independently, and it does not consume evidence from upstream CI.

### Human decision boundary

No runner automatically merges or pushes. A run can create only a local artifact, and `approved → released` requires an explicit API/UI action.

This is a workflow boundary, not an identity boundary. The API ignores a submitted reviewer identity and records the local demo user, but it still has no authentication or authorization.

## Known gaps

### The OS boundary exists, but only where it is measured

A per-run container boundary now exists (`server/engine/isolation.ts`), and
[SEC-00](experiment-report.md) measured it: 140 repetitions across seven attack
vectors disclosed no secret, wrote nothing outside the workspace, and delivered
no packet to a controlled sink. The same payloads in the process-level fallback
leaked a credential on 20 of 20 repetitions and delivered 80 packets.

The boundary is therefore real **and conditional**. `describeIsolation()` probes
for it at startup by actually mounting the workspace root in a container and
reading a token back; when that fails it reports `process` and the engine says so
in the API and the UI. Read the reported status — never infer it from the fact
that this file documents a container path.

Two configurations where the probe reports `process` today:

- **The GKE pod has no Docker daemon.** In-cluster runs get process-level
  controls only, so SEC-00's P0 gate is **not met there** and real-agent
  execution must stay off in the shared deployment. Meeting it in-cluster needs a
  per-run Kubernetes Job or a sibling runtime, which does not exist yet.
- **A workspace root outside Docker's shared paths.** Docker Desktop silently
  substitutes an empty directory rather than failing, so the probe treats an
  unreadable mount as no boundary at all (see `GOTCHAS.md` G48).

`ALLOW_UNSAFE_LOCAL_AGENT_EXECUTION=1` remains as an escape hatch for a
disposable laptop without Docker. It is a risk acknowledgement, not a control,
and it adds nothing; a verified boundary is now the preferred way past the gate
precisely because it is measured rather than promised.

What the boundary is NOT: namespaces and cgroups are a **kernel** boundary, not a
hypervisor one. A kernel escape defeats it. SEC-00's threshold accepts a
kernel boundary, and this residual risk is the reason arbitrary-repository
execution still needs the threat-model review the plan's promotion checklist
demands, not just a passing gate.

Only bundled fixtures are executable today. Keep that restriction in shared
deployments until a per-run boundary is measurable in the deployment itself.

### The comment wall accepts untrusted text from an unauthenticated actor

The wall is the first surface where a visitor's own prose is stored and then
served back to every other visitor. Three controls apply, and the ordering of the
first one matters:

- The body is passed through `redactSecrets` **before** it is written, not on the
  way out. Redacting only on read leaves the raw value in the database, where a
  backup, a log of a query, or a future endpoint would expose it.
- The length cap is enforced server-side in code points, so a client that skips
  the browser check cannot store an unbounded row.
- Author, role and timestamp are assigned from `store.getCurrentUser()`. There is
  no authentication, so an identity supplied by the client would be an
  impersonation primitive; the UI renders `wall.localNote` to say that nobody on
  the wall is verified.

What this does NOT do: sanitise for HTML. React escapes text nodes, so the
current renderer is safe, but a future surface that interpolates a body into
markup — an email digest, an OG image, a PDF receipt — would need its own
escaping. Redaction removes credentials, not markup.

### Network isolation is best-effort — outside a container

Inside a per-run container, verification runs with `--network none`, and SEC-00
measured zero arrivals at a controlled sink across raw TCP, UDP, DNS, HTTPS, and
the cloud metadata endpoint. That is a real denial, not a cooperative hint.

In the process-level fallback the verification phase sets proxy variables and
package-manager offline options, and SEC-00 measured what that is worth: 40 TCP
connections and 40 datagrams reached the sink across 20 repetitions, because raw
sockets ignore proxy variables entirely. Do not describe the fallback as having
disabled egress.

The supplied Kubernetes policy allows HTTPS without a destination selector. It is useful as a coarse policy but does not make verification network-free. Do not document or label the current system as having disabled egress.

### Verification planning and test evidence need hardening

Before general repository execution, the engine must still:

- use structured reporters for every supported test framework;
- support ranged reads and prevent a truncated read from being written back as a complete file;
- ~~clean up workspaces deterministically~~ (done: `runLoop` reaps in a `finally`) and enforce storage quotas;
- validate clone schemes, hosts, resolved addresses, commit identities, size, package shape, and licence policy.

The LLM tool path enforces 24 non-terminal calls, 200 KB of reads, 200 KB of cumulative writes, an 80-KB per-file write limit, and bounded, charged listings and literal searches. These controls bound cost and evidence ingestion only; they do not constrain SDK-runner commands, CPU, child-process creation, filesystem access outside a true sandbox, or raw network traffic.

### Secret bootstrap needs hardening

The deployment helper sources the local `.env` as shell code and passes secret values to `kubectl --from-literal`, which can expose them through local process arguments during execution. Use only trusted local input and a trusted workstation. Replace this with a restricted dotenv parser plus stdin or a platform secret manager before treating the bootstrap path as hardened.

### Deployment state is ephemeral

SQLite and workspaces use an `emptyDir`. Restarts and rollouts lose state. Rolling updates can briefly run two pods with independent databases. The current one-replica setting is necessary but does not remove this transition window.

## Required review for security-sensitive changes

When changing a runner, tool, guard, sandbox, repository input, or deployment policy:

1. State which runner and boundary the control applies to.
2. Prefer deterministic enforcement over prompt instructions.
3. Add a regression test that attempts to bypass the new or changed control.
4. Run `npm run test:server` and `npm run check`.
5. Update this document if the threat model or guarantee changes.
6. Avoid broadening executable repository scope until the per-run isolation work is complete.

For suspected credential exposure, rotate the credential outside the repository first. Do not paste secret material into an issue, commit, log, test fixture, or documentation example.
