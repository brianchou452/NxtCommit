import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missionServer } from './spec-tests/mission-test-support.js';
import { allocateRefund, computeReviewable, assertTransition } from './domain/mission.js';

test('all mission API contracts use owned persisted evidence and atomic intent', async () => {
  const app = await missionServer();
  try {
    const initial = await app.json('/missions/mission-fixture'); assert.equal(initial.status, 200); assert.equal(initial.body.latestRun, undefined); assert.equal(initial.body.artifact, undefined);
    assert.equal((await app.json('/missions/missing')).status, 404);
    assert.deepEqual((await app.json('/missions/mission-fixture/events')).body, { events: [] });
    assert.equal((await app.json('/missions/mission-fixture/run-request')).body.request, null);
    assert.equal((await app.json('/missions/missing/run-request')).status, 404);
    assert.equal((await app.json('/runs/missing')).status, 404); assert.equal((await app.json('/run-requests/missing')).status, 404);
    assert.deepEqual((await app.json('/live')).body.activities, []);
    const key = { 'Idempotency-Key': 'retry-intent' };
    const first = await app.json('/missions/mission-fixture/pledge', { amount: 10, contributorId: 'forged' }, key);
    assert.equal(first.status, 200); assert.equal(first.body.wallet, 9990);
    assert.deepEqual((await app.json('/missions/mission-fixture/pledge', { amount: 10 }, key)).body, first.body);
    assert.equal((await app.json('/missions/mission-fixture/pledge', { amount: 11 }, key)).status, 409);
    assert.equal((await app.json('/missions/mission-fixture/pledge', { amount: 1.2 })).status, 400);
    const mission = (await app.json('/missions/mission-fixture')).body; assert.equal(mission.pledges.length, 1); assert.equal(mission.pledges[0].contributorId, 'demo-contributor'); assert.equal(mission.ledger.length, 1);
    assert.equal((await app.json('/bootstrap')).body.currentUser.walletBalance, 9990);
    const denied = await app.json('/missions/mission-ready/cancel', { role: 'maintainer' }, { 'x-role': 'operator' }); assert.equal(denied.status, 403); assert.equal(denied.body.code, 'auth_required');
    const metadata = await app.json('/missions/mission-metadata/execute', { mode: 'demo' }); assert.equal(metadata.status, 400); assert.equal(metadata.body.code, 'workspace_not_executable');
    const finish = await app.json('/missions/mission-fixture/pledge', { amount: 90 }, { 'Idempotency-Key': 'complete-intent' });
    assert.equal(finish.body.executionStarting, true);
    const evidence = await app.terminal(finish.body.mission.latestRun.id); assert.equal(evidence.run.status, 'succeeded');
    assert.deepEqual((await app.json('/missions/mission-fixture/pledge', { amount: 90 }, { 'Idempotency-Key': 'complete-intent' })).body, finish.body);
  } finally { await app.stop(); }
});

test('inline execution reaches real engine evidence and exactly one settlement', async () => {
  const app = await missionServer();
  try {
    const dispatch = await app.json('/missions/mission-ready/execute', {}); assert.equal(dispatch.status, 200); assert.equal(dispatch.body.dispatch, 'inline');
    const evidence = await app.terminal(dispatch.body.run.id); assert.equal(evidence.run.status, 'succeeded', JSON.stringify(evidence));
    assert.equal(evidence.artifact?.testEvidenceSource, 'engine'); assert.equal(evidence.artifact?.dossier.baseline.passed, 2); assert.equal(evidence.artifact?.dossier.experiments[0]?.passed, 3);
    assert.equal(evidence.artifact?.files.length, 2); assert.ok(evidence.artifact?.files.every(file => file.diff.includes('diff --git')));
    assert.ok(evidence.events.some(event => event.source === 'demo' && !event.verified)); assert.ok(evidence.events.some(event => event.type === 'test-result' && event.source === 'engine' && event.verified));
    assert.equal(app.service.getMission('mission-ready').status, 'needs_review');
    const before = app.service.getMission('mission-ready').ledger; assert.equal(app.service.settle(evidence.run.id, 'failed'), false); assert.deepEqual(app.service.getMission('mission-ready').ledger, before);
    assert.equal((await app.json('/missions/mission-fixture/events?runId=' + evidence.run.id)).status, 404);
    assert.deepEqual((await app.json('/live')).body.activities, []);
  } finally { await app.stop(); }
});

test('accounting remainder and lifecycle gates reject forged success', () => {
  for (let pool = 0; pool <= 9; pool++) { const allocation = allocateRefund(pool, [{ id: 'b', amount: 3 }, { id: 'a', amount: 3 }, { id: 'c', amount: 3 }]); assert.equal([...allocation.values()].reduce((a, b) => a + b, 0), pool); }
  assert.equal(allocateRefund(1, [{ id: 'b', amount: 1 }, { id: 'a', amount: 1 }]).get('a'), 1);
  assert.throws(() => assertTransition('funding', 'needs_review'));
  assert.equal(computeReviewable({ command: 'test', exitCode: 0, passed: 2, failed: 0, total: 2 }, { command: 'test', exitCode: 0, passed: 2, failed: 0, total: 2 }, [], true).reviewable, false);
});

test('forged engine success cannot bypass authoritative artifact gate', async () => {
  const app = await missionServer();
  try { const dispatch = app.service.dispatch('mission-ready'); if (dispatch.dispatch !== 'inline') assert.fail(); assert.throws(() => app.service.settle(dispatch.run.id, 'succeeded'), /engine-verified/); assert.equal((await app.terminal(dispatch.run.id)).run.status, 'succeeded'); } finally { await app.stop(); }
});

test('retry projection never carries the previous artifact into a new active run', async () => {
  const app = await missionServer();
  try {
    const first = app.service.dispatch('mission-ready'); if (first.dispatch !== 'inline') assert.fail();
    await app.terminal(first.run.id);
    const previous = app.service.getMission('mission-ready'); assert.ok(previous.artifact);
    // C-owned local decision is represented by the persisted lifecycle state at this B port.
    app.service.store.put('mission', previous.id, previous.projectId, { ...previous, status: 'changes_requested' });
    const second = app.service.dispatch('mission-ready'); if (second.dispatch !== 'inline') assert.fail();
    const current = app.service.getMission('mission-ready'); assert.equal(current.latestRun?.id, second.run.id); assert.equal(current.artifact, undefined); assert.equal(app.service.getRunEvidence(second.run.id)?.artifact, undefined);
    await app.terminal(second.run.id); assert.equal(app.service.getMission('mission-ready').artifact?.runId, second.run.id);
  } finally { await app.stop(); }
});
