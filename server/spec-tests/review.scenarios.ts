import { test } from 'node:test';
import { reviewCases } from '../test-support/authoring.js';

/**
 * Spec: api.run-review
 * Scenario: review-keeps-human-boundary
 * Given A run has a reviewable local artifact.
 * When The local persona approves or requests changes.
 * Then The state changes locally, request_changes requires feedback and no upstream action occurs.
 */
test('api.run-review / review-keeps-human-boundary', reviewCases['review-keeps-human-boundary']!);

/**
 * Spec: api.shadow-review
 * Scenario: shadow-review-has-no-authority
 * Given A review artifact exists.
 * When Shadow review runs.
 * Then Findings record provenance and affectedGate remains false.
 */
test('api.shadow-review / shadow-review-has-no-authority', reviewCases['shadow-review-has-no-authority']!);

/**
 * Spec: component.diff-viewer
 * Scenario: diff-is-local-engine-artifact
 * Given Engine produced a baseline-relative artifact.
 * When Reviewer inspects files.
 * Then Persisted changes render without implying a pushed branch or GitHub PR.
 */
// Browser outcome coverage: e2e/computer-c.e2e.spec.ts (diff-is-local-engine-artifact).

/**
 * Spec: component.review-controls
 * Scenario: controls-cannot-bypass-gate
 * Given Advisory findings may be positive while deterministic gate is not reviewable.
 * When Controls render.
 * Then Decision remains unavailable until mission state authorizes it and request changes requires feedback.
 */
// Browser outcome coverage: e2e/computer-c.e2e.spec.ts (controls-cannot-bypass-gate).

/**
 * Spec: component.verification-dossier
 * Scenario: dossier-separates-suite-and-criteria
 * Given Aggregate tests and criterion evidence may differ.
 * When Dossier renders.
 * Then Suite success is not presented as proof for an unsupported criterion and unreadable stays unknown.
 */
// Browser outcome coverage: e2e/computer-c.e2e.spec.ts (dossier-separates-suite-and-criteria).

/**
 * Spec: page.review
 * Scenario: review-keeps-deterministic-evidence-primary
 * Given A mission has a local review artifact.
 * When Human and optional AI review features are used.
 * Then Deterministic evidence remains first and only local lifecycle actions occur.
 */
// Browser outcome coverage: e2e/computer-c.e2e.spec.ts (review-keeps-deterministic-evidence-primary).

/**
 * Spec: api.run-evidence-explanation
 * Scenario: explanation-never-rewrites-evidence
 * Given A run has a stored artifact.
 * When Explanation is requested.
 * Then Bounded prose and provenance are returned while source evidence remains authoritative.
 */
 test('api.run-evidence-explanation / explanation-never-rewrites-evidence', reviewCases['explanation-never-rewrites-evidence']!);
