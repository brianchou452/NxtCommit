import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missionServer } from './spec-tests/mission-test-support.js';

/**
 * Spec: page.execution-room
 * Scenario: execution-room-keeps-queue-separate-from-work
 * Given Queue dispatch returns a request before any worker owns or starts a run.
 * When The page polls queued leased completed failed or cancelled request states.
 * Then It reports request ownership separately and shows runner activity only after a matching run and events exist.
 */
test('page.execution-room / execution-room-keeps-queue-separate-from-work', async () => { const app = await missionServer({ dispatchMode: 'queue', autoWorker: false }); try { const dispatch = await app.json('/missions/mission-ready/execute', {}); assert.equal(dispatch.status, 202); assert.equal((await app.json('/missions/mission-ready')).body.latestRun, undefined); assert.deepEqual((await app.json('/live')).body.activities, []); await app.service.workOnce('test-worker'); const request = (await app.json('/run-requests/' + dispatch.body.request.id)).body.request; assert.equal(request.status, 'completed'); assert.equal((await app.json('/runs/' + request.resultRunId)).body.run.status, 'succeeded'); } finally { await app.stop(); } });
