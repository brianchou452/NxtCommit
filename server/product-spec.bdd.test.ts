// A-owned traceability entry. Phase 2 cases live in owner modules.
/**
 * Spec: api.ai-feedback
 * Scenario: feedback-is-bounded
 * Given A supported AI feature exposes a valid trace id.
 * When Helpful feedback is submitted.
 * Then Only the named score is attempted and actor remains visibly unauthenticated.
 */
/**
 * Spec: api.campaign-critique
 * Scenario: critic-is-advisory
 * Given A trusted draft remains bound to its analysis.
 * When Critique runs.
 * Then Advice is returned separately and the draft is not mutated or published.
 */
/**
 * Spec: api.campaign-generation
 * Scenario: campaign-mode-is-explicitly-labelled
 * Given A trusted analysis and selected issue exist.
 * When Generation is requested.
 * Then The draft records its actual generator and invalid requested modes fail loudly.
 */
/**
 * Spec: api.contributor-profile
 * Scenario: contributor-profile-route
 * Given A seeded or local contributor exists.
 * When Its profile is requested.
 * Then Local records and dataMode are returned while unknown external facts remain absent.
 */
/**
 * Spec: api.health
 * Scenario: health-route-is-liveness-only
 * Given The server process accepts HTTP even when configured execution is refused.
 * When Health is requested.
 * Then It returns liveness and non-secret refusal context without failing the process probe.
 */
/**
 * Spec: api.issue-assistant
 * Scenario: assistant-stays-issue-bound
 * Given A trusted analysis identifies one issue.
 * When Assistance is requested.
 * Then Suggestions remain bounded to that issue and carry generator evidence.
 */
/**
 * Spec: api.live-activity
 * Scenario: live-activity-route
 * Given Zero or more runs may be active.
 * When The snapshot is requested.
 * Then Only current run evidence is returned and empty means idle.
 */
/**
 * Spec: api.llm-validation
 * Scenario: validation-is-nonsecret-and-nonauthorizing
 * Given Model configuration may or may not be valid.
 * When Fresh validation runs.
 * Then Non-secret evidence is returned and execution mode is not promoted.
 */
/**
 * Spec: api.metrics
 * Scenario: metrics-route-exposes-bounded-observations
 * Given The server is running.
 * When Metrics are scraped.
 * Then Text exposition includes serving build identity and no secret or unbounded repository labels.
 */
/**
 * Spec: api.mission-cancel
 * Scenario: public-cancel-refused
 * Given No authentication or mission-scoped RBAC exists.
 * When Any caller posts cancellation.
 * Then The response is 403 auth_required and no client identity bypass is accepted.
 */
/**
 * Spec: api.mission-create
 * Scenario: mission-creation-trusts-server-snapshots
 * Given Matching live capabilities hold analysis and draft.
 * When Mission creation is requested repeatedly.
 * Then Client edits are ignored and the same bound mission is returned.
 */
/**
 * Spec: api.mission-detail
 * Scenario: mission-detail-route
 * Given A caller has a mission id.
 * When GET mission detail is requested.
 * Then The route returns the matching aggregate or 404 without inventing optional evidence.
 */
/**
 * Spec: api.mission-events
 * Scenario: mission-events-route
 * Given A mission may have zero or more runs.
 * When Stored events are requested.
 * Then Only events for its latest or explicitly owned run are returned.
 */
/**
 * Spec: api.mission-execute
 * Scenario: execute-dispatch-union
 * Given An eligible bundled fixture mission is ready.
 * When Execution is requested.
 * Then Inline returns 200 with a run while queue returns 202 with a request and neither path executes imported GitHub code.
 */
/**
 * Spec: api.mission-pledge
 * Scenario: pledge-intent-is-atomic
 * Given A local persona has sufficient credits and a retry-stable key.
 * When The same pledge intent is submitted more than once.
 * Then Wallet, pledge and ledger effects occur once and a conflicting body is rejected.
 */
/**
 * Spec: api.mission-run-request
 * Scenario: latest-mission-request-route
 * Given A valid mission may not have queued work.
 * When Its latest request is fetched.
 * Then The response distinguishes null from a missing mission.
 */
/**
 * Spec: api.mission-stream
 * Scenario: mission-stream-route
 * Given A mission view needs current updates.
 * When It opens the scoped SSE endpoint.
 * Then The server exposes the mission stream and clients revalidate after reconnect.
 */
/**
 * Spec: api.mvp-list
 * Scenario: mvp-list-route
 * Given Local mission and vote data exist.
 * When Nominees are requested.
 * Then Each category includes local basis and lock state without external-governance claims.
 */
/**
 * Spec: api.mvp-vote
 * Scenario: one-local-vote-per-category
 * Given The local persona has not voted in the nominee category.
 * When A vote is cast.
 * Then One vote is stored and later votes in that category are refused.
 */
/**
 * Spec: api.project-explanation
 * Scenario: project-explanation-route
 * Given A known project may or may not have a working model credential.
 * When Explanation is requested.
 * Then Real output or labelled demo fallback is returned without inventing missing measurements.
 */
/**
 * Spec: api.readiness
 * Scenario: readiness-reflects-serving-dependencies
 * Given Database and queue-worker readiness may differ from execution-mode consent.
 * When Readiness is requested.
 * Then HTTP status follows serving dependencies while any execution refusal is reported without credentials.
 */
/**
 * Spec: api.repository-analysis
 * Scenario: analysis-preserves-observation-boundary
 * Given A fixture or public GitHub URL is supplied.
 * When Analysis runs.
 * Then Only observed fields are present and a server capability binds later operations.
 */
/**
 * Spec: api.run-detail
 * Scenario: run-detail-route
 * Given A run may be active, terminal or absent.
 * When Its detail is requested.
 * Then Matching ordered evidence is returned without manufacturing an artifact.
 */
/**
 * Spec: api.run-evidence-explanation
 * Scenario: explanation-never-rewrites-evidence
 * Given A run has a stored artifact.
 * When Explanation is requested.
 * Then Bounded prose and provenance are returned while source evidence remains authoritative.
 */
/**
 * Spec: api.run-request
 * Scenario: run-request-route
 * Given Queue dispatch may have created a request.
 * When Its public status is fetched.
 * Then The route returns sanitized status or 404.
 */
/**
 * Spec: api.run-review
 * Scenario: review-keeps-human-boundary
 * Given A run has a reviewable local artifact.
 * When The local persona approves or requests changes.
 * Then The state changes locally, request_changes requires feedback and no upstream action occurs.
 */
/**
 * Spec: api.shadow-review
 * Scenario: shadow-review-has-no-authority
 * Given A review artifact exists.
 * When Shadow review runs.
 * Then Findings record provenance and affectedGate remains false.
 */
/**
 * Spec: api.wall-list
 * Scenario: wall-list-route
 * Given A mission may have local comments.
 * When Its wall is requested.
 * Then Persisted redacted messages are returned in order.
 */
/**
 * Spec: api.wall-post
 * Scenario: wall-post-redacts-before-storage
 * Given Untrusted text may contain a secret-like value.
 * When The local user posts it.
 * Then Redaction happens before persistence and the server assigns identity fields.
 */
/**
 * Spec: component.campaign-authoring
 * Scenario: authoring-separates-model-and-policy
 * Given A trusted issue may use real or demo generation.
 * When Draft and critique render.
 * Then Generator provenance is separate from deterministic estimate and publish remains local.
 */
/**
 * Spec: component.comment-wall
 * Scenario: wall-trusts-server-thread
 * Given User submits untrusted body text.
 * When Post succeeds.
 * Then The refreshed redacted server thread replaces optimistic content and identity is not client-selected.
 */
/**
 * Spec: component.contributor-impact
 * Scenario: impact-record-is-locally-traceable
 * Given Profile includes seeded identity and local observed records.
 * When Impact renders.
 * Then Every aggregate is traceable and no wallet identity or adoption is promoted beyond its provenance.
 */
/**
 * Spec: component.design-concept-shell
 * Scenario: standalone-concept-shell-has-no-product-effects
 * Given Visitor opens a concept home or campaign route
 * When They navigate, switch local language, or adjust mock backing controls
 * Then Only local exploration state changes and the demo disclosure remains present
 */
/**
 * Spec: component.diff-viewer
 * Scenario: diff-is-local-engine-artifact
 * Given Engine produced a baseline-relative artifact.
 * When Reviewer inspects files.
 * Then Persisted changes render without implying a pushed branch or GitHub PR.
 */
/**
 * Spec: component.execution-activity
 * Scenario: activity-never-invents-work
 * Given REST history and SSE may overlap or be empty.
 * When Events are merged.
 * Then IDs deduplicate order remains stable and empty state shows no fabricated activity.
 */
/**
 * Spec: component.guided-demo-controller
 * Scenario: controller-waits-for-real-reset
 * Given A walkthrough needs deterministic local state.
 * When User launches it.
 * Then Navigation begins only after reset succeeds and scripted intelligence remains disclosed.
 */
/**
 * Spec: component.mission-overview
 * Scenario: overview-keeps-provenance-with-claims
 * Given Mission and optional generated explanation are available.
 * When Overview renders.
 * Then Status generator dataMode and missing measurements remain distinguishable.
 */
/**
 * Spec: component.pledge-dialog
 * Scenario: retry-preserves-pledge-intent
 * Given A pledge request may fail after submission.
 * When User retries without changing intent.
 * Then The same idempotency key and amount are reused and credits remain labelled prototype units.
 */
/**
 * Spec: component.repository-analyzer
 * Scenario: github-analysis-stays-metadata-only
 * Given User selects a public GitHub repository.
 * When Analysis completes.
 * Then Coverage identifies metadata observations and UI makes no clone full-tree or execution claim.
 */
/**
 * Spec: component.review-controls
 * Scenario: controls-cannot-bypass-gate
 * Given Advisory findings may be positive while deterministic gate is not reviewable.
 * When Controls render.
 * Then Decision remains unavailable until mission state authorizes it and request changes requires feedback.
 */
/**
 * Spec: component.route-recovery
 * Scenario: recovery-does-not-leak-internals
 * Given Route is missing or throws.
 * When Recovery renders.
 * Then Accessible action exists and no stack secret or mission-state claim appears.
 */
/**
 * Spec: component.verification-dossier
 * Scenario: dossier-separates-suite-and-criteria
 * Given Aggregate tests and criterion evidence may differ.
 * When Dossier renders.
 * Then Suite success is not presented as proof for an unsupported criterion and unreadable stays unknown.
 */
/**
 * Spec: page.contributor-profile
 * Scenario: profile-keeps-demo-identity-visible
 * Given A local contributor aggregate exists.
 * When Profile renders.
 * Then Accounting and achievements are traceable while identity and adoption remain honestly labelled.
 */
/**
 * Spec: page.design-concepts
 * Scenario: concepts-remain-clearly-nonproduction
 * Given Visitor opens a concept route.
 * When Static mock interactions render.
 * Then No product API effect occurs and the exploration disclosure remains visible.
 */
/**
 * Spec: page.execution-room
 * Scenario: execution-room-preserves-event-authority
 * Given A run may be idle queued running or terminal.
 * When REST and SSE evidence are combined.
 * Then Events remain ordered and source-labelled while empty state stays honest.
 */
/**
 * Spec: page.guided-demo
 * Scenario: guided-demo-discloses-hybrid-boundary
 * Given Visitor opens the demo route.
 * When A walkthrough is launched.
 * Then Real UI automation remains visibly separated from scripted runner and demo identity claims.
 */
/**
 * Spec: page.marketplace
 * Scenario: marketplace-route-composes-live-read-model
 * Given Visitor opens the standalone marketplace.
 * When Data loads or stream updates arrive.
 * Then Shelves revalidate from API and preserve dataMode and generator labels.
 */
/**
 * Spec: page.mission-detail
 * Scenario: mission-detail-actions-follow-state
 * Given A mission can be funding executing reviewable or released.
 * When Its detail renders and updates arrive.
 * Then Only lifecycle-valid actions appear and every generated or demo fact retains provenance.
 */
/**
 * Spec: page.new-mission
 * Scenario: wizard-preserves-trusted-capabilities
 * Given Visitor progresses from analysis to publication.
 * When Each asynchronous step completes or fails.
 * Then The UI preserves server provenance and never treats client edits as trusted repository facts.
 */
/**
 * Spec: page.review
 * Scenario: review-keeps-deterministic-evidence-primary
 * Given A mission has a local review artifact.
 * When Human and optional AI review features are used.
 * Then Deterministic evidence remains first and only local lifecycle actions occur.
 */
/**
 * Spec: page.route-fallbacks
 * Scenario: route-fallbacks-remain-recoverable
 * Given A route is unknown or lazy rendering throws.
 * When Fallback renders.
 * Then Accessible recovery text and Home or reload action are available without internal details.
 */
import './spec-tests/authoring.scenarios.js';
import './spec-tests/community.scenarios.js';
import './spec-tests/operations.scenarios.js';
import './spec-tests/mission.scenarios.js';
import './spec-tests/review.scenarios.js';
