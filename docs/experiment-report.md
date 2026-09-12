# Verification record

[繁體中文](experiment-report.zh-TW.md)

This document records bounded, reproducible claims. It is not a live deployment dashboard and must not be used to infer what version is currently serving.

Future hypotheses, methods, pass thresholds, and go/no-go gates belong in the
[validation experiment plan](VALIDATION-EXPERIMENTS.md). An entry here is a
dated result, not permission to mark an unexecuted plan as passed.

## Evidence rules

- Record the date, version or commit, execution mode, target fixture, and command or journey.
- Distinguish engine observations from runner output.
- Never include keys, full internal URLs, IP addresses, private project paths, or complete trace identifiers.
- Preserve failed experiments when they changed a design decision, but summarize the lesson instead of keeping a terminal diary.
- Treat model behaviour as a dated observation, not a timeless guarantee.

## Local verification

### 2026-08-06 — SEC-00 per-run OS isolation (P0 gate)

- Harness: `npm run sec00` (`server/security/sec00.mts`, payloads in `sec00-payloads.ts`)
- Source commit: `abd03ae`. The bundle records `dirty: true` because documentation
  was being edited while the run executed; `git status -- server/engine
  server/security Dockerfile.sandbox` reported zero changes, so every code path
  under test was exactly `abd03ae`. Stated rather than rounded to "clean", because
  the plan requires a result tied to an immutable commit and this one is tied to a
  commit plus that verification.
- Environment: macOS 25.5.0 arm64, Node.js `v24.3.0`, sandbox image `commoncommit/sandbox:1`
- Inputs: fixture `tempo`, 7 vectors × 20 repetitions × 2 isolation modes = 280 runs
- Reproduced: three consecutive full executions on this commit, all with the same
  verdict. An earlier execution reported one container residue violation in 140,
  which was a defect in the HARNESS — it counted containers by image, so a previous
  repetition still being reaped by `--rm` scored as residue. Now filtered by the
  container's own name with a bounded grace period, because `--rm` removal is
  asynchronous by design. A flaky security assertion is worse than none: it teaches
  the reader to dismiss the signal.
- Canary: synthetic, generated per run; the bundle stores its prefix and SHA-256, never its value
- Evidence: `evidence/sec00-<date>/sec00-<timestamp>.json` (retained out of band; `evidence/` is git-ignored)

**Verdict: passed in `container` mode, failed in `process` mode.** The process
column is the experiment's control, and it is the reason the container column
means anything.

| Vector | `process` (no OS boundary) | `container` |
| --- | --- | --- |
| v1 secret read | **canary disclosed, 20/20 reps** | clean |
| v2 outside write | **sentinel modified + files planted** | clean |
| v3 egress | **40 TCP + 40 UDP arrivals at the sink** | 0 arrivals |
| v4 symlink escape | **wrote through a symlink to outside** | clean |
| v5 git history replacement | clean | clean |
| v5b git execution controls | clean | clean |
| v6 ignored/untracked payload | clean | clean |

Three findings worth more than the pass/fail:

1. **The leak was `ps -Eww`, not `/proc`.** This host has no `/proc`, so the
   Linux path the threat model names could not be exercised. The darwin
   equivalent leaked the parent's canary to a child with a fully scrubbed
   environment on every repetition. Both read the environment as it was at
   `exec`, which is why the harness re-executes itself with the canary in place —
   an earlier version assigned it at runtime, measured nothing, and reported
   "clean". In the container `/proc` exists, was swept, and contained no canary:
   a positive result from a check that ran, not the absence of a check.
2. **v5, v5b and v6 pass in BOTH modes**, because they were never about the
   boundary. Git history replacement, planted clean filters and hooks, and
   ignored-file payloads are caught by the engine's baseline-relative diff and
   its integrity seal. The container does not help, and reporting only the
   container column would have hidden which control was doing the work.
3. **The container is not what stops the payload from trying.** In v3 the payload
   reported `udp: "SENT"` while the sink recorded zero arrivals. The sink counter
   is the authority; the payload's self-report is cooperative and is never used
   for a verdict.

Residual risk, unchanged by this result: namespaces and cgroups are a **kernel**
boundary, not a hypervisor one. SEC-00's threshold accepts that, and
`SECURITY.md` records it.

**The in-cluster gate is NOT met.** The GKE pod has no Docker daemon, so
`describeIsolation()` there reports `process` — the failing column above. Real-agent
execution stays off in the shared deployment, and this local pass does not change
that. Meeting it in-cluster needs a per-run Kubernetes Job or a sibling runtime,
which does not exist yet.

### 2026-08-06 — P0/P1 experiment harnesses (PD-01/02/03, AG-02/03/04, SEC-01, DATA-01, I18N-01)

- Source commit: `fc77386` — deliberately a different commit from the SEC-00 entry
  above (`abd03ae`), because these are two separate executions on the same day, not
  one batch. The harness results here were verified by `npm run check` at `fc77386`;
  `abd03ae` then added the REC-01 fixes, after which the suite stood at 318 server
  tests. `npm run check` green at 296 server + 13 fixture tests
- Environment: macOS local host, Node.js `v24.3.0`, `EXECUTION_MODE=demo`, offline
- Each harness is deterministic (seeded, no wall-clock assertions) and prints its
  own measurement summary; the real case counts are named constants in each file,
  and where they fall short of the plan's aspiration the header says why.

Passed: **PD-01** (state machine and review gate), **PD-02** (1,000 seeded
schedules, 24,423 requests, 4,000 ownership probes — zero cross-mission
disclosures, duplicate effects, invariant failures, or handler throws),
**PD-03** (10,000 identity fuzz cases + 400 real HTTP mission creations; zero
wrong bindings, p95 validation 0.81–1.03 ms), **DATA-01** (200,000 allocator
property cases + 2,000 reconciled lifecycles), **AG-03** (999 label checks, 58
criterion checks, zero overclaims), **SEC-01** (18 of 20 measurements met),
**I18N-01** (351 keys per locale, exact parity, 73 security-marked keys checked
for dropped qualifiers).

**Regression and remediation note (2026-08-11).** Candidate `99f2205` regressed
to 17/21 and pipeline `2749163703` correctly blocked image publication. The
current source moves campaign-D copy into dictionaries, restores the seeded
qualifier, removes five dead keys, and passes 21/21 with 634 keys per locale and
121 security-marked keys. Deployment remains a separate evidence step.

Failed, and left failed: **AG-02** on a benign false-positive rate of 47.1%
(16/34) against a 5% threshold, measured on a deliberately adversarial
look-alike corpus — a realistic ambiguous-mission corpus scores 3.1%, so 47% is
an upper bound for text that resembles an attack, not a base rate. Its
containment half passes. **AG-04** at 22 of 24 measurements, failing only on
properties of the process-level fallback: a deliberately detached grandchild
survives a group kill (only a PID namespace or cgroup can close that), and a
frozen argv does not freeze what `npm test` resolves at execution time (the
write denylist and the protected-path preflight are what actually stop it).

Unmeasured, stated rather than assumed: real-model abstention rates (AG-02 T3
needs a real runner; the demo runner is scripted and never abstains), trace
content with tracing ON (needs a network sink), and everything in UX-01,
A11Y-01, PERF-01 and the browser half of I18N-01 that requires a real DOM.

These harnesses found and this session fixed: a retried pledge charging twice, a
case-insensitive-filesystem bypass of the entire write denylist, `../src`
becoming an executable workspace, concurrent resets corrupting the database, a
throwing SSE subscriber wedging a mission, cancellation never reaching the test
subprocess, an unbounded model response body, and two verification plans per run.
Each fix inverted the test that had documented it, so the assertion that once
recorded the defect now guards against its return.

### 2026-08-06 — landing and community surfaces (UX-01 re-measured)

- Source commit: `76e3ccf`; production build served by the app itself on a free port
- Harness: `server/landing.test.ts` (11 cases) plus a browser pass at 1440×900 and
  390×844 in both locales
- Environment: macOS, Node.js `v24.3.0`, `EXECUTION_MODE=demo`, isolation probe
  reporting `container`

**Automated — passed.** The 11 honesty invariants cover: counters computed from the
database (asserted by changing a pledge row and requiring the total to move by
exactly 250,000 — a hardcoded constant passes every range check and fails that
one); beacons resolving to real contributors with valid coordinates and no
duplicates; the live strip empty when nothing runs; a bilingual, generator-declared
plain-language explanation per project; an impact card that never turns an unknown
measurement into a zero and whose `dataMode` matches its project's; a time machine
whose projection is marked in the DATA and cannot project from an unmeasured base;
wall bodies redacted before storage with a server-assigned author; one vote per
category, idempotent; and both new tables cleared by a demo reset.

**Browser — passed, with one weakness found and hardened.** Five sections render, one
`h1`, no heading-level skips, zero horizontal overflow and zero clipped controls at
both widths in both locales, zero raw i18n keys on screen, no unlabelled controls,
and every required provenance label visible: the seeded-data note, the
credit→token conversion note, the map's "demo locations, geolocation never
collected", and the MVP local-votes note. `lang` becomes `zh-Hant-TW` on switch.

The weakness: the hero counters could freeze partway through their count-up and
stay there — 11,579,355 rendered against a real 19,020,000, and "1 feature built"
against a real 2 — because `requestAnimationFrame` does not fire in a hidden tab
while `setTimeout` does. The `sr-only` figures were correct throughout, so it was a
sighted-user-only wrong number on the surface whose whole purpose is to be
trustworthy. A settle timer now guarantees the exact value regardless of frames.

**Method note, because it changed two conclusions.** The frozen counter first read
as a product bug; `document.visibilityState` was "hidden" and a probe measured zero
rAF frames in 900 ms, so the freeze was environmental and the fix is hardening
rather than a bug fix. Separately, a screenshot mid-audit showed an apparently
broken layout; measuring section geometry directly (277/931/438/714/4316 px, no
runaway element) showed that to be compositing in a hidden tab. Both were checked
before anything was changed — the same discipline that caught a phantom
939-element overflow and a phantom WCAG focus failure earlier the same day.

**Still not covered by UX-01:** the pledge→execution→review journey end to end, SSE
reconnect, and the loading/empty/stale-run states. A11Y-01's contrast ratios, zoom
reflow, reduced-motion rendering and screen-reader journeys remain unmeasured.

### 2026-08-06 — UX-01 / A11Y-01 / I18N-01 browser half / PERF-01 (partial)

- Source commit: `0a8d6a7` plus the fixes this entry describes
- Environment: production build served by the app itself on a free port (the server
  serves `dist` when it exists), macOS, in-app Chromium. NOT the vite dev server:
  a stale process from 2026-08-04 was holding port 4177 and serving a two-day-old
  bundle, so the dev proxy would have measured the wrong code entirely. Found because
  `/api/bootstrap` was missing a field that exists in the source.
- Isolation state exercised BOTH ways by pointing `VAR_DIR` at a Docker-shareable
  path and then at one outside Docker's shared paths.

**UX-01 — partial pass, one defect found and fixed.** Zero horizontal overflow and
zero clipped controls at 390×844, 768×1024 and 1440×900, across marketplace,
mission detail, contributor profile and the unknown-route case, in both locales.
Zero truth-boundary copy defects: no claim of an authenticated maintainer, upstream
PR/push, or real registry release.

The defect: the isolation badge's tooltip published the **full failing `docker run`
command line**, absolute workspace path and username included, into the browser.
The verification record's own evidence rules forbid private project paths on an
exported surface, and a deployed instance would have been serving its container
layout to every visitor. `IsolationStatus` now separates a path-free `detail` from an
operator-only `diagnostic`, the API sends only the former through
`publicIsolationStatus()`, and a test asserts the SHAPE of the public object so a
newly added field cannot ride along.

Two measurement corrections worth recording, because both would have produced a
false finding:
- A first overflow check compared `scrollWidth` against `innerWidth` in a pane
  reporting `innerWidth: 0`, and "found" 939 overflowing elements. Meaningless.
  `clientWidth` at an explicit viewport shows zero overflow.
- A first focus-visibility check called `.focus()` programmatically and read
  `outline: none`, which looks like a WCAG 2.4.7 failure. `:focus-visible` only
  applies to keyboard focus; a real Tab press gives `solid 2px`.

**A11Y-01 — partial pass.** One `main`, one `h1`, no heading-level skips, no
unlabelled controls, a live region present, and the first Tab stop is a working skip
link with a visible focus ring. Six targets are under 24 CSS px tall (block links in
a list), and WCAG 2.5.8's **spacing** exception was measured rather than assumed:
zero of them have another target within a 24 px circle, so the criterion is met. Not
covered: contrast ratios, 200%/400% zoom reflow, reduced motion, high contrast, and
a screen-reader journey per locale.

**I18N-01 browser half — pass.** The static harness explicitly could not cover
this. Clicking the real switcher sets `document.documentElement.lang` to
`zh-Hant-TW`, persists `cc-locale=zh-TW`, and survives a real reload with the
locale intact. Zero raw dotted keys on screen in either locale, and the new
isolation badge renders its Chinese qualifier (`⛨ 每次執行都有作業系統邊界`).

**PERF-01 — partial, and it does not meet the plan's method.** Warm read API p50/p95
over 20 samples each: `/api/bootstrap` 1.2/3.2 ms, `/api/marketplace` 1.8/2.2 ms,
`/api/missions/:id` 1.0/1.2 ms — against a 250 ms p95 threshold. Bundle: 364 KB main
JS, 44 KB CSS, route-split chunks. NOT measured: 20 concurrent clients for 15
minutes, 50 simultaneous SSE streams, 30 cold plus 100 warm navigations, and
Lighthouse LCP/CLS/INP. PERF-01 stays `planned`; these are single-client local
numbers, not its declared load profile.

### 2026-08-06 — v0.3.9 candidate repository verification

- Source commit: [`237d833`](https://github.com/ianjuantw/commoncommit/commit/237d8339068b2f45d691d08eeaabc85d6f44f8b1)
- Environment: macOS local host, Node.js `v22.23.0`, clean disposable clone
- Execution mode: `demo` with `DEMO_SPEED=0`
- Executable target: bundled `fixtures/tempo` only

Commands:

```bash
npm ci --no-audit --no-fund
EXECUTION_MODE=demo DEMO_SPEED=0 npm run check
make check-version
```

Observed result:

| Stage | Result |
| --- | --- |
| Browser TypeScript | passed |
| Server TypeScript | passed |
| `fixtures/tempo` | 13 tests passed |
| Server suite | 122 tests passed |
| Vite frontend build | passed; 1,703 modules transformed |
| esbuild server bundle | passed |
| Version alignment | `v0.3.9` in nonprod and changelog |

A guided browser journey also covered 1,440 × 900 and 390 × 844 viewports,
English and Traditional Chinese switching, the localized not-found route,
GitHub-import failure recovery, the fixture campaign flow through local publish,
and pledge-dialog focus, Escape close, and focus return. Both viewports had no
horizontal overflow; every visible mobile header target measured at least 44 px.
No new console error appeared during this candidate session.

The command output and browser observations were recorded in the local Codex
task transcript; screenshots were not committed as a durable evidence bundle.
This is therefore a bounded candidate repository verification, not a formal
pass for every experiment in `VALIDATION-EXPERIMENTS.md`. In particular,
`SEC-00` passed locally on a measured boundary but is NOT met in the GKE deployment,
which has no Docker daemon, so untrusted real-agent execution remains a no-go there;
`DATA-02` remains blocked pending durable multi-process persistence tests.

Dependency review note: npm reported two high findings for React Router, while
the [upstream advisory](https://github.com/remix-run/react-router/security/advisories/GHSA-qwww-vcr4-c8h2)
identifies `7.18.2` as the patched 7.x release installed
by this candidate. The discrepancy is documented rather than converted into a
claim of a zero-finding audit.

### 2026-08-06 — pre-hardening repository check (superseded)

The original observation did not record an immutable commit, app version,
execution mode, environment profile, or retained evidence bundle. Its numbers
are preserved as history, but it does not satisfy the evidence rules above and
must not be used as the result for the v0.3.9 candidate.

Command:

```bash
npm ci
npm run check
```

Observed result:

| Stage | Result |
| --- | --- |
| Browser TypeScript | passed |
| Server TypeScript | passed |
| `fixtures/tempo` | 13 tests passed |
| Server suite | 86 tests passed |
| Vite frontend build | passed |
| esbuild server bundle | passed |

Total test observations: 99 passing, 0 failing. The suite does not include browser automation.

### Deterministic demo lifecycle

The engine test suite exercises the complete fixture lifecycle:

1. create and Git-baseline a fresh `tempo` workspace;
2. record a 13-test green baseline;
3. apply a scripted first patch and observe a real failure;
4. apply the correction and observe 20 passing tests;
5. compute the real diff and pass the deterministic gate;
6. create a local review artifact;
7. approve, update the local release state, refund unused credits, and award demo achievements.

Regression coverage also verifies reset during an active run, honest labels for seeded history, write containment, symlink handling, redaction, state transitions, reporter parsing, and the submission gate.

## Pre-evidence historical observations (not qualifying results)

The real-model and deployment notes below predate the evidence rules above.
They lack an immutable source commit, complete environment identity, exact
commands, and a retained evidence-bundle reference. They are preserved only as
design context and must not be treated as reproduced, current, or passing
experiments. Re-run the matching plan entries before making a capability claim.

### Real-model observations

The observations below were recorded on 2026-08-04 and 2026-08-05 against the bundled `fixtures/tempo` repository. They demonstrate that the path has worked with the named setup; they do not promise identical output from another model or date.

### Bounded LLM tool loop

Configuration: `llm` runner with the then-configured `gpt-5.5` endpoint.

Target issue: extend `parseDuration` to accept compound durations such as `1h 30m` while preserving existing behaviour.

Observed sequence:

| Observation | Source |
| --- | --- |
| Baseline 13/13 | engine |
| Listed the seven fixture files | LLM tool |
| Read the implementation, both existing test files, and README | LLM tool |
| Searched 28 matching call sites or symbols | LLM tool |
| Changed `src/index.mjs` and added a new test file | LLM tool |
| Self-ran the suite before submit | LLM tool using engine capability |
| Final 18/18 suite and two-file diff | engine |
| Review artifact prepared and held for a decision | engine |

The attempt completed in one runner attempt with ten tool calls. A separate feedback run added requested edge cases and finished with 20 passing tests.

The evidence supports a narrow claim: for this fixture and model configuration, the bounded loop inspected relevant files, added coverage, tested its own work, and passed the independent engine run. It does not establish general repository success or secure arbitrary-code execution.

### Advisory diff review

The real-model review was a separate call over the observed diff. It identified compatibility questions not covered by the tests, including whether reordered or repeated units should be accepted. The result was stored as advisory material and did not control the state machine.

An earlier experiment used a weaker campaign model for review and returned an uninformative approval. That result led to two durable rules: use the execution model for model-based review, and never present static checks as an LLM review.

### Abstention

A deliberately ambiguous public-API migration asked the runner to choose a unit and deprecation policy without repository evidence. The runner read and searched the fixture, wrote no files, and called `abstain`. The engine recorded a blocked run and moved the mission to `stalled` rather than reporting a failed implementation.

This demonstrates that abstention exists and has worked once; its rate and quality still require evaluation across a representative corpus.

### Deployment observations

A non-production deployment was previously exercised through ingress with:

- `/healthz`, `/readyz`, SPA assets, deep links, and SSE reachable;
- real LLM execution followed by a maintainer-feedback run;
- build identity, Prometheus scraping, and Langfuse ingestion observed;
- a non-root container and writable state volume verified.

Those observations are historical. They do not prove the current deployment version, mirror status, GitOps controller installation, or credential health. Follow `DEPLOYMENT.md` and inspect the live build-info metric for current truth.

## Findings that became permanent checks

| Finding | Permanent response |
| --- | --- |
| A green suite with no diff was accepted | Gate rejects `no_changes` |
| A runner weakened existing tests | Existing test writes are refused for `LlmRunner`; final test count may not shrink |
| Seeded events looked engine-verified | Seed history uses demo source labels and has a regression test |
| Reset raced an active run and crashed the service | The reset endpoint aborts and waits up to eight seconds before reseeding; timeout and the standalone seed command remain documented residual risks |
| Refund existed only in a ledger row | Release credits contributor wallets and has an accounting test |
| Unreadable reporter output looked like zero tests | Parser reports an explicit unreadable result |
| A symlink escaped string-prefix containment | Paths are checked after realpath resolution and symlink cases are tested |
| Missing measurements were shown as invented values | Analyzer fields are optional and feasibility exposes its measured signals |

`GOTCHAS.md` preserves the original stable G01–G51 incident catalogue plus subsequent appended incidents, including historical claims later narrowed by current-state corrections.

## Reproduce without external credentials

```bash
npm ci
EXECUTION_MODE=demo DEMO_SPEED=0 npm run check
EXECUTION_MODE=demo DEMO_SPEED=0 npm run dev
```

Then open the local UI, fund the executable `tempo-duration` mission, inspect the execution timeline, review the diff, approve the run, and inspect the contributor receipt.

## Reproduce a credential check

With a local ignored `.env` or environment variables configured:

```bash
make validate-llm
```

Expected evidence includes success, resolved model, latency, token usage, and a request identifier when the compatible gateway provides one. It must not include the API key.

---

## 2026-08-10 — LLM Phase 2 promotion baseline

- Release: `v0.5.0`
- Prompt catalogue: source-controlled version 1
- Datasets: `cc-issue-triage-v1`, `cc-criteria-v1`,
  `cc-explanation-v1`, `cc-shadow-review-v1`, `cc-bilingual-v1`
- Owner: `commoncommit-agent-quality`
- Dry-run command: `npm run eval:llm`
- Live command: `npm run eval:llm -- --sync --live` (explicit operator action;
  requires model and Langfuse credentials)

The accepted state is the source-controlled v1 fallback and a 100% application
fallback guarantee—not a claim that a candidate model has won. The repository
contains curated synthetic seed items only. No live input is automatically
copied into a dataset.

### Promotion decision

No candidate prompt/model is promoted by this report. Online promotion remains
blocked until each feature has at least 50 blinded human annotations, no P0
safety/grounding regression, declared confidence bounds, acceptable p95 latency
and token budget, and a stored Langfuse dataset-run ID. Record future decisions
below with commit, prompt version, model, run ID, score summary and owner.
