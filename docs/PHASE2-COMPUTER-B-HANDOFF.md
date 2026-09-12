# Computer B / Phase 2 handoff

[繁體中文](PHASE2-COMPUTER-B-HANDOFF.zh-TW.md)

Status: Computer B / Phase 2 **functionally verified** by an independent verifier.
Historical visual baseline equality is not approved or claimed.

Branch: `dev/computer-b`. Base: `32f8b28` from `origin/main`.
Scope: mission lifecycle, compute accounting, funding, execution, requests,
recovery, mission detail and execution room. This does not certify A/C slices
or a product deployment.

The user authorized minimal central wiring for B on 2026-09-12: application
initialization/reset/shutdown, the two React routes, locale fragments and browser
test discovery. These changes must be retained when A integrates the slice.

## Visual oracle inspection before implementation

All 13 approved PNGs were opened before visual implementation:

| Baselines | Observed composition and anchors |
| --- | --- |
| `mission-detail-funding`, `mission-detail-funded-fixture`, `mission-detail-metadata-refusal`, `mission-detail-needs-review` | Long editorial campaign, large title, dark project illustration, purple funding rail, narrative left and action card right; story, criteria, compute and community sections below. State changes alter actions and funding facts. |
| `mission-detail-error-recovery` | Sparse shell, wide dashed recovery panel, centered not-found message, no stale campaign. |
| `execution-room-idle`, `execution-room-queued` | Mission back-link and status heading followed by wide empty-state panel; queue ownership is separate from runner activity. |
| `execution-room-terminal`, `execution-room-running-demo` | Phase rail above dense two-column layout: chronological source-labelled timeline left, budget/tests/files/guardrails cards right; terminal has review action, running has activity label. |
| `mission-overview-funding` | Very large title, project stage illustration, funding amount and progress dominate a rounded gradient surface. |
| `pledge-dialog-ready`, `pledge-dialog-error` | Approximately 448px modal; heading, explanation, wallet, remaining amount, numeric field, Max and footer actions. Error adds inline red text without losing the amount. |
| `execution-activity-terminal` | Bordered rounded timeline with left event rail, timestamps, source badges, bounded test output and file chips. |

The historical images contain older seed amounts and copy and differ from the
current foundation shell. On 2026-09-12 the user explicitly authorized current
YAML and actual fixtures to govern implementation, preserving existing golden
files and reporting differences. No new baseline approval is implied.

## Verification

- Initial spec lint: 125 specs, zero contract errors, zero missing test files.
- Spec tooling regression tests: four passed.
- Independent `npm run check`: passed (52 passing Node checks, 47 A/C TODOs,
  zero failures), including both TypeScript targets and production build.
- Independent backend suite: 24/24 passed; three stale-owner counterexamples
  also passed after atomic ownership-fenced settlement.
- Independent Docker foundation + mission: 13/13 passed (4 foundation + 9 B).
- Additional final B Docker run: 10/10 passed, including delayed old-run and
  cross-mission SSE transport frames after a real UI retry.
- Worker entrypoint extension: queue suite 12/12 passed, including actual web
  and worker processes sharing only `VAR_DIR` and forced real-mode refusal.
- `make check-version`: `0.7.11` consistent. `git diff --check`: passed.
- Visual: all 13 historical baselines are retained; comparisons differ. The
  user authorized YAML/fixture priority, not replacement of approved PNGs.
- Deployment: local source only; no deployment or online verification.

## Runtime and reproduction

`server/app.ts` installs B's migration/seed/service and includes its reset
participant. `server/services/mission-services.ts` owns mutation and settlement;
`server/services/mission-engine.ts` owns the copied fixture, actual Node tests,
Git diff and deterministic reviewability gate. The synchronous
`context.evidence` reader is the B-to-C integration port.

The default local workflow uses Node 24:

```sh
npm run check
npm run test:e2e -- --project=mission
npm run test:e2e -- --project=mission-visual
npm run dev
```

Start at `/missions/mission-fixture`; pledge 100 local demo credits through the
dialog to start execution and reach a persisted reviewable result. The fixture
baseline has two actual tests; the final suite has three and a two-file diff.
`mission-ready` starts funded, `mission-metadata` proves execution refusal, and
`mission-terminal` is explicitly authored historical evidence, not a fresh run.

For separate-process queue execution after `npm run build`, use the same
`VAR_DIR` for these two processes:

```sh
RUN_DISPATCH_MODE=queue EXECUTION_MODE=demo VAR_DIR=var npm start
EXECUTION_MODE=demo VAR_DIR=var node dist-server/server/mission-worker.js
```

The worker can use an explicit `DATABASE_PATH` override; without one it uses the
same `VAR_DIR/nxtcommit.sqlite` path as the web server. Queue acceptance does not
mean a worker owns a run. Forced `llm`/`codex` modes remain refused.

## Acceptance boundary

The [coverage ledger](PHASE2-COMPUTER-B-COVERAGE.md) maps 34 specs, 30 scenarios,
runtime/tests and 13 visual baselines. B has no required unconnected central
entrypoint. A/C still own explanation, wall, review and other product slices:
B renders local failure fallbacks and a review navigation link, and does not
claim the destination's review decision workflow is implemented.

LLM/Codex tool loops, payment, authentication, upstream publication and per-run
OS isolation are not implemented by B. Credits are local prototype units. Test
suite evidence does not establish every acceptance criterion individually;
unknown criterion measurements remain unknown. Disposable execution workspaces
are currently retained for diagnostics; storage quotas/reaping are not supplied.

Fine-grained test limit: same-SPA delayed mutation covers leaving and returning to the same mission; delayed REST reads across different mission IDs are not separately tested. New browser fault injection verifies delayed cross-mission/prior-run SSE, which is distinct from that REST limitation. Functionally verified does not mean historical visuals are approved.
