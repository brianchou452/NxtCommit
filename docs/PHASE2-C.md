# Computer C / Phase 2 handoff

[繁體中文](PHASE2-C.zh-TW.md)

Branch: `dev/computer-c`. Base: `32f8b28`. Source version: `0.7.11`.
Status: **source integrated; 12 Docker journeys and non-browser checks passed; NOT Phase 2 verified**.

The user authorized C's necessary central wiring and chose current YAML ordering
over the conflicting old review PNG, preserving approved goldens for later human
review. No approved image was changed. Docker Desktop required administrator-enforced organization sign-in. At the user’s request, an independent Colima Docker engine was installed and started without changing Desktop management settings. All browser tests ran inside Docker on Colima (ARM64, Docker 29.5.2); no host Playwright substitute was used.

## Runtime and ownership

- `server/authoring/services.ts` assembles capabilities, local persistence,
  optional assistance/observation transports and the evidence reader. Reset
  epochs reject late authoring work, clear capabilities and restore the seed.
- `server/routes/authoring.ts` registers analysis, assistance, generation,
  critique, creation, feedback, validation and project explanation. Capabilities
  expire within 30 minutes and bind immutable server snapshots; creation retries
  return the original persisted mission. Imported GitHub repositories stay
  metadata-only. Five issue/PR records are read, then PRs are excluded.
- `server/persistence/authoring-review.ts` owns C's local authored mission and
  review records and a separately marked demo evidence reader. Migration 30 is
  installed during C service assembly. C never queries B-owned SQLite tables.
- `server/domain/reviewability.ts` is a deterministic gate over measured test,
  diff and integrity facts. `AuthoringOptions.evidence` and `integrityForRun`
  accept B's trusted adapters. Missing/failed evidence fails closed. The default
  `review-demo` fixture is an authored-seed exception for local decisions, never
  a fresh engine success. Request-changes comments are bounded and redacted.
- `server/routes/review.ts` supplies C mission/read-evidence fallbacks, bounded
  SSE, optional explanation/shadow advice and atomic local review decisions.
  B's route module remains earlier in the central registry.
- `server/routes/operations.ts` provides liveness, database/worker readiness and
  bounded metrics. `AppOptions.operations` accepts B's heartbeat/count probes.
  Startup still refuses queue dispatch when no actual worker is installed.
- `src/pages/NewMission.tsx`, `Review.tsx`, `DesignConcepts.tsx` and their C
  components are wired. `AuthoredMission.tsx` is the C publication receipt on
  the mission route; it does not implement B's funding/execution lifecycle.
  Concepts use a standalone shell and no product API. Locale fragments are
  imported into both central dictionaries.

The bundled `server/authoring/fixture` input is newly authored and measured from
files; it is not reconstructed from old screenshot numbers. The default review
fixture has zero experiments and gates and unknown measurements. Its authored
diff and criterion text cannot be used as evidence that an engine ran.

## Traceability

| Specs | Runtime authority | Executable evidence |
| --- | --- | --- |
| `domain.model-assistance`, `policy.model-assistance` | `authoring/assistance.ts`, `campaign.ts` | Controlled model transport, invalid-output fallback, redacted inputs and unchanged deterministic estimate tests |
| `domain.execution-evidence`, `domain.review-decision`, `policy.reviewability-gate`, `policy.evidence-provenance` | `domain/reviewability.ts`, `authoring/services.ts`, review repository | `reviewability.test.ts`, live-reader contract test, seed labels and local decision persistence |
| `persistence.capability-store` | `persistence/authoring-capabilities.ts` | Expiry, eviction, reset, copy isolation, failed-writer retry and idempotency tests |
| `persistence.llm-observability`, `policy.observability` | `authoring/observations.ts`, `assistance.ts`, `evaluations.ts` | Bounded trace/score capture, feature-bound feedback, export failure and offline evaluation tests |
| `api.repository-analysis`, `api.issue-assistant` | Authoring routes | `analysis-preserves-observation-boundary`, `assistant-stays-issue-bound` |
| `api.campaign-generation`, `api.campaign-critique`, `api.mission-create` | Authoring routes and capability repository | `campaign-mode-is-explicitly-labelled`, `critic-is-advisory`, `mission-creation-trusts-server-snapshots` |
| `api.ai-feedback`, `api.llm-validation`, `api.project-explanation` | Assistance and authoring routes | `feedback-is-bounded`, `validation-is-nonsecret-and-nonauthorizing`, `project-explanation-route` |
| `api.run-review`, `api.shadow-review`, `api.run-evidence-explanation` | Review routes | `review-keeps-human-boundary`, `shadow-review-has-no-authority`, `explanation-never-rewrites-evidence` |
| `api.health`, `api.readiness`, `api.metrics`, `policy.delivery-evidence` | Operations routes and version registry | Three operations scenarios, queue-heartbeat contract, version check |
| `component.repository-analyzer`, `component.campaign-authoring`, `page.new-mission` | New Mission and CampaignAuthoring | Four Docker journeys defined: visibility, publication, public-metadata retry/advice, cross-tab capability reset; **passed in Docker** |
| `component.verification-dossier`, `component.diff-viewer`, `component.review-controls`, `page.review` | Review and evidence/control components | SSR assertions passed; three Docker journeys defined for approval/evidence ordering, request-changes/SSE and recovery; **passed in Docker** |
| `component.design-concept-shell`, `page.design-concepts` | Standalone DesignConcepts | Docker navigation/language/mock-backing/no-API journey defined; **passed in Docker** |

API scenario implementations are in `server/spec-tests/{authoring,review,operations}.scenarios.ts`
and `server/test-support/authoring.ts`. C page/component annotations point to
`e2e/computer-c.e2e.spec.ts`; comments or SSR checks do not establish browser completion.

## Visual references inspected

All entries below remain `approved` in source; comparison and candidate capture
ran through `e2e/computer-c.visual.spec.ts`: all 14 candidates were captured, and all 14 comparisons failed against the preserved approved images. These are visual mismatches, not browser startup failures. See [candidate gallery](PHASE2-C-VISUAL-REVIEW.md).

| Baseline ID | Observed reference composition and anchors |
| --- | --- |
| `new-mission-source-step` | Narrow centered wizard, four-step row, paired source cards and right-aligned primary action beneath shared shell |
| `new-mission-draft-step` | Long narrow white draft card, critic panel above, dense story/criteria/estimate groups and bottom publication row |
| `repository-analyzer-results` | Wide observed-repository panel above one dense issue card; coverage numbers and next action lead |
| `campaign-authoring-draft` | Separate critic panel and story card, provenance badge, paired story columns and dense compute breakdown |
| `review-dossier-ready` | Main evidence stack with right decision sidebar; old AI panel precedes diff, conflicting with current YAML |
| `verification-dossier-ready` | Compact tinted summary, demo badge and six count tiles; authored empty experiments are distinct from fresh observations |
| `diff-viewer-ready` | Wide neutral disclosures, first file open, added/removed line backgrounds and second collapsed file |
| `review-controls-maintainer` | Narrow decision card, amber local-boundary text, feedback field and stacked actions |
| `review-controls-provider-read-only` | Compact read-only boundary panel without decision controls |
| `design-concept-editorial` | Standalone dark concept bar, large paired hero, lime poster with hard shadow, three cards and closing flow |
| `design-concept-kickstarter` | Serif hero, warm canvas, mint feature card and three rounded campaign cards |
| `design-concept-network` | Large sans hero beside dark dotted network panel, mint metric strip, cards and flow |
| `design-concept-hybrid` | Bold hero, dark dotted network panel, pill controls, campaign row and disclosure footer |
| `design-concept-hybrid-campaign` | Very long authored campaign canvas, main narrative and backing sidebar, evidence/milestone/community sections; reference uses Chinese content despite EN capture metadata |

The current implementation follows the available YAML semantic contracts; exact
old authored layout/content equality is not claimed. Source fixture data and shell
identity also differ from imported PNGs. The user must review candidate captures
before any approved image changes. Do not run a snapshot-update command to hide
these differences.

## Verification and remaining work

| Command | Result |
| --- | --- |
| `uv run python scripts/lint_specs.py` | PASS: 125 specs, 0 contract errors, 0 missing test files |
| `uv run python -m unittest discover -s scripts -p '*_test.py'` | PASS: 4 linter tests |
| `npm run check` | PASS: frontend/backend typechecks, 46 tests, production build; 54 unrelated A/B TODOs remain |
| `node scripts/verify-computer-c-runtime.mjs` | PASS: built server analysis → draft → persisted mission; local seeded review → persisted request_changes; reset restores seed |
| `node --import tsx scripts/evaluate-authoring.ts` | PASS: five offline cases, no promotion or live call |
| `npm run check-version` | PASS: source `0.7.11`, private tooling metadata `0.1.0` |
| `git diff --check` | PASS |
| Public `PrimeIntellect-ai/prime-agent` analysis | PASS: metadata and immutable commit observed; 0 non-PR issues in the bounded window; no clone/tests/execution |
| `bash scripts/playwright-docker.sh --project=computer-c` | PASS: 8 C journeys on Colima Docker |
| `bash scripts/playwright-docker.sh --project=computer-c-visual` | FAIL: 14 visual mismatches; 14 candidate PNGs captured; approval pending |

Foundation regression also passed all 4 journeys; combined command: `DOCKER_CONTEXT=colima BUILDX_CONFIG=/tmp/nxtcommit-colima-buildx bash scripts/playwright-docker.sh --project=foundation --project=computer-c` (12 passed). Browser findings fixed: focusable main landmarks on C routes and ambiguous status assertions during concurrent loading/reset and mock backing.

Local logs: `test-results/computer-c-nonbrowser/`. Source tests use controlled
model/trace transports; there is no claim of live external model or Langfuse
verification. Optional server configuration is documented in `.env.example`.
The evaluation command defaults to offline even when credentials exist;
`--live` requires explicit intent and configured model credentials.

To complete C verification, obtain human review of the 14 candidate images, address requested visual changes, then update only explicitly approved baselines and rerun visual comparison. Runtime commands: `colima start`, `docker context use colima`; stop with `colima stop`.

For A/B integration, use a single mission authority: adapt B's lifecycle to C's
repository port or supply the shared repository during integration, rather than
creating a second copy of a created mission. B must provide its actual evidence
reader, measured integrity facts and worker probes. C's synthetic adapter tests
are not a substitute for B's fresh engine-run → review outcome.

```yaml
slice: authoring-ai-review-operations
base_commit: 32f8b28
owner: C
state: functional-e2e-passed-visual-review-pending
central_integration_required:
  - B mission lifecycle/evidence/integrity/worker adapters for fresh execution outcomes
known_incomplete_behavior:
  - 14 approved visual comparisons fail; candidate review is outstanding
  - The current checkout has no B runner or funding lifecycle
  - Live provider and external observability validation have not been performed
```
