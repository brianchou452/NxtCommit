import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missionServer } from '../spec-tests/mission-test-support.js';

/**
 * Spec: api.mission-execute
 * Scenario: execute-success-produces-reviewable-evidence
 * Given DemoRunner applies scripted intelligence to a copied bundled fixture.
 * When Engine-owned verification observes a nonempty bounded diff and a green nonempty final suite.
 * Then The run persists source-labelled events dossier and artifact and only computeReviewable may move the mission to needs_review.
 */
test('api.mission-execute / execute-success-produces-reviewable-evidence', async () => { const app = await missionServer(); try { const dispatch = await app.json('/missions/mission-ready/execute', {}); const evidence = await app.terminal(dispatch.body.run.id); assert.equal(evidence.run.status, 'succeeded'); assert.equal(evidence.artifact?.dossier.baseline.passed, 2); assert.equal(evidence.artifact?.dossier.experiments[0]?.passed, 3); assert.equal(evidence.artifact?.files.length, 2); assert.equal(app.service.getMission('mission-ready').status, 'needs_review'); } finally { await app.stop(); } });

/**
 * Spec: page.execution-room
 * Scenario: execution-room-reaches-evidenced-terminal
 * Given An eligible bundled fixture is dispatched in demo mode with bounded compute.
 * When The runner and engine complete within the documented timeout.
 * Then Persisted runner events remain demo-labelled engine tests and diff remain engine-verified and the page revalidates to needs_review with a reviewable artifact.
 */
test('page.execution-room / execution-room-reaches-evidenced-terminal REST authority', async () => { const app = await missionServer(); try { const dispatch = await app.json('/missions/mission-ready/execute', {}); const evidence = await app.terminal(dispatch.body.run.id); assert.ok(evidence.events.some(event => event.source === 'demo' && !event.verified)); assert.ok(evidence.events.some(event => event.type === 'test-result' && event.source === 'engine' && event.verified)); const reload = await app.json('/missions/mission-ready'); assert.equal(reload.body.status, 'needs_review'); assert.equal(reload.body.artifact.testEvidenceSource, 'engine'); } finally { await app.stop(); } });
