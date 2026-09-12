# Changelog

[繁體中文](CHANGELOG.zh-TW.md)

This file records released, user-visible, architectural, and security-relevant changes. It does not record every edit; Git history owns that detail.

The deployment version is kept in sync with `Makefile` and `k8s/overlays/nonprod/kustomization.yaml`. Released entries are newest first.

## v0.7.30 — 2026-09-12

- Restore the approved homepage Hero slogan, supporting copy and Live Pipeline labels from the visual reference.

## v0.7.29 — 2026-09-12

- Use Agent Lab for the navigation label in both languages. Copy-only change; existing layout, interactions and provenance remain intact.

## v0.7.28 — 2026-09-12

- Render imported GitHub issue bodies as GitHub Flavored Markdown, including headings, emphasis, code, task lists and links. Raw HTML remains disabled and rendered URLs are protocol-bounded because issue content is untrusted.

## v0.7.27 — 2026-09-12

- Redesign Agent Lab around what is tested, measured results and next steps. Group observed checks into practical risk categories; explain role boundaries and collapse diagnostics behind evidence controls. Preserve live, idle, disconnected and provenance states.

## v0.7.26 — 2026-09-12

- Remove the homepage workflow concept section and restore the discovery button to campaigns.

## v0.7.25 — 2026-09-12

- Reposition the homepage around task correction and maintainer-confirmed repo workflow evolution. Add a nine-stage interactive concept with source, scope, version, explicit simulated confirmation and next-issue acceptance. Rename Chinese Agent Lab navigation and stages consistently. This presentation does not implement PR-reply ingestion or production rule enforcement.

## v0.7.24 — 2026-09-12

- Add GitHub source workspaces, draft PR creation on funding, bounded AI implementation with Docker verification, and ready-for-review promotion gated by same-commit CI. Add browser/Docker journeys and ownership, retry and failure gates. Not deployed or live GitHub-write verified.

## v0.7.23 — 2026-09-12

Feature-specific concise bilingual LLM advice, structured evidence compaction, invalid-answer negative caching and original trace linkage on cache hits. Campaign critique includes the selected issue. See `LLM-QUALITY-REPORT.md` for measured results and limits.

## v0.7.22 — 2026-09-12

- Remove the persistent demo/isolation notice below navigation. Keep execution errors as standalone alerts; update shell specs, locale dictionaries and browser regression coverage.

## v0.7.21 - 2026-09-12 (cloud assurance)

- Add the six-stage Agent Lab, authenticated scheduled execution, real controlled checks, model provenance and baseline iteration. See [assurance operations](ASSURANCE.md).
- Preserve scripted mission scope, demo data protection and shutdown cutoff. No cloud source repair or automatic promotion is claimed.

## v0.7.20 — 2026-09-12 (integrated local agents)

- Merge the local chaos/experiment, LangGraph checkpoints, Langfuse monitoring and switchable frontend update lane into current main.
- Preserve Responses-only production advice, request deduplication/budgets, measured usage, protected demo reset and A/B/C fixture execution.
- Propagate agent cancellation through both model APIs; retain bounded responses, crash recovery, immutable update gates and explicit fallback status.
- Local agent branch versions 0.7.12–0.7.16 are now integrated here; their dated verification remains in [the agent report](AGENT-TEST-REPORT.md). This merge does not deploy or enable automatic updates.

## v0.7.19 — 2026-09-12

Responses request deduplication and bounded concurrency/hourly calls, measured token counters, revision-based SQLite projection refresh, and protected shared demo reset/backup. Visual baselines remain unchanged by user instruction.

## v0.7.18

- Wire production authoring to the shared Responses API, preserve restricted keys and demo execution, and export measured model duration/usage to Langfuse Cloud with bounded metadata only.

## v0.7.17 — 2026-09-12 (integrated main)

- Merge Phase 3 A/B/C product work with current Cloudflare delivery and CI optimizations. Package both executable fixtures and Git in production; expose the integrated fixture-only deployment receipt.
- Preserve scoped egress, Responses key boundaries, ephemeral storage, monitoring and cutoff. Retain all 40 approved visual references and their outstanding differences.

## v0.7.16 — 2026-09-12

- Enable scoped HTTPS interception and Node trust for OpenAI egress; allow more time for Cloudflare container placement during deployment verification.

## v0.7.15 — 2026-09-12

- Add an authenticated fixed-prompt OpenAI connection check in the actual Cloudflare container, limited to one provider call per process.

## v0.7.14 — 2026-09-12

- Identify deployment probes with a service User-Agent and monitor container lifecycle without resetting its two-hour idle timer.

## v0.7.13 — 2026-09-12

- Export the Containers SDK outbound proxy required to start the deployed container.

## v0.7.12 — 2026-09-12 (Cloudflare container integration)

- Package the Phase 1 Node server and frontend in a non-root container; use one basic instance, 2-hour idle sleep, resource logs, and serving-image revision verification. Deployment verification is recorded separately in CI checkpoints.

## v0.7.12 — 2026-09-12 (local Phase 3 integration)

- Integrates dev/computer-a, dev/computer-b and dev/computer-c in order. Newly authored duration fixtures now use the same lifecycle authority as funding, execution and local review.
- Connects Marketplace/profile projections, comments, guide targets, worker readiness and SSE. Rejects stale route responses and stale-run decisions; keeps imported repositories non-executable.
- Adds cross-slice HTTP and Docker journeys plus an all-baseline verification gate. Approved golden images are preserved; this source integration does not claim visual approval or deployment. See [integration evidence](PHASE3-INTEGRATION.md).

## v0.7.11 — 2026-09-12 (local Computer A / Phase 2)

- Added SQLite-backed Home/community snapshots, demo graph reset, SSE invalidation,
  persisted redacted comments, category vote locking and local contributor receipts.
- Added Home, Marketplace, profile, guided launch/recovery and route recovery with
  bilingual controls and Docker interactive coverage. B/C workflows remain separate.
- Removed the logo background rectangle after the first 13 interactive journeys
  passed, as requested. Existing approved visual PNGs are preserved; full Phase 2
  verification still requires visual approval and the missing maintainer target.

- Adds the mission/funding/execution vertical slice with local compute accounting,
  fixture-only demo execution, persisted evidence and mission/execution pages.
- Central B wiring was explicitly authorized for branch `dev/computer-b`.
  Verification and remaining limits are recorded in [B's handoff](PHASE2-COMPUTER-B-HANDOFF.md).
- This is a source candidate, not a deployment or an approved visual baseline update.

## v0.7.11 — 2026-09-12 (Computer C Phase 2 source; functional E2E passed; visual approval pending)

- Added capability-bound authoring, local mission persistence and review decisions, advisory model/fallback paths, bounded observations and operational endpoints.
- Connected New Mission, Review and standalone design concepts with bilingual copy and interactive Docker journey definitions.
- Independent Colima Docker passed all 8 C journeys and 4 foundation regressions; 14 visual comparisons differ and have captured review candidates. Original approved images remain unchanged; no full Phase 2 verification, fresh mission execution, visual approval or deployment is claimed. See [Computer C handoff](PHASE2-C.md).

## v0.7.10 — 2026-09-12 (local Phase 1 source checkpoint)

- Established TypeScript frontend/backend shared contracts, modular HTTP registration,
  SQLite migration/transaction/reset foundations, bilingual shell and Docker browser tooling.
- Standardized terminal runs on `endedAt`; API run statuses now match the domain contract.
- This reconstruction does not include Phase 2 workflows or an execution runner. The
  nonprod overlay records a version only and contains no deployable workload. No rollout
  or approved visual-baseline update is claimed.

## v0.7.9 — 2026-08-23

### Fixed

- Made guided-demo launch complete a deterministic local reset before entering the selected role route, while preserving user control over every state-changing product action.
- Added Docker browser assertions that reject opacity-zero New Mission content and prove reset completes before guided navigation.
- Added executable-spec runtime authority, terminal outcome, and test-constraint fields so external automation cannot be mistaken for product-owned completion.

### Changed

- Corrected the feature-reality matrix: the product provides a guided walkthrough, not one-click workflow automation.

## v0.7.8 — 2026-08-20

### Added

- Added a Phase 4 integration gate, executable-spec evidence ledger, and bilingual vertical-slice handoff templates so completion claims require bounded terminal outcomes instead of route, UI, or snapshot evidence alone.

### Changed

- Exposed the Vite development server on the configured host interface for container and remote development access.

## v0.7.7 — 2026-08-16

### Added

- Added and approved ten Docker-captured Chromium golden baselines covering the eight non-Home visual specifications: marketplace, mission authoring, mission detail, execution, review, contributor profile, guided demo, and route fallback.

## v0.7.6 — 2026-08-16

### Added

- Expanded executable specifications from the Home slice to every current product API, SPA route, composite workflow component, core domain, persistence boundary, cross-layer policy, and planned non-Home visual baseline.

### Fixed

- Made repository analysis reject unknown source values before analysis or capability issuance instead of silently treating them as the executable bundled fixture.

## v0.7.5 — 2026-08-15

### Added

- Expanded the executable Home specifications with reconstructable application-shell, campaign-card, demo-reset, marketplace payload, localization, map, fixture, and component-dependency contracts so the Home slice can be rebuilt without existing frontend or shared-type sources.

### Fixed

- Excluded source-spec prose from Tailwind template discovery so editing YAML contracts cannot silently change generated product CSS or approved visual baselines.

## v0.7.4 — 2026-08-15

### Added

- Added four reviewed Home visual golden baselines and a reproducible screenshot comparison suite that runs the matching pinned Playwright Chromium image in Docker with isolated demo state.

## v0.7.3 — 2026-08-15

### Added

- Added machine-readable home-page, component, and API source specifications, schema validation, and BDD coverage that keeps the implemented landing and bootstrap contracts aligned with those specifications.

### Changed

- Updated the Node.js type definitions used by TypeScript development and CI.

## v0.7.2 — 2026-08-14

### Fixed

- Kept the landing hero promise and Live Pipeline fully visible side by side in a typical laptop viewport while preserving the spacious large-screen layout.
- Restored the compute map's Pool summary, supporter avatars, controls, and map-canvas visual hierarchy.
- Prevented repository titles, workflow artwork, and the delivery pipeline from overlapping in Campaign hero artwork.

## v0.7.1 — 2026-08-14

### Changed

- Rebuilt the online landing page and Campaign detail experience around the 15 editorial open-source Campaigns, with distinct card artwork, aligned Campaign titles, a two-stage delivery tracker, complete development-plan evidence, and a sticky backing panel.
- Added live-pipeline motion and completed-release storytelling to the landing page while preserving the explicit local-demo boundary.

### Fixed

- Made the GitLab version gate trust its CI checkout directory so candidate delivery no longer fails on Git's dubious-ownership protection.
- Updated seed-catalog coverage to verify the original ten lifecycle examples separately from the 15 editorial Campaigns.

## v0.7.0 — 2026-08-14

### Added

- Added the server-owned `server-heuristic-v2` compute estimator. Observed repository scope, issue size, acceptance criteria, planned verification loops, and risk produce a disclosed breakdown, interval, confidence, and caveats. Model-authored `computeGoal` values no longer control the budget.
- After at least three comparable successful runs, later estimates use a bounded median actual/estimated calibration ratio; the multiplier is capped to 0.75–1.5.
- Added Experiments & verification / Verification dossier surfaces to the live execution and review pages: baseline and every attempt, cumulative cases and failures, commands, exit codes, five deterministic gates, criterion evidence, estimated-versus-actual compute, and residual uncertainty.

### Documentation

- Added bilingual ADR-007 covering estimate authority, calibration thresholds, evidence structure, and why test volume must not be marketed as a quality guarantee.

## v0.6.2 — 2026-08-13

### Fixed

- Fixed the token-provider demo entry by registering the standalone `/marketplace` route, so the guided journey no longer lands on the not-found page.
- Rebuilt donation meteors around one cubic Bézier motion path for continuous left-to-right movement without the visible corners and speed changes caused by stitched transforms; sponsor labels and multi-meteor bursts remain intact.

## v0.6.1 — 2026-08-13

### Changed

- Split the product walkthrough into Maintainer and token-provider perspectives.
  Each guide now points to the next real product control and advances only after
  the person clicks it; all timer-driven synthetic clicks were removed.
- Renamed the ambiguous “Local review” surface to “Inspect change evidence” and
  made the boundary explicit: decisions update CommonCommit demo state only and
  are not GitHub approval, merge, or release operations.
- Made the token-provider evidence view read-only so the perspective cannot be
  mistaken for Maintainer decision authority. Demo roles remain UI perspectives,
  not authenticated identities or permissions.

## v0.6.0 — 2026-08-13

### Added

- Began Phase 3 with a transactional run-request queue: atomic leases,
  heartbeats, bounded retries, cooperative cancellation, one active owner per
  mission, expired-lease recovery, and an independent worker entrypoint.
- Added worker health and Prometheus metrics, bounded Langfuse
  `queue-worker-run` traces, queue-status APIs, and a UI polling fallback for
  cross-process runs.
- GitHub analysis now records the observed default branch and immutable commit
  SHA so later intake can be pinned instead of cloning a moving branch.

### Security boundary

- Phase 3 is not complete or deployed. Nonprod remains
  `RUN_DISPATCH_MODE=inline`, `EXECUTION_MODE=demo`, and imported-repository
  execution stays disabled. Disposable per-run workloads, durable shared
  storage, signed artifact storage and deployed SEC-00 evidence remain required.

## v0.5.9 — 2026-08-13

### Fixed

- Made the development-plan control scroll to the real plan instead of asking
  React Router to navigate to a fragment as though it were an application route.
- Removed the duplicate New Mission call-to-action from the homepage-embedded
  marketplace, while retaining it on the standalone marketplace view.
- Linked the completed release update to its real local campaign and made
  project identities in impact receipts and pledge history open the matching
  campaign.
- Classified execution cancellation as a future mission-maintainer or platform-
  operator action. Shared-demo viewers now see the missing-authentication boundary
  instead of a destructive control, and the unauthenticated cancellation endpoint
  now fails closed with `403 auth_required`; full RBAC is still not implemented.

## v0.5.8 — 2026-08-12

### Changed

- Renamed the product to NxtCommit with a stronger N-shaped logo, matching app
  icon and favicon, plus a higher-contrast token-stream hero visual.
- Expanded the landing story with a larger bilingual hero, community compute
  pool, simulated live pipeline, clearer campaign states, and a completed
  Funded → AI plan → maintainer merge → release update.
- Reframed campaign cards and details around release plans and user impact,
  added familiar WhisperX and SQLite examples, and made funded campaigns switch
  from backing prompts to development progress and local review.
- Tightened campaign layouts, milestone grids, map presentation, navigation,
  status copy, and Traditional Chinese / English parity across the experience.

## v0.5.7 — 2026-08-11

### Changed

- Reframed the homepage around the relationship between commits and commitment,
  with one campaign CTA and a concise token-commitment line.
- Added a compact, single-rail Discover → Back → Build → Merge narrative after
  the hero; the persistent demo banner continues to carry the runtime boundary.
- Restored the supporter map as the third screen, moved campaigns after it,
  renamed the campaign section to “Commit what's next”, and branded funding
  actions as “Commit 1K Tokens”.
- Reduced category-banner height and replaced its near-black treatment with a
  lighter blue-violet gradient.
- Reordered and renamed the primary navigation to Discover, New Mission, My
  Commitment, and Demo in both locale experiences.

## v0.5.6 — 2026-08-11

### Changed

- Replaced the homepage's detached black compute panel with a warm violet,
  mint and paper motion canvas that belongs to the product's light campaign
  theme while retaining readable live API totals.
- Expanded the authored demo backer map from 14 to 20 distinct pledged cities.
  A compact city explorer now controls map details instead of rendering twenty
  pills below the map.
- Reoriented pledge meteors into curved left-to-right paths and placed the real
  local pledge handle on every streak; larger pledges still create bounded
  bursts rather than fabricated donation events.
- Anchored every guided Demo action explanation beside the exact visible
  control it will activate, with an onboarding-style focus scrim, responsive
  placement and a separate confirmation callout inside the pledge dialog.

## v0.5.5 — 2026-08-11

> **Delivery note:** source commit `99f2205` was blocked by four I18N-01 gates in
> pipeline `2749163703`. The remediation in this release restores 21/21 static
> parity; immutable-image, Argo, and serving status remain separate evidence in
> the delivery runbook.

### Changed

- Replaced the production mission detail with the refined D campaign structure:
  one unified hero and funding canvas, a plain-language product story, a clearly
  labelled disappearance scenario, release scope and milestones, plus a sticky
  backing action alongside the long-form campaign.
- Rebuilt the landing story around a motion-led, data-backed impact hero. Compute,
  backers, repositories and shipped releases use values from the existing APIs;
  only their visual focus moves, so motion never fabricates a live count.
- Curated campaigns by product category using the D visual language: a black
  motion banner, one fixed-proportion feature and four compact campaigns. Sixth
  and later campaigns move into a separate continuation grid rather than
  stretching the feature card.
- Moved the guided demo to its own route, kept community awards and voting at the
  end of the homepage, and removed the context-free working-agent feed from the
  landing narrative.

## v0.5.4 — 2026-08-11

### Changed

- Rebuilt the full product interface around the selected campaign direction:
  DM Sans typography, warm paper surfaces, restrained violet and mint ambient
  light, black pill actions, semantic violet funding progress, and a consistent
  light-mode component system across marketplace, mission, pledge, execution,
  review, profile, and creation journeys.
- Reframed the landing hero around the product story — community compute flowing
  through an AI execution plan into a concrete release — while keeping execution
  mode, evidence provenance, and demo boundaries visible.
- Preserved the four original concept routes and added the refined hybrid
  homepage and campaign prototype as a shareable design reference.

## v0.5.3 — 2026-08-11

### Changed

- Removed obsolete GitLab endpoint-verification, release and production placeholder
  jobs after rollout ownership moved to Argo PostSync. Candidate CI now ends at
  immutable-image publication and no longer uploads an unused dotenv report.
- Added regression tests that enforce candidate-before-main promotion, the CI/GitOps
  responsibility boundary, and in-cluster exact-build verification.
- Reduced the shared-runner build pod's admission reservation from 800m to 250m
  after scheduler evidence showed the former request could not fit on any node;
  CPU remains unlimited so image builds may use spare capacity.

## v0.5.2 — 2026-08-10

### Changed

- Replaced the race between GitLab image production and Argo CD reconciliation
  with two-phase delivery: GitLab verifies and builds `delivery-candidate`, then
  GitHub fast-forwards GitLab `main` only after the immutable image exists.
- New commits cancel superseded deliveries, unchanged scheduled reconciliations
  exit without creating a pipeline, npm downloads are cached, and unused build
  artifacts are no longer uploaded.
- Added an in-cluster Argo CD PostSync hook that verifies readiness and exact
  serving build identity without crossing the protected ingress. The Deployment
  now requires five stable ready seconds before that check runs.

## v0.5.1 — 2026-08-10

### Fixed

- Flushes completed Langfuse traces through a single-flight exporter so export
  success/failure and flush latency are visible during normal traffic instead of
  only at process shutdown.
- GitHub delivery verification now fails immediately when GitLab skips
  `build:image`, reports the `version-bump` prerequisite and prints its trace
  instead of waiting the full 20-minute image window.

## v0.5.0 — 2026-08-10

### Added

- Completed the Phase 0–2 implementation: a Langfuse v5 observed model boundary,
  versioned prompt provenance, bounded trace capture, feedback scores, five
  curated datasets, a dry-run/sync/live experiment CLI, stable rollout cohorts,
  operational dashboards and volume-gated alerts.
- Added real optional LLM issue triage and acceptance criteria, campaign critique,
  evidence explanation and shadow diff review. Every surface has explicit
  generator/prompt/variant provenance and a deterministic fallback; none can
  change execution, tests, credits, publication or human review state.
- Added a bilingual Phase 3–7 roadmap. Phase 3 isolated repository execution is
  explicitly not implemented and shared nonprod remains `EXECUTION_MODE=demo`.

- Added a bilingual, gate-driven plan for read-only LLM triage, acceptance
  criteria, evidence explanation, shadow review, isolated real-agent execution,
  and a Langfuse optimization loop spanning trace contracts, scores, datasets,
  dashboards, privacy, experiments, promotion, and rollback.
- Added an agent-facing bilingual GitHub/GitLab/Argo operations record and a
  complete feature-reality matrix that separates real LLM calls, real non-LLM
  integrations, hybrid/seeded demonstrations, UI-only effects, and unimplemented
  external actions. Repository-level `AGENTS.md` now routes future agents to
  those truth boundaries and records safe credential handling.
- The GitLab verification pod now advertises bounded Kubernetes CPU requests,
  preventing a runner-accepted test from spending the entire delivery window
  Pending on a busy cluster. GitHub timeout diagnostics now print both test and
  image-build traces.

## v0.4.10 — 2026-08-09

### Fixed

- Fixed guided Demo campaigns accepting undersized AI estimates that could fund
  successfully but exhaust the runner budget before review. Generated goals now
  reserve one complete implementation and verification attempt, and terminal
  failures are surfaced by the guide instead of appearing stuck.

## v0.4.9 — 2026-08-09

### Added

- The guided demo now operates the real creation, selection, generation,
  publishing, pledge, execution, and review controls. Its final screen shows the
  actual local patch and test evidence, and explicitly stops short of claiming an
  upstream pull request without authenticated write access.
- Live-agent cards now expose the exact observed engine event, changed files,
  test command and result, verification state, and provenance instead of generic
  simulated activity text.

### Fixed

- Public GitHub repositories can produce a conservative, issue-grounded demo
  campaign when a validated LLM is unavailable. Repository discovery is no
  longer incorrectly disabled by the generator mode.
- GitHub repository errors now distinguish a missing or private repository,
  anonymous API rate limiting, and upstream unavailability in both locales.
- Server tests cap file concurrency at four so process-heavy recovery and agent
  budget experiments do not create CPU-starvation timeouts on eight-core runners.
- The container build advertises bounded Kubernetes CPU requests for its build,
  helper, and Docker service containers. This prevents a shared runner from
  holding the job in an unschedulable Pending pod when nodes have less than the
  runner's oversized defaults available; the values are requests, not limits.

## v0.4.8 — 2026-08-09

### Added

- The community experience now includes token-scaled contributor beacons, richer
  live-agent motion, redesigned voting, pledge celebrations, a guided one-click
  demo, sponsorship-scaled meteors, and category-coloured achievements.
- Seeded projects link to their real upstream GitHub repositories, and the demo
  distinguishes authored scenarios from verified upstream issue data.

### Fixed

- Main-branch pipelines now reject image-relevant source changes that reuse an
  existing release tag. The guard previously ran only for merge requests, so a
  direct GitHub mirror could reach `build:image` with an immutable stale tag.
- An Argo CD `PreSync` image preflight now keeps the existing Recreate-managed
  pod serving until the new immutable image can actually be pulled. A Git commit
  can therefore arrive before its image without producing an ImagePullBackOff
  outage. Mesh sidecar injection is disabled for this one-shot Job so its proxy
  cannot keep the hook alive after the image check exits.
- GitHub waits up to twenty minutes for GitLab image delivery and includes the
  current build trace on timeout, instead of reporting an opaque failure after a
  thirteen-minute window that included the test stage.

## v0.4.6 — 2026-08-07

### Added

- The long landing page now has a bilingual, keyboard-visible quick navigation
  bar for Impact, the backer map, live agents, and projects. Every link targets a
  real section and keeps a 44 px touch target on narrow screens.

## v0.4.5 — 2026-08-07

### Fixed

- A configured-but-refused execution mode no longer takes the pod down. `/healthz`,
  `/readyz`, and `/api/bootstrap` called the throwing `resolveMode()`, so setting
  `EXECUTION_MODE=llm` where no per-run OS boundary exists — the shape of the
  non-production cluster — returned 500 from the liveness probe and the container
  restart-looped over a refusal that was correct. The three status endpoints now
  report the refusal as data (`resolved: null` plus an operator-facing `error`);
  `executeMission` still refuses to start the run.
- The GitHub mirror workflow no longer reports success for a run that mirrored
  nothing. `GITLAB_PUSH_TOKEN` has never been set on the repository, so every
  green run in that workflow's history was the unconfigured skip path, and the
  GitHub → GitLab → build → deploy chain has never run end to end from a push. A
  push still skips with a warning; the new scheduled reconcile fails, because a
  heartbeat exists to report the true state.

### Added

- A six-hourly reconcile for the GitLab mirror. The push trigger gets one attempt,
  and on 2026-08-06 four consecutive runs lost it to GitHub-side runner
  acquisition ("The job was not acquired by Runner of type hosted"), each burning
  15 minutes without executing a step. The reconcile is idempotent and annotates
  the run when it actually had to catch up, which is the only evidence that a
  push-triggered mirror was lost.
- `deploy:verify` now fails the deploy when a real agent is live without a measured
  per-run OS boundary, promoting SEC-00 from a runtime refusal to a deploy gate.
- `mode.refused` in both locales, so a refused execution mode renders as its own
  danger-coloured state rather than a raw `mode.null.desc` key.

### Fixed (tests)

- `server/landing.test.ts` no longer calls a live model. On a machine holding
  `OPENAI_API_KEY` it asserted minimum lengths on model-authored prose, so two runs
  of an unchanged tree disagreed and failed on different projects, while the GitLab
  job — no `.env`, no secret — always took the deterministic bundled-copy path. The
  local gate was the stricter and flakier of the two, which is the direction nobody
  checks.

### Changed

- `deploy:verify`'s rollout-gap message is now evidence-based. It records whether
  the live version changed at all during the ten-minute wait and reports the
  no-controller case and the wrong-revision case separately, instead of listing
  both and leaving the reader to guess.

## v0.4.4 — 2026-08-07

### Changed

- Marketplace cards replace GitHub-star popularity with a compact impact view:
  downstream dependent projects, weekly downloads, and the data provenance now
  appear beside the concrete consequence of losing the repository.

## v0.4.3 — 2026-08-07

### Changed

- Repository cards now lead with the human case for backing: what would break if
  the repository disappeared, the concrete outcome, who benefits, and why support
  is needed now. Every seeded project has specific bilingual impact copy.

## v0.4.2 — 2026-08-07

### Added

- Added a bundled, public-domain Natural Earth land silhouette and collision-aware
  city labels so the supporter map remains complete without a runtime map service.
- Added regression coverage for map geometry and state, responsive mission actions,
  native form controls, phase tracking, keyboard focus, and colour contrast.

### Changed

- Renamed the map around what its data actually proves: seeded supporter profile
  locations, not compute regions or data centres. City and country names are now
  localized in both supported languages.
- The map and impact counters now consume one shared live snapshot, retain the last
  good value during revalidation, and refresh together after mission events.
- Moved the mission's funding summary and primary action ahead of long supporting
  content on narrow screens, while retaining one sticky desktop action panel.

### Fixed

- Restored the missing world landmass, legible mobile markers, selected-marker
  state, label leaders, and explicit loading, empty, failure, and retry states.
- Prevented stale plain-language mission explanations after route changes and added
  visible loading, failure, and retry feedback.
- Kept the execution phase active when later budget or informational events arrive,
  and prevented events from separate retries from being merged into one run.
- Discarded stale repository-analysis and route responses after the user changes
  source, URL, or mission; restored native radio keyboard behaviour; and corrected
  focus, header overflow, CTA contrast, and small purple text contrast.

## v0.4.1 — 2026-08-07

### Changed

- The local demo contributor now starts with 100,000 compute credits.
- Every repository product card is a full-card link to its mission detail while
  preserving the donate, retry, and external-repository controls as distinct actions.
- The seeded marketplace now keeps exactly five of its ten unique repositories
  open for backing. `globlin` retains its exhausted-run evidence and reopens as a
  re-scoped 6,000-credit rescue round with 2,000 credits remaining.

## v0.4.0 — 2026-08-06

### Added

- **Impact-first landing page.** The index route is no longer the repo shelf. It
  opens on a hero ("Revive Open Source with AI Compute") and then on four impact
  figures — tokens donated → features built → bugs fixed → projects revived — with
  a 14-day sparkline. Purple primary, blue→teal gradient, glass surfaces, aurora
  glow, scroll reveals. The four existing dimensions
  (funding/development/verification/adoption) remain the product's only CATEGORICAL
  colour scale. The first version of this claimed the brand palette was purely
  additive while `--color-grad-a` was byte-identical to `--color-dev` and the token
  meter used the brand gradient to report FUNDING progress — which has its own
  colour. The brand purples are now visibly distant from the adoption lavender, the
  meter is amber, and the gradient's safety rests on never being categorical rather
  than on a distance it cannot have: a blue→green ramp necessarily passes through
  both the development and verification hues.
- **Community layer.** A donor world map; a live agent strip driven by real engine
  events; achievement badges; Token Rain streaks on real pledges; a per-mission
  comment wall; and monthly awards in three categories — most helpful project,
  most efficient agent, community choice — deliberately not a sponsor leaderboard.
  One vote per category is enforced by a `UNIQUE (contributor_id, category)`
  constraint rather than an application check a concurrent submit could race past.
- **Repositories presented as products.** `PlainLanguage` leads with an emoji, one
  sentence a non-engineer understands, and three concrete use cases; the technical
  description is demoted to a disclosure. `ProductCard` replaces `MissionCard` on
  the landing: name, creator, what it can do, what it still needs, donate.
- **Impact cards** — "if this project disappeared" — with every consequence tagged
  measured or editorial, per line.
- **Five achievement badges**: First Bug Hero, Documentation Angel, AI Architect,
  OSS Guardian, Night Owl Sponsor. Each is awarded from a signal already recorded —
  the release tag partition, a documentation path in the released diff, the resolved
  runner mode, a distinct-project count, and the pledge hour in UTC (named in the
  description, because the server does not know the backer's timezone). A test
  proves each is earnable AND that each declines when its condition is absent; a
  badge that always fires says nothing. `ai_architect` is deliberately unearnable in
  demo mode, since it claims a real agent did work a scripted runner did.
- `server/taxonomy.ts` holds the single definition of what counts as a feature and
  what counts as a bug fix, so the "bugs fixed" counter and the First Bug Hero badge
  cannot come to disagree about what a bug fix is.
- **Time Machine**: before / now / projected, where the projection is visually and
  structurally distinct from the two observed frames.

### Changed

- `Project.figuresMode` records whether a project's popularity figures were
  OBSERVED or AUTHORED. The seed writes plausible numbers for fictional packages,
  which was tolerable while only the marketplace rendered them under a
  section-level demo label; the product and impact cards render the same figures
  in isolation, where that label is gone. Provenance now travels on the row, so
  consumers derive their label instead of remembering to add one.
- `ImpactCard.dataMode` is separate from `generator`, because a model can write an
  honest sentence about an invented number and a bundled demo string can quote a
  real one. The two questions are independent.
- `TimeMachineFrame.openIssues` and `passingTests` became OPTIONAL. They were
  required, which forced a never-executed project to ship `passingTests: 0` — and
  "0 passing tests" under a label reading "passing tests" states a measurement
  nobody took. Absent now means unmeasured; zero means measured as zero, which for
  a suite is a real and different fact. A projection may no longer be computed
  from an unmeasured base either, because that manufactures a number from a blank.
- `fmtDate` in `src/lib/format.ts` replaces two components' private locale
  ternaries, which is where the two locales drift apart.

### Hardened

- The hero counters can no longer display a partially-counted figure. The count-up
  froze at 11,579,355 against a real 19,020,000 in a hidden tab, because
  `requestAnimationFrame` does not fire there while `setTimeout` does; a timer now
  settles every counter on its exact value regardless of how many frames ran. Filed
  as hardening rather than a fix, because the freeze was environmental — the
  behaviour self-heals on refocus, and "correct once you look away and back" is
  simply not a property worth relying on for these numbers. The `sr-only` figures
  were correct throughout, so the exposure was sighted-users-only.

### Security

- **Per-run OS isolation (SEC-00).** Sandboxed commands now run in a disposable
  container with private PID, mount, and network namespaces when one is
  available. Measured: 140 repetitions across seven attack vectors disclosed no
  secret, wrote nothing outside the workspace, and delivered no packet to a
  controlled sink; the same payloads in the process-level fallback leaked a
  credential on 20 of 20 repetitions and delivered 80 packets. The boundary is
  probed by actually mounting the workspace root, not inferred from
  configuration, and `describeIsolation()` is reported through the API and the UI
  in both states. The GKE pod has no Docker daemon, so the in-cluster gate is
  **not met** and real-agent execution stays off in the shared deployment.
- **The write denylist is case-insensitive.** `PACKAGE.JSON` previously passed
  the guard and then overwrote `package.json` on any case-insensitive filesystem;
  `makefile` and `GNUmakefile` shadowed the protected `Makefile` on every
  platform. The list also gained the spellings each toolchain actually reads.
- **Fixture selection is an allowlist.** `createWorkspace` and `analyzeFixture`
  accepted any path relative to `fixtures/`, so `../src` became an executable
  workspace containing this application's own frontend. Both now share one gate.
- **Redaction moved into the logger** instead of being a rule callers had to
  remember, reserved log fields can no longer be forged by a caller field, and
  prompt containment now covers filenames, maintainer feedback, attempt history,
  and the objective. Benign redaction false positives fell from 3.23% to 0.00%
  while the credential heuristic gained the prefixed spellings it was missing
  (`db_password`, `my_secret`, `service_token`).
- **Model responses are bounded on the receiving side** at 4 MiB. `max_tokens` is
  a request to the model, not a limit on the gateway: 8 MiB was accepted from a
  call made with `maxTokens: 8`.

### Fixed

- Product cards now actually load their plain-language explanation when they
  approach the viewport. Duplicate shelf entries share one request, at most two
  generators run concurrently, and an unavailable endpoint falls back to the
  technical description with a retry instead of leaving a permanent skeleton.
- Missing `figuresMode` evidence from an older marketplace payload now fails
  closed to authored demo data; it can no longer be presented as live figures.
- Kept the new frontend compatible with the previous bootstrap payload during a
  mixed-version window: absent isolation evidence is rendered as unavailable
  instead of crashing or being inferred as safe.
- Made deployment verification read the expected execution mode from the
  nonprod overlay. Shared GKE intentionally stays in `demo` because it has no
  Docker daemon for the measured SEC-00 container boundary.
- Changed the single-replica, `emptyDir` deployment from a rolling surge to
  `Recreate`. Nonprod now has a brief rollout outage instead of two independently
  writable SQLite databases and a window where the new SPA can reach the old API.
- Made the GitLab release job fetch build provenance artifacts directly; `needs`
  artifacts are not transitive through the live-verification job.

- A retried pledge charged the backer twice. `POST /missions/:id/pledge` now
  honours an optional `Idempotency-Key` header, recorded in the same transaction
  as the effect. A request without the header is still unprotected, because the
  server cannot distinguish an accidental retry from a deliberate second pledge.
- Concurrent `POST /demo/reset` duplicated the seed and orphaned a mission from
  its project, which made `GET /marketplace` answer HTTP 500. Reset is now
  single-flight.
- A throwing SSE subscriber propagated into the publisher and could leave a
  mission `executing` with no executor. Each subscriber now runs isolated, and
  the global channel carries mission summaries only instead of broadcasting every
  run's captured command output to every connected browser.
- Cancellation never reached the test subprocess: a cancelled suite ran to
  completion and reported success. The signal now reaches the sandbox, which
  spawns into its own process group, and the engine checks the abort before
  interpreting the result — otherwise a cancelled run was reported as `blocked`,
  blaming the agent for a human's decision.
- Every run leaked its workspace: a full repository copy per run, retained
  indefinitely in a pod whose state directory has no size limit.
- Crash recovery left the compute a killed run had already consumed out of the
  ledger, so the mission counter and the ledger disagreed.
- A mission stalled by a killed verification child could not be re-run at all,
  stranding its reserved credits, even though the state machine permits it.
- Truncated sandbox output reported `truncated: false` with no marker, and a
  cancelled or truncated run could report success. Unreadable evidence is now
  non-zero: the engine cannot verify a green suite it could not read.
- The agent's own `run_tests` re-derived its verification plan, so the agent saw
  a verdict from a different command than the one the engine graded it by.
- Three reachable API error codes had no translation key in either locale, and
  four zh-TW strings rendered ASCII punctuation inside CJK runs.

### Documentation

- Added complete Traditional Chinese counterparts for every indexed document and
  made both README indexes explicitly bilingual.
- Restored the stable G01–G46 gotcha catalogue; entries are now preserved and
  corrected in place instead of being removed for brevity.
- Added a product and website direction document covering positioning, areas to
  converge, safe extensions, prerequisites, information architecture, and
  deliberate non-goals.
- Replaced the overlapping product overview, architecture diary, deployment diary, roadmap, experiment log, and agent rules with single-owner documents.
- Added explicit prototype, identity, GitHub-import, upstream-delivery, and sandbox boundaries.
- Completed `.env.example` and aligned the quick-start, build, execution-mode, and deployment instructions with the implementation.
- Removed internal deployment identifiers and stale live-version claims from public-facing documentation.

## v0.3.9 — 2026-08-06

### Added

- Added a bilingual, execution-ready validation experiment specification spanning program
  design, AI-agent quality, security isolation, credit conservation, UI/UX,
  accessibility, localization, performance, and recovery.
- Added regression coverage for canonical paths, runner-independent protected
  files, baseline-relative diffs, hard tool budgets, repository identity,
  timeout classification, child-environment filtering, and exact credit
  allocation.

### Security

- Made real Codex/LLM execution fail closed unless a local operator explicitly
  sets `ALLOW_UNSAFE_LOCAL_AGENT_EXECUTION=1`; shared nonprod now stays in demo
  mode while the P0 OS-isolation experiment is blocked.
- Froze the engine-owned verification plan, rejected an untrusted baseline
  before model spend, compared artifacts with the captured baseline commit,
  and blocked protected or newly ignored runner changes before the authoritative final suite, with a second integrity check after executable tests returned.
- Canonicalized workspace paths, enforced read/tool budgets, changed search to
  bounded literal matching, contained runner prefetch reads, and removed
  unrelated service credentials from the Codex child environment.
- Bound campaign and mission mutations to short-lived server-held analysis and
  draft snapshots, bound fixture projects by source identity rather than name,
  and stopped accepting reviewer identity from the browser.

### Fixed

- Conserved every integer credit across proportional refunds and prevented a
  pledge from exceeding the remaining goal.
- Distinguished aggregate suite success from criterion-level verification and
  carried explicit test-evidence provenance into review artifacts.
- Replaced upstream PR/release and authenticated-maintainer implications with
  accurate local-prototype language throughout the interface.
- Added mobile navigation, localized route failures, request timeouts, stale
  route-response guards, bootstrap retry feedback, keyboard-friendly dialogs,
  labels, reduced-motion handling, and WCAG-AA normal-text contrast.

## v0.3.8 — 2026-08-05

### Changed

- Reworked issue-feasibility signals from measured training data and shipped calibration metadata with every score.
- Renamed UI bands to describe observed tendency instead of presenting an unsupported 0–100 intelligence score.
- Separated scored signals from unscored observations and made uncertainty permanently visible.

### Verification

- Held-out repository evaluation did **not** show that the new ranking was more accurate. That negative result is part of the release record and is the basis for the current “heuristic” label.
- Corrected the evaluation CLI's per-signal accounting and added AUC, baseline, and band-separation output.

## v0.3.7 — 2026-08-05

### Changed

- Preserved unknown filesystem and popularity measurements during GitHub analysis instead of manufacturing zero values.
- Added a human-readable label for GitHub's `NOASSERTION` licence result without changing the stored value.

### Verification

- Exercised the analysis path across 90 public repositories without request failures; npm popularity appeared only when it was actually measured.

## v0.3.6 — 2026-08-05

### Added

- Added captured parser fixtures for Jest, Vitest, and Mocha, Node spec/TAP parser tests, and initial parsing support for pytest and Go test output.
- Added an explicit `test_output_unreadable` engine result instead of treating unknown output as zero tests.
- Added a repository-grouped feasibility evaluation corpus and train/test split.

### Changed

- Reframed the feasibility score as a weak, calibrated heuristic after evaluation showed only limited lift over the base rate.

## v0.3.5 — 2026-08-05

### Changed

- Made CI runner selection untagged and declared the Docker-in-Docker service explicitly.
- Enabled keyless Artifact Registry authentication through Workload Identity Federation.
- Enforced immutable image tags by comparing image-relevant source-tree identity before reuse.

## v0.3.4 — 2026-08-05

### Fixed

- Made `make build` refuse image-relevant uncommitted changes so provenance labels describe the bytes being built.
- Added `make build-dirty` for local-only iteration with deliberately non-deployable identity.

## v0.3.3 — 2026-08-05

### Security

- Replaced string-prefix workspace checks with realpath-based containment and skipped symlinks in repository walkers.
- Removed the fallback that could execute the bundled `tempo` fixture for a non-fixture project.

## v0.3.2 — 2026-08-05

### Added

- Added GitHub-to-GitLab mirroring and a verify, build, deploy-verification, and release pipeline.
- Added runtime build identity metrics for version, commit, and source tree.
- Added an ArgoCD Application template and post-rollout identity checks.

### Security

- Expanded the LLM-tool write denylist to CI include directories and files that define verification commands.

## v0.3.1 — 2026-08-05

### Changed

- Made repository measurements optional and stopped presenting unobserved counts, popularity, licence, and health values as facts.
- Added real read-only GitHub README, workflow, and npm-download lookups where available.
- Replaced the constant feasibility value with an input-dependent, signal-exposing heuristic.
- Added abstention metrics and separated infrastructure blocks from deliberate agent abstention.

## v0.3.0 — 2026-08-04

### Added

- Replaced fixed planning/coding calls with a bounded seven-tool LLM loop.
- Added tool-call and read budgets, a submission gate, explicit abstention, and engine-owned memory across attempts.
- Added an advisory diff judge with honest `llm` versus `static` attribution.

### Fixed

- Rejected unknown campaign modes and malformed acceptance-criteria payloads.
- Derived artifact labels from observed issue and environment facts instead of fixture constants.
- Preserved `stalled` for deliberate handoff instead of reporting every non-success as `failed`.

## v0.2.0 — 2026-08-04

### Added

- Added environment planning, command allowlisting, working-directory containment, secret-cleaned child environments, timeouts, and output limits.
- Added dependency provisioning and test-command derivation from observed repository files.
- Added evidence fencing, secret-shaped redaction, injection signals, deterministic reviewability checks, and a hard write denylist for bounded LLM tools.
- Added `slugpress` and `hostile` fixtures for dependency and adversarial paths.

### Clarification

- Network controls introduced in this version are best-effort proxy and package-manager settings, not hard egress isolation.

## v0.1.2 — 2026-08-04

### Fixed

- Made demo reset cancel and settle active runs before replacing state, and hardened asynchronous cleanup paths.
- Corrected seeded history so simulated events cannot appear engine-verified.
- Kept review actionable when a requested follow-up cannot execute.
- Credited contributor wallets for unused compute refunds.
- Corrected release, acceptance-evidence, and cancellation messages to describe implemented behaviour.
- Added LLM abort propagation and a request timeout.

## v0.1.1 — 2026-08-04

### Added

- Added and exercised the non-production container and Kubernetes deployment path.
- Added writable-state fallback, non-root volume ownership, health checks, ingress, metrics, and dashboard integration.

### Fixed

- Normalized quoted environment values.
- Bundled the production server instead of transpiling TypeScript at runtime.
- Supported both spec and TAP Node test output.
- Filled previously dead demo routes and completed en/zh-TW UI coverage.

## v0.1.0 — 2026-08-04

### Added

- Delivered the initial marketplace-to-release prototype: pledge, fixture execution, live events, engine verification, local review artifact, approval, release state, achievements, and contributor receipt.
- Added explicit mission and run state machines, compute accounting, Git-baselined workspaces, real fixture tests and diffs, and a human decision step.
- Added React/Vite UI, Express/SQLite server, demo/LLM/Codex runner interfaces, structured logs, Prometheus metrics, optional Langfuse tracing, and en/zh-TW content.
