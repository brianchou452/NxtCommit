# commoncommit presentation parity

[繁體中文](COMMONCOMMIT-PARITY.zh-TW.md)

The user explicitly selected commoncommit as the presentation authority. The integrated application now renders its source presentation from `src/commoncommit`, using NxtCommit's existing API, SQLite data, accounting, runner and deployment. This is part of NxtCommit, not a separately deployed copy.

## Comparison scope

Source: commoncommit `a52346519fa7258a56ec39f70212b243d599e833`. Target baseline: NxtCommit `0d4d8a81f34ed8bebca47892655a91662919b900` (0.7.33). The mechanical inventory is `commoncommit-parity-inventory.json`: 10 source page modules, 19 component modules and 35 named CSS keyframes. The keyframe count measures imported definitions, not 35 independently missing product features. Concurrent, uncommitted source changes are outside this reproducible baseline.

| Difference group | Baseline gap | Integrated result |
| --- | --- | --- |
| Shell and navigation | Different typography, header and mobile treatment | Source shell, bundled DM Sans, bilingual navigation and responsive layout |
| Landing story | Simplified hero and mechanism | Original hero, mechanism and editorial composition |
| Community overview | Different pool and map presentation | Original donor map, pool counters and provenance labels |
| Repository catalog | Data imported, cards simplified | Source project artwork, category shelves and full marketplace list over all 25 imported repositories |
| Campaign narrative | Generic campaign detail | Repository-specific story, before/after, scope, evidence, milestones and delivery panels |
| Pledging | Simplified funding controls | Source dialog, preview, celebration and token effects over the same idempotent ledger |
| Project explanation | Different explanation and timeline UI | Source plain-language, impact and keyboard-operated Time Machine components |
| My Commitment | Earlier isolated layout port | Original profile, badges, achievements, receipt chain and pledge history in the shared shell |
| Demo model | Different role presentation | Shared nine-stage state, maintainer/provider roles and original animation |
| Guided journey | Simplified controller | Visible-anchor guidance across authoring, funding, execution and review |
| Execution and recovery | Different presentation and demo fixture | Original tempo fixture with actual baseline, failed first attempt, repaired second attempt, evidence and source execution room |
| Review and release | Approval ended without source release journey | Source review UI and persisted idempotent local release, reflected in contributor receipts |

Agent Lab and GitHub workspace routes remain available through the integrated navigation. Existing NxtCommit source components and earlier visual goldens remain in the repository for historical reference; they are not the selected presentation for the migrated routes.

## Data and execution boundaries

The adapter translates API shapes without creating another backend or ledger. Imported catalog history remains labelled, read-only source demo content, and cannot authorize execution. Imported repositories still have no executable workspace. Only explicitly bound, bundled fixtures run. The new tempo fixture preserves its source tests and implements the original two-attempt scripted scenario: 13 baseline tests; 18 passing / 2 failing in attempt one; 20 passing / 0 failing after repair. A requested-changes rerun adds source feedback regression tests.

Planning and animation remain demonstrative; test results come from actual subprocesses. Unknown measurements render as a dash, never fabricated numbers. Approval records a local review; the local-release endpoint requires an approved successful demo fixture and engine artifact, records `upstreamPublished: false`, and is idempotent. It does not publish a GitHub release or package.

Protected shared demos never reset existing data on launch. A provider journey prepares a new bound tempo campaign using the existing authoring API. Pledge retry retains its intent key, and named stream events refresh the shared profile and wallet.

## Design and validation evidence

Source page/component/visual contracts are preserved under `docs/reference/commoncommit`; they are reference documents, not newly registered contracts or claims that their source test paths run here. The integrated contract is `spec/components/commoncommit-presentation.yaml`. Original source goldens were reviewed without overwriting approved images. Expected differences include NxtCommit branding, Agent Lab/GitHub navigation, the existing 10,000-credit demo wallet, authoritative current catalog/accounting and explicit historical evidence boundaries.

The frontend uses the source TypeScript index/optional-property settings under strict mode; `tsconfig.check.json` retains the target's stricter settings for server, shared contracts and tests. Existing server regression coverage remains active. Source presentation journeys replace old UI-specific acceptance selectors; the old browser suites remain under explicit legacy projects. Active acceptance also includes the existing GitHub workspace and Agent Lab journeys. Browser screenshots are review evidence, not a claim of byte-identical pixels or an automatically approved golden update.

Rollback uses the release commit's inverse. Migration is additive; a private pre-deployment database backup is retained separately and is never automatically restored over newer user activity.

### Verification recorded on 2026-09-12

- 133 contracts: zero schema errors or missing test files.
- Production build, strict TypeScript checks and all 173 server tests passed, including tempo feedback rerun with 23 passing tests, release receipt and replay.
- All 32 active browser journeys passed. After the final execution-count/duration display repair, the full maintainer recovery journey and TypeScript checks passed again.
- Desktop screenshots cover the landing, catalog detail, demo, execution and review; comparisons retained the source shell, pledge and review-control goldens. Header additions have usable width and responsive wrapping. Mobile was checked at 390×844 for reflow, bilingual content and no horizontal overflow; **mobile visual baseline not covered** by approved goldens.
- Normal-motion pledge particles, reduced-motion reading state, visible guide targets, keyboard Time Machine navigation, lost pledge responses, protected launch and cross-tab wallet/profile refresh were exercised. Source unknown duration is shown as a dash; final attempt counts are refreshed from the authoritative mission snapshot.
- The private pre-deployment SQLite backup passed `quick_check` and has mode 0600. No production pledge or reset was used for acceptance testing. CI and live deployment identity are verified separately after publishing this revision.
