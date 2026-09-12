import { test } from 'node:test';

/**
 * Spec: api.contributor-profile
 * Scenario: contributor-profile-route
 * Given A seeded or local contributor exists.
 * When Its profile is requested.
 * Then Local records and dataMode are returned while unknown external facts remain absent.
 */
test.todo("api.contributor-profile / contributor-profile-route — Phase 2 owner implementation pending");

/**
 * Spec: api.mvp-list
 * Scenario: mvp-list-route
 * Given Local mission and vote data exist.
 * When Nominees are requested.
 * Then Each category includes local basis and lock state without external-governance claims.
 */
test.todo("api.mvp-list / mvp-list-route — Phase 2 owner implementation pending");

/**
 * Spec: api.mvp-vote
 * Scenario: one-local-vote-per-category
 * Given The local persona has not voted in the nominee category.
 * When A vote is cast.
 * Then One vote is stored and later votes in that category are refused.
 */
test.todo("api.mvp-vote / one-local-vote-per-category — Phase 2 owner implementation pending");

/**
 * Spec: api.run-evidence-explanation
 * Scenario: explanation-never-rewrites-evidence
 * Given A run has a stored artifact.
 * When Explanation is requested.
 * Then Bounded prose and provenance are returned while source evidence remains authoritative.
 */
// Computer C implements this scenario in review.scenarios.ts.

/**
 * Spec: api.wall-list
 * Scenario: wall-list-route
 * Given A mission may have local comments.
 * When Its wall is requested.
 * Then Persisted redacted messages are returned in order.
 */
test.todo("api.wall-list / wall-list-route — Phase 2 owner implementation pending");

/**
 * Spec: api.wall-post
 * Scenario: wall-post-redacts-before-storage
 * Given Untrusted text may contain a secret-like value.
 * When The local user posts it.
 * Then Redaction happens before persistence and the server assigns identity fields.
 */
test.todo("api.wall-post / wall-post-redacts-before-storage — Phase 2 owner implementation pending");

/**
 * Spec: component.comment-wall
 * Scenario: wall-trusts-server-thread
 * Given User submits untrusted body text.
 * When Post succeeds.
 * Then The refreshed redacted server thread replaces optimistic content and identity is not client-selected.
 */
test.todo("component.comment-wall / wall-trusts-server-thread — Phase 2 owner implementation pending");

/**
 * Spec: component.contributor-impact
 * Scenario: impact-record-is-locally-traceable
 * Given Profile includes seeded identity and local observed records.
 * When Impact renders.
 * Then Every aggregate is traceable and no wallet identity or adoption is promoted beyond its provenance.
 */
test.todo("component.contributor-impact / impact-record-is-locally-traceable — Phase 2 owner implementation pending");

/**
 * Spec: component.guided-demo-controller
 * Scenario: controller-waits-for-real-reset
 * Given A walkthrough needs deterministic local state.
 * When User launches it.
 * Then Navigation begins only after reset succeeds and scripted intelligence remains disclosed.
 */
test.todo("component.guided-demo-controller / controller-waits-for-real-reset — Phase 2 owner implementation pending");

/**
 * Spec: component.route-recovery
 * Scenario: recovery-does-not-leak-internals
 * Given Route is missing or throws.
 * When Recovery renders.
 * Then Accessible action exists and no stack secret or mission-state claim appears.
 */
test.todo("component.route-recovery / recovery-does-not-leak-internals — Phase 2 owner implementation pending");

/**
 * Spec: page.contributor-profile
 * Scenario: profile-keeps-demo-identity-visible
 * Given A local contributor aggregate exists.
 * When Profile renders.
 * Then Accounting and achievements are traceable while identity and adoption remain honestly labelled.
 */
test.todo("page.contributor-profile / profile-keeps-demo-identity-visible — Phase 2 owner implementation pending");

/**
 * Spec: page.guided-demo
 * Scenario: guided-demo-discloses-hybrid-boundary
 * Given Visitor opens the demo route.
 * When A walkthrough is launched.
 * Then Real UI automation remains visibly separated from scripted runner and demo identity claims.
 */
test.todo("page.guided-demo / guided-demo-discloses-hybrid-boundary — Phase 2 owner implementation pending");

/**
 * Spec: page.marketplace
 * Scenario: marketplace-route-composes-live-read-model
 * Given Visitor opens the standalone marketplace.
 * When Data loads or stream updates arrive.
 * Then Shelves revalidate from API and preserve dataMode and generator labels.
 */
test.todo("page.marketplace / marketplace-route-composes-live-read-model — Phase 2 owner implementation pending");

/**
 * Spec: page.route-fallbacks
 * Scenario: route-fallbacks-remain-recoverable
 * Given A route is unknown or lazy rendering throws.
 * When Fallback renders.
 * Then Accessible recovery text and Home or reload action are available without internal details.
 */
test.todo("page.route-fallbacks / route-fallbacks-remain-recoverable — Phase 2 owner implementation pending");
