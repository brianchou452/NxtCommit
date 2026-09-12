# Computer A / Phase 1 foundation

[繁體中文](PHASE1-FOUNDATION.zh-TW.md)

Base: `c21d4ed` from `origin/main`, pulled without discarding local work. This is
a reconstruction checkpoint, not a completed product or deployment. The imported
architecture, feature and operational documents also describe capabilities of the
earlier full application; the implementation inventory below is authoritative for
this checkpoint.

## Shared ownership and contracts

Both application tiers are TypeScript. `shared/types.ts` exports the browser-safe
contracts before either tier's implementation: localized text, errors, provenance,
bootstrap/capability and HTTP response types, `RunSummary`, `ExecutionEvidence`,
`RunArtifact`, `ReviewabilityResult`, `ReviewDecision` and `EventEnvelope`.

Terminal runs require `endedAt`; running runs must omit it. `stalled` belongs to
missions, not runs. Domain and expanded API statuses are checked for drift. Unknown
test measurements remain optional and non-engine events cannot be verified.

Computer B supplies `ExecutionEvidenceReader`. Computer C consumes that port rather
than querying B's SQLite tables. The port is synchronous for the current SQLite
adapter; changing it is a shared contract change. Event payloads remain bounded
JSON at the common layer; B owns the concrete event variants and runtime redaction.

Computer A owns package/lock files, TypeScript/Vite configs, shared exports,
`server/routes/index.ts`, `server/persistence/migrations.ts`, `src/router.tsx`,
global i18n dictionaries, central BDD entries and Playwright configuration.
B/C add their own modules and hand off registry changes to A.

## Runtime boundaries

| Boundary | Entrypoint | Status |
| --- | --- | --- |
| HTTP lifecycle and safe JSON errors | `server/app.ts`, `server/index.ts` | implemented |
| Bootstrap | `server/routes/home.ts` | real local persona snapshot; execution is refused |
| Process health and SQLite readiness | `server/routes/operations.ts` | foundation only; no queue or missions installed |
| SQLite migrations and nested transactions | `server/persistence/database.ts` | durable file or isolated in-memory database |
| Reset coordination | `server/persistence/reset.ts` | quiesce first, clear child-first, seed parent-first, atomic rollback |
| Demo seed | `server/persistence/seed.ts` | foundation persona only, not the Home fixture graph |
| Shell | `src/components/ApplicationShell.tsx` | locale, navigation, refusal, retry, wallet, persona and reset |
| Routes | `src/router.tsx` | all declared paths have explicit Phase 1 placeholders |
| Evidence services | `server/services/context.ts` | extension port only; no runner or evidence fabrication |

Only `/api/bootstrap`, `/api/demo/reset`, `/healthz` and `/readyz` are registered.
Other API routes return 404. There is no runner, model call, queue worker, external
repository execution, SSE publisher or product-level mission lifecycle. No mode,
including demo, resolves to executable until B installs a runner. No model secret
is consumed by this foundation.

Reset participants must stop and drain work before deletion. Register parents
before dependants. All clear/seed callbacks are synchronous and run inside one
SQLite transaction; async callbacks are not supported. Phase 2 must integrate its
full fixture graph and prevent new mutations/workers during reset.

## Local workflow

Use Node 24.x, npm, uv and Docker. Python is only for YAML tooling; neither
application tier is Python.

```bash
npm ci
uv sync --locked
npm run dev
```

Optional `.env` loading preserves existing environment values. Supported foundation
settings are `HOST`, `PORT`, `VAR_DIR`, `EXECUTION_MODE` and inline
`RUN_DISPATCH_MODE`; queue mode fails startup instead of reporting false readiness.
Production-style local startup is `npm run build && npm start`.

```bash
npm run check
npm run lint:spec
npm run test:spec-tools
make check-version
npm run test:e2e
npm run test:visual
git diff --check
```

Docker is mandatory for Playwright. The wrapper uses an isolated state directory,
server-owned error/reset fixtures and a pinned Playwright image. Output is in
`test-results/docker/`. The visual command compares only the Phase 1 shell;
later phases must extend coverage to their product pages.

The Makefile, nonprod image tag and bilingual changelog use source version
`0.7.10`. Private npm/Python metadata is independently `0.1.0`. The nonprod
kustomization contains no resources: it is a version registry, not a deployable
workload. No image is pushed or deployment performed.

## Evidence and handoff

| Spec / responsibility | Test / observable result |
| --- | --- |
| `api.bootstrap` / `bootstrap-reports-server-resolved-execution-state` | `server/api-bootstrap.bdd.test.ts`: local persona, null resolved mode, explicit refusal and no credential fields for every configured mode |
| `domain.mission-lifecycle`, `domain.execution-evidence`, `domain.provenance` / shared boundaries | `server/foundation.test.ts`: terminal timestamps, budgets and engine-only verification |
| Persistence foundation | `server/foundation.test.ts`: reopen durable state, atomic failed migration, nested rollback, FK-safe reset ordering, coalescing and retry |
| `policy.localization`, `policy.home-localization` | `server/i18n01-parity.test.ts`: key parity and locale fallback; Docker: real selection and reload persistence |
| `component.application-shell` / `shell-preserves-local-demo-and-locale-boundaries` | `e2e/foundation.spec.ts`: profile navigation, refusal, skip link, error/retry and UI reset to persisted state |
| `design-system.nxtcommit` | foundation tokens and global accessibility styles; shell visual comparison separately reported |

Four BDD entrypoints exist. Product cases are split into community (A), mission
(B), authoring/review/operations (C) modules. Pending scenarios remain explicit
TODO/skip entries, never passing implementations. Schema lint validates references
and file existence; it does not certify those scenarios as complete.

The approved `application-shell-desktop` image was inspected before shell visual
implementation. It is a dense, single-row 1440×103 header: left identity, middle
navigation with active Demo, right mode/locale/wallet/persona controls. It has the
older unbacked chain logo, resolved demo mode and a 100,000-credit persona. Current
YAML requires the canonical dark-backed SVG. The user explicitly authorized
following YAML while preserving the old golden. The foundation has an unavailable
runner and a 10,000-credit local persona; these are additional fixture differences.
The truth strip sits directly below the header, outside the header-only capture.
The original PNG is not updated, and visual equality is not claimed.

Validation at handoff: 125 YAML specs passed lint, 14 server/shared/i18n tests
passed, 4 linter regression tests passed, and 4 Docker foundation journeys passed.
There are 77 server TODO scenarios plus 2 skipped product browser scenarios for
later phases. Frontend/backend typechecks, production builds and version checks
passed. The shell comparison failed with 13,673 differing pixels (reported ratio
0.10); the golden remains unchanged. Reports are separated under
`test-results/docker/foundation/` and `test-results/docker/visual/`.

Remaining Phase 2 work: Home/community graph, mission/funding/execution,
authoring/model assistance, review/operations, SSE, complete product journeys and
their visual baselines. The imported root maintainer `SKILL.md` remains absent;
AGENTS.md and `skills/yaml-spec-to-code/SKILL.md` were followed, with the imported
maintainer translation and canonical topic documents consulted as context.

Remote integration: merged `origin/main` through `c945dce`, preserving the Cloudflare infrastructure workflows. The merged delivery guard intentionally rejects product source until a compatible runtime is integrated; pushing this foundation does not deploy it. Both validators and the three Worker tests passed alongside the foundation checks.
