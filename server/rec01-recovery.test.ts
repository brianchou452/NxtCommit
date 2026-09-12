import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missionServer } from './spec-tests/mission-test-support.js';

/**
 * Spec: api.mission-execute
 * Scenario: execute-dispatch-must-reach-terminal-or-recoverable
 * Given Inline or worker dispatch accepts an eligible run.
 * When Runtime processing proceeds or a bounded fault occurs.
 * Then The request produces one owned run that reaches succeeded failed budget_exhausted blocked or cancelled with endedAt persisted within the documented timeout; an accepted row alone is not completion.
 */
test('api.mission-execute / execute-dispatch-must-reach-terminal-or-recoverable', async () => { const app = await missionServer({ executionTimeoutMs: 1 }); try { const result = await app.json('/missions/mission-ready/execute', {}); const terminal = await app.terminal(result.body.run.id); assert.equal(terminal.run.status, 'failed'); assert.ok(terminal.run.endedAt); assert.equal(app.service.getMission('mission-ready').status, 'failed'); const old = terminal.run; const again = await app.json('/missions/mission-ready/execute', {}); assert.equal(again.status, 200); assert.notEqual(again.body.run.id, old.id); await app.terminal(again.body.run.id); assert.deepEqual(app.service.getRunEvidence(old.id)?.run, old); } finally { await app.stop(); } });

/**
 * Spec: page.execution-room
 * Scenario: execution-room-preserves-failure-and-recovery
 * Given A run fails stalls is cancelled loses its stream or is interrupted by restart.
 * When The page reloads or reconnects.
 * Then The last persisted evidence and explicit recoverable outcome remain visible without invented progress or cross-run data.
 */
test('page.execution-room / execution-room-preserves-failure-and-recovery', async () => { const app = await missionServer(); try { const dispatch = await app.json('/missions/mission-ready/execute', {}); await app.service.quiesce(); const first = await app.json('/runs/' + dispatch.body.run.id); const reload = await app.json('/runs/' + dispatch.body.run.id); assert.equal(first.body.run.status, 'cancelled'); assert.ok(first.body.run.endedAt); assert.deepEqual(reload.body, first.body); assert.equal(app.service.getMission('mission-ready').status, 'stalled'); } finally { await app.stop(); } });
