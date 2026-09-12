# Computer A / Phase 3 integration evidence

[繁體中文](PHASE3-INTEGRATION.zh-TW.md)

Date: 2026-09-12. Integration branch: `codex/dev-spec-integration`.
Source version: `0.7.12`. This is local source integration; no push, deployment,
upstream PR, merge, package publication or live-provider verification is claimed.

## Merge record

The integration starts at common main ancestor `d376137`, incorporates the shared
foundation through A, and follows the required A → B → C order.

| Slice | Source branch and tip | Merge commit | Integration responsibility |
| --- | --- | --- | --- |
| A | `dev/computer-a` / `24b211f` | `9325ee1` | Home, community, shell, global snapshots, central registries |
| B | `origin/dev/computer-b` / `e6057bd` | `9954d8a` | Lifecycle, funding, ledger, fixture engine, queue and recovery |
| C | `origin/dev/computer-c` / `ec95912` | `8b15b99` | Authoring capabilities, advisory assistance, evidence and local review |

B's targeted tests, typecheck and YAML lint passed before merging C. Slice
handoffs remain historical records; the wiring and results below supersede their
statements about missing integration.

## Runtime authority and repaired boundaries

- `server/services/slice-integration.ts` provides C's typed repository port to
  B's lifecycle. New authoring writes one mission; C never directly queries B's
  tables. A's Home tables are rebuildable projections of that mission and its
  pledges. Historical Home seeds retain demo provenance and no workspace.
- Opaque server analysis capabilities decide fixture eligibility. Only bundled
  `duration-demo` and `retry-queue` execute. Client edits and GitHub metadata do
  not grant execution authority. The engine copies fixed local inputs and owns
  test commands, protected-file checks, diff calculation and reviewability.
- A new duration mission reaches measured baseline 2/2 and final 5/5 tests with a
  persisted `parser.js` / `compound.test.mjs` diff. The retry-queue fixture reaches
  baseline 2/2 and final 3/3. Scripted reasoning remains `demo`; measured test and
  diff observations are `engine`. This does not establish arbitrary-code isolation.
- C reads B's current run evidence and deterministic gate. Approval and
  request-changes persist against that run; retry creates a new run, records the
  redacted review comment and refuses decisions on the old run. The separate
  `review-demo` seed remains an explicitly authored demo exception.
- Global SSE refreshes marketplace, profile and wallet snapshots. Queue workers
  publish persisted heartbeats; the web process bridges persisted worker state
  into SSE. Readiness reports actual inline/worker availability. Reset drains
  work, clears every slice and capability epoch, restores fixtures and resumes.
- The maintainer and provider guides follow visible product controls through
  terminal review. Provider review remains read-only. Route changes abort stale
  dispatch responses; initial bootstrap failure remains visible until retry.
  Project explanations render localized prose, source labels, impact and timeline
  instead of exposing the transport JSON as product content.

## Cross-slice outcome ledger

All browser mutations below use visible controls against built code in Docker.
HTTP reads supplement UI assertions with persisted evidence. Fault fixtures and
external model/GitHub transports are deterministic test inputs, not live claims.

| Scenario / specs | Owner | Runtime authority and wiring | Contract / outcome tests | Bound | Browser evidence | State |
| --- | --- | --- | --- | --- | --- | --- |
| `mission-creation-trusts-server-snapshots`; `api.mission-create`, `page.new-mission`, `page.marketplace` | A+C | Capability → C port → B mission → A read model | `server/phase3-integration.test.ts`: idempotent creation, client spoof refusal, finite market data, no duplicate C mission | HTTP terminal 5 s | `e2e/integration.e2e.spec.ts`: maintainer authoring and another tab's marketplace | browser-verified |
| `execute-success-produces-reviewable-evidence`; `api.mission-execute`, `page.mission-detail`, `page.execution-room` | A+B+C | UI pledge → ledger → fixture engine → persisted dossier → C review | Integration test measures 2 → 5 tests, bounded diff, engine provenance and `endedAt`; B engine/gate tests | UI terminal 20 s | Maintainer/provider funding → terminal engine evidence → review | browser-verified |
| `review-keeps-human-boundary`; `api.run-review`, `page.review` | B+C | Current run gate → atomic local decision → B status and A receipt | Integration test rejects old-run approval; review gate and advisory tests | Playwright 30 s | Request changes → new owned run → approve → reload | browser-verified |
| `page.contributor-profile`, `persistence.compute-ledger` | A+B | Persisted pledges and settlements → profile and wallet snapshots | Reopen SQLite retains approval, zero reservation and exactly two consumption rows for two runs | HTTP terminal 5 s | Maintainer profile shows the new pledge and local approval receipt | browser-verified |
| `api.demo-reset`, `page.guided-demo` | A+B+C | Shared reset harness → all slice graphs and capability epochs | Integration tests invalidate prior capabilities, remove new mission and restore B/C seeds | Playwright 30 s | Guide reset/start, cross-tab mission removal, provider exit and complete states | browser-verified |
| `execute-dispatch-union`; recovery and run-request policies | B+A | Dispatch → persistent queue → worker → fenced settlement | `server/mission-queue-outcome.test.ts` verifies separate processes; `server/rec01-recovery.test.ts`, `server/pd02-concurrency.test.ts`, engine tests | B recovery bounds; UI 20 s | `e2e/mission-execution.e2e.spec.ts`: in-process queue worker terminal, failure/retry, reconnect, stale SSE and navigation | browser-verified |
| `api.repository-analysis`; metadata execution boundary | C+B | Controlled public metadata input → capability → non-executable B mission | Forged fixture fields cannot change authority; execution refused and no run created | HTTP 5 s | `e2e/computer-c.e2e.spec.ts`: public metadata retry, scope advice, non-executable publication | browser-verified |

The source probe for public import remains
`https://github.com/PrimeIntellect-ai/prime-agent`; these new integration tests
use a controlled response for it. They do not clone or execute the repository.

## Page coverage and reproduction

| Pages | Docker test file | Covered outcomes |
| --- | --- | --- |
| Home, marketplace, contributor profile, guided demo, route fallbacks | `e2e/product.e2e.spec.ts`, `e2e/foundation.spec.ts` | Discovery, filters, map, wall/vote persistence, reset/retry, empty/error/loading states, reconnect, repeated navigation, mobile and locale |
| Mission detail, execution room | `e2e/mission-execution.e2e.spec.ts` | Funding, idempotent lost-response retry, inline/queue terminal evidence, refusal, failed run recovery, stale-frame and stale-navigation rejection |
| New mission, review, design concepts | `e2e/computer-c.e2e.spec.ts` | Authoring, advisory boundaries, capability reset, seeded review labels, persisted decisions, cross-tab SSE, error recovery, concept interactions without API writes |
| Integrated maintainer and provider flows | `e2e/integration.e2e.spec.ts` | Three complete journeys using fresh engine evidence, including request-changes/retry and reset |

```bash
UV_CACHE_DIR=/tmp/commoncommit-uv-cache bash scripts/phase4-gate.sh
# Functional browser suite only (foundation + all product journeys):
npm run test:e2e
# All approved A/B/C screenshot comparisons:
npm run test:visual
```

The Docker wrapper pins Playwright `1.56.1` / Chromium in Ubuntu Noble and uses
one worker, locale `en`, timezone `Asia/Taipei` and reduced motion. C fault
fixtures use port 4201, separate from B's 4191–4194. Reports are local generated
artifacts in `test-results/docker/interactive/` and `test-results/docker/visual-all/`.

## Verification and remaining boundaries

| Check | Result |
| --- | --- |
| YAML lint | PASS: 125 specs, zero contract errors or missing test files |
| Spec linter unit tests | PASS: 4 tests |
| `npm run check` | PASS: frontend/backend typechecks, 96 tests with zero TODO/skipped cases, production build, including i18n parity |
| Built-server C smoke | PASS: integrated authoring contract, authored-seed review persistence and reset |
| Offline authoring evaluation | PASS: five dry-run cases; no model promotion or live call |
| Docker functional E2E | PASS: 38/38 journeys, 58.5 s, zero skipped or flaky tests |
| Docker approved visual comparisons | FAIL: 40/40 compared and different (A 13, B 13, C 14), 106.6 s; all have actual/expected/diff PNGs; no setup failures |
| `bash scripts/phase4-gate.sh` | FAIL only at the visual gate; preceding functional checks passed |
| `make check-version`, `git diff --check` | PASS |

The approved PNGs inherited from all three slices already had reported
mismatches. They are preserved. Functional completion does not imply visual
approval or Phase 4 completion. The current review YAML puts measured evidence
and diff before AI advice, while an old review PNG orders them differently; the
C handoff records that conflict. Candidate screenshots require human review
before any approved reference can be changed.
See the [40-baseline review table](PHASE3-VISUAL-REVIEW.md) for spec/fixture IDs,
approved reference links and local comparison artifacts. A diff against the
common ancestor confirms no file under `e2e/golden/` was changed.

Optional assistance and trace export have controlled transport tests; live
provider/Langfuse verification is outside this run. No authenticated maintainer,
payment, upstream GitHub write or deployment is implemented by these journeys.
The unused Phase 1 `FoundationPage` remains unreachable from the integrated
router; it is not counted as a product page.
