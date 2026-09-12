import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ownedEvents, envelopeBelongsToMission } from '../src/services/mission.js';
import type { ExecutionEvent } from '../shared/execution.js';

/**
 * Spec: component.execution-activity
 * Scenario: activity-rejects-cross-run-events
 * Given Stored and live events contain delayed frames from a prior run.
 * When Activity adopts a new active run.
 * Then Every prior-run frame and derived test/file/phase summary is removed before the new timeline renders.
 */
test('component.execution-activity / activity-rejects-cross-run-events', () => {
  const event = (id: string, runId: string, seq: number, missionId = 'm'): ExecutionEvent => ({ id, runId, missionId, seq, type: 'test-result', ts: '2026-01-01T00:00:00Z', source: 'demo', verified: false, computeDelta: 0 });
  const events = [event('old', 'old-run', 1), event('two', 'new-run', 2), event('one', 'new-run', 1), event('two', 'new-run', 2), event('foreign', 'new-run', 3, 'other')];
  assert.deepEqual(ownedEvents(events, 'm', 'new-run').map(item => item.id), ['one', 'two']);
  assert.deepEqual(ownedEvents(events, 'm'), []);
  assert.equal(envelopeBelongsToMission({ kind: 'mission_update', mission: { id: 'old-mission', status: 'funded' } }, 'new-mission'), false);
  assert.equal(envelopeBelongsToMission({ kind: 'mission_update', mission: { id: 'new-mission', status: 'funded' } }, 'new-mission'), true);
});

/**
 * Spec: page.execution-room
 * Scenario: execution-room-isolates-active-run
 * Given A mission starts a later retry while prior REST and SSE responses remain in flight.
 * When The active run changes.
 * Then Old-run events tests files phase and summaries are discarded and every accepted update matches both current missionId and runId.
 */
// Interactive acceptance executes in Docker: e2e/mission-execution.e2e.spec.ts,
// "bounded failure retains old outcome and retry adopts only the new run".
