# Computer A / Phase 2: Home and community

[繁體中文](PHASE2-COMPUTER-A.zh-TW.md)

Branch: `dev/computer-a`. Scope follows
`skills/yaml-spec-to-code/references/three-computer-phases.md`.
This is a local implementation, not a deployment or complete Phase 2 verification.
The Phase 1 document is a historical checkpoint, not the current feature inventory.

## Runtime and provenance

- `server/persistence/home.ts` owns the migration, deterministic 16-campaign / 20-city
  seed and transactional projections. Projects, missions, contributors, pledges,
  achievements, comments and category votes are persisted in `home_*` tables.
- `server/routes/home.ts` exposes bootstrap, impact, marketplace, stream and reset.
  `server/routes/community.ts` exposes contributor profiles, MVP list/vote and walls.
- `server/services/global-stream.ts` broadcasts invalidations. The browser shares one
  EventSource, ignores heartbeat, refetches REST on mission updates/open, and reconnects
  after 1.5 seconds. Requests are cancelled on unmount and stale responses ignored.
- `server/app.ts` registers the Home reset participant; child data is cleared before
  personas, parents are reseeded first, and non-reset writes receive 503 during drain.
  Failed reset rolls back. An invalidation is published only after successful reset.
- Comment text is limited to 280 Unicode code points, escaped by React, and redacted
  **before storage**. Author, role and time come from the server. Pattern redaction
  covers common plaintext key/token/password forms, not arbitrary encodings or every
  possible secret. SQLite enforces one current-persona vote per category.
- Amounts derive from local pledges and mission projections. Seed history, locations,
  campaign prose, progress and achievements remain demo. Unknown provider consumption,
  refunds and external adoption are absent. No fixture engine run or upstream effect
  is fabricated. The bootstrap's refused execution capability remains unchanged.

## Spec and outcome ledger

| Specs | Runtime authority | Executable evidence |
| --- | --- | --- |
| `domain.home-impact`, `domain.marketplace`, `domain.provenance`; `persistence.home-demo-seed`, `home-read-model`, `community-store` | `shared/home*.ts`, `server/persistence/home.ts` | `server/spec-tests/home-behavior.ts`: aggregates change with storage, dedup/order/funding gates, 14-day trend, 20 bounded positive beacons, transactional reset; `community-behavior.ts`: durable reopen, receipts and votes |
| `api.bootstrap`, `impact`, `marketplace`, `global-stream`, `demo-reset` | Home routes, application reset and GlobalStream | HTTP tests; browser cross-tab reset causes live REST refresh; forced stream disconnect recovers without replay assumptions; heartbeat does not refetch |
| `api.contributor-profile`, `mvp-list`, `mvp-vote`, `wall-list`, `wall-post` | Community routes and HomeStore | HTTP identity spoof refusal, Unicode limit, pre-storage redaction, concurrent category vote lock, SQLite reopen; browser posting/voting/reload/reset |
| `component.application-shell`, `hero`, `commitment-flow`, `donor-world-map`, `campaign-browser`, `campaign-card`, `release-update`; `page.home`, `marketplace` | `HomeComponents.tsx`, `HomePages.tsx`, snapshot hook | Home anchors, one h1, map selection, repeated campaign navigation, category overflow, unknown/loading/error/empty/retry, release links, mobile controls |
| `component.contributor-impact`, `comment-wall`; `page.contributor-profile` | Profile and Community components | Persisted receipts and pledge links, empty/missing/retry profiles, retained draft after failure, refreshed redacted thread |
| `component.guided-demo-controller`; `page.guided-demo` | Launcher owns reset; real product page owns subsequent action | Reset failure stays on Demo; successful provider launch highlights a real campaign link; exit removes guide without undo claims. Maintainer target is **not implemented by C yet** |
| `component.route-recovery`; `page.route-fallbacks` | Error boundary / recovery page | Unknown route returns Home; malformed server fixture induces real React render failure, generic reload restores profile without exception text |
| `policy.home-localization`, `home-presentation`, `home-provenance`, `home-refresh`, `localization` | Dictionaries, shared snapshots, UI and routes | Dictionary parity, language reload/navigation, demo labels, unknown values, semantic order, heartbeat and reconnect browser tests |

The original BDD entrypoints retain exact scenario trace comments and refer to
actual server modules or `e2e/product.e2e.spec.ts`. UI scenarios are not counted as
server passes. Other owners' TODO tests remain explicit.

## Visual review and logo sequence

All 13 relevant approved page/component references were opened before visual
implementation. Home uses the editorial hero, process panel, dominant map, three
category groups and closing release card. Marketplace retains lifecycle shelves;
profile retains identity/accounting/achievements/receipts; demo uses perspective
launch cards; recovery provides a centered action. Cards retain identity, status,
benefit, funding and backer order. Canonical map geometry and token-stream PNG are
imported verbatim, with map labels placed without collisions.

The old references contain a resolved runner, different persona/amounts and older
product UI. The user authorized current YAML implementation. After the first
**13/13 Docker product journeys passed**, the user-requested SVG background rectangle
was removed. Its gradient path and node artwork were retained. The pre-change test
report is `test-results/docker/product-before-svg/results.json`.

`e2e/visual.spec.ts` compares all five A pages and eight component baselines. Twelve
comparisons differ from the preserved approved PNGs; the maintainer guide baseline
cannot meet its real-analysis-target precondition. Current captures, expected images,
diffs and traces are under `test-results/docker/visual/`. No approved golden was
updated. Visual mismatch is not reported as verification success.

## Reproduction

```bash
UV_CACHE_DIR=/tmp/commoncommit-uv-cache uv run python scripts/lint_specs.py
npm run check
npm run test:spec-tools
make check-version
npm run test:e2e
npm run test:visual
git diff --check
```

The default Docker E2E command runs both foundation and product interactive suites.
Each product journey creates an isolated server-owned SQLite fixture through the
**test-only** server on port 4179. Only test fixtures inject failures, empty states or
stream disconnects. Production routes expose no fixture-control endpoints. Browser
tests mutate product state by visible controls; evidence endpoints only read state.

## Verification results (2026-09-12)

| Gate | Result |
| --- | --- |
| YAML lint | 125 specs, 0 contract errors, 0 missing test files |
| `npm run check` | Frontend/backend typechecks and builds pass; 22 server tests pass, 53 B/C TODO scenarios remain explicit |
| Spec tooling | 4 regression tests pass |
| `npm run test:e2e` | 17/17 Docker interactive tests pass after the SVG change (4 foundation + 13 product) |
| Version / whitespace | `0.7.11` consistent; `git diff --check` passes |
| Approved visual gate | Not passed: 12 mismatches and 1 missing maintainer target |

Interactive report: `test-results/docker/interactive/results.json`.
Visual report: `test-results/docker/visual/results.json`.

## Central integration and remaining gates

- B owns mission detail, funding, execution, queue and terminal engine evidence.
  `MissionCommunityPage` is an explicit community-only host at the mission route;
  replace it with B's page and mount `CommentWall` there during Phase 3.
- C owns `/new` and the real analysis control. Register a visible
  `data-guide-target="analyze"` on that actual control. Subsequent pages must publish
  real successful workflow progress before exposing their next guide target. The
  guide currently shows a recoverable missing-target state after campaign selection
  and on the maintainer route; it does not complete either end-to-end mission workflow.
- B/C migrations must be registered centrally after IDs 1 and 2. Their reset
  participants must be added parent-first with corresponding quiesce/drain behavior.
- Home uses its A-owned seeded read model. Phase 3 must connect B's authoritative
  mission/pledge/accounting projections to Home/profile instead of treating this
  parallel seed graph as fresh execution evidence. Publishing an event alone does
  not synchronize the stored projections.
- Full Phase 2 verified remains **incomplete** until these owned guide outcomes and
  approved visual comparisons are resolved. No push, merge or deployment occurred.
