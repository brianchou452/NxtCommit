import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missionServer } from './spec-tests/mission-test-support.js';

/**
 * Spec: api.mission-detail
 * Scenario: mission-detail-nests-only-owned-evidence
 * Given Several missions have concurrent runs pledges ledger rows artifacts and reviews.
 * When One mission detail is requested.
 * Then Every nested record belongs to that mission and absent optional evidence stays absent.
 */
test('api.mission-detail / mission-detail-nests-only-owned-evidence', async () => {
  const app = await missionServer();
  try {
    const [a, b] = await Promise.all([app.json('/missions/mission-ready/execute', {}), app.json('/missions/mission-fixture/pledge', { amount: 100 })]);
    await Promise.all([app.terminal(a.body.run.id), app.terminal(b.body.mission.latestRun.id)]);
    for (const id of ['mission-ready', 'mission-fixture']) {
      const mission = (await app.json('/missions/' + id)).body;
      assert.equal(mission.latestRun.missionId, id); assert.equal(mission.artifact.missionId, id);
      assert.ok(mission.pledges.every((row: { missionId: string }) => row.missionId === id)); assert.ok(mission.ledger.every((row: { missionId: string }) => row.missionId === id));
      const events = (await app.json('/missions/' + id + '/events')).body.events;
      assert.ok(events.every((row: { missionId: string; runId: string }) => row.missionId === id && row.runId === mission.latestRun.id));
    }
  } finally { await app.stop(); }
});

/**
 * Spec: api.mission-stream
 * Scenario: mission-stream-never-crosses-mission-or-run
 * Given Concurrent missions and sequential retries publish overlapping updates.
 * When Clients subscribe disconnect and reconnect.
 * Then Each stream receives only its mission and clients accept execution frames only for the selected active run before REST revalidation.
 */
test('api.mission-stream / mission-stream-never-crosses-mission-or-run', async () => {
  const app = await missionServer(); const controller = new AbortController();
  try {
    const stream = await fetch(app.url + '/api/missions/mission-ready/stream', { signal: controller.signal }); const reader = stream.body!.getReader(); await reader.read();
    const received: string[] = []; const collect = (async () => { try { while (true) { const { done, value } = await reader.read(); if (done) break; received.push(new TextDecoder().decode(value)); } } catch { /* intentional disconnect */ } })();
    const [a, b] = await Promise.all([app.json('/missions/mission-ready/execute', {}), app.json('/missions/mission-fixture/pledge', { amount: 100 })]);
    await Promise.all([app.terminal(a.body.run.id), app.terminal(b.body.mission.latestRun.id)]);
    controller.abort(); await collect;
    const frames = received.join('').split('\n').filter(line => line.startsWith('data: ')).map(line => JSON.parse(line.slice(6)));
    assert.ok(frames.some(frame => frame.kind === 'exec_event'));
    for (const frame of frames) { if (frame.event) { assert.equal(frame.event.missionId, 'mission-ready'); assert.equal(frame.event.runId, a.body.run.id); } if (frame.run) assert.equal(frame.run.missionId, 'mission-ready'); if (frame.mission) assert.equal(frame.mission.id, 'mission-ready'); }
    const snapshot = await app.json('/missions/mission-ready/events'); assert.equal(snapshot.body.runId, a.body.run.id); assert.ok(snapshot.body.events.length > 0);
  } finally { controller.abort(); await app.stop(); }
});
