import { test } from 'node:test';

/**
 * Spec: api.run-review
 * Scenario: review-keeps-human-boundary
 * Given A run has a reviewable local artifact.
 * When The local persona approves or requests changes.
 * Then The state changes locally, request_changes requires feedback and no upstream action occurs.
 */
test.todo("api.run-review / review-keeps-human-boundary — Phase 2 owner implementation pending");

/**
 * Spec: api.shadow-review
 * Scenario: shadow-review-has-no-authority
 * Given A review artifact exists.
 * When Shadow review runs.
 * Then Findings record provenance and affectedGate remains false.
 */
test.todo("api.shadow-review / shadow-review-has-no-authority — Phase 2 owner implementation pending");

/**
 * Spec: component.diff-viewer
 * Scenario: diff-is-local-engine-artifact
 * Given Engine produced a baseline-relative artifact.
 * When Reviewer inspects files.
 * Then Persisted changes render without implying a pushed branch or GitHub PR.
 */
test.todo("component.diff-viewer / diff-is-local-engine-artifact — Phase 2 owner implementation pending");

/**
 * Spec: component.review-controls
 * Scenario: controls-cannot-bypass-gate
 * Given Advisory findings may be positive while deterministic gate is not reviewable.
 * When Controls render.
 * Then Decision remains unavailable until mission state authorizes it and request changes requires feedback.
 */
test.todo("component.review-controls / controls-cannot-bypass-gate — Phase 2 owner implementation pending");

/**
 * Spec: component.verification-dossier
 * Scenario: dossier-separates-suite-and-criteria
 * Given Aggregate tests and criterion evidence may differ.
 * When Dossier renders.
 * Then Suite success is not presented as proof for an unsupported criterion and unreadable stays unknown.
 */
test.todo("component.verification-dossier / dossier-separates-suite-and-criteria — Phase 2 owner implementation pending");

/**
 * Spec: page.review
 * Scenario: review-keeps-deterministic-evidence-primary
 * Given A mission has a local review artifact.
 * When Human and optional AI review features are used.
 * Then Deterministic evidence remains first and only local lifecycle actions occur.
 */
test.todo("page.review / review-keeps-deterministic-evidence-primary — Phase 2 owner implementation pending");

/**
 * Spec: api.run-evidence-explanation
 * Scenario: explanation-never-rewrites-evidence
 * Given A run has a stored artifact.
 * When Explanation is requested.
 * Then Bounded prose and provenance are returned while source evidence remains authoritative.
 */
test.todo("api.run-evidence-explanation / explanation-never-rewrites-evidence — Phase 2 owner implementation pending");
